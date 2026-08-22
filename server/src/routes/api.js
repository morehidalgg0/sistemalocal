const express = require('express');
const router = express.Router();
const db = require('../db');
const excelData = require('../seeds/excelData');

// Inicializar datos en el almacén local si están vacíos o recién iniciados
function checkAndSeed() {
  const store = db.getInMemoryDB();
  if (!store.dispositivos || store.dispositivos.length === 0 || !store.ventas || store.ventas.length === 0) {
    Object.assign(store, JSON.parse(JSON.stringify(excelData)));
    db.saveJsonStore();
  }
}
checkAndSeed();

// ----------------------------------------------------
// 1. CONFIGURACIÓN & COTIZACIONES
// ----------------------------------------------------
router.get('/config', (req, res) => {
  const store = db.getInMemoryDB();
  res.json({
    config: store.configuracion || excelData.configuracion,
    isPostgresReady: db.isPostgresReady()
  });
});

router.post('/config', (req, res) => {
  const store = db.getInMemoryDB();
  store.configuracion = { ...store.configuracion, ...req.body };
  db.saveJsonStore();
  res.json({ success: true, config: store.configuracion });
});

// ----------------------------------------------------
// 2. DASHBOARD RESUMEN EJECUTIVO (KPIs)
// ----------------------------------------------------
router.get('/dashboard', (req, res) => {
  const store = db.getInMemoryDB();
  const dolar = parseFloat(store.configuracion?.dolar_blue || 1480);

  // Capital en Stock de Dispositivos (USD)
  const stockDispositivosUSD = (store.dispositivos || [])
    .filter(d => d.estado === 'En Stock' || d.estado === 'Señado')
    .reduce((acc, d) => acc + (parseFloat(d.costo_usd) || 0) + (parseFloat(d.costo_reparacion_usd) || 0), 0);

  // Capital en Accesorios y Repuestos (USD)
  const stockAccesoriosUSD = (store.inventario_items || [])
    .reduce((acc, item) => acc + ((parseFloat(item.costo_usd) || ((parseFloat(item.costo_pesos)||0)/dolar) || 0) * (item.stock_actual || 0)), 0);

  // Cajas y Saldos Líquidos
  const cajas = store.cuentas_caja || [];
  let saldoCajasUSD = 0;
  let saldoCajasARS = 0;

  cajas.forEach(c => {
    const s = parseFloat(c.saldo_actual) || 0;
    if (c.moneda === 'USD' || c.moneda === 'USDT') saldoCajasUSD += s;
    else if (c.moneda === 'ARS') saldoCajasARS += s;
  });

  const totalLiquidoUSD = saldoCajasUSD + (saldoCajasARS / dolar);
  const capitalTotalActivo = stockDispositivosUSD + stockAccesoriosUSD + totalLiquidoUSD;

  // Ganancias del mes en Ventas
  const ventas = store.ventas || [];
  const gananciaMesUSD = ventas.reduce((acc, v) => acc + (parseFloat(v.ganancia_usd) || 0), 0);
  const totalEquiposVendidos = ventas.length;
  const promedioGananciaPorTel = totalEquiposVendidos > 0 ? (gananciaMesUSD / totalEquiposVendidos) : 0;

  // Deudores y Deudas
  const deudores = (store.deudas_deudores || []).filter(d => d.tipo === 'DEUDOR' && d.estado !== 'Cancelado');
  const totalDeudoresUSD = deudores.reduce((acc, d) => acc + (parseFloat(d.monto_pendiente) || 0), 0);

  const deudas = (store.deudas_deudores || []).filter(d => d.tipo === 'DEUDA' && d.estado !== 'Cancelado');
  const totalDeudasUSD = deudas.reduce((acc, d) => acc + (parseFloat(d.monto_pendiente) || 0), 0);

  // Cuentas Corrientes Adeudadas
  const saldoCCProveedores = (store.entidades_cc || [])
    .filter(e => e.tipo === 'PROVEEDOR')
    .reduce((acc, e) => acc + (parseFloat(e.saldo_adeudado) || 0), 0);

  res.json({
    kpis: {
      capitalTotalUSD: capitalTotalActivo,
      stockDispositivosUSD,
      stockAccesoriosUSD,
      totalLiquidoUSD,
      saldoCajasUSD,
      saldoCajasARS,
      gananciaMesUSD,
      totalEquiposVendidos,
      promedioGananciaPorTel,
      totalDeudoresUSD,
      totalDeudasUSD,
      saldoCCProveedores,
      dolarActual: dolar
    },
    equiposEnStock: (store.dispositivos || []).filter(d => d.estado === 'En Stock').length,
    reparacionesActivas: (store.reparaciones || []).filter(r => r.estado !== 'Entregado y Cobrado').length,
    ultimasVentas: (store.ventas || []).slice(-5).reverse(),
    ultimosMovimientos: (store.caja_movimientos || []).slice(-6).reverse()
  });
});

