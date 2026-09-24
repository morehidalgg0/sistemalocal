import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import seedData from "./excelData.js";
import { fetchDolarBlueMdp, obtenerDolarActual } from "./dolarService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

let pool = null;
let isPostgresAvailable = false;
let memStore = JSON.parse(JSON.stringify(seedData));

async function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000
      });
      const client = await pool.connect();
      client.release();
      isPostgresAvailable = true;
    } catch (e) {
      console.warn("PostgreSQL connection failed, using in-memory store:", e.message);
      pool = null;
      isPostgresAvailable = false;
    }
  }
  return pool;
}

async function q(text, params = []) {
  const p = await getPool();
  if (p && isPostgresAvailable) {
    return p.query(text, params);
  }
  throw new Error("POSTGRES_UNAVAILABLE");
}

// Postgres devuelve columnas NUMERIC como strings ("330.00"). El frontend usa .toFixed/.toLocaleString,
// así que normalizamos a Number las columnas numéricas antes de responder por JSON.
const COLUMNS_NUMERICAS = new Set([
  "id", "dispositivo_id", "vendedor_id", "cuenta_id", "entidad_id",
  "bateria", "costo_usd", "costo_pesos", "costo_reparacion_usd", "costo_reparacion_pesos",
  "precio_sugerido_usd", "precio_sugerido_pesos", "monto_senia", "precio_venta_usd",
  "precio_venta_pesos", "cotizacion_dolar", "costo_total_usd", "costo_total_pesos",
  "costo_reparacion", "descuento_monto", "ganancia_usd", "ganancia_pesos",
  "comision_vendedor_pesos", "comision_vendedor_usd", "saldo_inicial", "saldo_actual",
  "monto", "cotizacion", "saldo_adeudado", "saldo_resultante", "stock_actual",
  "stock_minimo", "porcentaje_comision", "costo_repuesto_usd", "costo_repuesto_pesos",
  "mano_obra_usd", "mano_obra_pesos", "total_presupuesto_usd", "total_presupuesto_pesos",
  "dia_vencimiento", "monto_original", "monto_pendiente", "valor_usd", "valor_pesos",
  "regalo_costo_snapshot_usd"
]);
function numericize(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = (COLUMNS_NUMERICAS.has(k) && typeof v === "string" && v !== "" && !isNaN(Number(v))) ? Number(v) : v;
  }
  return out;
}

// Ajusta la ganancia de ventas que tienen accesorios bonificados (regalo_componentes):
// usa el costo ACTUAL de esos accesorios en el stock, no el valor congelado al momento de vender.
async function recomponerGananciaRegalos(rows) {
  if (!rows || rows.length === 0) return rows;
  const conRegalo = rows.filter(v => v && v.regalo_componentes);
  if (conRegalo.length === 0) return rows;

  let items = [];
  try {
    const r = await q("SELECT nombre, costo_usd, costo_pesos, stock_actual FROM inventario_items");
    if (r.rows && r.rows.length > 0) items = r.rows;
  } catch (e) {
    items = memStore.inventario_items || [];
  }

  const kwCosts = {};
  const getKwCost = (kw) => {
    if (!(kw in kwCosts)) {
      if (items.length === 0) {
        kwCosts[kw] = 0;
      } else {
        const match = items
          .filter(i => (parseInt(i.stock_actual) || 0) > 0 && i.nombre && i.nombre.toLowerCase().includes(kw))
          .sort((a, b) => (parseFloat(a.costo_usd) || 0) - (parseFloat(b.costo_usd) || 0))[0];
        kwCosts[kw] = match ? (parseFloat(match.costo_usd) || (parseFloat(match.costo_pesos) || 0) / 1480 || 0) : 0;
      }
    }
    return kwCosts[kw] || 0;
  };

  rows.forEach(v => {
    if (!v || !v.regalo_componentes) return;
    let kws = [];
    try {
      const parsed = JSON.parse(v.regalo_componentes);
      kws = Array.isArray(parsed) ? parsed.map(s => String(s).toLowerCase().trim()).filter(Boolean) : [];
    } catch (e) {
      kws = String(v.regalo_componentes).split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    }
    const accNow = kws.reduce((sum, kw) => sum + getKwCost(kw), 0);
    const snapshot = parseFloat(v.regalo_costo_snapshot_usd) || 0;
    const manual = parseFloat(v.descuento_monto) || 0;
    const descEfectivo = manual - snapshot + accNow;
    const cotiz = parseFloat(v.cotizacion_dolar) || 1480;
    const precioUSD = parseFloat(v.precio_venta_usd) || (parseFloat(v.precio_venta_pesos) || 0) / cotiz;
    const gan = precioUSD - (parseFloat(v.costo_total_usd) || 0) - (parseFloat(v.costo_reparacion) || 0) - descEfectivo;
    v.ganancia_usd = gan;
    v.ganancia_pesos = gan * cotiz;
    v.descuento_accesorios_usd = accNow;
    v.descuento_efectivo_usd = descEfectivo;
  });
  return rows;
}

// Persiste una venta en Postgres (solo si la DB está disponible) y ajusta caja/dispositivo en la DB.
// Reasigna venta.id al id serial real si la fila se inserta ahora.
async function persistVentaPG(venta, impactarCaja) {
  if (!isPostgresAvailable) return;
  const cols = "fecha, dispositivo_id, item_detalle, cliente_nombre, cliente_contacto, vendedor_nombre, precio_venta_usd, precio_venta_pesos, cotizacion_dolar, costo_total_usd, costo_total_pesos, costo_reparacion, descuentos_regalos_detalle, descuento_monto, regalo_componentes, regalo_costo_snapshot_usd, ganancia_usd, ganancia_pesos, comision_vendedor_pesos, comision_vendedor_usd, comision_se_pago, entrega, metodo_pago, caja_destino, desglose_pago, observaciones";
  const v = [
    venta.fecha, venta.dispositivo_id, venta.item_detalle || "", venta.cliente_nombre || "", venta.cliente_contacto || "",
    venta.vendedor_nombre || "NP", venta.precio_venta_usd, venta.precio_venta_pesos, venta.cotizacion_dolar,
    venta.costo_total_usd, venta.costo_total_pesos, venta.costo_reparacion, venta.descuentos_regalos_detalle || "",
    venta.descuento_monto, venta.regalo_componentes || null, venta.regalo_costo_snapshot_usd || 0,
    venta.ganancia_usd, venta.ganancia_pesos, venta.comision_vendedor_pesos,
    venta.comision_vendedor_usd, venta.comision_se_pago || false, venta.entrega || false,
    venta.metodo_pago || "Efectivo USD", venta.caja_destino || "Caja Dólares",
    venta.desglose_pago || null,
    venta.observaciones || ""
  ];
  const placeholders = v.map((_, i) => "$" + (i + 1)).join(", ");
  const r = await q(`INSERT INTO ventas (${cols}) VALUES (${placeholders}) RETURNING id`, v);
  if (r.rows && r.rows[0]) venta.id = r.rows[0].id;

  if (venta.dispositivo_id) {
    await q("UPDATE dispositivos SET estado='Vendido' WHERE id=$1", [parseInt(venta.dispositivo_id)]).catch(() => {});
  }

  if (impactarCaja !== false) {
    await aplicarDesglosePG(venta, legsDeVenta(venta), `VENTA-#${venta.id}`);
  }
}

// Normaliza las patas del abono de una venta: [{caja, monto, moneda}].
// Si no hay desglose explícito, cae al comportamiento viejo: 1 caja destino.
function legsDeVenta(venta) {
  let legs = venta.desglose_pago;
  if (typeof legs === "string") { try { legs = JSON.parse(legs); } catch (e) { legs = null; } }
  if (Array.isArray(legs) && legs.length > 0) {
    return legs
      .map(l => ({
        caja: l.caja || venta.caja_destino || "Caja Dólares",
        monto: parseFloat(l.monto) || 0,
        moneda: l.moneda || (/pesos|cuenta pes/i.test(l.caja || "") ? "ARS" : "USD")
      }))
      .filter(l => l.monto > 0);
  }
  const esPesos = /pesos/i.test(venta.caja_destino || "");
  return [{
    caja: venta.caja_destino || "Caja Dólares",
    monto: esPesos ? (parseFloat(venta.precio_venta_pesos) || 0) : (parseFloat(venta.precio_venta_usd) || 0),
    moneda: esPesos ? "ARS" : "USD"
  }].filter(l => l.monto > 0);
}

// Texto que detalla en el movimiento cómo se abonó (ej: " · Abonado: 700 USD + 78000 PESOS")
function detalleAbono(legs) {
  if (!Array.isArray(legs) || legs.length === 0) return "";
  const fmt = m => {
    const n = Math.round(parseFloat(m) * 100) / 100;
    return n.toLocaleString("es-AR", { maximumFractionDigits: n % 1 === 0 ? 0 : 2 });
  };
  return " · Abonado: " + legs.map(l => `${fmt(l.monto)} ${l.moneda === "ARS" ? "PESOS" : l.moneda}`).join(" + ");
}

