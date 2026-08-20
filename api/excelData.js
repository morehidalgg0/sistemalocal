// Datos extraídos y parseados de las hojas del Excel del negocio

const configuracion = {
  dolar_blue: "1480.00",
  dolar_oficial: "1050.00",
  dolar_tarjeta: "1600.00",
  nombre_local: "New Point Store & Lab",
  moneda_default: "USD"
};

const vendedores = [
  { id: 1, nombre: "NP", porcentaje_comision: 10, activo: true },
  { id: 2, nombre: "Eze", porcentaje_comision: 10, activo: true },
  { id: 3, nombre: "Mardel", porcentaje_comision: 10, activo: true },
  { id: 4, nombre: "Fran", porcentaje_comision: 10, activo: true },
  { id: 5, nombre: "Lara", porcentaje_comision: 10, activo: true },
  { id: 6, nombre: "Ger", porcentaje_comision: 10, activo: true },
  { id: 7, nombre: "Lourdes", porcentaje_comision: 10, activo: true }
];

const cuentas_caja = [
  { id: 1, nombre: "Caja Fuerte Dólares", tipo: "Caja Fuerte USD", moneda: "USD", saldo_inicial: 1470, saldo_actual: 1470, activo: true },
  { id: 2, nombre: "Caja Fuerte Pesos", tipo: "Caja Fuerte Pesos", moneda: "ARS", saldo_inicial: 193200, saldo_actual: 193200, activo: true },
  { id: 3, nombre: "Banco Galicia / Transferencias", tipo: "Banco", moneda: "ARS", saldo_inicial: 0, saldo_actual: 0, activo: true },
  { id: 4, nombre: "Lemon Ezequiel Mora", tipo: "Billetera Virtual", moneda: "ARS", saldo_inicial: 854000, saldo_actual: 174254, activo: true },
  { id: 5, nombre: "Lemon Ema Haase", tipo: "Billetera Virtual", moneda: "ARS", saldo_inicial: 0, saldo_actual: 1000, activo: true },
  { id: 6, nombre: "Dólares Cara Chica", tipo: "Cara Chica", moneda: "USD", saldo_inicial: 0, saldo_actual: 0, activo: true },
  { id: 7, nombre: "Caja Reales", tipo: "Reales", moneda: "BRL", saldo_inicial: 0, saldo_actual: 0, activo: true },
  { id: 8, nombre: "Caja Euros", tipo: "Euros", moneda: "EUR", saldo_inicial: 0, saldo_actual: 0, activo: true }
];

const entidades_cc = [
  { id: 1, nombre: "Garden", tipo: "PROVEEDOR", contacto: "Mayorista", moneda_principal: "USD", saldo_adeudado: 10314, notas: "Proveedor mayorista de iPhones" },
  { id: 2, nombre: "Lucas Moroni", tipo: "PROVEEDOR", contacto: "Lucas M", moneda_principal: "USD", saldo_adeudado: 2025, notas: "Proveedor de equipos" },
  { id: 3, nombre: "Victor Diaz", tipo: "PROVEEDOR", contacto: "Victor Diaz", moneda_principal: "USD", saldo_adeudado: 0, notas: "Equipos y repuestos" },
  { id: 4, nombre: "Agus Black Apple", tipo: "PROVEEDOR", contacto: "Agus B", moneda_principal: "USD", saldo_adeudado: 2025, notas: "Proveedor" },
  { id: 5, nombre: "Ramiro Piu", tipo: "PROVEEDOR", contacto: "Ramiro", moneda_principal: "USD", saldo_adeudado: 0, notas: "Equipos" },
  { id: 6, nombre: "Bauti Righini", tipo: "SOCIO", contacto: "Bauti", moneda_principal: "USD", saldo_adeudado: -5, notas: "Cuenta de socio" },
  { id: 7, nombre: "Abuela Mirta", tipo: "SOCIO", contacto: "Abuela", moneda_principal: "USD", saldo_adeudado: 1563, notas: "Préstamos e inversiones" },
  { id: 8, nombre: "Rosario Técnica", tipo: "TECNICO", contacto: "Rosario Lab", moneda_principal: "USD", saldo_adeudado: 0, notas: "Taller externo de placas y pantallas" },
  { id: 9, nombre: "Apple Becker", tipo: "TECNICO", contacto: "Becker", moneda_principal: "USD", saldo_adeudado: 0, notas: "Reparaciones de tapas y cámaras" },
  { id: 10, nombre: "Huevo y Alegre", tipo: "TECNICO", contacto: "H&A", moneda_principal: "USD", saldo_adeudado: 0, notas: "Taller técnico" },
  { id: 11, nombre: "Ema Haase", tipo: "SOCIO", contacto: "Ema", moneda_principal: "USD", saldo_adeudado: 446, notas: "Socio / Cuenta de equipos" },
  { id: 12, nombre: "German Falcone", tipo: "SOCIO", contacto: "German", moneda_principal: "USD", saldo_adeudado: 0, notas: "Socio" },
  { id: 13, nombre: "Munchi", tipo: "SOCIO", contacto: "Munchi", moneda_principal: "USD", saldo_adeudado: 1320, notas: "Cuenta corriente" },
  { id: 14, nombre: "Fran", tipo: "SOCIO", contacto: "Fran", moneda_principal: "USD", saldo_adeudado: 0, notas: "Socio" }
];