// Rutas de Dispositivos
router.get('/dispositivos', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.dispositivos || []);
});

router.post('/dispositivos', (req, res) => {
  const store = db.getInMemoryDB();
  const nuevo = {
    id: Date.now(),
    modelo: req.body.modelo,
    color: req.body.color || '',
    capacidad: req.body.capacidad || '',
    bateria: parseInt(req.body.bateria) || null,
    imei: req.body.imei || '',
    condicion: req.body.condicion || 'Usado',
    costo_usd: parseFloat(req.body.costo_usd) || 0,
    costo_pesos: parseFloat(req.body.costo_pesos) || 0,
    costo_reparacion_usd: parseFloat(req.body.costo_reparacion_usd) || 0,
    precio_sugerido_usd: parseFloat(req.body.precio_sugerido_usd) || 0,
    precio_sugerido_pesos: parseFloat(req.body.precio_sugerido_pesos) || 0,
    proveedor: req.body.proveedor || '',
    estado: req.body.estado || 'En Stock',
    cliente_senia: req.body.cliente_senia || '',
    monto_senia: parseFloat(req.body.monto_senia) || 0,
    detalles: req.body.detalles || '',
    created_at: new Date().toISOString()
  };

  store.dispositivos = store.dispositivos || [];
  store.dispositivos.push(nuevo);

  if (req.body.afectar_cc && req.body.proveedor) {
    const entidad = (store.entidades_cc || []).find(e => e.nombre.toLowerCase() === req.body.proveedor.toLowerCase());
    if (entidad) {
      entidad.saldo_adeudado = (parseFloat(entidad.saldo_adeudado) || 0) + nuevo.costo_usd;
      store.movimientos_cc = store.movimientos_cc || [];
      store.movimientos_cc.push({
        id: Date.now() + 1,
        entidad_id: entidad.id,
        fecha: new Date().toISOString(),
        tipo: 'ENTREGA_EQUIPO',
        concepto: `Ingreso equipo: ${nuevo.modelo} (${nuevo.capacidad || ''} ${nuevo.color || ''})`,
        monto: nuevo.costo_usd,
        moneda: 'USD',
        saldo_resultante: entidad.saldo_adeudado,
        dispositivo_id: nuevo.id
      });
    }
  }

  db.saveJsonStore();
  res.json({ success: true, dispositivo: nuevo });
});

router.put('/dispositivos/:id', (req, res) => {
  const store = db.getInMemoryDB();
  const id = parseInt(req.params.id);
  const index = (store.dispositivos || []).findIndex(d => d.id === id);
  if (index !== -1) {
    store.dispositivos[index] = { ...store.dispositivos[index], ...req.body, updated_at: new Date().toISOString() };
    db.saveJsonStore();
    res.json({ success: true, dispositivo: store.dispositivos[index] });
  } else {
    res.status(404).json({ error: 'Dispositivo no encontrado' });
  }
});

router.delete('/dispositivos/:id', (req, res) => {
  const store = db.getInMemoryDB();
  const id = parseInt(req.params.id);
  store.dispositivos = (store.dispositivos || []).filter(d => d.id !== id);
  db.saveJsonStore();
  res.json({ success: true });
});

// Rutas de Ventas
router.get('/ventas', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.ventas || []);
});

