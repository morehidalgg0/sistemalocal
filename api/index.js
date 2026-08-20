import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import seedData from './excelData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

let pool = null;
let dbReady = false;

async function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function initDB() {
  if (dbReady) return;
  try {
    const p = await getPool();
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await p.query(schema);
    const check = await p.query('SELECT COUNT(*) FROM dispositivos');
    if (parseInt(check.rows[0].count) === 0) {
      await seedDB(p);
    }
    dbReady = true;
  } catch (e) {
    console.error('DB init error:', e.message);
  }
}

async function seedDB(p) {
  const conf = seedData.configuracion;
  for (const [key, val] of Object.entries(conf)) {
    await p.query('INSERT INTO configuracion (id, valor) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [key, String(val)]);
  }

  for (const v of seedData.vendedores) {
    await p.query('INSERT INTO vendedores (id, nombre, porcentaje_comision, activo) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING', [v.id, v.nombre, v.porcentaje_comision, v.activo]);
  }

  for (const d of seedData.dispositivos) {
    await p.query(`INSERT INTO dispositivos (id, modelo, color, capacidad, bateria, imei, condicion, costo_usd, costo_pesos, costo_reparacion_usd, precio_sugerido_usd, precio_sugerido_pesos, proveedor, estado, detalles)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT (id) DO NOTHING`,
      [d.id, d.modelo, d.color, d.capacidad, d.bateria, d.imei, d.condicion, d.costo_usd, d.costo_pesos, d.costo_reparacion_usd, d.precio_sugerido_usd, d.precio_sugerido_pesos, d.proveedor, d.estado, d.detalles]);
  }

  for (const c of seedData.cuentas_caja) {
    await p.query(`INSERT INTO cuentas_caja (id, nombre, tipo, moneda, saldo_inicial, saldo_actual, activo)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [c.id, c.nombre, c.tipo, c.moneda, c.saldo_inicial, c.saldo_actual, c.activo]);
  }

  for (const v of seedData.ventas) {
    await p.query(`INSERT INTO ventas (id, fecha, item_detalle, cliente_nombre, cliente_contacto, vendedor_nombre, precio_venta_usd, precio_venta_pesos, cotizacion_dolar, costo_total_usd, costo_total_pesos, costo_reparacion, descuentos_regalos_detalle, descuento_monto, ganancia_usd, ganancia_pesos, comision_vendedor_pesos, comision_vendedor_usd, caja_destino, metodo_pago)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) ON CONFLICT (id) DO NOTHING`,
      [v.id, v.fecha, v.item_detalle, v.cliente_nombre, v.cliente_contacto, v.vendedor_nombre, v.precio_venta_usd, v.precio_venta_pesos, v.cotizacion_dolar, v.costo_total_usd, v.costo_total_pesos, v.costo_reparacion, v.descuentos_regalos_detalle, v.descuento_monto, v.ganancia_usd, v.ganancia_pesos, v.comision_vendedor_pesos, v.comision_vendedor_usd, v.caja_destino, v.metodo_pago]);
  }

  for (const i of seedData.inventario_items) {
    await p.query(`INSERT INTO inventario_items (id, categoria, nombre, stock_actual, stock_minimo, costo_pesos, costo_usd, precio_venta_pesos, precio_venta_usd, ubicacion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [i.id, i.categoria, i.nombre, i.stock_actual, i.stock_minimo, i.costo_pesos, i.costo_usd, i.precio_venta_pesos, i.precio_venta_usd, i.ubicacion]);
  }

  for (const r of seedData.reparaciones) {
    await p.query(`INSERT INTO reparaciones (id, fecha_ingreso, equipo, imei, cliente_nombre, cliente_telefono, problema_reportado, diagnostico_tecnico, tecnico_asignado, costo_repuesto_usd, costo_repuesto_pesos, mano_obra_usd, mano_obra_pesos, total_presupuesto_usd, total_presupuesto_pesos, estado, pagado, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT (id) DO NOTHING`,
      [r.id, r.fecha_ingreso, r.equipo, r.imei, r.cliente_nombre, r.cliente_telefono, r.problema_reportado, r.diagnostico_tecnico, r.tecnico_asignado, r.costo_repuesto_usd, r.costo_repuesto_pesos, r.mano_obra_usd, r.mano_obra_pesos, r.total_presupuesto_usd, r.total_presupuesto_pesos, r.estado, r.pagado, r.observaciones]);
  }

  for (const m of seedData.caja_movimientos) {
    await p.query(`INSERT INTO caja_movimientos (id, fecha, cuenta_id, cuenta_nombre, tipo_movimiento, categoria, concepto, monto, moneda, cotizacion, persona_asociada)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      [m.id, m.fecha, m.cuenta_id, m.cuenta_nombre, m.tipo_movimiento, m.categoria, m.concepto, m.monto, m.moneda, m.cotizacion, m.persona_asociada]);
  }

  for (const e of seedData.entidades_cc) {
    await p.query(`INSERT INTO entidades_cc (id, nombre, tipo, contacto, moneda_principal, saldo_adeudado, notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [e.id, e.nombre, e.tipo, e.contacto, e.moneda_principal, e.saldo_adeudado, e.notas]);
  }

  for (const m of seedData.movimientos_cc) {
    await p.query(`INSERT INTO movimientos_cc (id, entidad_id, fecha, tipo, concepto, monto, moneda, saldo_resultante)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [m.id, m.entidad_id, m.fecha, m.tipo, m.concepto, m.monto, m.moneda, m.saldo_resultante]);
  }

  for (const g of seedData.gastos_fijos) {
    await p.query(`INSERT INTO gastos_fijos (id, concepto, persona_responsable, monto, moneda, dia_vencimiento, pagado)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [g.id, g.concepto, g.persona_responsable, g.monto, g.moneda, g.dia_vencimiento, g.pagado]);
  }

  for (const d of seedData.deudas_deudores) {
    await p.query(`INSERT INTO deudas_deudores (id, tipo, persona, concepto, monto_original, monto_pendiente, moneda, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [d.id, d.tipo, d.persona, d.concepto, d.monto_original, d.monto_pendiente, d.moneda, d.estado]);
  }

  for (const inv of seedData.inversiones) {
    await p.query(`INSERT INTO inversiones (id, item, valor_usd, valor_pesos, contacto_proveedor, categoria)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [inv.id, inv.item, inv.valor_usd, inv.valor_pesos, inv.contacto_proveedor, inv.categoria]);
  }
}

async function q(text, params = []) {
  await initDB();
  const p = await getPool();
  return p.query(text, params);
}

// ---- ROUTES ----

app.get('/api/config', async (req, res) => {
  try {
    const r = await q('SELECT id, valor FROM configuracion');
    const config = {};
    r.rows.forEach(row => { config[row.id] = row.valor; });
    res.json({ config, isPostgresReady: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const conf = await q('SELECT id, valor FROM configuracion');
    const config = {};
    conf.rows.forEach(r => { config[r.id] = r.valor; });
    const dolar = parseFloat(config.dolar_blue || 1480);

    const stockDisp = await q("SELECT COALESCE(SUM(costo_usd),0) as total FROM dispositivos WHERE estado = 'En Stock'");
    const stockAcc = await q('SELECT COALESCE(SUM(costo_usd * stock_actual),0) as total FROM inventario_items');
    const cajas = await q('SELECT moneda, saldo_actual FROM cuentas_caja');
    let saldoUSD = 0, saldoARS = 0;
    cajas.rows.forEach(c => {
      if (c.moneda === 'USD' || c.moneda === 'USDT') saldoUSD += parseFloat(c.saldo_actual);
      else if (c.moneda === 'ARS') saldoARS += parseFloat(c.saldo_actual);
    });
    const totalLiquido = saldoUSD + saldoARS / dolar;
    const ventas = await q('SELECT ganancia_usd FROM ventas');
    const gananciaMes = ventas.rows.reduce((a, v) => a + (parseFloat(v.ganancia_usd) || 0), 0);
    const totalVendidos = ventas.rows.length;
    const promedio = totalVendidos > 0 ? gananciaMes / totalVendidos : 0;

    const deudores = await q("SELECT COALESCE(SUM(monto_pendiente),0) as total FROM deudas_deudores WHERE tipo='DEUDOR' AND estado!='Cancelado'");
    const deudas = await q("SELECT COALESCE(SUM(monto_pendiente),0) as total FROM deudas_deudores WHERE tipo='DEUDA' AND estado!='Cancelado'");
    const ccProv = await q("SELECT COALESCE(SUM(saldo_adeudado),0) as total FROM entidades_cc WHERE tipo='PROVEEDOR'");

    const dispEnStock = await q("SELECT COUNT(*) as c FROM dispositivos WHERE estado='En Stock'");
    const repActivas = await q("SELECT COUNT(*) as c FROM reparaciones WHERE estado != 'Entregado y Cobrado'");
    const ultimasVentas = await q('SELECT * FROM ventas ORDER BY id DESC LIMIT 5');
    const ultimosMovs = await q('SELECT * FROM caja_movimientos ORDER BY id DESC LIMIT 6');

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
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dispositivos', async (req, res) => {
  try {
    const r = await q('SELECT * FROM dispositivos ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/dispositivos', async (req, res) => {
  try {
    const b = req.body;
    const r = await q(`INSERT INTO dispositivos (modelo, color, capacidad, bateria, imei, condicion, costo_usd, costo_pesos, costo_reparacion_usd, precio_sugerido_usd, precio_sugerido_pesos, proveedor, estado, cliente_senia, monto_senia, detalles)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [b.modelo, b.color||'', b.capacidad||'', b.bateria||null, b.imei||'', b.condicion||'Usado', b.costo_usd||0, b.costo_pesos||0, b.costo_reparacion_usd||0, b.precio_sugerido_usd||0, b.precio_sugerido_pesos||0, b.proveedor||'', b.estado||'En Stock', b.cliente_senia||'', b.monto_senia||0, b.detalles||'']);
    res.json({ success: true, dispositivo: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/dispositivos/:id', async (req, res) => {
  try {
    const b = req.body;
    const r = await q(`UPDATE dispositivos SET modelo=COALESCE($1,modelo), color=COALESCE($2,color), capacidad=COALESCE($3,capacidad), bateria=COALESCE($4,bateria), imei=COALESCE($5,imei), condicion=COALESCE($6,condicion), costo_usd=COALESCE($7,costo_usd), costo_pesos=COALESCE($8,costo_pesos), costo_reparacion_usd=COALESCE($9,costo_reparacion_usd), precio_sugerido_usd=COALESCE($10,precio_sugerido_usd), precio_sugerido_pesos=COALESCE($11,precio_sugerido_pesos), proveedor=COALESCE($12,proveedor), estado=COALESCE($13,estado), detalles=COALESCE($14,detalles), updated_at=CURRENT_TIMESTAMP WHERE id=$15 RETURNING *`,
      [b.modelo, b.color, b.capacidad, b.bateria, b.imei, b.condicion, b.costo_usd, b.costo_pesos, b.costo_reparacion_usd, b.precio_sugerido_usd, b.precio_sugerido_pesos, b.proveedor, b.estado, b.detalles, req.params.id]);
    res.json({ success: true, dispositivo: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/dispositivos/:id', async (req, res) => {
  try {
    await q('DELETE FROM dispositivos WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ventas', async (req, res) => {
  try {
    const r = await q('SELECT * FROM ventas ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ventas', async (req, res) => {
  try {
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

    const r = await q(`INSERT INTO ventas (fecha, dispositivo_id, item_detalle, cliente_nombre, cliente_contacto, vendedor_nombre, precio_venta_usd, precio_venta_pesos, cotizacion_dolar, costo_total_usd, costo_total_pesos, costo_reparacion, descuentos_regalos_detalle, descuento_monto, ganancia_usd, ganancia_pesos, comision_vendedor_pesos, comision_vendedor_usd, metodo_pago, caja_destino)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [b.fecha||new Date().toISOString(), b.dispositivo_id||null, b.item_detalle||'', b.cliente_nombre||'Cliente Final', b.cliente_contacto||'', b.vendedor_nombre||'NP', precioUSD, precioPesos, dolar, costoUSD, costoUSD*dolar, costoRep, b.descuentos_regalos_detalle||'', desc, ganUSD, ganUSD*dolar, comisionPesos, comisionUSD, b.metodo_pago||'Efectivo USD', b.caja_destino||'Caja Fuerte Dólares']);

    if (b.dispositivo_id) {
      await q("UPDATE dispositivos SET estado='Vendido' WHERE id=$1", [b.dispositivo_id]);
    }
    if (b.impactar_caja !== false) {
      const caja = await q('SELECT * FROM cuentas_caja WHERE nombre=$1', [b.caja_destino||'Caja Fuerte Dólares']);
      if (caja.rows.length) {
        const c = caja.rows[0];
        const monto = c.moneda === 'ARS' ? precioPesos : precioUSD;
        await q('UPDATE cuentas_caja SET saldo_actual = saldo_actual + $1 WHERE id=$2', [monto, c.id]);
        await q(`INSERT INTO caja_movimientos (fecha, cuenta_id, cuenta_nombre, tipo_movimiento, categoria, concepto, monto, moneda, cotizacion, persona_asociada)
          VALUES ($1,$2,$3,'ENTRADA','Venta',$4,$5,$6,$7,$8)`,
          [b.fecha||new Date().toISOString(), c.id, c.nombre, `Venta: ${b.item_detalle}`, monto, c.moneda, dolar, b.vendedor_nombre||'NP']);
      }
    }
    res.json({ success: true, venta: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cajas', async (req, res) => {
  try {
    const r = await q('SELECT * FROM cuentas_caja ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cajas/movimientos', async (req, res) => {
  try {
    const r = await q('SELECT * FROM caja_movimientos ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cajas/movimientos', async (req, res) => {
  try {
    const b = req.body;
    const caja = await q('SELECT * FROM cuentas_caja WHERE id=$1 OR nombre=$2', [parseInt(b.cuenta_id)||0, b.cuenta_nombre||'']);
    if (!caja.rows.length) return res.status(400).json({ error: 'Caja no encontrada' });
    const c = caja.rows[0];
    const monto = parseFloat(b.monto) || 0;
    if (b.tipo_movimiento === 'ENTRADA') await q('UPDATE cuentas_caja SET saldo_actual = saldo_actual + $1 WHERE id=$2', [monto, c.id]);
    else if (b.tipo_movimiento === 'SALIDA') await q('UPDATE cuentas_caja SET saldo_actual = saldo_actual - $1 WHERE id=$2', [monto, c.id]);

    const r = await q(`INSERT INTO caja_movimientos (fecha, cuenta_id, cuenta_nombre, tipo_movimiento, categoria, concepto, monto, moneda, cotizacion, persona_asociada, comprobante_ref)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.fecha||new Date().toISOString(), c.id, c.nombre, b.tipo_movimiento, b.categoria||'Varios', b.concepto||'', monto, c.moneda, b.cotizacion||1, b.persona_asociada||'', b.comprobante_ref||'']);
    const updated = await q('SELECT * FROM cuentas_caja WHERE id=$1', [c.id]);
    res.json({ success: true, movimiento: r.rows[0], cuenta_actualizada: updated.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cuentas-corrientes', async (req, res) => {
  try {
    const r = await q('SELECT * FROM entidades_cc ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cuentas-corrientes/:id/movimientos', async (req, res) => {
  try {
    const r = await q('SELECT * FROM movimientos_cc WHERE entidad_id=$1 ORDER BY id', [req.params.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cuentas-corrientes/:id/movimientos', async (req, res) => {
  try {
    const b = req.body;
    const ent = await q('SELECT * FROM entidades_cc WHERE id=$1', [req.params.id]);
    if (!ent.rows.length) return res.status(404).json({ error: 'Entidad no encontrada' });
    const e = ent.rows[0];
    const monto = parseFloat(b.monto) || 0;
    let nuevoSaldo = parseFloat(e.saldo_adeudado);
    if (b.tipo === 'ENTREGA_EQUIPO' || b.tipo === 'SERVICIO_TECNICO') nuevoSaldo += monto;
    else if (b.tipo === 'PAGO_REALIZADO' || b.tipo === 'COBRO_RECIBIDO') nuevoSaldo -= monto;

    await q('UPDATE entidades_cc SET saldo_adeudado=$1 WHERE id=$2', [nuevoSaldo, e.id]);
    const r = await q(`INSERT INTO movimientos_cc (entidad_id, fecha, tipo, concepto, monto, moneda, saldo_resultante, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [e.id, b.fecha||new Date().toISOString(), b.tipo, b.concepto, monto, e.moneda_principal, nuevoSaldo, b.observaciones||'']);

    if (b.impactar_caja && b.caja_id) {
      await q('UPDATE cuentas_caja SET saldo_actual = saldo_actual - $1 WHERE id=$2', [monto, b.caja_id]);
      const caja = await q('SELECT * FROM cuentas_caja WHERE id=$1', [b.caja_id]);
      if (caja.rows.length) {
        await q(`INSERT INTO caja_movimientos (fecha, cuenta_id, cuenta_nombre, tipo_movimiento, categoria, concepto, monto, moneda)
          VALUES ($1,$2,$3,'SALIDA','Pago Proveedor',$4,$5,$6)`,
          [b.fecha||new Date().toISOString(), caja.rows[0].id, caja.rows[0].nombre, `Pago CC a ${e.nombre}: ${b.concepto}`, monto, caja.rows[0].moneda]);
      }
    }
    const updated = await q('SELECT * FROM entidades_cc WHERE id=$1', [e.id]);
    res.json({ success: true, movimiento: r.rows[0], entidad_actualizada: updated.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventario', async (req, res) => {
  try {
    const r = await q('SELECT * FROM inventario_items ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventario', async (req, res) => {
  try {
    const b = req.body;
    const r = await q(`INSERT INTO inventario_items (categoria, nombre, stock_actual, stock_minimo, costo_pesos, costo_usd, precio_venta_pesos, precio_venta_usd, ubicacion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [b.categoria||'Accesorio', b.nombre, b.stock_actual||0, b.stock_minimo||2, b.costo_pesos||0, b.costo_usd||0, b.precio_venta_pesos||0, b.precio_venta_usd||0, b.ubicacion||'Local']);
    res.json({ success: true, item: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/inventario/:id', async (req, res) => {
  try {
    const b = req.body;
    const r = await q(`UPDATE inventario_items SET categoria=COALESCE($1,categoria), nombre=COALESCE($2,nombre), stock_actual=COALESCE($3,stock_actual), stock_minimo=COALESCE($4,stock_minimo), costo_pesos=COALESCE($5,costo_pesos), costo_usd=COALESCE($6,costo_usd), precio_venta_pesos=COALESCE($7,precio_venta_pesos), precio_venta_usd=COALESCE($8,precio_venta_usd), ubicacion=COALESCE($9,ubicacion), updated_at=CURRENT_TIMESTAMP WHERE id=$10 RETURNING *`,
      [b.categoria, b.nombre, b.stock_actual, b.stock_minimo, b.costo_pesos, b.costo_usd, b.precio_venta_pesos, b.precio_venta_usd, b.ubicacion, req.params.id]);
    res.json({ success: true, item: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reparaciones', async (req, res) => {
  try {
    const r = await q('SELECT * FROM reparaciones ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reparaciones', async (req, res) => {
  try {
    const b = req.body;
    const r = await q(`INSERT INTO reparaciones (equipo, imei, cliente_nombre, cliente_telefono, problema_reportado, diagnostico_tecnico, tecnico_asignado, costo_repuesto_usd, costo_repuesto_pesos, mano_obra_usd, mano_obra_pesos, total_presupuesto_usd, total_presupuesto_pesos, estado, pagado, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [b.equipo, b.imei||'', b.cliente_nombre, b.cliente_telefono||'', b.problema_reportado, b.diagnostico_tecnico||'', b.tecnico_asignado||'Taller Central', b.costo_repuesto_usd||0, b.costo_repuesto_pesos||0, b.mano_obra_usd||0, b.mano_obra_pesos||0, b.total_presupuesto_usd||0, b.total_presupuesto_pesos||0, b.estado||'Pendiente', b.pagado||false, b.observaciones||'']);
    res.json({ success: true, reparacion: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/reparaciones/:id', async (req, res) => {
  try {
    const b = req.body;
    const r = await q(`UPDATE reparaciones SET equipo=COALESCE($1,equipo), imei=COALESCE($2,imei), cliente_nombre=COALESCE($3,cliente_nombre), cliente_telefono=COALESCE($4,cliente_telefono), problema_reportado=COALESCE($5,problema_reportado), diagnostico_tecnico=COALESCE($6,diagnostico_tecnico), tecnico_asignado=COALESCE($7,tecnico_asignado), costo_repuesto_usd=COALESCE($8,costo_repuesto_usd), costo_repuesto_pesos=COALESCE($9,costo_repuesto_pesos), mano_obra_usd=COALESCE($10,mano_obra_usd), mano_obra_pesos=COALESCE($11,mano_obra_pesos), total_presupuesto_usd=COALESCE($12,total_presupuesto_usd), total_presupuesto_pesos=COALESCE($13,total_presupuesto_pesos), estado=COALESCE($14,estado), pagado=COALESCE($15,pagado), observaciones=COALESCE($16,observaciones), updated_at=CURRENT_TIMESTAMP WHERE id=$17 RETURNING *`,
      [b.equipo, b.imei, b.cliente_nombre, b.cliente_telefono, b.problema_reportado, b.diagnostico_tecnico, b.tecnico_asignado, b.costo_repuesto_usd, b.costo_repuesto_pesos, b.mano_obra_usd, b.mano_obra_pesos, b.total_presupuesto_usd, b.total_presupuesto_pesos, b.estado, b.pagado, b.observaciones, req.params.id]);
    res.json({ success: true, reparacion: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/gastos-fijos', async (req, res) => {
  try {
    const r = await q('SELECT * FROM gastos_fijos ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/gastos-fijos', async (req, res) => {
  try {
    const b = req.body;
    const r = await q(`INSERT INTO gastos_fijos (concepto, persona_responsable, monto, moneda, dia_vencimiento, pagado)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [b.concepto, b.persona_responsable||'', b.monto||0, b.moneda||'PESOS', b.dia_vencimiento||10, b.pagado||false]);
    res.json({ success: true, gasto: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/deudas-deudores', async (req, res) => {
  try {
    const r = await q('SELECT * FROM deudas_deudores ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/deudas-deudores', async (req, res) => {
  try {
    const b = req.body;
    const r = await q(`INSERT INTO deudas_deudores (tipo, persona, concepto, monto_original, monto_pendiente, moneda, estado)
      VALUES ($1,$2,$3,$4,$5,$6,'Pendiente') RETURNING *`,
      [b.tipo||'DEUDOR', b.persona, b.concepto, b.monto_original||0, b.monto_pendiente||b.monto_original||0, b.moneda||'USD']);
    res.json({ success: true, registro: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inversiones', async (req, res) => {
  try {
    const r = await q('SELECT * FROM inversiones ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inversiones', async (req, res) => {
  try {
    const b = req.body;
    const r = await q(`INSERT INTO inversiones (item, valor_usd, valor_pesos, contacto_proveedor, categoria)
      VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [b.item, b.valor_usd||0, b.valor_pesos||0, b.contacto_proveedor||'', b.categoria||'Equipamiento']);
    res.json({ success: true, inversion: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/vendedores', async (req, res) => {
  try {
    const r = await q('SELECT * FROM vendedores ORDER BY id');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default app;