// Genera un movimiento de caja por cada pata del abono en memoria (memStore).
function aplicarDesgloseMem(venta, legs, ref) {
  const detalle = detalleAbono(legs);
  const nuevos = [];
  for (const leg of legs) {
    const c = (memStore.cuentas_caja || []).find(c => c.nombre === leg.caja);
    if (!c) continue;
    c.saldo_actual = (parseFloat(c.saldo_actual) || 0) + leg.monto;
    nuevos.push({
      id: Date.now() + nuevos.length,
      fecha: venta.fecha,
      cuenta_id: c.id,
      cuenta_nombre: c.nombre,
      tipo_movimiento: "ENTRADA",
      categoria: "Venta",
      concepto: "Venta: " + (venta.item_detalle || "") + detalle,
      monto: leg.monto,
      moneda: leg.moneda || c.moneda,
      cotizacion: venta.cotizacion_dolar,
      persona_asociada: venta.vendedor_nombre || "NP",
      comprobante_ref: ref
    });
  }
  if (nuevos.length) memStore.caja_movimientos = [...nuevos, ...(memStore.caja_movimientos || [])];
}

// Revierte en memoria todos los movimientos de caja de una venta y sus saldos.
function revertirDesgloseMem(ref, matchFn) {
  const esMovDeVenta = (m) => m.comprobante_ref === ref || (matchFn ? matchFn(m) : false);
  const movs = (memStore.caja_movimientos || []).filter(esMovDeVenta);
  movs.forEach(m => {
    const caja = (memStore.cuentas_caja || []).find(c => c.id === m.cuenta_id || c.nombre === m.cuenta_nombre);
    if (caja) caja.saldo_actual = (parseFloat(caja.saldo_actual) || 0) - (parseFloat(m.monto) || 0);
  });
  if (movs.length > 0) memStore.caja_movimientos = (memStore.caja_movimientos || []).filter(m => !esMovDeVenta(m));
  return movs.length;
}
async function aplicarDesglosePG(venta, legs, ref) {
  const detalle = detalleAbono(legs);
  for (const leg of legs) {
    const cajaPG = await q("SELECT * FROM cuentas_caja WHERE nombre=$1", [leg.caja]).catch(() => null);
    if (!cajaPG || !cajaPG.rows || !cajaPG.rows[0]) continue;
    const cRow = cajaPG.rows[0];
    await q("UPDATE cuentas_caja SET saldo_actual = COALESCE(saldo_actual, 0) + $1 WHERE id=$2", [leg.monto, cRow.id]).catch(() => {});
    await q(
      `INSERT INTO caja_movimientos (fecha, cuenta_id, cuenta_nombre, tipo_movimiento, categoria, concepto, monto, moneda, cotizacion, persona_asociada, comprobante_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [venta.fecha, cRow.id, cRow.nombre, "ENTRADA", "Venta", "Venta: " + (venta.item_detalle || "") + detalle, leg.monto, leg.moneda, venta.cotizacion_dolar, venta.vendedor_nombre || "NP", ref]
    ).catch(() => {});
  }
}

// Revierte en Postgres todos los movimientos de caja de una venta y su saldo.
async function revertirDesglosePG(ref, itemDetalle, cajaFallback) {
  let rows = [];
  let movPG = await q("SELECT * FROM caja_movimientos WHERE comprobante_ref=$1", [ref]).catch(() => null);
  if (movPG && movPG.rows && movPG.rows.length > 0) rows = movPG.rows;
  if (rows.length === 0 && itemDetalle) {
    movPG = await q("SELECT * FROM caja_movimientos WHERE categoria='Venta' AND cuenta_nombre=$1 AND concepto LIKE $2", [cajaFallback || "Caja Dólares", "%" + itemDetalle + "%"]).catch(() => null);
    if (movPG && movPG.rows) rows = movPG.rows;
  }
  for (const m of rows) {
    await q("UPDATE cuentas_caja SET saldo_actual = COALESCE(saldo_actual, 0) - $1 WHERE id=$2", [parseFloat(m.monto) || 0, m.cuenta_id]).catch(() => {});
    await q("DELETE FROM caja_movimientos WHERE id=$1", [m.id]).catch(() => {});
  }
  return rows.length;
}

// ---------------- ROUTES ----------------

app.get("/api/config", async (req, res) => {
  try {
    const r = await q("SELECT id, valor FROM configuracion");
    const config = {};
    if (r.rows && r.rows.length > 0) {
      r.rows.forEach(row => { config[row.id] = row.valor; });
      return res.json({ config, isPostgresReady: true });
    }
    return res.json({ config: memStore.configuracion, isPostgresReady: false });
  } catch (e) {
    res.json({ config: memStore.configuracion, isPostgresReady: false });
  }
});

app.post("/api/config", async (req, res) => {
  try {
    const b = req.body;
    memStore.configuracion = { ...memStore.configuracion, ...b };
    if (isPostgresAvailable) {
      for (const [k, v] of Object.entries(b)) {
        await q("INSERT INTO configuracion (id, valor) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET valor = $2", [k, String(v)]);
      }
    }
    res.json({ success: true, config: memStore.configuracion });
  } catch (e) {
    res.json({ success: true, config: memStore.configuracion });
  }
});

// ---------------- DÓLAR BLUE MAR DEL PLATA (InfoDolar) ----------------

async function guardarDolar(fresh) {
  const configUpdate = {
    dolar_blue: String(fresh.venta),
    dolar_blue_compra: fresh.compra != null ? String(fresh.compra) : "",
    dolar_blue_actualizado: new Date().toISOString(),
    dolar_blue_fuente: fresh.fuente || "InfoDolar Mar del Plata"
  };
  memStore.configuracion = { ...memStore.configuracion, ...configUpdate };
  if (isPostgresAvailable) {
    for (const [k, v] of Object.entries(configUpdate)) {
      await q("INSERT INTO configuracion (id, valor) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET valor = $2", [k, String(v)]).catch(() => {});
    }
  }
  return configUpdate;
}

function respuestaDolar(extra = {}) {
  const c = memStore.configuracion || {};
  return res => res.json({
    venta: parseFloat(c.dolar_blue) || 1480,
    compra: c.dolar_blue_compra ? parseFloat(c.dolar_blue_compra) : null,
    actualizado: c.dolar_blue_actualizado || null,
    fuente: c.dolar_blue_fuente || "InfoDolar Mar del Plata",
    ...extra
  });
}

// Devuelve la cotización; si tiene más de 12hs, se actualiza sola desde InfoDolar
app.get("/api/dolar", async (req, res) => {
  try {
    // Hidratar config desde Postgres si está disponible (arranque frío)
    if (isPostgresAvailable) {
      const r = await q("SELECT id, valor FROM configuracion").catch(() => null);
      if (r && r.rows && r.rows.length > 0) {
        const dbConf = {};
        r.rows.forEach(row => { dbConf[row.id] = row.valor; });
        memStore.configuracion = { ...memStore.configuracion, ...dbConf };
      }
    }
    const resultado = await obtenerDolarActual(memStore.configuracion);
    if (resultado.actualizadoAhora) {
      await guardarDolar(resultado);
      return respuestaDolar({ autoActualizado: true })(res);
    }
    return res.json({
      venta: resultado.venta,
      compra: resultado.compra,
      actualizado: resultado.fechaActualizacion,
      fuente: resultado.fuente,
      autoActualizado: false
    });
  } catch (e) {
    console.warn("GET /api/dolar error:", e.message);
    return respuestaDolar({ autoActualizado: false, error: e.message })(res);
  }
});

// Actualización manual desde el botón de la interfaz
app.post("/api/dolar/refresh", async (req, res) => {
  try {
    const fresh = await fetchDolarBlueMdp();
    await guardarDolar(fresh);
    res.json({
      success: true,
      venta: fresh.venta,
      compra: fresh.compra,
      fuente: fresh.fuente,
      actualizado: memStore.configuracion.dolar_blue_actualizado
    });
  } catch (e) {
    console.warn("POST /api/dolar/refresh error:", e.message);
    res.status(502).json({ success: false, error: "No se pudo actualizar desde InfoDolar: " + e.message });
  }
});

// Endpoint para Vercel Cron (actualización diaria automática)
app.get("/api/cron/dolar", async (req, res) => {
  try {
    const fresh = await fetchDolarBlueMdp();
    await guardarDolar(fresh);
    console.log(`[CRON] Dólar Blue MDP actualizado: ${fresh.venta}`);
    res.json({ success: true, venta: fresh.venta });
  } catch (e) {
    console.error("[CRON] Error actualizando dólar:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const conf = await q("SELECT id, valor FROM configuracion");
    const config = {};
    conf.rows.forEach(r => { config[r.id] = r.valor; });
    const dolar = parseFloat(config.dolar_blue || 1480);

    const stockDisp = await q("SELECT COALESCE(SUM(costo_usd),0) as total FROM dispositivos WHERE estado = 'En Stock'");
    const stockAcc = await q("SELECT COALESCE(SUM(costo_usd * stock_actual),0) as total FROM inventario_items");
    const cajas = await q("SELECT moneda, saldo_actual FROM cuentas_caja");
    let saldoUSD = 0, saldoARS = 0;
    cajas.rows.forEach(c => {
      if (c.moneda === "USD" || c.moneda === "USDT") saldoUSD += parseFloat(c.saldo_actual);
      else if (c.moneda === "ARS") saldoARS += parseFloat(c.saldo_actual);
    });
    const totalLiquido = saldoUSD + saldoARS / dolar;
const ventasRaw = await q("SELECT * FROM ventas");
    const ventas = await recomponerGananciaRegalos(ventasRaw.rows.map(numericize));
    const gananciaMes = ventas.reduce((a, v) => a + (parseFloat(v.ganancia_usd) || 0), 0);
    const totalVendidos = ventas.length;
    const promedio = totalVendidos > 0 ? gananciaMes / totalVendidos : 0;

    const deudores = await q("SELECT COALESCE(SUM(monto_pendiente),0) as total FROM deudas_deudores WHERE tipo='DEUDOR' AND estado!='Cancelado'");
    const deudas = await q("SELECT COALESCE(SUM(monto_pendiente),0) as total FROM deudas_deudores WHERE tipo='DEUDA' AND estado!='Cancelado'");
    const ccProv = await q("SELECT COALESCE(SUM(saldo_adeudado),0) as total FROM entidades_cc WHERE tipo='PROVEEDOR'");
    const dispEnStock = await q("SELECT COUNT(*) as c FROM dispositivos WHERE estado = 'En Stock'");
    const repActivas = await q("SELECT COUNT(*) as c FROM reparaciones WHERE estado != 'Entregado y Cobrado'");
    const ultimasVentas = await q("SELECT * FROM ventas ORDER BY id DESC LIMIT 5");
    const ultimosMovs = await q("SELECT * FROM caja_movimientos ORDER BY id DESC LIMIT 6");

    if (totalVendidos === 0 && (memStore.ventas || []).length > 0) {
      throw new Error("EMPTY_POSTGRES_FALLBACK");
    }

    res.json({
      kpis: {
        capitalTotalUSD: parseFloat(stockDisp.rows[0].total) + parseFloat(stockAcc.rows[0].total) + totalLiquido,
        stockDispositivosUSD: parseFloat(stockDisp.rows[0].total),
        stockAccesoriosUSD: parseFloat(stockAcc.rows[0].total),
        totalLiquidoUSD: totalLiquido,
        saldoCajasUSD: saldoUSD,
        saldoCajasARS: saldoARS,
        gananciaMesUSD: gananciaMes,
        totalEquiposVendidos: totalVendidos,
        promedioGananciaPorTel: promedio,
        totalDeudoresUSD: parseFloat(deudores.rows[0].total),
        totalDeudasUSD: parseFloat(deudas.rows[0].total),
        saldoCCProveedores: parseFloat(ccProv.rows[0].total),
        dolarActual: dolar
      },
      equiposEnStock: parseInt(dispEnStock.rows[0].c),
      reparacionesActivas: parseInt(repActivas.rows[0].c),
      ultimasVentas: await recomponerGananciaRegalos(ultimasVentas.rows.map(numericize)),
      ultimosMovimientos: ultimosMovs.rows.map(numericize)
    });
  } catch (e) {
    const dolar = parseFloat(memStore.configuracion?.dolar_blue || 1480);
    const stockDisp = (memStore.dispositivos || [])
      .filter(d => d.estado === "En Stock" || d.estado === "Señado")
      .reduce((a, d) => a + (parseFloat(d.costo_usd) || 0) + (parseFloat(d.costo_reparacion_usd) || 0), 0);
    const stockAcc = (memStore.inventario_items || [])
      .reduce((a, i) => a + ((parseFloat(i.costo_usd) || ((parseFloat(i.costo_pesos)||0)/dolar)) * (i.stock_actual || 0)), 0);
    let saldoUSD = 0, saldoARS = 0;
    (memStore.cuentas_caja || []).forEach(c => {
      const s = parseFloat(c.saldo_actual) || 0;
      if (c.moneda === "USD" || c.moneda === "USDT") saldoUSD += s;
      else if (c.moneda === "ARS") saldoARS += s;
    });
    const totalLiquido = saldoUSD + (saldoARS / dolar);
    const ventas = await recomponerGananciaRegalos(memStore.ventas || []);
    const gananciaMes = ventas.reduce((a, v) => a + (parseFloat(v.ganancia_usd) || 0), 0);
    const totalVendidos = ventas.length;
    const promedio = totalVendidos > 0 ? gananciaMes / totalVendidos : 0;

    const deudores = (memStore.deudas_deudores || []).filter(d => d.tipo === "DEUDOR" && d.estado !== "Cancelado");
    const totalDeudoresUSD = deudores.reduce((a, d) => a + (parseFloat(d.monto_pendiente) || 0), 0);

    const deudas = (memStore.deudas_deudores || []).filter(d => d.tipo === "DEUDA" && d.estado !== "Cancelado");
    const totalDeudasUSD = deudas.reduce((a, d) => a + (parseFloat(d.monto_pendiente) || 0), 0);

    const ccProv = (memStore.entidades_cc || [])
      .filter(e => e.tipo === "PROVEEDOR")
      .reduce((a, e) => a + (parseFloat(e.saldo_adeudado) || 0), 0);

    res.json({
      kpis: {
        capitalTotalUSD: stockDisp + stockAcc + totalLiquido,
        stockDispositivosUSD: stockDisp,
        stockAccesoriosUSD: stockAcc,
        totalLiquidoUSD: totalLiquido,
        saldoCajasUSD: saldoUSD,
        saldoCajasARS: saldoARS,
        gananciaMesUSD: gananciaMes,
        totalEquiposVendidos: totalVendidos,
        promedioGananciaPorTel: promedio,
        totalDeudoresUSD: totalDeudoresUSD,
        totalDeudasUSD: totalDeudasUSD,
        saldoCCProveedores: ccProv,
        dolarActual: dolar
      },
      equiposEnStock: (memStore.dispositivos || []).filter(d => d.estado === "En Stock").length,
      reparacionesActivas: (memStore.reparaciones || []).filter(r => r.estado !== "Entregado y Cobrado").length,
      ultimasVentas: ventas.slice(-5).reverse(),
      ultimosMovimientos: (memStore.caja_movimientos || []).slice(-6).reverse()
    });
  }
});

app.get("/api/dispositivos", async (req, res) => {
  try {
    const r = await q("SELECT * FROM dispositivos ORDER BY id");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.dispositivos || []);
  } catch (e) {
    res.json(memStore.dispositivos || []);
  }
});

app.post("/api/dispositivos", async (req, res) => {
  const b = req.body;
  const newDisp = {
    id: Date.now(),
    modelo: b.modelo,
    color: b.color || "",
    capacidad: b.capacidad || "",
    bateria: b.bateria || null,
    imei: b.imei || "",
    condicion: b.condicion || "Usado",
    costo_usd: parseFloat(b.costo_usd) || 0,
    costo_pesos: parseFloat(b.costo_pesos) || 0,
    costo_reparacion_usd: parseFloat(b.costo_reparacion_usd) || 0,
    precio_sugerido_usd: parseFloat(b.precio_sugerido_usd) || 0,
    precio_sugerido_pesos: parseFloat(b.precio_sugerido_pesos) || 0,
    proveedor: b.proveedor || "",
    estado: b.estado || "En Stock",
    cliente_senia: b.cliente_senia || "",
    monto_senia: parseFloat(b.monto_senia) || 0,
    detalles: b.detalles || ""
  };
  memStore.dispositivos = [newDisp, ...(memStore.dispositivos || [])];

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const cols = "modelo, color, capacidad, bateria, imei, condicion, costo_usd, costo_pesos, costo_reparacion_usd, precio_sugerido_usd, precio_sugerido_pesos, proveedor, estado, cliente_senia, monto_senia, moneda_senia, detalles";
        const vals = [newDisp.modelo, newDisp.color, newDisp.capacidad, newDisp.bateria, newDisp.imei, newDisp.condicion, newDisp.costo_usd, newDisp.costo_pesos, newDisp.costo_reparacion_usd, newDisp.precio_sugerido_usd, newDisp.precio_sugerido_pesos, newDisp.proveedor || "", newDisp.estado, newDisp.cliente_senia || "", newDisp.monto_senia, "USD", newDisp.detalles || ""];
        const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
        const r = await q(`INSERT INTO dispositivos (${cols}) VALUES (${ph}) RETURNING id`, vals);
        if (r.rows && r.rows[0]) newDisp.id = r.rows[0].id;
      } catch (e) {
        console.warn("PG insert dispositivo:", e.message);
      }
    }
  }

  res.json({ success: true, dispositivo: newDisp });
});

app.put("/api/dispositivos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;
  const idx = (memStore.dispositivos || []).findIndex(d => d.id === id);
  if (idx !== -1) {
    memStore.dispositivos[idx] = { ...memStore.dispositivos[idx], ...b };
  }

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const d = memStore.dispositivos[idx] || { ...b, id };
        const colsUpdate = "modelo=$1, color=$2, capacidad=$3, bateria=$4, imei=$5, condicion=$6, costo_usd=$7, costo_pesos=$8, costo_reparacion_usd=$9, precio_sugerido_usd=$10, precio_sugerido_pesos=$11, proveedor=$12, estado=$13, cliente_senia=$14, monto_senia=$15, detalles=$16, updated_at=CURRENT_TIMESTAMP";
        const valsUpdate = [d.modelo, d.color || "", d.capacidad || "", d.bateria, d.imei || "", d.condicion || "Usado", parseFloat(d.costo_usd) || 0, parseFloat(d.costo_pesos) || 0, parseFloat(d.costo_reparacion_usd) || 0, parseFloat(d.precio_sugerido_usd) || 0, parseFloat(d.precio_sugerido_pesos) || 0, d.proveedor || "", d.estado || "En Stock", d.cliente_senia || "", parseFloat(d.monto_senia) || 0, d.detalles || ""];
        const upd = await q(`UPDATE dispositivos SET ${colsUpdate} WHERE id=${id}`, valsUpdate);
        if (upd.rowCount === 0) {
          const cols = "id, modelo, color, capacidad, bateria, imei, condicion, costo_usd, costo_pesos, costo_reparacion_usd, precio_sugerido_usd, precio_sugerido_pesos, proveedor, estado, cliente_senia, monto_senia, moneda_senia, detalles";
          const vals = [id, ...valsUpdate];
          const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
          await q(`INSERT INTO dispositivos (${cols}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`, vals).catch(() => {});
        }
      } catch (e) {
        console.warn("PG update dispositivo:", e.message);
      }
    }
  }

  return res.json({ success: true, dispositivo: memStore.dispositivos[idx] });
});

app.delete("/api/dispositivos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  memStore.dispositivos = (memStore.dispositivos || []).filter(d => d.id !== id);
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      await q("DELETE FROM dispositivos WHERE id=$1", [id]).catch(() => {});
    }
  }
  res.json({ success: true });
});

app.get("/api/ventas", async (req, res) => {
  try {
    const r = await q("SELECT * FROM ventas ORDER BY id DESC");
    if (r.rows && r.rows.length > 0) {
      const pgIds = new Set(r.rows.map(row => String(row.id)));
      const extra = (memStore.ventas || []).filter(v => !pgIds.has(String(v.id)));
      const merged = await recomponerGananciaRegalos([...r.rows.map(numericize), ...extra]);
      return res.json(merged);
    }
    return res.json(await recomponerGananciaRegalos(memStore.ventas || []));
  } catch (e) {
    res.json(await recomponerGananciaRegalos(memStore.ventas || []));
  }
});

app.post("/api/ventas", async (req, res) => {
  const b = req.body;
  const dolar = parseFloat(b.cotizacion_dolar) || 1480;
  const precioUSD = parseFloat(b.precio_venta_usd) || 0;
  const precioPesos = parseFloat(b.precio_venta_pesos) || (precioUSD * dolar);
  const costoUSD = parseFloat(b.costo_total_usd) || 0;
  const costoRep = parseFloat(b.costo_reparacion) || 0;
  const desc = parseFloat(b.descuento_monto) || 0;
  const ganUSD = precioUSD - costoUSD - costoRep - desc;
  const comisionPesos = parseFloat(b.comision_vendedor_pesos) || 0;
  const comisionUSD = comisionPesos > 0 ? comisionPesos / dolar : (parseFloat(b.comision_vendedor_usd) || 0);

  const newVenta = {
    id: Date.now(),
    fecha: b.fecha || new Date().toISOString(),
    dispositivo_id: b.dispositivo_id || null,
    item_detalle: b.item_detalle || "",
    cliente_nombre: b.cliente_nombre || "Cliente Final",
    cliente_contacto: b.cliente_contacto || "",
    vendedor_nombre: b.vendedor_nombre || "NP",
    precio_venta_usd: precioUSD,
    precio_venta_pesos: precioPesos,
    cotizacion_dolar: dolar,
    costo_total_usd: costoUSD,
    costo_total_pesos: costoUSD * dolar,
    costo_reparacion: costoRep,
    descuentos_regalos_detalle: b.descuentos_regalos_detalle || "",
    descuento_monto: desc,
    regalo_componentes: b.regalo_componentes || null,
    regalo_costo_snapshot_usd: parseFloat(b.regalo_costo_snapshot_usd) || 0,
    ganancia_usd: ganUSD,
    ganancia_pesos: ganUSD * dolar,
    comision_vendedor_pesos: comisionPesos,
    comision_vendedor_usd: comisionUSD,
    caja_destino: b.caja_destino || "Caja Dólares",
    metodo_pago: b.metodo_pago || "Efectivo USD",
    desglose_pago: b.desglose_pago || null
  };

  memStore.ventas = [newVenta, ...(memStore.ventas || [])];

  if (b.dispositivo_id) {
    const dIdx = (memStore.dispositivos || []).findIndex(d => d.id === parseInt(b.dispositivo_id));
    if (dIdx !== -1) memStore.dispositivos[dIdx].estado = "Vendido";
  }

  // Persistir en Postgres cuando está disponible (durabilidad + consistencia entre instancias de Vercel)
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      await persistVentaPG(newVenta, b.impactar_caja).catch(e => console.warn("PG insert venta:", e.message));
    }
  }

  if (b.impactar_caja !== false) {
    aplicarDesgloseMem(newVenta, legsDeVenta(newVenta), `VENTA-#${newVenta.id}`);
  }

  res.json({ success: true, venta: newVenta });
});

app.put("/api/ventas/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;

  // Fuente de verdad: Postgres primero (evita 404 por instancia serverless con memStore frío)
  let old = null;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("SELECT * FROM ventas WHERE id=$1", [id]).catch(() => null);
        if (r && r.rows && r.rows.length > 0) old = numericize(r.rows[0]);
      } catch (e) {
        console.warn("PUT ventas -> PG select error:", e.message);
      }
    }
  }
  if (!old) {
    const idx = (memStore.ventas || []).findIndex(v => v.id === id);
    if (idx !== -1) old = memStore.ventas[idx];
  }
  if (!old) return res.status(404).json({ error: "Venta no encontrada" });

  const dolar = parseFloat(b.cotizacion_dolar) || parseFloat(memStore.configuracion?.dolar_blue || 1480);
  const precioUSD = parseFloat(b.precio_venta_usd) || (parseFloat(b.precio_venta_pesos) / dolar) || 0;
  const precioPesos = parseFloat(b.precio_venta_pesos) || (precioUSD * dolar) || 0;
  const costoUSD = parseFloat(b.costo_total_usd) || 0;
  const costoRep = parseFloat(b.costo_reparacion) || 0;
  const desc = parseFloat(b.descuento_monto) || 0;
  const ganUSD = precioUSD - costoUSD - costoRep - desc;
  const comisionPesos = parseFloat(b.comision_vendedor_pesos) || 0;
  const comisionUSD = comisionPesos > 0 ? comisionPesos / dolar : (parseFloat(b.comision_vendedor_usd) || 0);

  // Revertir impacto a caja de la venta original
  const refVenta = `VENTA-#${old.id}`;
  revertirDesgloseMem(refVenta, (m) =>
    m.categoria === "Venta" && m.cuenta_nombre === old.caja_destino && m.concepto && m.concepto.includes(old.item_detalle)
  );

  const updated = {
    ...old,
    item_detalle: b.item_detalle ?? old.item_detalle,
    cliente_nombre: b.cliente_nombre ?? old.cliente_nombre,
    cliente_contacto: b.cliente_contacto ?? old.cliente_contacto,
    vendedor_nombre: b.vendedor_nombre ?? old.vendedor_nombre,
    precio_venta_usd: precioUSD,
    precio_venta_pesos: precioPesos,
    cotizacion_dolar: dolar,
    costo_total_usd: costoUSD,
    costo_total_pesos: costoUSD * dolar,
    costo_reparacion: costoRep,
    descuentos_regalos_detalle: b.descuentos_regalos_detalle ?? old.descuentos_regalos_detalle,
    descuento_monto: desc,
    regalo_componentes: b.regalo_componentes !== undefined ? b.regalo_componentes : (old.regalo_componentes || null),
    regalo_costo_snapshot_usd: b.regalo_costo_snapshot_usd !== undefined ? parseFloat(b.regalo_costo_snapshot_usd) || 0 : (parseFloat(old.regalo_costo_snapshot_usd) || 0),
    ganancia_usd: ganUSD,
    ganancia_pesos: ganUSD * dolar,
    comision_vendedor_pesos: comisionPesos,
    comision_vendedor_usd: comisionUSD,
    comision_se_pago: b.comision_se_pago === undefined ? (old.comision_se_pago || false) : (b.comision_se_pago ? true : false),
    entrega: b.entrega === undefined ? (old.entrega || false) : (b.entrega ? true : false),
    caja_destino: b.caja_destino ?? old.caja_destino,
    metodo_pago: b.metodo_pago ?? old.metodo_pago,
    desglose_pago: b.desglose_pago !== undefined ? b.desglose_pago : old.desglose_pago,
    observaciones: b.observaciones ?? old.observaciones,
    updated_at: new Date().toISOString()
  };
  const idx = (memStore.ventas || []).findIndex(v => v.id === id);
  if (idx !== -1) memStore.ventas[idx] = updated;

  // Aplicar nuevo impacto a caja
  if (b.impactar_caja !== false) {
    aplicarDesgloseMem(updated, legsDeVenta(updated), refVenta);
  }

  // Persistir la edición en Postgres cuando está disponible
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        // 1) Revertir TODOS los movimientos de caja originales en PG (una venta puede tener N patas)
        await revertirDesglosePG("VENTA-#" + id, old.item_detalle, old.caja_destino);
        // 2) Actualizar la venta en PG (o insertarla si no existía)
        const upd = await q(
          `UPDATE ventas SET item_detalle=$1, cliente_nombre=$2, cliente_contacto=$3, vendedor_nombre=$4, precio_venta_usd=$5, precio_venta_pesos=$6, cotizacion_dolar=$7, costo_total_usd=$8, costo_total_pesos=$9, costo_reparacion=$10, descuentos_regalos_detalle=$11, descuento_monto=$12, regalo_componentes=$13, regalo_costo_snapshot_usd=$14, ganancia_usd=$15, ganancia_pesos=$16, comision_vendedor_pesos=$17, comision_vendedor_usd=$18, comision_se_pago=$19, entrega=$20, metodo_pago=$21, caja_destino=$22, desglose_pago=$23, observaciones=$24 WHERE id=$25`,
          [updated.item_detalle, updated.cliente_nombre, updated.cliente_contacto, updated.vendedor_nombre, updated.precio_venta_usd, updated.precio_venta_pesos, updated.cotizacion_dolar, updated.costo_total_usd, updated.costo_total_pesos, updated.costo_reparacion, updated.descuentos_regalos_detalle || "", updated.descuento_monto, updated.regalo_componentes || null, updated.regalo_costo_snapshot_usd || 0, updated.ganancia_usd, updated.ganancia_pesos, updated.comision_vendedor_pesos, updated.comision_vendedor_usd, updated.comision_se_pago || false, updated.entrega || false, updated.metodo_pago || "Efectivo USD", updated.caja_destino || "Caja Dólares", updated.desglose_pago || null, updated.observaciones || "", parseInt(id)]
        );
        if (upd.rowCount === 0) {
          await persistVentaPG(updated, b.impactar_caja);
        } else if (b.impactar_caja !== false) {
          await aplicarDesglosePG(updated, legsDeVenta(updated), "VENTA-#" + id);
        }
      } catch (e) {
        console.warn("PUT ventas -> PG error:", e.message);
      }
    }
  }

  res.json({ success: true, venta: updated });
});

