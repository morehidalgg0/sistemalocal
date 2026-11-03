import crypto from "crypto";

// ===================== AUTENTICACIÓN =====================
// Sesiones persistidas en Postgres (funcionan entre instancias serverless)
// y contraseñas hasheadas con scrypt (sin dependencias externas).

const SESSION_COOKIE = "np_session";
const SESSION_TTL_DAYS = 30;
const MIN_PASSWORD_LENGTH = 8;

let authSchemaReady = false;

export async function ensureAuthSchema(q) {
  if (authSchemaReady) return;

  const statements = [
    `CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      email VARCHAR(150) UNIQUE NOT NULL,
      nombre VARCHAR(120),
      password_hash TEXT NOT NULL,
      rol VARCHAR(20) NOT NULL DEFAULT 'OWNER',
      activo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMPTZ
    )`,
    `CREATE TABLE IF NOT EXISTS sesiones (
      token VARCHAR(64) PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMPTZ NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sesiones_expires ON sesiones(expires_at)`,
  ];

  for (const sql of statements) {
    try {
      await q(sql);
    } catch (e) {
      // Si dos instancias intentan crear la tabla a la vez, ignoramos el choque.
      if (!/already exists|duplicate key/i.test(e.message || "")) throw e;
    }
  }

  authSchemaReady = true;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [algo, salt, hash] = String(stored || "").split("$");
    if (algo !== "scrypt" || !salt || !hash) return false;
    const calc = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (calc.length !== expected.length) return false;
    return crypto.timingSafeEqual(calc, expected);
  } catch {
    return false;
  }
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || "";
  raw.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) return;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  });
  return out;
}

function isHttps(req) {
  return (
    req.headers["x-forwarded-proto"] === "https" ||
    process.env.NODE_ENV === "production"
  );
}

