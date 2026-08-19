module.exports = {
  configuracion: {
    dolar_blue: "1480.00",
    dolar_oficial: "1050.00",
    dolar_tarjeta: "1600.00",
    nombre_local: "New Point Store & Lab",
    moneda_default: "USD"
  },
  vendedores: [
    { id: 1, nombre: "NP", porcentaje_comision: 10, activo: true },
    { id: 2, nombre: "Eze", porcentaje_comision: 10, activo: true },
    { id: 3, nombre: "Mardel", porcentaje_comision: 10, activo: true },
    { id: 4, nombre: "Fran", porcentaje_comision: 10, activo: true },
    { id: 5, nombre: "Lara", porcentaje_comision: 10, activo: true },
    { id: 6, nombre: "Ger", porcentaje_comision: 10, activo: true },
    { id: 7, nombre: "Lourdes", porcentaje_comision: 10, activo: true }
  ],
  cuentas_caja: [
    { id: 1, nombre: "Caja Fuerte Dólares", tipo: "Caja Fuerte USD", moneda: "USD", saldo_inicial: 1470, saldo_actual: 1470, activo: true },
    { id: 2, nombre: "Caja Fuerte Pesos", tipo: "Caja Fuerte Pesos", moneda: "ARS", saldo_inicial: 193200, saldo_actual: 193200, activo: true },
    { id: 3, nombre: "Banco Galicia / Transferencias", tipo: "Banco", moneda: "ARS", saldo_inicial: 0, saldo_actual: 0, activo: true },
    { id: 4, nombre: "Lemon Cash / Cripto", tipo: "Billetera Virtual", moneda: "USDT", saldo_inicial: 0, saldo_actual: 0, activo: true },
    { id: 5, nombre: "Dólares Cara Chica", tipo: "Cara Chica", moneda: "USD", saldo_inicial: 0, saldo_actual: 0, activo: true },
    { id: 6, nombre: "Caja Reales", tipo: "Reales", moneda: "BRL", saldo_inicial: 0, saldo_actual: 0, activo: true },
    { id: 7, nombre: "Caja Euros", tipo: "Euros", moneda: "EUR", saldo_inicial: 0, saldo_actual: 0, activo: true }
  ],
  entidades_cc: [
    { id: 1, nombre: "Garden", tipo: "PROVEEDOR", contacto: "Garden Oficial", moneda_principal: "USD", saldo_adeudado: 10314, notas: "Proveedor mayorista de iPhones nuevos y sellados" },
    { id: 2, nombre: "Lucas Moroni", tipo: "PROVEEDOR", contacto: "Lucas M", moneda_principal: "USD", saldo_adeudado: 2025, notas: "Proveedor de equipos usados y nuevos seleccionados" },
    { id: 3, nombre: "Victor Diaz", tipo: "PROVEEDOR", contacto: "Victor Diaz", moneda_principal: "USD", saldo_adeudado: 0, notas: "Equipos y repuestos" },
    { id: 4, nombre: "Agus Black Apple", tipo: "PROVEEDOR", contacto: "Agus B", moneda_principal: "USD", saldo_adeudado: 2025, notas: "Proveedor" },
    { id: 5, nombre: "Rosario Técnica", tipo: "TECNICO", contacto: "Rosario Lab", moneda_principal: "USD", saldo_adeudado: 0, notas: "Taller externo especializado en placas y pantallas" },
    { id: 6, nombre: "Apple Becker", tipo: "TECNICO", contacto: "Becker", moneda_principal: "USD", saldo_adeudado: 0, notas: "Reparaciones y tapas traseras" },
    { id: 7, nombre: "Huevo y Alegre", tipo: "TECNICO", contacto: "Taller H&A", moneda_principal: "USD", saldo_adeudado: 0, notas: "Módulos y cambios de batería" },
    { id: 8, nombre: "Soulfix Repuestos", tipo: "PROVEEDOR", contacto: "Soulfix", moneda_principal: "ARS", saldo_adeudado: 0, notas: "Módulos y pegamentos" },
    { id: 9, nombre: "Zani Repuestos", tipo: "PROVEEDOR", contacto: "Zani", moneda_principal: "ARS", saldo_adeudado: 0, notas: "Baterías y flex" },
    { id: 10, nombre: "Ema Haase", tipo: "SOCIO", contacto: "Ema", moneda_principal: "USD", saldo_adeudado: 446, notas: "Socio / Cuentas" },
    { id: 11, nombre: "Ezequiel Mora", tipo: "SOCIO", contacto: "Eze", moneda_principal: "ARS", saldo_adeudado: 0, notas: "Socio / Operaciones" },
    { id: 12, nombre: "German Falcone", tipo: "SOCIO", contacto: "German", moneda_principal: "USD", saldo_adeudado: 0, notas: "Socio" },
    { id: 13, nombre: "Bauti Righini", tipo: "SOCIO", contacto: "Bauti", moneda_principal: "USD", saldo_adeudado: -5, notas: "Cuenta de socio" },
    { id: 14, nombre: "Munchi", tipo: "SOCIO", contacto: "Munchi", moneda_principal: "USD", saldo_adeudado: 1320, notas: "Cuenta corriente" }
  ],
  dispositivos: [
    { id: 1, modelo: "iPhone 14 Pro Max", color: "Purple", capacidad: "256GB", bateria: 78, imei: "354155091238491", condicion: "Usado Impecable (Lente nuevo)", costo_usd: 530, costo_pesos: 0, costo_reparacion_usd: 50, precio_sugerido_usd: 650, precio_sugerido_pesos: 975000, proveedor: "Garden", estado: "En Stock", detalles: "Cambio de lente de cámara realizado" },
    { id: 2, modelo: "iPhone 14 Pro", color: "Negro", capacidad: "128GB", bateria: 85, imei: "355536081293847", condicion: "Usado", costo_usd: 375, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 480, precio_sugerido_pesos: 720000, proveedor: "Lucas Moroni", estado: "En Stock", detalles: "Batería original 85%" },
    { id: 3, modelo: "iPhone 13", color: "Negro", capacidad: "128GB", bateria: 87, imei: "358546029384729", condicion: "Usado", costo_usd: 300, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 410, precio_sugerido_pesos: 615000, proveedor: "Victor Diaz", estado: "En Stock", detalles: "Todo original" },
    { id: 4, modelo: "iPhone 15 Pro Max", color: "Natural Titanium", capacidad: "256GB", bateria: 94, imei: "351284091827364", condicion: "Usado Excelente", costo_usd: 700, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 880, precio_sugerido_pesos: 1320000, proveedor: "Garden", estado: "En Stock", detalles: "Impecable sin detalles" },
    { id: 5, modelo: "iPhone 16 Pro", color: "Desert Titanium", capacidad: "256GB", bateria: 100, imei: "350016091823746", condicion: "Nuevo Sellado", costo_usd: 975, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 1160, precio_sugerido_pesos: 1740000, proveedor: "Garden", estado: "En Stock", detalles: "En caja sellada" },
    { id: 6, modelo: "Samsung Galaxy S25 Ultra", color: "Blanco", capacidad: "512GB", bateria: 100, imei: "359974019283746", condicion: "Nuevo", costo_usd: 960, costo_pesos: 0, costo_reparacion_usd: 0, precio_sugerido_usd: 1180, precio_sugerido_pesos: 1770000, proveedor: "Lucas Moroni", estado: "En Stock", detalles: "Dual SIM" }
  ],
  inventario_items: [
    { id: 1, categoria: "Accesorio", nombre: "Cargador Rápido 20W Original", stock_actual: 50, stock_minimo: 5, costo_pesos: 8340, costo_usd: 5.6, precio_venta_pesos: 25000, precio_venta_usd: 20, ubicacion: "Vitrina 1" },
    { id: 2, categoria: "Accesorio", nombre: "Cable USB-C a Lightning 1m", stock_actual: 31, stock_minimo: 5, costo_pesos: 2900, costo_usd: 2.0, precio_venta_pesos: 10000, precio_venta_usd: 8, ubicacion: "Mostrador" },
    { id: 3, categoria: "Accesorio", nombre: "Cable Tipo C a Tipo C Mallado", stock_actual: 30, stock_minimo: 5, costo_pesos: 4060, costo_usd: 2.8, precio_venta_pesos: 12000, precio_venta_usd: 9, ubicacion: "Mostrador" },
    { id: 4, categoria: "Accesorio", nombre: "Fundas MagSafe Premium", stock_actual: 195, stock_minimo: 20, costo_pesos: 4500, costo_usd: 3.1, precio_venta_pesos: 15000, precio_venta_usd: 12, ubicacion: "Pared Accesorios" },
    { id: 5, categoria: "Accesorio", nombre: "Vidrios Templados 9D / Privacidad", stock_actual: 419, stock_minimo: 50, costo_pesos: 681, costo_usd: 0.5, precio_venta_pesos: 5000, precio_venta_usd: 4, ubicacion: "Cajón 2" },
    { id: 6, categoria: "Repuesto", nombre: "Batería iPhone 11 / 11 Pro", stock_actual: 4, stock_minimo: 2, costo_pesos: 20500, costo_usd: 14.0, precio_venta_pesos: 45000, precio_venta_usd: 35, ubicacion: "Taller" },
    { id: 7, categoria: "Repuesto", nombre: "Batería iPhone 12 / 12 Pro", stock_actual: 2, stock_minimo: 2, costo_pesos: 27280, costo_usd: 18.5, precio_venta_pesos: 55000, precio_venta_usd: 40, ubicacion: "Taller" },
    { id: 8, categoria: "Repuesto", nombre: "Batería iPhone 13", stock_actual: 3, stock_minimo: 2, costo_pesos: 22000, costo_usd: 15.0, precio_venta_pesos: 50000, precio_venta_usd: 38, ubicacion: "Taller" },
    { id: 9, categoria: "Repuesto", nombre: "Tapas Traseras Laser iPhone Varios", stock_actual: 19, stock_minimo: 5, costo_pesos: 10000, costo_usd: 6.8, precio_venta_pesos: 28000, precio_venta_usd: 25, ubicacion: "Taller" }
  ],
  gastos_fijos: [
    { id: 1, concepto: "Alquiler Oficina Rioja (2B)", persona_responsable: "Inmobiliaria", monto: 550, moneda: "USD", dia_vencimiento: 10, pagado: false },
    { id: 2, concepto: "Sueldos Personal", persona_responsable: "Equipo", monto: 1200, moneda: "USD", dia_vencimiento: 5, pagado: false },
    { id: 3, concepto: "Servicios Falucho", persona_responsable: "Administración", monto: 85000, moneda: "PESOS", dia_vencimiento: 15, pagado: false },
    { id: 4, concepto: "Luz Oficina Rioja", persona_responsable: "Edesur / Edea", monto: 65000, moneda: "PESOS", dia_vencimiento: 20, pagado: false },
    { id: 5, concepto: "Internet Starlink", persona_responsable: "Starlink", monto: 56000, moneda: "PESOS", dia_vencimiento: 1, pagado: true },
    { id: 6, concepto: "Monotributo + Honorarios Contador", persona_responsable: "Estudio Contable", monto: 95000, moneda: "PESOS", dia_vencimiento: 20, pagado: false }
  ],
  deudas_deudores: [
    { id: 1, tipo: "DEUDOR", persona: "German Falcone", concepto: "Diferencia préstamo / equipo", monto_original: 99, monto_pendiente: 99, moneda: "USD", estado: "Pendiente" },
    { id: 2, tipo: "DEUDOR", persona: "Dario Mecánico", concepto: "Equipos entregados", monto_original: 285, monto_pendiente: 285, moneda: "USD", estado: "Pendiente" },
    { id: 3, tipo: "DEUDOR", persona: "Iñaki Mar del Plata", concepto: "Saldo 2 equipos", monto_original: 443, monto_pendiente: 443, moneda: "USD", estado: "Pendiente" },
    { id: 4, tipo: "DEUDA", persona: "Préstamo Richard", concepto: "Inversión inicial capital", monto_original: 8000, monto_pendiente: 8000, moneda: "USD", estado: "Pendiente" }
  ],
  inversiones: [
    { id: 1, item: "Antena Starlink Kit", valor_usd: 400, valor_pesos: 0, contacto_proveedor: "Starlink", categoria: "Equipamiento" },
    { id: 2, item: "Contadora de billetes automática", valor_usd: 200, valor_pesos: 0, contacto_proveedor: "Distribuidor", categoria: "Herramientas" },
    { id: 3, item: "Juego de Escritorios y Sillas Oficina", valor_usd: 840, valor_pesos: 0, contacto_proveedor: "Muebles Paola", categoria: "Mobiliario" },
    { id: 4, item: "Herramientas de Taller y Unión Tools", valor_usd: 2060, valor_pesos: 0, contacto_proveedor: "Union Tools", categoria: "Taller" },
    { id: 5, item: "Cámaras de Seguridad HD", valor_usd: 400, valor_pesos: 0, contacto_proveedor: "Seguridad", categoria: "Seguridad" },
    { id: 6, item: "Desarrollo Web & Sistema NewPoint", valor_usd: 1750, valor_pesos: 0, contacto_proveedor: "Dev", categoria: "Software" }
  ]
};