// Elimina una venta revirtiendo su impacto: el dispositivo vuelve a stock y el dinero sale de la caja.
app.delete("/api/ventas/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  // Fuente de verdad: Postgres primero (evita 404 por instancia serverless con memStore frío)
  let old = null;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("SELECT * FROM ventas WHERE id=$1", [id]).catch(() => null);
        if (r && r.rows && r.rows.length > 0) { old = numericize(r.rows[0]); }
      } catch (e) {
        console.warn("DELETE ventas -> PG select error:", e.message);
      }
    }
  }
  if (!old) {
    const idx = (memStore.ventas || []).findIndex(v => v.id === id);
    old = idx !== -1 ? memStore.ventas[idx] : null;
  }
  if (!old) return res.status(404).json({ error: "Venta no encontrada" });

  const refVenta = `VENTA-#${id}`;

  // Revertir dinero en caja y stock en (memStore), por consistencia de la instancia
  revertirDesgloseMem(refVenta, (m) =>
    m.categoria === "Venta" && m.cuenta_nombre === old.caja_destino && m.concepto && m.concepto.includes(old.item_detalle)
  );
  if (old.dispositivo_id) {
    const dIdx = (memStore.dispositivos || []).findIndex(d => d.id === parseInt(old.dispositivo_id));
    if (dIdx !== -1 && memStore.dispositivos[dIdx].estado === "Vendido") memStore.dispositivos[dIdx].estado = "En Stock";
  }
  const memIdx = (memStore.ventas || []).findIndex(v => v.id === id);
  if (memIdx !== -1) memStore.ventas.splice(memIdx, 1);

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        // Revertir TODOS los movimientos de caja (N patas) y luego borrar
        await revertirDesglosePG(refVenta, old.item_detalle, old.caja_destino);
        if (old.dispositivo_id) {
          await q("UPDATE dispositivos SET estado='En Stock' WHERE id=$1 AND estado='Vendido'", [parseInt(old.dispositivo_id)]).catch(() => {});
        }
        await q("DELETE FROM ventas WHERE id=$1", [id]).catch(() => {});
      } catch (e) {
        console.warn("DELETE ventas -> PG error:", e.message);
      }
    }
  }

  res.json({ success: true, id });
});