function buildSessionCookie(token, req, maxAgeSeg = SESSION_TTL_DAYS * 24 * 3600) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeg}`,
  ];
  if (isHttps(req)) parts.push("Secure");
  return parts.join("; ");
}

function clearSessionCookie(req) {
  return buildSessionCookie("", req, 0);
}

function publicUser(u) {
  return { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol };
}

async function createSession(q, usuarioId) {
  const token = crypto.randomBytes(32).toString("hex");
  await q(
    `INSERT INTO sesiones (token, usuario_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '${SESSION_TTL_DAYS} days')`,
    [token, usuarioId]
  );
  // Limpieza oportunista de sesiones vencidas (no bloquea la respuesta).
  q("DELETE FROM sesiones WHERE expires_at < NOW()").catch(() => {});
  return token;
}

async function getSessionUser(q, req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const r = await q(
    `SELECT u.id, u.email, u.nombre, u.rol
       FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token = $1 AND s.expires_at > NOW() AND u.activo = TRUE`,
    [token]
  );
  return (r.rows && r.rows[0]) || null;
}

// Rate limit básico de login (por instancia serverless).
const loginAttempts = new Map();

function loginKey(req, email) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "?";
  return `${ip}:${String(email || "").toLowerCase()}`;
}

function loginBlocked(key) {
  const now = Date.now();
  const rec = loginAttempts.get(key);
  if (!rec) return false;
  if (now - rec.first > 15 * 60 * 1000) {
    loginAttempts.delete(key);
    return false;
  }
  return rec.count >= 10;
}

function registerLoginFail(key) {
  const now = Date.now();
  const rec = loginAttempts.get(key);
  if (!rec || now - rec.first > 15 * 60 * 1000) {
    loginAttempts.set(key, { first: now, count: 1 });
  } else {
    rec.count += 1;
  }
}

const PUBLIC_PATHS = new Set([
  "/api/auth/status",
  "/api/auth/setup",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/cron/dolar",
]);

function isCronRequest(req) {
  if (req.headers["x-vercel-cron"]) return true;
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization === `Bearer ${secret}`) return true;
  return false;
}

/**
 * Instala el middleware de protección y las rutas de auth.
 * Debe llamarse ANTES de declarar el resto de las rutas /api/*.
 */
export function installAuth(app, q) {
  // ---- Middleware: todo /api/* requiere sesión salvo las rutas públicas ----
  app.use(async (req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    if (req.method === "OPTIONS") return next();
    if (PUBLIC_PATHS.has(req.path)) return next();
    if (isCronRequest(req)) return next();

    try {
      await ensureAuthSchema(q);
      const user = await getSessionUser(q, req);
      if (!user) {
        return res.status(401).json({ error: "No autorizado. Iniciá sesión." });
      }
      req.usuario = user;
      return next();
    } catch (e) {
      console.error("Auth middleware:", e.message);
      return res.status(500).json({ error: "Error de autenticación" });
    }
  });

  // ---- Estado público: ¿hay cuentas? ¿estoy logueado? ----
  app.get("/api/auth/status", async (req, res) => {
    try {
      await ensureAuthSchema(q);
      const total = await q("SELECT COUNT(*)::int AS c FROM usuarios");
      let user = null;
      try {
        user = await getSessionUser(q, req);
      } catch {
        user = null;
      }
      res.json({
        hasUsers: (total.rows[0]?.c || 0) > 0,
        authenticated: !!user,
        user: user ? publicUser(user) : null,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- Alta inicial del dueño (solo si no existe ninguna cuenta) ----
  app.post("/api/auth/setup", async (req, res) => {
    try {
      await ensureAuthSchema(q);
      const email = String(req.body?.email || "").trim().toLowerCase();
      const nombre = String(req.body?.nombre || "").trim();
      const password = String(req.body?.password || "");

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: "Email inválido" });
      }
      if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
        return res.status(400).json({
          error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
        });
      }

      // INSERT atómico: solo crea si todavía no hay usuarios.
      const r = await q(
        `INSERT INTO usuarios (email, nombre, password_hash, rol)
         SELECT $1, $2, $3, 'OWNER'
          WHERE NOT EXISTS (SELECT 1 FROM usuarios)
         RETURNING id, email, nombre, rol`,
        [email, nombre || email.split("@")[0], hashPassword(password)]
      );

      if (!r.rows || r.rows.length === 0) {
        return res.status(403).json({
          error: "Ya existe una cuenta. Iniciá sesión.",
        });
      }

      const user = r.rows[0];
      const token = await createSession(q, user.id);
      res.setHeader("Set-Cookie", buildSessionCookie(token, req));
      return res.json({ success: true, user: publicUser(user) });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ---- Login ----
  app.post("/api/auth/login", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const key = loginKey(req, email);

    try {
      await ensureAuthSchema(q);

      if (loginBlocked(key)) {
        return res
          .status(429)
          .json({ error: "Demasiados intentos. Esperá 15 minutos." });
      }

      const r = await q(
        "SELECT * FROM usuarios WHERE LOWER(email) = $1 AND activo = TRUE",
        [email]
      );
      const u = r.rows && r.rows[0];

      if (!u || !verifyPassword(password, u.password_hash)) {
        registerLoginFail(key);
        return res.status(401).json({ error: "Email o contraseña incorrectos" });
      }

      loginAttempts.delete(key);
      await q("UPDATE usuarios SET last_login = NOW() WHERE id = $1", [u.id]).catch(
        () => {}
      );

      const token = await createSession(q, u.id);
      res.setHeader("Set-Cookie", buildSessionCookie(token, req));
      return res.json({ success: true, user: publicUser(u) });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ---- Logout ----
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = parseCookies(req)[SESSION_COOKIE];
      if (token) {
        await q("DELETE FROM sesiones WHERE token = $1", [token]).catch(() => {});
      }
    } catch {
      // Si la base no responde, igual limpiamos la cookie.
    }
    res.setHeader("Set-Cookie", clearSessionCookie(req));
    return res.json({ success: true });
  });

  // ---- Usuario actual ----
  app.get("/api/auth/me", async (req, res) => {
    try {
      await ensureAuthSchema(q);
      const user = await getSessionUser(q, req);
      if (!user) return res.status(401).json({ error: "No autorizado" });
      return res.json({ user: publicUser(user) });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ---- Cambio de contraseña ----
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const currentPassword = String(req.body?.currentPassword || "");
      const newPassword = String(req.body?.newPassword || "");

      if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 200) {
        return res.status(400).json({
          error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
        });
      }

      const r = await q("SELECT * FROM usuarios WHERE id = $1", [req.usuario.id]);
      const u = r.rows && r.rows[0];

      if (!u || !verifyPassword(currentPassword, u.password_hash)) {
        return res.status(400).json({ error: "La contraseña actual es incorrecta" });
      }

      await q("UPDATE usuarios SET password_hash = $1 WHERE id = $2", [
        hashPassword(newPassword),
        u.id,
      ]);

      // Cerramos las demás sesiones; la actual sigue válida.
      const token = parseCookies(req)[SESSION_COOKIE];
      await q("DELETE FROM sesiones WHERE usuario_id = $1 AND token <> $2", [
        u.id,
        token || "",
      ]).catch(() => {});

      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
}
// =================== FIN AUTENTICACIÓN ===================
