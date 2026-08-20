-- TABLA DE CONFIGURACIÓN Y COTIZACIONES
CREATE TABLE IF NOT EXISTS configuracion (
  id VARCHAR(50) PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VENDEDORES Y PERSONAL
CREATE TABLE IF NOT EXISTS vendedores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  porcentaje_comision NUMERIC(5,2) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DISPOSITIVOS (STOCK Y ESTADO)
CREATE TABLE IF NOT EXISTS dispositivos (
  id SERIAL PRIMARY KEY,
  modelo VARCHAR(150) NOT NULL,
  color VARCHAR(50),
  capacidad VARCHAR(50),
  bateria INTEGER, -- % de batería
  imei VARCHAR(50),
  condicion VARCHAR(50) DEFAULT 'Usado', -- 'Nuevo', 'Usado', 'Open Box', 'Outlet', etc.
  costo_usd NUMERIC(12,2) DEFAULT 0,
  costo_pesos NUMERIC(14,2) DEFAULT 0,
  costo_reparacion_usd NUMERIC(12,2) DEFAULT 0,
  costo_reparacion_pesos NUMERIC(14,2) DEFAULT 0,
  precio_sugerido_usd NUMERIC(12,2) DEFAULT 0,
  precio_sugerido_pesos NUMERIC(14,2) DEFAULT 0,
  proveedor VARCHAR(100),
  estado VARCHAR(50) DEFAULT 'En Stock', -- 'En Stock', 'Señado', 'En Taller', 'Vendido'
  cliente_senia VARCHAR(100),
  monto_senia NUMERIC(12,2) DEFAULT 0,
  moneda_senia VARCHAR(10) DEFAULT 'USD',
  detalles TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ACCESORIOS Y REPUESTOS EN STOCK
CREATE TABLE IF NOT EXISTS inventario_items (
  id SERIAL PRIMARY KEY,
  categoria VARCHAR(50) NOT NULL, -- 'Accesorio', 'Repuesto', 'Herramienta', 'Otro'
  nombre VARCHAR(150) NOT NULL,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 2,
  costo_pesos NUMERIC(12,2) DEFAULT 0,
  costo_usd NUMERIC(12,2) DEFAULT 0,
  precio_venta_pesos NUMERIC(12,2) DEFAULT 0,
  precio_venta_usd NUMERIC(12,2) DEFAULT 0,
  ubicacion VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VENTAS REALIZADAS
CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dispositivo_id INTEGER REFERENCES dispositivos(id) ON DELETE SET NULL,
  item_detalle VARCHAR(255) NOT NULL,
  cliente_nombre VARCHAR(150),
  cliente_contacto VARCHAR(100),
  vendedor_id INTEGER REFERENCES vendedores(id) ON DELETE SET NULL,
  vendedor_nombre VARCHAR(100),
  precio_venta_usd NUMERIC(12,2) DEFAULT 0,
  precio_venta_pesos NUMERIC(14,2) DEFAULT 0,
  cotizacion_dolar NUMERIC(10,2) DEFAULT 1,
  costo_total_usd NUMERIC(12,2) DEFAULT 0,
  costo_total_pesos NUMERIC(14,2) DEFAULT 0,
  costo_reparacion NUMERIC(12,2) DEFAULT 0,
  descuentos_regalos_detalle TEXT,
  descuento_monto NUMERIC(12,2) DEFAULT 0,
  ganancia_usd NUMERIC(12,2) DEFAULT 0,
  ganancia_pesos NUMERIC(14,2) DEFAULT 0,
  comision_vendedor_pesos NUMERIC(12,2) DEFAULT 0,
  comision_vendedor_usd NUMERIC(12,2) DEFAULT 0,
  metodo_pago VARCHAR(50) DEFAULT 'Efectivo', -- 'Caja USD', 'Caja Pesos', 'Transferencia/Banco', 'Lemon', 'USDT', 'Mixto'
  caja_destino VARCHAR(50) DEFAULT 'Caja Fuerte Dólares',
  observaciones TEXT
);

-- CAJAS Y CUENTAS BANCARIAS
CREATE TABLE IF NOT EXISTS cuentas_caja (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(50) NOT NULL, -- 'Caja Fuerte USD', 'Caja Fuerte Pesos', 'Banco', 'Billetera Virtual', 'Cara Chica', 'Euros', 'Reales', 'USDT'
  moneda VARCHAR(10) NOT NULL, -- 'USD', 'ARS', 'USDT', 'EUR', 'BRL'
  saldo_inicial NUMERIC(14,2) DEFAULT 0,
  saldo_actual NUMERIC(14,2) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MOVIMIENTOS DE CAJA / TESORERÍA
CREATE TABLE IF NOT EXISTS caja_movimientos (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cuenta_id INTEGER REFERENCES cuentas_caja(id) ON DELETE CASCADE,
  cuenta_nombre VARCHAR(100),
  tipo_movimiento VARCHAR(20) NOT NULL, -- 'ENTRADA', 'SALIDA', 'CAMBIO_DIVISA', 'TRANSFERENCIA'
  categoria VARCHAR(50), -- 'Venta', 'Compra USD', 'Gasto Fijo', 'Gasto Extra', 'Retiro Socio', 'Pago Proveedor', 'Servicio Técnico', 'Otro'
  concepto VARCHAR(255) NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  moneda VARCHAR(10) NOT NULL,
  cotizacion NUMERIC(10,2) DEFAULT 1,
  persona_asociada VARCHAR(100),
  comprobante_ref VARCHAR(100),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CUENTAS CORRIENTES (PROVEEDORES, TÉCNICOS, SOCIOS, CONSIGNACIONES)
CREATE TABLE IF NOT EXISTS entidades_cc (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  tipo VARCHAR(50) NOT NULL, -- 'PROVEEDOR', 'TECNICO', 'SOCIO', 'CLIENTE_FRECUENTE'
  contacto VARCHAR(100),
  moneda_principal VARCHAR(10) DEFAULT 'USD',
  saldo_adeudado NUMERIC(14,2) DEFAULT 0, -- Positivo = Le debemos / Negativo = Nos debe
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MOVIMIENTOS DE CUENTA CORRIENTE
CREATE TABLE IF NOT EXISTS movimientos_cc (
  id SERIAL PRIMARY KEY,
  entidad_id INTEGER REFERENCES entidades_cc(id) ON DELETE CASCADE,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  tipo VARCHAR(30) NOT NULL, -- 'ENTREGA_EQUIPO', 'PAGO_REALIZADO', 'COBRO_RECIBIDO', 'AJUSTE', 'SERVICIO_TECNICO'
  concepto VARCHAR(255) NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'USD',
  saldo_resultante NUMERIC(14,2) DEFAULT 0,
  dispositivo_id INTEGER REFERENCES dispositivos(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SERVICIO TÉCNICO Y REPARACIONES
CREATE TABLE IF NOT EXISTS reparaciones (
  id SERIAL PRIMARY KEY,
  fecha_ingreso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_estimada TIMESTAMP,
  fecha_egreso TIMESTAMP,
  equipo VARCHAR(150) NOT NULL,
  imei VARCHAR(50),
  cliente_nombre VARCHAR(150),
  cliente_telefono VARCHAR(100),
  problema_reportado TEXT NOT NULL,
  diagnostico_tecnico TEXT,
  tecnico_asignado VARCHAR(100),
  costo_repuesto_pesos NUMERIC(12,2) DEFAULT 0,
  costo_repuesto_usd NUMERIC(12,2) DEFAULT 0,
  mano_obra_pesos NUMERIC(12,2) DEFAULT 0,
  mano_obra_usd NUMERIC(12,2) DEFAULT 0,
  total_presupuesto_pesos NUMERIC(12,2) DEFAULT 0,
  total_presupuesto_usd NUMERIC(12,2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'Pendiente', -- 'Pendiente', 'En Taller', 'Listo para Retirar', 'Entregado y Cobrado', 'Sin Reparación'
  pagado BOOLEAN DEFAULT FALSE,
  medio_pago VARCHAR(50),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GASTOS FIJOS Y MENSUALES
CREATE TABLE IF NOT EXISTS gastos_fijos (
  id SERIAL PRIMARY KEY,
  concepto VARCHAR(150) NOT NULL,
  persona_responsable VARCHAR(100),
  monto NUMERIC(12,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'PESOS', -- 'PESOS', 'USD'
  dia_vencimiento INTEGER DEFAULT 10,
  mes_anio VARCHAR(10), -- '2026-08'
  pagado BOOLEAN DEFAULT FALSE,
  fecha_pago TIMESTAMP,
  caja_origen VARCHAR(100),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DEUDORES Y DEUDAS EXTERNAS
CREATE TABLE IF NOT EXISTS deudas_deudores (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL, -- 'DEUDOR' (Nos deben plata) o 'DEUDA' (Debemos plata)
  persona VARCHAR(150) NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto_original NUMERIC(14,2) NOT NULL,
  monto_pendiente NUMERIC(14,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'USD',
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_limite TIMESTAMP,
  estado VARCHAR(30) DEFAULT 'Pendiente', -- 'Pendiente', 'Parcial', 'Cancelado'
  observaciones TEXT
);

-- INVERSIONES EN EQUIPAMIENTO / LOCAL
CREATE TABLE IF NOT EXISTS inversiones (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  item VARCHAR(150) NOT NULL,
  valor_usd NUMERIC(12,2) DEFAULT 0,
  valor_pesos NUMERIC(14,2) DEFAULT 0,
  contacto_proveedor VARCHAR(150),
  categoria VARCHAR(50) DEFAULT 'Mobiliario y Herramientas',
  observaciones TEXT
);