app.get("/api/cajas", async (req, res) => {
  try {
    const r = await q("SELECT * FROM cuentas_caja ORDER BY id");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.cuentas_caja || []);
  } catch (e) {
    res.json(memStore.cuentas_caja || []);
  }
});

app.get("/api/cajas/movimientos", async (req, res) => {
  try {
    const r = await q("SELECT * FROM caja_movimientos ORDER BY id DESC");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.caja_movimientos || []);
  } catch (e) {
    res.json(memStore.caja_movimientos || []);
  }
});

app.post("/api/cajas/movimientos", async (req, res) => {
  const b = req.body;
  const cIdx = (memStore.cuentas_caja || []).findIndex(c => c.id === parseInt(b.cuenta_id) || c.nombre === b.cuenta_nombre);
  if (cIdx === -1) return res.status(400).json({ error: "Caja no encontrada" });
  const c = memStore.cuentas_caja[cIdx];
  const monto = parseFloat(b.monto) || 0;
  if (b.tipo_movimiento === "ENTRADA") c.saldo_actual = (parseFloat(c.saldo_actual) || 0) + monto;
  else if (b.tipo_movimiento === "SALIDA") c.saldo_actual = (parseFloat(c.saldo_actual) || 0) - monto;

  const newMov = {
    id: Date.now(),
    fecha: b.fecha || new Date().toISOString(),
    cuenta_id: c.id,
    cuenta_nombre: c.nombre,
    tipo_movimiento: b.tipo_movimiento,
    categoria: b.categoria || "Varios",
    concepto: b.concepto || "",
    monto: monto,
    moneda: c.moneda,
    cotizacion: parseFloat(b.cotizacion) || 1,
    persona_asociada: b.persona_asociada || "",
    comprobante_ref: b.comprobante_ref || ""
  };
  memStore.caja_movimientos = [newMov, ...(memStore.caja_movimientos || [])];

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const cols = "fecha, cuenta_id, cuenta_nombre, tipo_movimiento, categoria, concepto, monto, moneda, cotizacion, persona_asociada, comprobante_ref";
        const vals = [newMov.fecha, newMov.cuenta_id, newMov.cuenta_nombre, newMov.tipo_movimiento, newMov.categoria, newMov.concepto, newMov.monto, newMov.moneda, newMov.cotizacion, newMov.persona_asociada, newMov.comprobante_ref || ""];
        const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
        const r = await q(`INSERT INTO caja_movimientos (${cols}) VALUES (${ph}) RETURNING id`, vals);
        if (r.rows && r.rows[0]) newMov.id = r.rows[0].id;
        const delta = b.tipo_movimiento === "ENTRADA" ? monto : (b.tipo_movimiento === "SALIDA" ? -monto : 0);
        if (delta !== 0) {
          await q("UPDATE cuentas_caja SET saldo_actual = COALESCE(saldo_actual, 0) + $1 WHERE id=$2", [delta, c.id]).catch(() => {});
        }
      } catch (e) {
        console.warn("PG insert caja movimiento:", e.message);
      }
    }
  }

  res.json({ success: true, movimiento: newMov, cuenta_actualizada: c });
});