const dispositivos = [
  // Dispositivos de la planilla de stock / ventas
  { id: 101, modelo: "iPhone 14 Pro Max", color: "Purple", capacidad: "256GB", bateria: 78, imei: "354155091238491", condicion: "Usado (Lente reparado)", costo_usd: 530, costo_pesos: 0, costo_reparacion_usd: 50, precio_sugerido_usd: 650, precio_sugerido_pesos: 975000, proveedor: "Garden", estado: "En Stock", detalles: "Reparación de lente efectuada" },
  { id: 102, modelo: "iPhone 14 Pro", color: "Negro", capacidad: "128GB", bateria: 85, imei: "355536081293847", condicion: "Usado", costo_usd: 375, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 480, precio_sugerido_pesos: 720000, proveedor: "Lucas Moroni", estado: "En Stock", detalles: "Original 85% batería" },
  { id: 103, modelo: "iPhone 14", color: "Negro", capacidad: "128GB", bateria: 85, imei: "358546029384729", condicion: "Usado", costo_usd: 360, costo_pesos: 0, costo_reparacion_usd: 10, precio_sugerido_usd: 470, precio_sugerido_pesos: 705000, proveedor: "Victor Diaz", estado: "En Stock", detalles: "Funda y cargador" },
  { id: 104, modelo: "iPhone 13", color: "Negro", capacidad: "128GB", bateria: 87, imei: "354455019283746", condicion: "Usado", costo_usd: 300, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 410, precio_sugerido_pesos: 615000, proveedor: "Victor Diaz", estado: "En Stock", detalles: "Original" },
  { id: 105, modelo: "iPhone 14", color: "Lila", capacidad: "128GB", bateria: 84, imei: "355168019283745", condicion: "Usado", costo_usd: 405, costo_pesos: 0, costo_reparacion_usd: 30, precio_sugerido_usd: 520, precio_sugerido_pesos: 780000, proveedor: "Garden", estado: "En Stock", detalles: "Con accesorios" },
  { id: 106, modelo: "iPhone 13", color: "Rojo", capacidad: "128GB", bateria: 94, imei: "350016091823746", condicion: "Usado Impecable", costo_usd: 270, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 380, precio_sugerido_pesos: 570000, proveedor: "Lucas Moroni", estado: "En Stock", detalles: "94% de batería" },
  { id: 107, modelo: "iPhone 17 Pro", color: "Blanco", capacidad: "256GB", bateria: 100, imei: "359974019283746", condicion: "Nuevo Sellado", costo_usd: 970, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 1210, precio_sugerido_pesos: 1815000, proveedor: "Garden", estado: "En Stock", detalles: "Nuevo en caja" },
  { id: 108, modelo: "iPhone 17 Pro Max", color: "Desert / Silver", capacidad: "256GB", bateria: 100, imei: "351284091827364", condicion: "Nuevo Sellado", costo_usd: 1290, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 1450, precio_sugerido_pesos: 2175000, proveedor: "Garden", estado: "En Stock", detalles: "Sellado" },
  { id: 109, modelo: "Samsung Galaxy S26 Ultra", color: "Violeta", capacidad: "512GB", bateria: 100, imei: "358798019283746", condicion: "Nuevo", costo_usd: 1180, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 1360, precio_sugerido_pesos: 2040000, proveedor: "Lucas Moroni", estado: "En Stock", detalles: "512GB Dual SIM" },
  { id: 110, modelo: "Samsung Galaxy S25 Ultra", color: "Blanco", capacidad: "512GB", bateria: 100, imei: "356656019283746", condicion: "Nuevo", costo_usd: 960, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 1180, precio_sugerido_pesos: 1770000, proveedor: "Lucas Moroni", estado: "En Stock", detalles: "Nuevo con caja" },
  { id: 111, modelo: "iPhone 15 Pro Max", color: "Natural Titanium", capacidad: "256GB", bateria: 89, imei: "353238019283746", condicion: "Usado", costo_usd: 700, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 880, precio_sugerido_pesos: 1320000, proveedor: "Garden", estado: "En Stock", detalles: "Pantalla y estética perfecta" },
  { id: 112, modelo: "iPhone 15 Pro", color: "Blue", capacidad: "128GB", bateria: 88, imei: "357420019283746", condicion: "Usado", costo_usd: 590, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 710, precio_sugerido_pesos: 1065000, proveedor: "Garden", estado: "En Stock", detalles: "Impecable" }
];

