require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('../server/src/db');
const apiRoutes = require('../server/src/routes/api');

const app = express();

app.use(cors());
app.use(express.json());

let dbInitPromise = null;
app.use(async (req, res, next) => {
  if (!dbInitPromise) {
    dbInitPromise = db.initDB();
  }
  await dbInitPromise;
  next();
});

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    deployed: 'Vercel Serverless',
    time: new Date().toISOString()
  });
});

module.exports = app;