app.get("/api/cajas/movimientos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  let mov = null;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("SELECT * FROM caja_movimientos WHERE id=$1", [id]).catch(() => null);
        if (r && r.rows && r.rows.length > 0) mov = numericize(r.rows[0]);
      } catch (e) {
        console.warn("GET caja movimiento -> PG select error:", e.message);
      }
    }
  }
  if (!mov) {
    mov = (memStore.caja_movimientos || []).find(m => m.id === id) || null;
  }
  if (!mov) return res.status(404).json({ error: "Movimiento no encontrado" });
  res.json(mov);
});

app.put("/api/cajas/movimientos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;

  // Fuente de verdad: Postgres primero
  let mov = null;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("SELECT * FROM caja_movimientos WHERE id=$1", [id]).catch(() => null);
        if (r && r.rows && r.rows.length > 0) mov = numericize(r.rows[0]);
      } catch (e) {
        console.warn("PUT caja movimiento -> PG select error:", e.message);
      }
    }
  }
  if (!mov) {
    mov = (memStore.caja_movimientos || []).find(m => m.id === id) || null;
  }
  if (!mov) return res.status(404).json({ error: "Movimiento no encontrado" });

  const cuentaId = parseInt(b.cuenta_id) || mov.cuenta_id;
  const cuenta = (memStore.cuentas_caja || []).find(c => c.id === cuentaId);
  const tipo = b.tipo_movimiento || mov.tipo_movimiento;
  const monto = (b.monto !== undefined && b.monto !== "") ? (parseFloat(b.monto) || 0) : (parseFloat(mov.monto) || 0);

  // Revertir el impacto del movimiento original sobre el saldo de la caja (si cambió o la caja es la misma)
  const deltaOriginal = mov.tipo_movimiento === "ENTRADA" ? (parseFloat(mov.monto) || 0) : (mov.tipo_movimiento === "SALIDA" ? -(parseFloat(mov.monto) || 0) : 0);
  const deltaNuevo = tipo === "ENTRADA" ? monto : (tipo === "SALIDA" ? -monto : 0);

  const updated = {
    ...mov,
    fecha: (b.fecha !== undefined && b.fecha !== "") ? b.fecha : (b.fecha === "" ? null : mov.fecha),
    cuenta_id: cuentaId,
    cuenta_nombre: (b.cuenta_nombre || (cuenta ? cuenta.nombre : mov.cuenta_nombre)),
    tipo_movimiento: tipo,
    categoria: b.categoria !== undefined ? b.categoria : mov.categoria,
    concepto: b.concepto !== undefined ? b.concepto : mov.concepto,
    monto: monto,
    moneda: b.moneda || (cuenta ? cuenta.moneda : mov.moneda),
    cotizacion: (b.cotizacion !== undefined && b.cotizacion !== "") ? (parseFloat(b.cotizacion) || 1) : (parseFloat(mov.cotizacion) || 1),
    persona_asociada: b.persona_asociada !== undefined ? b.persona_asociada : mov.persona_asociada,
    comprobante_ref: b.comprobante_ref !== undefined ? b.comprobante_ref : mov.comprobante_ref
  };

  const memIdx = (memStore.caja_movimientos || []).findIndex(m => m.id === id);
  if (memIdx !== -1) memStore.caja_movimientos[memIdx] = updated;

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        // Ajustar el saldo de la caja correspondiente al movimiento
        if (cuenta) {
          const ajuste = deltaNuevo - deltaOriginal;
          if (mov.cuenta_id === cuentaId && ajuste !== 0) {
            await q("UPDATE cuentas_caja SET saldo_actual = COALESCE(saldo_actual, 0) + $1 WHERE id=$2", [ajuste, cuentaId]).catch(() => {});
          }
        }
        await q("UPDATE caja_movimientos SET fecha=$1, cuenta_id=$2, cuenta_nombre=$3, tipo_movimiento=$4, categoria=$5, concepto=$6, monto=$7, moneda=$8, cotizacion=$9, persona_asociada=$10, comprobante_ref=$11 WHERE id=$12",
          [updated.fecha, updated.cuenta_id, updated.cuenta_nombre, updated.tipo_movimiento, updated.categoria || "Varios", updated.concepto || "", updated.monto, updated.moneda, updated.cotizacion, updated.persona_asociada || "", updated.comprobante_ref || "", id]).catch(() => {});
      } catch (e) {
        console.warn("PUT caja movimiento -> PG error:", e.message);
      }
    }
  }

  res.json({ success: true, movimiento: updated });
});