const ventas = [
  {
    id: 1,
    fecha: "2026-08-01T14:30:00.000Z",
    item_detalle: "iPhone 8 64GB Rose Gold",
    cliente_nombre: "Cliente NP",
    cliente_contacto: "",
    vendedor_nombre: "MARDEL",
    precio_venta_usd: 330,
    precio_venta_pesos: 126390,
    cotizacion_dolar: 383,
    costo_total_usd: 163,
    costo_total_pesos: 62400,
    costo_reparacion: 52,
    descuentos_regalos_detalle: "Cargador 20W + Funda + Vidrio",
    descuento_monto: 25,
    ganancia_usd: 115,
    ganancia_pesos: 43990,
    comision_vendedor_pesos: 68000,
    comision_vendedor_usd: 11,
    caja_destino: "Caja Fuerte Dólares",
    metodo_pago: "Efectivo USD"
  },
  {
    id: 2,
    fecha: "2026-08-03T16:00:00.000Z",
    item_detalle: "iPhone 11 64GB Black",
    cliente_nombre: "Candela Hidalgo",
    cliente_contacto: "",
    vendedor_nombre: "MARDEL",
    precio_venta_usd: 470,
    precio_venta_pesos: 183300,
    cotizacion_dolar: 390,
    costo_total_usd: 420,
    costo_total_pesos: 163800,
    costo_reparacion: 0,
    descuentos_regalos_detalle: "Funda + Templado",
    descuento_monto: 15,
    ganancia_usd: 50,
    ganancia_pesos: 19500,
    comision_vendedor_pesos: 60000,
    comision_vendedor_usd: 11,
    caja_destino: "Caja Fuerte Dólares",
    metodo_pago: "Efectivo USD"
  },
  {
    id: 3,
    fecha: "2026-08-06T18:00:00.000Z",
    item_detalle: "iPhone 11 128GB Lila",
    cliente_nombre: "Nahiara",
    cliente_contacto: "",
    vendedor_nombre: "NP",
    precio_venta_usd: 500,
    precio_venta_pesos: 190000,
    cotizacion_dolar: 380,
    costo_total_usd: 460,
    costo_total_pesos: 174800,
    costo_reparacion: 0,
    descuentos_regalos_detalle: "Cargador 20W",
    descuento_monto: 10,
    ganancia_usd: 40,
    ganancia_pesos: 15200,
    comision_vendedor_pesos: 20000,
    comision_vendedor_usd: 10,
    caja_destino: "Caja Fuerte Dólares",
    metodo_pago: "Efectivo USD"
  },
  {
    id: 4,
    fecha: "2026-08-08T19:00:00.000Z",
    item_detalle: "iPhone 12 64GB Con Caja",
    cliente_nombre: "Marcelo Cliente NP",
    cliente_contacto: "2235316850",
    vendedor_nombre: "NP",
    precio_venta_usd: 410,
    precio_venta_pesos: 156210,
    cotizacion_dolar: 381,
    costo_total_usd: 300,
    costo_total_pesos: 114300,
    costo_reparacion: 0,
    descuentos_regalos_detalle: "Funda + Vidrio",
    descuento_monto: 12,
    ganancia_usd: 109,
    ganancia_pesos: 41670,
    comision_vendedor_pesos: 20000,
    comision_vendedor_usd: 12,
    caja_destino: "Caja Fuerte Dólares",
    metodo_pago: "Efectivo USD"
  },
  {
    id: 5,
    fecha: "2026-08-10T12:00:00.000Z",
    item_detalle: "iPhone 11 Pro Max 128GB",
    cliente_nombre: "Roxana Clienta NP",
    cliente_contacto: "",
    vendedor_nombre: "MARDEL",
    precio_venta_usd: 650,
    precio_venta_pesos: 253500,
    cotizacion_dolar: 390,
    costo_total_usd: 510,
    costo_total_pesos: 198900,
    costo_reparacion: 30,
    descuentos_regalos_detalle: "Cargador 20W Original + Funda MagSafe",
    descuento_monto: 20,
    ganancia_usd: 110,
    ganancia_pesos: 42900,
    comision_vendedor_pesos: 83000,
    comision_vendedor_usd: 11,
    caja_destino: "Caja Fuerte Dólares",
    metodo_pago: "Efectivo USD"
  }
];

