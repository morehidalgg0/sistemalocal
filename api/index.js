import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import seedData from "./excelData.js";

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

// ---------------- ROUTES ----------------

app.get("/api/config", async (req, res) => {
  try {
    const r = await q("SELECT id, valor FROM configuracion");
    const config = {};
    r.rows.forEach(row => { config[row.id] = row.valor; });
    res.json({ config, isPostgresReady: true });
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

app.get("/api/dashboard", async (req, res) => {
  try {
    const conf = await q("SELECT id, valor FROM configuracion");
    const config = {};
    conf.rows.forEach(r => { config[r.id] = r.valor; });
    const dolar = parseFloat(config.dolar_blue || 1480);

    const stockDisp = await q("SELECT COALESCE(SUM(costo_usd),0) as total FROM dispositivos WHERE estado = \x27En Stock\x27");
    const stockAcc = await q("SELECT COALESCE(SUM(costo_usd * stock_actual),0) as total FROM inventario_items");
    const cajas = await q("SELECT moneda, saldo_actual FROM cuentas_caja");
    let saldoUSD = 0, saldoARS = 0;
    cajas.rows.forEach(c => {
      if (c.moneda === "USD" || c.moneda === "USDT") saldoUSD += parseFloat(c.saldo_actual);
      else if (c.moneda === "ARS") saldoARS += parseFloat(c.saldo_actual);
    });
    const totalLiquido = saldoUSD + saldoARS / dolar;
    const ventas = await q("SELECT ganancia_usd FROM ventas");
    const gananciaMes = ventas.rows.reduce((a, v) => a + (parseFloat(v.ganancia_usd) || 0), 0);
    const totalVendidos = ventas.rows.length;
    const promedio = totalVendidos > 0 ? gananciaMes / totalVendidos : 0;

    const deudores = await q("SELECT COALESCE(SUM(monto_pendiente),0) as total FROM deudas_deudores WHERE tipo=\x27DEUDOR\x27 AND estado!=\x27Cancelado\x27");
    const deudas = await q("SELECT COALESCE(SUM(monto_pendiente),0) as total FROM deudas_deudores WHERE tipo=\x27DEUDA\x27 AND estado!=\x27Cancelado\x27");
    const ccProv = await q("SELECT COALESCE(SUM(saldo_adeudado),0) as total FROM entidades_cc WHERE tipo=\x27PROVEEDOR\x27");

    const dispEnStock = await q("SELECT COUNT(*) as c FROM dispositivos WHERE estado=\x27En Stock\x27");
    const repActivas = await q("SELECT COUNT(*) as c FROM reparaciones WHERE estado != \x27Entregado y Cobrado\x27");
    const ultimasVentas = await q("SELECT * FROM ventas ORDER BY id DESC LIMIT 5");
    const ultimosMovs = await q("SELECT * FROM caja_movimientos ORDER BY id DESC LIMIT 6");

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
      ultimasVentas: ultimasVentas.rows,
      ultimosMovimientos: ultimosMovs.rows
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
    const ventas = memStore.ventas || [];
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
      ultimasVentas: (memStore.ventas || []).slice(-5).reverse(),
      ultimosMovimientos: (memStore.caja_movimientos || []).slice(-6).reverse()
    });
  }
});

app.get("/api/dispositivos", async (req, res) => {
  try {
    const r = await q("SELECT * FROM dispositivos ORDER BY id");
    res.json(r.rows);
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
  res.json({ success: true, dispositivo: newDisp });
});

app.put("/api/dispositivos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;
  const idx = (memStore.dispositivos || []).findIndex(d => d.id === id);
  if (idx !== -1) {
    memStore.dispositivos[idx] = { ...memStore.dispositivos[idx], ...b };
    return res.json({ success: true, dispositivo: memStore.dispositivos[idx] });
  }
  res.json({ success: true });
});

app.delete("/api/dispositivos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  memStore.dispositivos = (memStore.dispositivos || []).filter(d => d.id !== id);
  res.json({ success: true });
});

