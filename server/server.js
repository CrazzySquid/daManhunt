require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const db = require('./db');

app.post('/api/ping', (req, res) => {
  const { runner_id, lat, lng, accuracy } = req.body;

  if (!runner_id || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'runner_id, lat, and lng are required' });
  }

  const timestamp = Date.now();

  db.prepare(`
    INSERT INTO runner_locations (runner_id, lat, lng, accuracy, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(runner_id, lat, lng, accuracy ?? null, timestamp);

  res.json({ ok: true, timestamp });
});