router.post('/ventas', (req, res) => {
  const store = db.getInMemoryDB();
  const dolar = parseFloat(req.body.cotizacion_dolar) || parseFloat(store.configuracion?.dolar_blue || 1480);
  
  const precioVentaUSD = parseFloat(req.body.precio_venta_usd) || (parseFloat(req.body.precio_venta_pesos) / dolar) || 0;
  const precioVentaPesos = parseFloat(req.body.precio_venta_pesos) || (precioVentaUSD * dolar) || 0;
  
  const costoTotalUSD = parseFloat(req.body.costo_total_usd) || 0;
  const costoReparacionUSD = parseFloat(req.body.costo_reparacion) || 0;
  const descuentoUSD = parseFloat(req.body.descuento_monto) || 0;
  
  const gananciaUSD = precioVentaUSD - costoTotalUSD - costoReparacionUSD - descuentoUSD;
  const gananciaPesos = gananciaUSD * dolar;

  const comisionPesos = parseFloat(req.body.comision_vendedor_pesos) || 0;
  const comisionUSD = comisionPesos > 0 ? comisionPesos / dolar : (parseFloat(req.body.comision_vendedor_usd) || 0);

  const nuevaVenta = {
    id: Date.now(),
    fecha: req.body.fecha || new Date().toISOString(),
    dispositivo_id: req.body.dispositivo_id || null,
    item_detalle: req.body.item_detalle || 'Dispositivo / Accesorio',
    cliente_nombre: req.body.cliente_nombre || 'Cliente Final',
    cliente_contacto: req.body.cliente_contacto || '',
    vendedor_id: req.body.vendedor_id || null,
    vendedor_nombre: req.body.vendedor_nombre || 'NP',
    precio_venta_usd: precioVentaUSD,
    precio_venta_pesos: precioVentaPesos,
    cotizacion_dolar: dolar,
    costo_total_usd: costoTotalUSD,
    costo_total_pesos: costoTotalUSD * dolar,
    costo_reparacion: costoReparacionUSD,
    descuentos_regalos_detalle: req.body.descuentos_regalos_detalle || '',
    descuento_monto: descuentoUSD,
    ganancia_usd: gananciaUSD,
    ganancia_pesos: gananciaPesos,
    comision_vendedor_pesos: comisionPesos,
    comision_vendedor_usd: comisionUSD,
    metodo_pago: req.body.metodo_pago || 'Efectivo USD',
    caja_destino: req.body.caja_destino || 'Caja Fuerte Dólares',
    observaciones: req.body.observaciones || ''
  };

  store.ventas = store.ventas || [];
  store.ventas.push(nuevaVenta);

  if (nuevaVenta.dispositivo_id) {
    const disp = (store.dispositivos || []).find(d => d.id === parseInt(nuevaVenta.dispositivo_id));
    if (disp) {
      disp.estado = 'Vendido';
      disp.updated_at = new Date().toISOString();
    }
  }

  if (req.body.impactar_caja !== false) {
    const caja = (store.cuentas_caja || []).find(c => c.nombre === nuevaVenta.caja_destino);
    if (caja) {
      const montoIngreso = (caja.moneda === 'ARS') ? nuevaVenta.precio_venta_pesos : nuevaVenta.precio_venta_usd;
      caja.saldo_actual = (parseFloat(caja.saldo_actual) || 0) + montoIngreso;

      store.caja_movimientos = store.caja_movimientos || [];
      store.caja_movimientos.push({
        id: Date.now() + 2,
        fecha: nuevaVenta.fecha,
        cuenta_id: caja.id,
        cuenta_nombre: caja.nombre,
        tipo_movimiento: 'ENTRADA',
        categoria: 'Venta',
        concepto: `Venta: ${nuevaVenta.item_detalle} - Cliente: ${nuevaVenta.cliente_nombre}`,
        monto: montoIngreso,
        moneda: caja.moneda,
        cotizacion: dolar,
        persona_asociada: nuevaVenta.vendedor_nombre,
        comprobante_ref: `VENTA-#${nuevaVenta.id}`
      });
    }
  }

  db.saveJsonStore();
  res.json({ success: true, venta: nuevaVenta });
});