app.get("/api/ventas", async (req, res) => {
  try {
    const r = await q("SELECT * FROM ventas ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) {
    res.json(memStore.ventas || []);
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
    ganancia_usd: ganUSD,
    ganancia_pesos: ganUSD * dolar,
    comision_vendedor_pesos: comisionPesos,
    comision_vendedor_usd: comisionUSD,
    caja_destino: b.caja_destino || "Caja Fuerte Dólares",
    metodo_pago: b.metodo_pago || "Efectivo USD"
  };

  memStore.ventas = [newVenta, ...(memStore.ventas || [])];

  if (b.dispositivo_id) {
    const dIdx = (memStore.dispositivos || []).findIndex(d => d.id === parseInt(b.dispositivo_id));
    if (dIdx !== -1) memStore.dispositivos[dIdx].estado = "Vendido";
  }

  if (b.impactar_caja !== false) {
    const cIdx = (memStore.cuentas_caja || []).findIndex(c => c.nombre === b.caja_destino);
    if (cIdx !== -1) {
      const c = memStore.cuentas_caja[cIdx];
      const monto = c.moneda === "ARS" ? precioPesos : precioUSD;
      c.saldo_actual = (parseFloat(c.saldo_actual) || 0) + monto;
      memStore.caja_movimientos = [{
        id: Date.now(),
        fecha: newVenta.fecha,
        cuenta_id: c.id,
        cuenta_nombre: c.nombre,
        tipo_movimiento: "ENTRADA",
        categoria: "Venta",
        concepto: "Venta: " + b.item_detalle,
        monto: monto,
        moneda: c.moneda,
        cotizacion: dolar,
        persona_asociada: b.vendedor_nombre || "NP"
      }, ...(memStore.caja_movimientos || [])];
    }
  }

  res.json({ success: true, venta: newVenta });
});

app.get("/api/cajas", async (req, res) => {
  try {
    const r = await q("SELECT * FROM cuentas_caja ORDER BY id");
    res.json(r.rows);
  } catch (e) {
    res.json(memStore.cuentas_caja || []);
  }
});

app.get("/api/cajas/movimientos", async (req, res) => {
  try {
    const r = await q("SELECT * FROM caja_movimientos ORDER BY id DESC");
    res.json(r.rows);
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
  res.json({ success: true, movimiento: newMov, cuenta_actualizada: c });
});

app.get("/api/cuentas-corrientes", async (req, res) => {
  try {
    const r = await q("SELECT * FROM entidades_cc ORDER BY id");
    res.json(r.rows);
  } catch (e) {
    res.json(memStore.entidades_cc || []);
  }
});

app.get("/api/cuentas-corrientes/:id/movimientos", async (req, res) => {
  const id = parseInt(req.params.id);
  const movs = (memStore.movimientos_cc || []).filter(m => m.entidad_id === id);
  res.json(movs);
});

app.post("/api/cuentas-corrientes/:id/movimientos", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;
  const eIdx = (memStore.entidades_cc || []).findIndex(e => e.id === id);
  if (eIdx === -1) return res.status(404).json({ error: "Entidad no encontrada" });
  const e = memStore.entidades_cc[eIdx];
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
  memStore.movimientos_cc = [newMov, ...(memStore.movimientos_cc || [])];
  res.json({ success: true, movimiento: newMov, entidad_actualizada: e });
});

app.get("/api/inventario", async (req, res) => {
  try {
    const r = await q("SELECT * FROM inventario_items ORDER BY id");
    res.json(r.rows);
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
  res.json({ success: true, item: newItem });
});

app.put("/api/inventario/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;
  const idx = (memStore.inventario_items || []).findIndex(i => i.id === id);
  if (idx !== -1) {
    memStore.inventario_items[idx] = { ...memStore.inventario_items[idx], ...b };
    return res.json({ success: true, item: memStore.inventario_items[idx] });
  }
  res.json({ success: true });
});

app.get("/api/reparaciones", async (req, res) => {
  try {
    const r = await q("SELECT * FROM reparaciones ORDER BY id");
    res.json(r.rows);
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
  res.json({ success: true, reparacion: newRep });
});

app.put("/api/reparaciones/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const b = req.body;
  const idx = (memStore.reparaciones || []).findIndex(r => r.id === id);
  if (idx !== -1) {
    memStore.reparaciones[idx] = { ...memStore.reparaciones[idx], ...b };
    return res.json({ success: true, reparacion: memStore.reparaciones[idx] });
  }
  res.json({ success: true });
});

app.get("/api/gastos-fijos", async (req, res) => {
  try {
    const r = await q("SELECT * FROM gastos_fijos ORDER BY id");
    res.json(r.rows);
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
  res.json({ success: true, gasto: newG });
});

app.get("/api/deudas-deudores", async (req, res) => {
  try {
    const r = await q("SELECT * FROM deudas_deudores ORDER BY id");
    res.json(r.rows);
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
  res.json({ success: true, registro: newD });
});

app.get("/api/inversiones", async (req, res) => {
  try {
    const r = await q("SELECT * FROM inversiones ORDER BY id");
    res.json(r.rows);
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
  res.json({ success: true, inversion: newInv });
});

app.get("/api/vendedores", async (req, res) => {
  try {
    const r = await q("SELECT * FROM vendedores ORDER BY id");
    res.json(r.rows);
  } catch (e) {
    res.json(memStore.vendedores || []);
  }
});

export default app;
