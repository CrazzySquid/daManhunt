// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./db');
const { startGame } = require('./game');
const { nearestStations } = require('./stations');
const presets = require('./config/timingPresets');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

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

app.post('/api/game/start', (req, res) => {
  const { preset, customIntervals } = req.body;

  let intervals;
  if (customIntervals) {
    intervals = customIntervals;
  } else if (presets[preset]) {
    intervals = presets[preset];
  } else {
    return res.status(400).json({ error: 'Provide a valid preset or customIntervals array' });
  }

  startGame(intervals);
  res.json({ ok: true, started: Date.now() });
});

app.get('/api/reveals/latest', (req, res) => {
  const latest = db.prepare(`
    SELECT * FROM reveals ORDER BY revealed_at DESC LIMIT 1
  `).get();

  if (!latest) {
    return res.status(404).json({ error: 'No reveals yet' });
  }

  const stations = nearestStations(latest.lat, latest.lng, 2);
  res.json({ ...latest, nearestStations: stations });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));