app.delete("/api/cajas/movimientos/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  // Fuente de verdad: Postgres primero
  let mov = null;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("SELECT * FROM caja_movimientos WHERE id=$1", [id]).catch(() => null);
        if (r && r.rows && r.rows.length > 0) mov = numericize(r.rows[0]);
      } catch (e) {
        console.warn("DELETE caja movimiento -> PG select error:", e.message);
      }
    }
  }
  if (!mov) {
    mov = (memStore.caja_movimientos || []).find(m => m.id === id) || null;
  }
  if (!mov) return res.status(404).json({ error: "Movimiento no encontrado" });

  const delta = mov.tipo_movimiento === "ENTRADA" ? (parseFloat(mov.monto) || 0) : (mov.tipo_movimiento === "SALIDA" ? -(parseFloat(mov.monto) || 0) : 0);

  const memIdx = (memStore.caja_movimientos || []).findIndex(m => m.id === id);
  if (memIdx !== -1) memStore.caja_movimientos.splice(memIdx, 1);
  const cMemIdx = (memStore.cuentas_caja || []).findIndex(c => c.id === mov.cuenta_id);
  if (cMemIdx !== -1 && delta !== 0) {
    memStore.cuentas_caja[cMemIdx].saldo_actual = (parseFloat(memStore.cuentas_caja[cMemIdx].saldo_actual) || 0) - delta;
  }

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        if (delta !== 0) {
          await q("UPDATE cuentas_caja SET saldo_actual = COALESCE(saldo_actual, 0) - $1 WHERE id=$2", [delta, mov.cuenta_id]).catch(() => {});
        }
        await q("DELETE FROM caja_movimientos WHERE id=$1", [id]).catch(() => {});
      } catch (e) {
        console.warn("DELETE caja movimiento -> PG error:", e.message);
      }
    }
  }

  res.json({ success: true, id });
});

app.get("/api/cuentas-corrientes", async (req, res) => {
  try {
    const r = await q("SELECT * FROM entidades_cc ORDER BY id");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.entidades_cc || []);
  } catch (e) {
    res.json(memStore.entidades_cc || []);
  }
});

app.get("/api/cuentas-corrientes/:id/movimientos", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const r = await q("SELECT * FROM movimientos_cc WHERE entidad_id=$1 ORDER BY id DESC", [id]);
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json((memStore.movimientos_cc || []).filter(m => m.entidad_id === id));
  } catch (e) {
    res.json((memStore.movimientos_cc || []).filter(m => m.entidad_id === id));
  }
});

app.post("/api/cuentas-corrientes/:id/movimientos", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;

  // Fuente de verdad: Postgres primero (evita 404 por instancia serverless con memStore frío)
  let e = null;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("SELECT * FROM entidades_cc WHERE id=$1", [id]).catch(() => null);
        if (r && r.rows && r.rows.length > 0) e = numericize(r.rows[0]);
      } catch (err) {
        console.warn("POST movimiento CC -> PG select:", err.message);
      }
    }
  }
  if (!e) {
    const eIdx = (memStore.entidades_cc || []).findIndex(ent => ent.id === id);
    if (eIdx !== -1) e = memStore.entidades_cc[eIdx];
  }
  if (!e) return res.status(404).json({ error: "Entidad no encontrada" });

  const monto = parseFloat(b.monto) || 0;
  let nuevoSaldo = parseFloat(e.saldo_adeudado) || 0;
  if (b.tipo === "ENTREGA_EQUIPO" || b.tipo === "SERVICIO_TECNICO") nuevoSaldo += monto;
  else if (b.tipo === "PAGO_REALIZADO" || b.tipo === "COBRO_RECIBIDO") nuevoSaldo -= monto;

  e.saldo_adeudado = nuevoSaldo;
  const newMov = {
    id: Date.now(),
    entidad_id: e.id,
    fecha: b.fecha || new Date().toISOString(),
    tipo: b.tipo,
    concepto: b.concepto,
    monto: monto,
    moneda: e.moneda_principal,
    saldo_resultante: nuevoSaldo,
    observaciones: b.observaciones || ""
  };
  const eIdxMem = (memStore.entidades_cc || []).findIndex(ent => ent.id === id);
  if (eIdxMem !== -1) memStore.entidades_cc[eIdxMem].saldo_adeudado = nuevoSaldo;
  memStore.movimientos_cc = [newMov, ...(memStore.movimientos_cc || [])];

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const cols = "entidad_id, fecha, tipo, concepto, monto, moneda, saldo_resultante, observaciones";
        const vals = [e.id, newMov.fecha, newMov.tipo, newMov.concepto, monto, newMov.moneda, nuevoSaldo, newMov.observaciones || ""];
        const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
        const r = await q(`INSERT INTO movimientos_cc (${cols}) VALUES (${ph}) RETURNING id`, vals);
        if (r.rows && r.rows[0]) newMov.id = r.rows[0].id;
        await q("UPDATE entidades_cc SET saldo_adeudado=$1 WHERE id=$2", [nuevoSaldo, e.id]).catch(() => {});
      } catch (err) {
        console.warn("PG insert movimiento CC:", err.message);
      }
    }
  }

  res.json({ success: true, movimiento: newMov, entidad_actualizada: e });
});

app.put("/api/cuentas-corrientes/:id/movimientos/:movId", async (req, res) => {
  const entidadId = parseInt(req.params.id);
  const movId = parseInt(req.params.movId);
  const b = req.body;

  // Fuente de verdad: Postgres primero
  let mov = null;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("SELECT * FROM movimientos_cc WHERE id=$1 AND entidad_id=$2", [movId, entidadId]).catch(() => null);
        if (r && r.rows && r.rows.length > 0) mov = numericize(r.rows[0]);
      } catch (err) {
        console.warn("PUT movimiento CC -> PG select:", err.message);
      }
    }
  }
  if (!mov) {
    mov = (memStore.movimientos_cc || []).find(m => m.id === movId && m.entidad_id === entidadId) || null;
  }
  if (!mov) return res.status(404).json({ error: "Movimiento no encontrado" });

  const esCarga = (t) => t === "ENTREGA_EQUIPO" || t === "SERVICIO_TECNICO";
  const nuevoTipo = b.tipo || mov.tipo;
  const nuevoMonto = (b.monto !== undefined && b.monto !== "") ? (parseFloat(b.monto) || 0) : (parseFloat(mov.monto) || 0);

  const updated = {
    ...mov,
    fecha: (b.fecha !== undefined && b.fecha !== "") ? b.fecha : (b.fecha === "" ? null: mov.fecha),
    tipo: nuevoTipo,
    concepto: b.concepto !== undefined ? b.concepto : mov.concepto,
    monto: nuevoMonto,
    moneda: b.moneda || mov.moneda || "USD"
  };

  // Recalcular el saldo_resultante de esta fila a partir del movimiento anterior (por id ascendente).
  // No se modifica el saldo_adeudado de la entidad a propósito.
  let prevSaldo = 0;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("SELECT saldo_resultante FROM movimientos_cc WHERE entidad_id=$1 AND id<$2 ORDER BY id DESC LIMIT 1", [entidadId, movId]).catch(() => null);
        if (r && r.rows && r.rows[0]) prevSaldo = parseFloat(r.rows[0].saldo_resultante) || 0;
      } catch (err) {
        console.warn("PUT movimiento CC -> PG prev:", err.message);
      }
    }
  }
  if (!prevSaldo) {
    const prev = (memStore.movimientos_cc || []).filter(m => m.entidad_id === entidadId && m.id < movId).sort((a, c) => c.id - a.id)[0];
    if (prev) prevSaldo = parseFloat(prev.saldo_resultante) || 0;
  }
  updated.saldo_resultante = prevSaldo + (esCarga(nuevoTipo) ? nuevoMonto : -nuevoMonto);

  const memIdx = (memStore.movimientos_cc || []).findIndex(m => m.id === movId && m.entidad_id === entidadId);
  if (memIdx !== -1) memStore.movimientos_cc[memIdx] = updated;

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        await q("UPDATE movimientos_cc SET fecha=$1, tipo=$2, concepto=$3, monto=$4, moneda=$5, saldo_resultante=$6 WHERE id=$7",
          [updated.fecha, updated.tipo, updated.concepto || "", updated.monto, updated.moneda, updated.saldo_resultante, movId]).catch(() => {});
      } catch (err) {
        console.warn("PUT movimiento CC -> PG error:", err.message);
      }
    }
  }

  res.json({ success: true, movimiento: updated });
});