const inventario_items = [
  { id: 1, categoria: "Accesorio", nombre: "Cargador Rápido 20W Original", stock_actual: 50, stock_minimo: 5, costo_pesos: 8340, costo_usd: 5.6, precio_venta_pesos: 25000, precio_venta_usd: 20, ubicacion: "Vitrina 1" },
  { id: 2, categoria: "Accesorio", nombre: "Cable USB-C a Lightning 1m", stock_actual: 31, stock_minimo: 5, costo_pesos: 2900, costo_usd: 2.0, precio_venta_pesos: 10000, precio_venta_usd: 8, ubicacion: "Mostrador" },
  { id: 3, categoria: "Accesorio", nombre: "Cable Tipo C a Tipo C Mallado", stock_actual: 30, stock_minimo: 5, costo_pesos: 4060, costo_usd: 2.8, precio_venta_pesos: 12000, precio_venta_usd: 9, ubicacion: "Mostrador" },
  { id: 4, categoria: "Accesorio", nombre: "Fundas MagSafe Premium", stock_actual: 195, stock_minimo: 20, costo_pesos: 4500, costo_usd: 3.1, precio_venta_pesos: 15000, precio_venta_usd: 12, ubicacion: "Pared Accesorios" },
  { id: 5, categoria: "Accesorio", nombre: "Vidrios Templados 9D / Privacidad", stock_actual: 419, stock_minimo: 50, costo_pesos: 681, costo_usd: 0.5, precio_venta_pesos: 5000, precio_venta_usd: 4, ubicacion: "Cajón 2" },
  { id: 6, categoria: "Repuesto", nombre: "Batería iPhone 11 / 11 Pro", stock_actual: 4, stock_minimo: 2, costo_pesos: 20500, costo_usd: 14.0, precio_venta_pesos: 45000, precio_venta_usd: 35, ubicacion: "Taller" },
  { id: 7, categoria: "Repuesto", nombre: "Batería iPhone 12 / 12 Pro", stock_actual: 2, stock_minimo: 2, costo_pesos: 27280, costo_usd: 18.5, precio_venta_pesos: 55000, precio_venta_usd: 40, ubicacion: "Taller" },
  { id: 8, categoria: "Repuesto", nombre: "Batería iPhone 13", stock_actual: 3, stock_minimo: 2, costo_pesos: 22000, costo_usd: 15.0, precio_venta_pesos: 50000, precio_venta_usd: 38, ubicacion: "Taller" },
  { id: 9, categoria: "Repuesto", nombre: "Batería iPhone 14 / 14 Pro", stock_actual: 2, stock_minimo: 2, costo_pesos: 29000, costo_usd: 20.0, precio_venta_pesos: 60000, precio_venta_usd: 45, ubicacion: "Taller" },
  { id: 10, categoria: "Repuesto", nombre: "Cámara Trasera iPhone 14 Pro Max", stock_actual: 2, stock_minimo: 1, costo_pesos: 100000, costo_usd: 68.0, precio_venta_pesos: 160000, precio_venta_usd: 110, ubicacion: "Taller" },
  { id: 11, categoria: "Repuesto", nombre: "Tapas Traseras Laser iPhone Varios", stock_actual: 19, stock_minimo: 5, costo_pesos: 10000, costo_usd: 6.8, precio_venta_pesos: 28000, precio_venta_usd: 25, ubicacion: "Taller" },
  { id: 12, categoria: "Accesorio", nombre: "Parlante Boombox 3", stock_actual: 1, stock_minimo: 1, costo_pesos: 94000, costo_usd: 63.5, precio_venta_pesos: 150000, precio_venta_usd: 110, ubicacion: "Vitrina" },
  { id: 13, categoria: "Accesorio", nombre: "Smartwatch V16 Ultra", stock_actual: 2, stock_minimo: 1, costo_pesos: 28000, costo_usd: 19.0, precio_venta_pesos: 48000, precio_venta_usd: 35, ubicacion: "Vitrina" }
];