// Rutas de Cajas
router.get('/cajas', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.cuentas_caja || []);
});

router.get('/cajas/movimientos', (req, res) => {
  const store = db.getInMemoryDB();
  res.json((store.caja_movimientos || []).slice().reverse());
});

router.post('/cajas/movimientos', (req, res) => {
  const store = db.getInMemoryDB();
  const cuenta = (store.cuentas_caja || []).find(c => c.id === parseInt(req.body.cuenta_id) || c.nombre === req.body.cuenta_nombre);
  
  if (!cuenta) {
    return res.status(400).json({ error: 'Caja o cuenta no encontrada' });
  }

  const monto = parseFloat(req.body.monto) || 0;
  const tipo = req.body.tipo_movimiento;

  if (tipo === 'ENTRADA') {
    cuenta.saldo_actual = (parseFloat(cuenta.saldo_actual) || 0) + monto;
  } else if (tipo === 'SALIDA') {
    cuenta.saldo_actual = (parseFloat(cuenta.saldo_actual) || 0) - monto;
  } else if (tipo === 'CAMBIO_DIVISA') {
    cuenta.saldo_actual = (parseFloat(cuenta.saldo_actual) || 0) + monto;
    if (req.body.cuenta_origen_id) {
      const origen = (store.cuentas_caja || []).find(c => c.id === parseInt(req.body.cuenta_origen_id));
      if (origen) {
        const montoEgreso = parseFloat(req.body.monto_egreso) || (monto * (parseFloat(req.body.cotizacion) || 1));
        origen.saldo_actual = (parseFloat(origen.saldo_actual) || 0) - montoEgreso;
      }
    }
  }

  const nuevoMov = {
    id: Date.now(),
    fecha: req.body.fecha || new Date().toISOString(),
    cuenta_id: cuenta.id,
    cuenta_nombre: cuenta.nombre,
    tipo_movimiento: tipo,
    categoria: req.body.categoria || 'Varios',
    concepto: req.body.concepto || 'Movimiento de caja',
    monto: monto,
    moneda: cuenta.moneda,
    cotizacion: parseFloat(req.body.cotizacion) || 1,
    persona_asociada: req.body.persona_asociada || '',
    comprobante_ref: req.body.comprobante_ref || '',
    observaciones: req.body.observaciones || ''
  };

  store.caja_movimientos = store.caja_movimientos || [];
  store.caja_movimientos.push(nuevoMov);
  db.saveJsonStore();

  res.json({ success: true, movimiento: nuevoMov, cuenta_actualizada: cuenta });
});

// Rutas de Cuentas Corrientes
router.get('/cuentas-corrientes', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.entidades_cc || []);
});

router.post('/cuentas-corrientes', (req, res) => {
  const store = db.getInMemoryDB();
  const nueva = {
    id: Date.now(),
    nombre: req.body.nombre,
    tipo: req.body.tipo || 'PROVEEDOR',
    contacto: req.body.contacto || '',
    moneda_principal: req.body.moneda_principal || 'USD',
    saldo_adeudado: parseFloat(req.body.saldo_inicial) || 0,
    notas: req.body.notas || '',
    created_at: new Date().toISOString()
  };
  store.entidades_cc = store.entidades_cc || [];
  store.entidades_cc.push(nueva);
  db.saveJsonStore();
  res.json({ success: true, entidad: nueva });
});

router.get('/cuentas-corrientes/:id/movimientos', (req, res) => {
  const store = db.getInMemoryDB();
  const id = parseInt(req.params.id);
  const movs = (store.movimientos_cc || []).filter(m => m.entidad_id === id);
  res.json(movs);
});

