require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

// Registrar rutas de la API
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    db_postgres: db.isPostgresReady(),
    time: new Date().toISOString()
  });
});

// Inicializar Base de Datos (PostgreSQL o fallback estructurado persistente)
db.initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor backend ejecutándose en el puerto http://localhost:${PORT}`);
  });
});