const reparaciones = [
  {
    id: 1,
    fecha_ingreso: "2026-08-01T10:00:00.000Z",
    equipo: "iPhone 12 Pro Max Blanco",
    imei: "355661091283746",
    cliente_nombre: "Julieta",
    cliente_telefono: "2234985535",
    problema_reportado: "Cambio de módulo OLED + Batería",
    diagnostico_tecnico: "Display con líneas verticales",
    tecnico_asignado: "Rosario Técnica",
    costo_repuesto_usd: 180,
    costo_repuesto_pesos: 270000,
    mano_obra_usd: 40,
    mano_obra_pesos: 60000,
    total_presupuesto_usd: 260,
    total_presupuesto_pesos: 390000,
    estado: "Entregado y Cobrado",
    pagado: true,
    observaciones: "Entregado con garantía 90 días"
  },
  {
    id: 2,
    fecha_ingreso: "2026-08-04T11:30:00.000Z",
    equipo: "iPhone 13 Pro Azul",
    imei: "359290019283746",
    cliente_nombre: "Daniela Gauna",
    cliente_telefono: "2234237951",
    problema_reportado: "Cambio de tapa trasera láser",
    diagnostico_tecnico: "Tapa astillada",
    tecnico_asignado: "Apple Becker",
    costo_repuesto_usd: 43,
    costo_repuesto_pesos: 64500,
    mano_obra_usd: 30,
    mano_obra_pesos: 45000,
    total_presupuesto_usd: 90,
    total_presupuesto_pesos: 135000,
    estado: "Listo para Retirar",
    pagado: false,
    observaciones: "Listo en mostrador"
  },
  {
    id: 3,
    fecha_ingreso: "2026-08-08T15:00:00.000Z",
    equipo: "iPhone 14 Pro Purple",
    imei: "350667019283746",
    cliente_nombre: "Sasha Espinosa",
    cliente_telefono: "2234985535",
    problema_reportado: "Cambio de lente de cámara trasera",
    diagnostico_tecnico: "Lente roto sin afectación del sensor",
    tecnico_asignado: "Apple Becker",
    costo_repuesto_usd: 20,
    costo_repuesto_pesos: 30000,
    mano_obra_usd: 20,
    mano_obra_pesos: 30000,
    total_presupuesto_usd: 50,
    total_presupuesto_pesos: 75000,
    estado: "En Taller",
    pagado: false,
    observaciones: "En proceso"
  }
];

