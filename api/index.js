require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('../server/src/db');
const apiRoutes = require('../server/src/routes/api');

const app = express();

app.use(cors());
app.use(express.json());

// Iniciar DB antes de resolver rutas
let dbInitPromise = null;
app.use(async (req, res, next) => {
  if (!dbInitPromise) {
    dbInitPromise = db.initDB();
  }
  await dbInitPromise;
  next();
});

// Registrar rutas tanto en /api como en la raíz de la serverless function
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

module.exports = app;