app.post("/api/cuentas-corrientes", async (req, res) => {
  const b = req.body;
  const nueva = {
    id: Date.now(),
    nombre: b.nombre,
    tipo: b.tipo || "PROVEEDOR",
    contacto: b.contacto || "",
    moneda_principal: b.moneda_principal || "USD",
    saldo_adeudado: parseFloat(b.saldo_inicial) || 0,
    notas: b.notas || "",
    created_at: new Date().toISOString()
  };
  memStore.entidades_cc = [nueva, ...(memStore.entidades_cc || [])];
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("INSERT INTO entidades_cc (nombre, tipo, contacto, moneda_principal, saldo_adeudado, notas) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
          [nueva.nombre, nueva.tipo, nueva.contacto || "", nueva.moneda_principal, nueva.saldo_adeudado, nueva.notas || ""]);
        if (r.rows && r.rows[0]) nueva.id = r.rows[0].id;
      } catch (err) {
        console.warn("PG insert entidad CC:", err.message);
      }
    }
  }
  res.json({ success: true, entidad: nueva });
});

app.put("/api/cuentas-corrientes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;

  // Fuente de verdad: Postgres primero (misma estrategia que ventas)
  let ent = null;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("SELECT * FROM entidades_cc WHERE id=$1", [id]).catch(() => null);
        if (r && r.rows && r.rows.length > 0) ent = numericize(r.rows[0]);
      } catch (e) {
        console.warn("PUT cuentas-corrientes -> PG select error:", e.message);
      }
    }
  }
  if (!ent) {
    const idx = (memStore.entidades_cc || []).findIndex(e => e.id === id);
    if (idx !== -1) ent = memStore.entidades_cc[idx];
  }
  if (!ent) return res.status(404).json({ error: "Cuenta corriente no encontrada" });

  const updated = {
    ...ent,
    nombre: b.nombre ?? ent.nombre,
    tipo: b.tipo ?? ent.tipo,
    contacto: b.contacto !== undefined ? b.contacto : (ent.contacto || ""),
    moneda_principal: b.moneda_principal ?? ent.moneda_principal,
    saldo_adeudado: b.saldo_adeudado !== undefined ? (parseFloat(b.saldo_adeudado) || 0) : ent.saldo_adeudado,
    notas: b.notas !== undefined ? b.notas : (ent.notas || ""),
    updated_at: new Date().toISOString()
  };

  const memIdx = (memStore.entidades_cc || []).findIndex(e => e.id === id);
  if (memIdx !== -1) memStore.entidades_cc[memIdx] = updated;

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        await q("UPDATE entidades_cc SET nombre=$1, tipo=$2, contacto=$3, moneda_principal=$4, saldo_adeudado=$5, notas=$6 WHERE id=$7",
          [updated.nombre, updated.tipo, updated.contacto || "", updated.moneda_principal, updated.saldo_adeudado, updated.notas || "", id]).catch(() => {});
      } catch (e) {
        console.warn("PUT cuentas-corrientes -> PG error:", e.message);
      }
    }
  }

  res.json({ success: true, entidad: updated });
});

app.delete("/api/cuentas-corrientes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  let found = false;
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = await q("DELETE FROM entidades_cc WHERE id=$1 RETURNING id", [id]);
        found = (r.rowCount || 0) > 0;
      } catch (e) {
        console.warn("DELETE cuentas-corrientes -> PG error:", e.message);
      }
    }
  }
  const memIdx = (memStore.entidades_cc || []).findIndex(e => e.id === id);
  if (memIdx !== -1) {
    memStore.entidades_cc.splice(memIdx, 1);
    memStore.movimientos_cc = (memStore.movimientos_cc || []).filter(m => m.entidad_id !== id);
    found = true;
  }
  if (!found) return res.status(404).json({ error: "Cuenta corriente no encontrada" });
  res.json({ success: true, id });
});

app.get("/api/inventario", async (req, res) => {
  try {
    const r = await q("SELECT * FROM inventario_items ORDER BY id");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.inventario_items || []);
  } catch (e) {
    res.json(memStore.inventario_items || []);
  }
});

app.post("/api/inventario", async (req, res) => {
  const b = req.body;
  const newItem = {
    id: Date.now(),
    categoria: b.categoria || "Accesorio",
    nombre: b.nombre,
    stock_actual: parseInt(b.stock_actual) || 0,
    stock_minimo: parseInt(b.stock_minimo) || 2,
    costo_pesos: parseFloat(b.costo_pesos) || 0,
    costo_usd: parseFloat(b.costo_usd) || 0,
    precio_venta_pesos: parseFloat(b.precio_venta_pesos) || 0,
    precio_venta_usd: parseFloat(b.precio_venta_usd) || 0,
    ubicacion: b.ubicacion || "Local"
  };
  memStore.inventario_items = [newItem, ...(memStore.inventario_items || [])];

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const cols = "categoria, nombre, stock_actual, stock_minimo, costo_pesos, costo_usd, precio_venta_pesos, precio_venta_usd, ubicacion";
        const vals = [newItem.categoria, newItem.nombre, newItem.stock_actual, newItem.stock_minimo, newItem.costo_pesos, newItem.costo_usd, newItem.precio_venta_pesos, newItem.precio_venta_usd, newItem.ubicacion];
        const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
        const r = await q(`INSERT INTO inventario_items (${cols}) VALUES (${ph}) RETURNING id`, vals);
        if (r.rows && r.rows[0]) newItem.id = r.rows[0].id;
      } catch (e) {
        console.warn("PG insert inventario:", e.message);
      }
    }
  }

  res.json({ success: true, item: newItem });
});

app.put("/api/inventario/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;
  const idx = (memStore.inventario_items || []).findIndex(i => i.id === id);
  if (idx !== -1) {
    memStore.inventario_items[idx] = { ...memStore.inventario_items[idx], ...b };
  }

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const it = memStore.inventario_items[idx] || { ...b, id };
        const colsUpdate = "categoria=$1, nombre=$2, stock_actual=$3, stock_minimo=$4, costo_pesos=$5, costo_usd=$6, precio_venta_pesos=$7, precio_venta_usd=$8, ubicacion=$9, updated_at=CURRENT_TIMESTAMP";
        const valsUpdate = [it.categoria || "Accesorio", it.nombre, parseInt(it.stock_actual) || 0, parseInt(it.stock_minimo) || 2, parseFloat(it.costo_pesos) || 0, parseFloat(it.costo_usd) || 0, parseFloat(it.precio_venta_pesos) || 0, parseFloat(it.precio_venta_usd) || 0, it.ubicacion || "Local"];
        const upd = await q(`UPDATE inventario_items SET ${colsUpdate} WHERE id=${id}`, valsUpdate);
        if (upd.rowCount === 0) {
          const cols = "id, categoria, nombre, stock_actual, stock_minimo, costo_pesos, costo_usd, precio_venta_pesos, precio_venta_usd, ubicacion";
          const vals = [id, ...valsUpdate];
          const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
          await q(`INSERT INTO inventario_items (${cols}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`, vals).catch(() => {});
        }
      } catch (e) {
        console.warn("PG update inventario:", e.message);
      }
    }
  }

  return res.json({ success: true, item: memStore.inventario_items[idx] });
});

app.delete("/api/inventario/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  memStore.inventario_items = (memStore.inventario_items || []).filter(i => i.id !== id);
  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      await q("DELETE FROM inventario_items WHERE id=$1", [id]).catch(() => {});
    }
  }
  res.json({ success: true });
});

app.get("/api/reparaciones", async (req, res) => {
  try {
    const r = await q("SELECT * FROM reparaciones ORDER BY id");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.reparaciones || []);
  } catch (e) {
    res.json(memStore.reparaciones || []);
  }
});

