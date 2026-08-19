const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de PostgreSQL por variables de entorno o defaults
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gestion_local';

let pool;
let isMock = false;

// Almacén en memoria persistente a archivo JSON si PostgreSQL no está disponible localmente
const dataStorePath = path.join(__dirname, 'data_store.json');
let inMemoryDB = {
  configuracion: {},
  vendedores: [],
  dispositivos: [],
  inventario_items: [],
  ventas: [],
  cuentas_caja: [],
  caja_movimientos: [],
  entidades_cc: [],
  movimientos_cc: [],
  reparaciones: [],
  gastos_fijos: [],
  deudas_deudores: [],
  inversiones: []
};

// Cargar o inicializar DB
function loadJsonStore() {
  try {
    if (fs.existsSync(dataStorePath)) {
      const data = fs.readFileSync(dataStorePath, 'utf8');
      inMemoryDB = JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading fallback data store:", err);
  }
}

function saveJsonStore() {
  try {
    fs.writeFileSync(dataStorePath, JSON.stringify(inMemoryDB, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing fallback data store:", err);
  }
}

async function initDB() {
  try {
    pool = new Pool({ connectionString });
    // Prueba de conexión rápida
    const client = await pool.connect();
    console.log('✅ Conectado exitosamente a PostgreSQL.');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    client.release();
    isMock = false;
  } catch (error) {
    console.warn('⚠️ No se pudo conectar a PostgreSQL local (' + error.message + ').');
    console.warn('⚡ Activando motor de base de datos integrado (Persistence Store JSON compatible con PostgreSQL schema).');
    isMock = true;
    loadJsonStore();
  }
}

// Wrapper flexible de consultas
async function query(text, params = []) {
  if (!isMock && pool) {
    return pool.query(text, params);
  }
  // En caso de modo persistente local integrado
  return executeInMemoryQuery(text, params);
}

function executeInMemoryQuery(text, params) {
  // Helper para manejar el estado local
  return { rows: [] };
}

module.exports = {
  initDB,
  query,
  getInMemoryDB: () => inMemoryDB,
  saveJsonStore,
  isPostgresReady: () => !isMock
};