const caja_movimientos = [
  { id: 1, fecha: "2026-08-01T09:00:00.000Z", cuenta_id: 1, cuenta_nombre: "Caja Fuerte Dólares", tipo_movimiento: "ENTRADA", categoria: "Apertura", concepto: "Saldo inicial del período", monto: 1470, moneda: "USD", cotizacion: 1, persona_asociada: "Administración" },
  { id: 2, fecha: "2026-08-01T09:00:00.000Z", cuenta_id: 2, cuenta_nombre: "Caja Fuerte Pesos", tipo_movimiento: "ENTRADA", categoria: "Apertura", concepto: "Saldo inicial del período", monto: 193200, moneda: "ARS", cotizacion: 1, persona_asociada: "Administración" },
  { id: 3, fecha: "2026-08-02T12:00:00.000Z", cuenta_id: 1, cuenta_nombre: "Caja Fuerte Dólares", tipo_movimiento: "ENTRADA", categoria: "Venta", concepto: "Venta iPhone 16 Blanco 100%", monto: 600, moneda: "USD", cotizacion: 1520, persona_asociada: "NP" },
  { id: 4, fecha: "2026-08-03T14:00:00.000Z", cuenta_id: 1, cuenta_nombre: "Caja Fuerte Dólares", tipo_movimiento: "SALIDA", categoria: "Pago Proveedor", concepto: "Pago Lucas Moroni MacBook", monto: 1400, moneda: "USD", cotizacion: 1, persona_asociada: "Lucas Moroni" },
  { id: 5, fecha: "2026-08-05T16:00:00.000Z", cuenta_id: 1, cuenta_nombre: "Caja Fuerte Dólares", tipo_movimiento: "ENTRADA", categoria: "Venta", concepto: "Venta iPhone 17 Pro Max", monto: 700, moneda: "USD", cotizacion: 1520, persona_asociada: "NP" },
  { id: 6, fecha: "2026-08-06T18:00:00.000Z", cuenta_id: 1, cuenta_nombre: "Caja Fuerte Dólares", tipo_movimiento: "SALIDA", categoria: "Pago Proveedor", concepto: "Pago Garden mayorista", monto: 600, moneda: "USD", cotizacion: 1, persona_asociada: "Garden" },
  { id: 7, fecha: "2026-08-07T11:00:00.000Z", cuenta_id: 1, cuenta_nombre: "Caja Fuerte Dólares", tipo_movimiento: "ENTRADA", categoria: "Compra USD", concepto: "Compra 200 USD efectivo", monto: 200, moneda: "USD", cotizacion: 1560, persona_asociada: "Administración" },
  { id: 8, fecha: "2026-08-07T11:00:00.000Z", cuenta_id: 2, cuenta_nombre: "Caja Fuerte Pesos", tipo_movimiento: "SALIDA", categoria: "Compra USD", concepto: "Egreso compra 200 USD x $1560", monto: 312000, moneda: "ARS", cotizacion: 1560, persona_asociada: "Administración" },
  { id: 9, fecha: "2026-08-08T19:00:00.000Z", cuenta_id: 2, cuenta_nombre: "Caja Fuerte Pesos", tipo_movimiento: "SALIDA", categoria: "Pago Proveedor", concepto: "Pago Garden repuestos", monto: 280000, moneda: "ARS", cotizacion: 1, persona_asociada: "Garden" }
];

