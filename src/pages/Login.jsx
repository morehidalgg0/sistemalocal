import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "setup"
  const [checking, setChecking] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Al abrir: si ya hay sesión, entra directo; si no hay ninguna cuenta, ofrece crearla.
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        if (!alive || !data) return;
        if (data.authenticated && data.user) {
          onLogin(data.user);
        } else if (data.hasUsers === false) {
          setMode("setup");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (mode === "setup" && password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const url = mode === "setup" ? "/api/auth/setup" : "/api/auth/login";
      const body =
        mode === "setup" ? { nombre, email, password } : { email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "No se pudo iniciar sesión.");
      }
      if (data.user) onLogin(data.user);
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
      </div>
    );
  }

  const isSetup = mode === "setup";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px circle at 15% 10%, rgba(14,165,233,0.16), transparent 55%), radial-gradient(500px circle at 85% 85%, rgba(99,102,241,0.14), transparent 55%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Marca */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center font-extrabold text-white text-lg shadow-lg shadow-sky-500/30">
            NP
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
            NEW POINT
          </h1>
          <p className="text-[11px] text-sky-400 font-semibold uppercase tracking-[0.2em]">
            Gestión &amp; Lab
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl shadow-black/40 p-6 sm:p-8 backdrop-blur">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {isSetup ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-sky-400" />
                  Crear cuenta del dueño
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-sky-400" />
                  Iniciar sesión
                </>
              )}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {isSetup
                ? "Es la primera vez que se usa el sistema. Creá la cuenta principal."
                : "Ingresá con tu email y contraseña para acceder al sistema."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSetup && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Nombre
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSetup ? "Mínimo 8 caracteres" : "Tu contraseña"}
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {isSetup && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Repetir contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repetí la contraseña"
                    autoComplete="new-password"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isSetup ? "Creando cuenta..." : "Ingresando..."}
                </>
              ) : isSetup ? (
                "Crear cuenta e ingresar"
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          {isSetup && (
            <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
              Esta cuenta será la principal (dueño). Después vas a poder crear
              accesos para el resto del equipo.
            </p>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          Sistema privado · Acceso solo para personal autorizado
        </p>
      </div>
    </div>
  );
}