router.post('/cuentas-corrientes/:id/movimientos', (req, res) => {
  const store = db.getInMemoryDB();
  const id = parseInt(req.params.id);
  const entidad = (store.entidades_cc || []).find(e => e.id === id);
  if (!entidad) return res.status(404).json({ error: 'Entidad no encontrada' });

  const monto = parseFloat(req.body.monto) || 0;
  const tipo = req.body.tipo;

  if (tipo === 'ENTREGA_EQUIPO' || tipo === 'SERVICIO_TECNICO') {
    entidad.saldo_adeudado = (parseFloat(entidad.saldo_adeudado) || 0) + monto;
  } else if (tipo === 'PAGO_REALIZADO' || tipo === 'COBRO_RECIBIDO') {
    entidad.saldo_adeudado = (parseFloat(entidad.saldo_adeudado) || 0) - monto;
  }

  const mov = {
    id: Date.now(),
    entidad_id: entidad.id,
    fecha: req.body.fecha || new Date().toISOString(),
    tipo: tipo,
    concepto: req.body.concepto,
    monto: monto,
    moneda: entidad.moneda_principal || 'USD',
    saldo_resultante: entidad.saldo_adeudado,
    observaciones: req.body.observaciones || ''
  };

  store.movimientos_cc = store.movimientos_cc || [];
  store.movimientos_cc.push(mov);

  if (req.body.impactar_caja && req.body.caja_id) {
    const caja = (store.cuentas_caja || []).find(c => c.id === parseInt(req.body.caja_id));
    if (caja) {
      caja.saldo_actual = (parseFloat(caja.saldo_actual) || 0) - monto;
      store.caja_movimientos = store.caja_movimientos || [];
      store.caja_movimientos.push({
        id: Date.now() + 3,
        fecha: mov.fecha,
        cuenta_id: caja.id,
        cuenta_nombre: caja.nombre,
        tipo_movimiento: 'SALIDA',
        categoria: 'Pago Proveedor',
        concepto: `Pago CC a ${entidad.nombre}: ${mov.concepto}`,
        monto: monto,
        moneda: caja.moneda
      });
    }
  }

  db.saveJsonStore();
  res.json({ success: true, movimiento: mov, entidad_actualizada: entidad });
});

// Rutas de Inventario
router.get('/inventario', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.inventario_items || []);
});

router.post('/inventario', (req, res) => {
  const store = db.getInMemoryDB();
  const nuevo = {
    id: Date.now(),
    categoria: req.body.categoria || 'Accesorio',
    nombre: req.body.nombre,
    stock_actual: parseInt(req.body.stock_actual) || 0,
    stock_minimo: parseInt(req.body.stock_minimo) || 2,
    costo_pesos: parseFloat(req.body.costo_pesos) || 0,
    costo_usd: parseFloat(req.body.costo_usd) || 0,
    precio_venta_pesos: parseFloat(req.body.precio_venta_pesos) || 0,
    precio_venta_usd: parseFloat(req.body.precio_venta_usd) || 0,
    ubicacion: req.body.ubicacion || 'Local',
    created_at: new Date().toISOString()
  };
  store.inventario_items = store.inventario_items || [];
  store.inventario_items.push(nuevo);
  db.saveJsonStore();
  res.json({ success: true, item: nuevo });
});

router.put('/inventario/:id', (req, res) => {
  const store = db.getInMemoryDB();
  const id = parseInt(req.params.id);
  const index = (store.inventario_items || []).findIndex(i => i.id === id);
  if (index !== -1) {
    store.inventario_items[index] = { ...store.inventario_items[index], ...req.body, updated_at: new Date().toISOString() };
    db.saveJsonStore();
    res.json({ success: true, item: store.inventario_items[index] });
  } else {
    res.status(404).json({ error: 'Item no encontrado' });
  }
});

router.delete('/inventario/:id', (req, res) => {
  const store = db.getInMemoryDB();
  const id = parseInt(req.params.id);
  store.inventario_items = (store.inventario_items || []).filter(i => i.id !== id);
  db.saveJsonStore();
  res.json({ success: true });
});

// Rutas de Reparaciones
router.get('/reparaciones', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.reparaciones || []);
});