const movimientos_cc = [
  // Garden
  { id: 1, entidad_id: 1, fecha: "2026-08-01T10:00:00.000Z", tipo: "ENTREGA_EQUIPO", concepto: "17 Pro Max 256GB Blue + 17 Pro Silver", monto: 2580, moneda: "USD", saldo_resultante: 12514 },
  { id: 2, entidad_id: 1, fecha: "2026-08-06T15:00:00.000Z", tipo: "PAGO_REALIZADO", concepto: "Pago efectivo en mano", monto: 600, moneda: "USD", saldo_resultante: 11914 },
  { id: 3, entidad_id: 1, fecha: "2026-08-08T18:00:00.000Z", tipo: "PAGO_REALIZADO", concepto: "Pago transferencia parte pesos ($280.000)", monto: 1600, moneda: "USD", saldo_resultante: 10314 },

  // Lucas Moroni
  { id: 4, entidad_id: 2, fecha: "2026-08-01T10:00:00.000Z", tipo: "ENTREGA_EQUIPO", concepto: "iPhone 16 Pro Desert 256 + 16 Blanco", monto: 2265, moneda: "USD", saldo_resultante: 4125 },
  { id: 5, entidad_id: 2, fecha: "2026-08-04T12:00:00.000Z", tipo: "PAGO_REALIZADO", concepto: "Pago MacBook y equipos", monto: 1400, moneda: "USD", saldo_resultante: 2725 },
  { id: 6, entidad_id: 2, fecha: "2026-08-07T14:00:00.000Z", tipo: "PAGO_REALIZADO", concepto: "Pago saldo efectivo", monto: 700, moneda: "USD", saldo_resultante: 2025 },

  // Ema Haase
  { id: 7, entidad_id: 11, fecha: "2026-08-01T10:00:00.000Z", tipo: "ENTREGA_EQUIPO", concepto: "Entrega 16 Pro Max 256GB", monto: 1180, moneda: "USD", saldo_resultante: 1180 },
  { id: 8, entidad_id: 11, fecha: "2026-08-05T17:00:00.000Z", tipo: "PAGO_REALIZADO", concepto: "Pago comisión y venta", monto: 734, moneda: "USD", saldo_resultante: 446 }
];

const gastos_fijos = [
  { id: 1, concepto: "Alquiler Oficina Rioja (2B)", persona_responsable: "Inmobiliaria", monto: 550, moneda: "USD", dia_vencimiento: 10, pagado: false },
  { id: 2, concepto: "Sueldos Personal (Eze & Equipo)", persona_responsable: "Equipo", monto: 1200, moneda: "USD", dia_vencimiento: 5, pagado: false },
  { id: 3, concepto: "Servicios Falucho", persona_responsable: "Administración", monto: 85000, moneda: "PESOS", dia_vencimiento: 15, pagado: false },
  { id: 4, concepto: "Luz Oficina Rioja", persona_responsable: "Edesur / Edea", monto: 65000, moneda: "PESOS", dia_vencimiento: 20, pagado: false },
  { id: 5, concepto: "Internet Starlink", persona_responsable: "Starlink", monto: 56000, moneda: "PESOS", dia_vencimiento: 1, pagado: true },
  { id: 6, concepto: "Monotributo + Honorarios Contador", persona_responsable: "Estudio Contable", monto: 95000, moneda: "PESOS", dia_vencimiento: 20, pagado: false },
  { id: 7, concepto: "Líneas Telefónicas Móviles", persona_responsable: "Personal / Claro", monto: 38000, moneda: "PESOS", dia_vencimiento: 15, pagado: false }
];