app.post("/api/reparaciones", async (req, res) => {
  const b = req.body;
  const newRep = {
    id: Date.now(),
    fecha_ingreso: b.fecha_ingreso || new Date().toISOString(),
    equipo: b.equipo,
    imei: b.imei || "",
    cliente_nombre: b.cliente_nombre,
    cliente_telefono: b.cliente_telefono || "",
    problema_reportado: b.problema_reportado,
    diagnostico_tecnico: b.diagnostico_tecnico || "",
    tecnico_asignado: b.tecnico_asignado || "Taller Central",
    costo_repuesto_usd: parseFloat(b.costo_repuesto_usd) || 0,
    costo_repuesto_pesos: parseFloat(b.costo_repuesto_pesos) || 0,
    mano_obra_usd: parseFloat(b.mano_obra_usd) || 0,
    mano_obra_pesos: parseFloat(b.mano_obra_pesos) || 0,
    total_presupuesto_usd: parseFloat(b.total_presupuesto_usd) || 0,
    total_presupuesto_pesos: parseFloat(b.total_presupuesto_pesos) || 0,
    estado: b.estado || "En Taller",
    pagado: b.pagado || false,
    observaciones: b.observaciones || ""
  };
  memStore.reparaciones = [newRep, ...(memStore.reparaciones || [])];

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const cols = "fecha_ingreso, equipo, imei, cliente_nombre, cliente_telefono, problema_reportado, diagnostico_tecnico, tecnico_asignado, costo_repuesto_usd, costo_repuesto_pesos, mano_obra_usd, mano_obra_pesos, total_presupuesto_usd, total_presupuesto_pesos, estado, pagado, observaciones";
        const vals = [newRep.fecha_ingreso, newRep.equipo, newRep.imei, newRep.cliente_nombre, newRep.cliente_telefono, newRep.problema_reportado, newRep.diagnostico_tecnico, newRep.tecnico_asignado, newRep.costo_repuesto_usd, newRep.costo_repuesto_pesos, newRep.mano_obra_usd, newRep.mano_obra_pesos, newRep.total_presupuesto_usd, newRep.total_presupuesto_pesos, newRep.estado, newRep.pagado, newRep.observaciones || ""];
        const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
        const r = await q(`INSERT INTO reparaciones (${cols}) VALUES (${ph}) RETURNING id`, vals);
        if (r.rows && r.rows[0]) newRep.id = r.rows[0].id;
      } catch (e) {
        console.warn("PG insert reparacion:", e.message);
      }
    }
  }

  res.json({ success: true, reparacion: newRep });
});

app.put("/api/reparaciones/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;
  const idx = (memStore.reparaciones || []).findIndex(r => r.id === id);
  if (idx !== -1) {
    memStore.reparaciones[idx] = { ...memStore.reparaciones[idx], ...b };
  }

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const r = memStore.reparaciones[idx] || { ...b, id };
        const colsUpdate = "equipo=$1, imei=$2, cliente_nombre=$3, cliente_telefono=$4, problema_reportado=$5, diagnostico_tecnico=$6, tecnico_asignado=$7, costo_repuesto_usd=$8, costo_repuesto_pesos=$9, mano_obra_usd=$10, mano_obra_pesos=$11, total_presupuesto_usd=$12, total_presupuesto_pesos=$13, estado=$14, pagado=$15, observaciones=$16, updated_at=CURRENT_TIMESTAMP";
        const valsUpdate = [r.equipo, r.imei || "", r.cliente_nombre || "", r.cliente_telefono || "", r.problema_reportado || "", r.diagnostico_tecnico || "", r.tecnico_asignado || "Taller Central", parseFloat(r.costo_repuesto_usd) || 0, parseFloat(r.costo_repuesto_pesos) || 0, parseFloat(r.mano_obra_usd) || 0, parseFloat(r.mano_obra_pesos) || 0, parseFloat(r.total_presupuesto_usd) || 0, parseFloat(r.total_presupuesto_pesos) || 0, r.estado || "En Taller", !!r.pagado, r.observaciones || ""];
        const upd = await q(`UPDATE reparaciones SET ${colsUpdate} WHERE id=${id}`, valsUpdate);
        if (upd.rowCount === 0) {
          const cols = "id, fecha_ingreso, equipo, imei, cliente_nombre, cliente_telefono, problema_reportado, diagnostico_tecnico, tecnico_asignado, costo_repuesto_usd, costo_repuesto_pesos, mano_obra_usd, mano_obra_pesos, total_presupuesto_usd, total_presupuesto_pesos, estado, pagado, observaciones";
          const vals = [id, r.fecha_ingreso || new Date().toISOString(), ...valsUpdate];
          const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
          await q(`INSERT INTO reparaciones (${cols}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`, vals).catch(() => {});
        }
      } catch (e) {
        console.warn("PG update reparacion:", e.message);
      }
    }
  }

  return res.json({ success: true, reparacion: memStore.reparaciones[idx] });
});

app.get("/api/gastos-fijos", async (req, res) => {
  try {
    const r = await q("SELECT * FROM gastos_fijos ORDER BY id");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.gastos_fijos || []);
  } catch (e) {
    res.json(memStore.gastos_fijos || []);
  }
});

app.post("/api/gastos-fijos", async (req, res) => {
  const b = req.body;
  const newG = {
    id: Date.now(),
    concepto: b.concepto,
    persona_responsable: b.persona_responsable || "",
    monto: parseFloat(b.monto) || 0,
    moneda: b.moneda || "PESOS",
    dia_vencimiento: parseInt(b.dia_vencimiento) || 10,
    pagado: b.pagado || false
  };
  memStore.gastos_fijos = [newG, ...(memStore.gastos_fijos || [])];

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const cols = "concepto, persona_responsable, monto, moneda, dia_vencimiento, pagado";
        const vals = [newG.concepto, newG.persona_responsable, newG.monto, newG.moneda, newG.dia_vencimiento, newG.pagado];
        const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
        const r = await q(`INSERT INTO gastos_fijos (${cols}) VALUES (${ph}) RETURNING id`, vals);
        if (r.rows && r.rows[0]) newG.id = r.rows[0].id;
      } catch (e) {
        console.warn("PG insert gasto fijo:", e.message);
      }
    }
  }

  res.json({ success: true, gasto: newG });
});

app.get("/api/deudas-deudores", async (req, res) => {
  try {
    const r = await q("SELECT * FROM deudas_deudores ORDER BY id");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.deudas_deudores || []);
  } catch (e) {
    res.json(memStore.deudas_deudores || []);
  }
});

app.post("/api/deudas-deudores", async (req, res) => {
  const b = req.body;
  const newD = {
    id: Date.now(),
    tipo: b.tipo || "DEUDOR",
    persona: b.persona,
    concepto: b.concepto,
    monto_original: parseFloat(b.monto_original) || 0,
    monto_pendiente: parseFloat(b.monto_pendiente || b.monto_original) || 0,
    moneda: b.moneda || "USD",
    estado: "Pendiente"
  };
  memStore.deudas_deudores = [newD, ...(memStore.deudas_deudores || [])];

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const cols = "tipo, persona, concepto, monto_original, monto_pendiente, moneda, estado";
        const vals = [newD.tipo, newD.persona, newD.concepto, newD.monto_original, newD.monto_pendiente, newD.moneda, newD.estado];
        const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
        const r = await q(`INSERT INTO deudas_deudores (${cols}) VALUES (${ph}) RETURNING id`, vals);
        if (r.rows && r.rows[0]) newD.id = r.rows[0].id;
      } catch (e) {
        console.warn("PG insert deuda/deudor:", e.message);
      }
    }
  }

  res.json({ success: true, registro: newD });
});

app.get("/api/inversiones", async (req, res) => {
  try {
    const r = await q("SELECT * FROM inversiones ORDER BY id");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.inversiones || []);
  } catch (e) {
    res.json(memStore.inversiones || []);
  }
});

app.post("/api/inversiones", async (req, res) => {
  const b = req.body;
  const newInv = {
    id: Date.now(),
    item: b.item,
    valor_usd: parseFloat(b.valor_usd) || 0,
    valor_pesos: parseFloat(b.valor_pesos) || 0,
    contacto_proveedor: b.contacto_proveedor || "",
    categoria: b.categoria || "Equipamiento"
  };
  memStore.inversiones = [newInv, ...(memStore.inversiones || [])];

  if (process.env.DATABASE_URL) {
    await getPool();
    if (isPostgresAvailable) {
      try {
        const cols = "item, valor_usd, valor_pesos, contacto_proveedor, categoria";
        const vals = [newInv.item, newInv.valor_usd, newInv.valor_pesos, newInv.contacto_proveedor, newInv.categoria];
        const ph = vals.map((_, i) => "$" + (i + 1)).join(", ");
        const r = await q(`INSERT INTO inversiones (${cols}) VALUES (${ph}) RETURNING id`, vals);
        if (r.rows && r.rows[0]) newInv.id = r.rows[0].id;
      } catch (e) {
        console.warn("PG insert inversion:", e.message);
      }
    }
  }

  res.json({ success: true, inversion: newInv });
});

app.get("/api/vendedores", async (req, res) => {
  try {
    const r = await q("SELECT * FROM vendedores ORDER BY id");
    if (r.rows && r.rows.length > 0) return res.json(r.rows.map(numericize));
    return res.json(memStore.vendedores || []);
  } catch (e) {
    res.json(memStore.vendedores || []);
  }
});

export default app;
