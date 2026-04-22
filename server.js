const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
app.use(cors());
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch(e) {
    res.json({ status: 'ok', database: 'disconnected', error: e.message });
  }
});
app.get('/api/jobs', (req, res) => {
  res.json({ jobs: [], total: 0 });
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log('Running on port ' + PORT));