router.post('/reparaciones', (req, res) => {
  const store = db.getInMemoryDB();
  const rep = {
    id: Date.now(),
    fecha_ingreso: new Date().toISOString(),
    equipo: req.body.equipo,
    imei: req.body.imei || '',
    cliente_nombre: req.body.cliente_nombre,
    cliente_telefono: req.body.cliente_telefono || '',
    problema_reportado: req.body.problema_reportado,
    diagnostico_tecnico: req.body.diagnostico_tecnico || '',
    tecnico_asignado: req.body.tecnico_asignado || 'Taller Central',
    costo_repuesto_usd: parseFloat(req.body.costo_repuesto_usd) || 0,
    costo_repuesto_pesos: parseFloat(req.body.costo_repuesto_pesos) || 0,
    mano_obra_usd: parseFloat(req.body.mano_obra_usd) || 0,
    mano_obra_pesos: parseFloat(req.body.mano_obra_pesos) || 0,
    total_presupuesto_usd: parseFloat(req.body.total_presupuesto_usd) || 0,
    total_presupuesto_pesos: parseFloat(req.body.total_presupuesto_pesos) || 0,
    estado: req.body.estado || 'Pendiente',
    pagado: req.body.pagado || false,
    observaciones: req.body.observaciones || ''
  };
  store.reparaciones = store.reparaciones || [];
  store.reparaciones.push(rep);
  db.saveJsonStore();
  res.json({ success: true, reparacion: rep });
});

router.put('/reparaciones/:id', (req, res) => {
  const store = db.getInMemoryDB();
  const id = parseInt(req.params.id);
  const index = (store.reparaciones || []).findIndex(r => r.id === id);
  if (index !== -1) {
    store.reparaciones[index] = { ...store.reparaciones[index], ...req.body, updated_at: new Date().toISOString() };
    db.saveJsonStore();
    res.json({ success: true, reparacion: store.reparaciones[index] });
  } else {
    res.status(404).json({ error: 'Reparación no encontrada' });
  }
});

// Rutas de Gastos Fijos, Deudas e Inversiones
router.get('/gastos-fijos', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.gastos_fijos || []);
});

router.post('/gastos-fijos', (req, res) => {
  const store = db.getInMemoryDB();
  const nuevo = {
    id: Date.now(),
    concepto: req.body.concepto,
    persona_responsable: req.body.persona_responsable || '',
    monto: parseFloat(req.body.monto) || 0,
    moneda: req.body.moneda || 'PESOS',
    dia_vencimiento: parseInt(req.body.dia_vencimiento) || 10,
    pagado: req.body.pagado || false
  };
  store.gastos_fijos = store.gastos_fijos || [];
  store.gastos_fijos.push(nuevo);
  db.saveJsonStore();
  res.json({ success: true, gasto: nuevo });
});

router.get('/deudas-deudores', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.deudas_deudores || []);
});

router.post('/deudas-deudores', (req, res) => {
  const store = db.getInMemoryDB();
  const nuevo = {
    id: Date.now(),
    tipo: req.body.tipo || 'DEUDOR',
    persona: req.body.persona,
    concepto: req.body.concepto,
    monto_original: parseFloat(req.body.monto_original) || 0,
    monto_pendiente: parseFloat(req.body.monto_pendiente) || parseFloat(req.body.monto_original) || 0,
    moneda: req.body.moneda || 'USD',
    estado: 'Pendiente',
    fecha_registro: new Date().toISOString()
  };
  store.deudas_deudores = store.deudas_deudores || [];
  store.deudas_deudores.push(nuevo);
  db.saveJsonStore();
  res.json({ success: true, registro: nuevo });
});

router.get('/inversiones', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.inversiones || []);
});

router.post('/inversiones', (req, res) => {
  const store = db.getInMemoryDB();
  const nuevo = {
    id: Date.now(),
    item: req.body.item,
    valor_usd: parseFloat(req.body.valor_usd) || 0,
    valor_pesos: parseFloat(req.body.valor_pesos) || 0,
    contacto_proveedor: req.body.contacto_proveedor || '',
    categoria: req.body.categoria || 'Equipamiento'
  };
  store.inversiones = store.inversiones || [];
  store.inversiones.push(nuevo);
  db.saveJsonStore();
  res.json({ success: true, inversion: nuevo });
});

router.get('/vendedores', (req, res) => {
  const store = db.getInMemoryDB();
  res.json(store.vendedores || []);
});

module.exports = router;