const deudas_deudores = [
  { id: 1, tipo: "DEUDOR", persona: "German Falcone", concepto: "Diferencia préstamo / equipo", monto_original: 99, monto_pendiente: 99, moneda: "USD", estado: "Pendiente" },
  { id: 2, tipo: "DEUDOR", persona: "Dario Mecánico", concepto: "Equipos entregados a cuenta", monto_original: 285, monto_pendiente: 285, moneda: "USD", estado: "Pendiente" },
  { id: 3, tipo: "DEUDOR", persona: "Iñaki Mar del Plata", concepto: "Saldo 2 equipos", monto_original: 443, monto_pendiente: 443, moneda: "USD", estado: "Pendiente" },
  { id: 4, tipo: "DEUDOR", persona: "Agus Carri", concepto: "Equipo consignado", monto_original: 57, monto_pendiente: 57, moneda: "USD", estado: "Pendiente" },
  { id: 5, tipo: "DEUDOR", persona: "Fabian Delacola", concepto: "Reparación pendiente", monto_original: 21, monto_pendiente: 21, moneda: "USD", estado: "Pendiente" },
  { id: 6, tipo: "DEUDOR", persona: "Nachito", concepto: "Funda y cargador", monto_original: 50, monto_pendiente: 50, moneda: "USD", estado: "Pendiente" },
  { id: 7, tipo: "DEUDOR", persona: "Gallego Amigo German", concepto: "Accesorio y servicio", monto_original: 63, monto_pendiente: 63, moneda: "USD", estado: "Pendiente" },
  { id: 8, tipo: "DEUDOR", persona: "German", concepto: "Retiro temporal", monto_original: 100000, monto_pendiente: 100000, moneda: "PESOS", estado: "Pendiente" },
  { id: 9, tipo: "DEUDA", persona: "Préstamo Richard", concepto: "Inversión inicial capital", monto_original: 8000, monto_pendiente: 8000, moneda: "USD", estado: "Pendiente" }
];

const inversiones = [
  { id: 1, item: "Antena Starlink Kit", valor_usd: 400, valor_pesos: 0, contacto_proveedor: "Starlink", categoria: "Equipamiento" },
  { id: 2, item: "Contadora de billetes automática", valor_usd: 200, valor_pesos: 0, contacto_proveedor: "Distribuidor", categoria: "Herramientas" },
  { id: 3, item: "Juego de Escritorios y Sillas Oficina", valor_usd: 840, valor_pesos: 0, contacto_proveedor: "Muebles Paola", categoria: "Mobiliario" },
  { id: 4, item: "Herramientas de Taller y Unión Tools", valor_usd: 2060, valor_pesos: 0, contacto_proveedor: "Union Tools", categoria: "Taller" },
  { id: 5, item: "Cámaras de Seguridad HD", valor_usd: 400, valor_pesos: 0, contacto_proveedor: "Seguridad", categoria: "Seguridad" },
  { id: 6, item: "Notebook Acer i3 + Lenovo i5", valor_usd: 340, valor_pesos: 0, contacto_proveedor: "Computación", categoria: "Equipamiento" },
  { id: 7, item: "PlayStation 4 y Accesorios", valor_usd: 260, valor_pesos: 0, contacto_proveedor: "Local", categoria: "Equipamiento" },
  { id: 8, item: "Impresora HP", valor_usd: 110, valor_pesos: 0, contacto_proveedor: "Insumos", categoria: "Oficina" },
  { id: 9, item: "2000 Bolsas y Carteles Polifam", valor_usd: 260, valor_pesos: 0, contacto_proveedor: "Imprenta", categoria: "Marketing" },
  { id: 10, item: "Depósito Alquiler Oficina Nueva", valor_usd: 900, valor_pesos: 0, contacto_proveedor: "Inmobiliaria", categoria: "Inmueble" },
  { id: 11, item: "Desarrollo Web & Sistema NewPoint", valor_usd: 1750, valor_pesos: 0, contacto_proveedor: "Dev", categoria: "Software" }
];

export default {
  configuracion,
  vendedores,
  cuentas_caja,
  entidades_cc,
  dispositivos,
  ventas,
  inventario_items,
  reparaciones,
  caja_movimientos,
  movimientos_cc,
  gastos_fijos,
  deudas_deudores,
  inversiones
};
