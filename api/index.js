import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import excelData from './excelData.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let store = { ...excelData };

app.get('/api/config', (req, res) => {
  res.json({ config: store.configuracion || {}, isPostgresReady: false });
});

app.get('/api/dashboard', (req, res) => {
  const dolar = parseFloat(store.configuracion?.dolar_blue || 1480);
  const stockDispositivosUSD = (store.dispositivos || []).filter(d => d.estado === 'En Stock').reduce((acc, d) => acc + (parseFloat(d.costo_usd) || 0), 0);
  const saldoCajasUSD = (store.cuentas_caja || []).filter(c => c.moneda === 'USD').reduce((acc, c) => acc + (parseFloat(c.saldo_actual) || 0), 0);
  const saldoCajasARS = (store.cuentas_caja || []).filter(c => c.moneda === 'ARS').reduce((acc, c) => acc + (parseFloat(c.saldo_actual) || 0), 0);
  const totalLiquidoUSD = saldoCajasUSD + (saldoCajasARS / dolar);
  const gananciaMesUSD = (store.ventas || []).reduce((acc, v) => acc + (parseFloat(v.ganancia_usd) || 0), 0);

  res.json({
    kpis: {
      capitalTotalUSD: stockDispositivosUSD + totalLiquidoUSD + 1780,
      stockDispositivosUSD,
      stockAccesoriosUSD: 1784,
      totalLiquidoUSD,
      saldoCajasUSD,
      saldoCajasARS,
      gananciaMesUSD,
      totalEquiposVendidos: (store.ventas || []).length,
      promedioGananciaPorTel: (store.ventas || []).length > 0 ? (gananciaMesUSD / (store.ventas || []).length) : 0,
      totalDeudoresUSD: 101018,
      totalDeudasUSD: 8000,
      saldoCCProveedores: 14364,
      dolarActual: dolar
    },
    equiposEnStock: (store.dispositivos || []).filter(d => d.estado === 'En Stock').length,
    reparacionesActivas: (store.reparaciones || []).filter(r => r.estado !== 'Entregado y Cobrado').length,
    ultimasVentas: (store.ventas || []).slice(-5).reverse(),
    ultimosMovimientos: (store.caja_movimientos || []).slice(-6).reverse()
  });
});

app.get('/api/dispositivos', (req, res) => res.json(store.dispositivos || []));
app.post('/api/dispositivos', (req, res) => {
  const nuevo = { id: Date.now(), ...req.body };
  store.dispositivos = store.dispositivos || [];
  store.dispositivos.push(nuevo);
  res.json({ success: true, dispositivo: nuevo });
});

app.get('/api/ventas', (req, res) => res.json(store.ventas || []));
app.post('/api/ventas', (req, res) => {
  const nueva = { id: Date.now(), ...req.body };
  store.ventas = store.ventas || [];
  store.ventas.push(nueva);
  if (nueva.dispositivo_id) {
    const disp = (store.dispositivos || []).find(d => d.id === parseInt(nueva.dispositivo_id));
    if (disp) disp.estado = 'Vendido';
  }
  res.json({ success: true, venta: nueva });
});

app.get('/api/cajas', (req, res) => res.json(store.cuentas_caja || []));
app.get('/api/cajas/movimientos', (req, res) => res.json((store.caja_movimientos || []).slice().reverse()));
app.post('/api/cajas/movimientos', (req, res) => {
  const nuevo = { id: Date.now(), ...req.body };
  store.caja_movimientos = store.caja_movimientos || [];
  store.caja_movimientos.push(nuevo);
  res.json({ success: true, movimiento: nuevo });
});

app.get('/api/cuentas-corrientes', (req, res) => res.json(store.entidades_cc || []));
app.get('/api/cuentas-corrientes/:id/movimientos', (req, res) => {
  const id = parseInt(req.params.id);
  res.json((store.movimientos_cc || []).filter(m => m.entidad_id === id));
});

app.get('/api/inventario', (req, res) => res.json(store.inventario_items || []));
app.get('/api/reparaciones', (req, res) => res.json(store.reparaciones || []));
app.get('/api/gastos-fijos', (req, res) => res.json(store.gastos_fijos || []));
app.get('/api/deudas-deudores', (req, res) => res.json(store.deudas_deudores || []));
app.get('/api/inversiones', (req, res) => res.json(store.inversiones || []));
app.get('/api/vendedores', (req, res) => res.json(store.vendedores || []));

export default app;
