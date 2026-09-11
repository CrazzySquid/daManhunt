// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./db');
const { startGame, getStatus, isGameRunning, stopGame } = require('./game');
const { nearestStations } = require('./stations');
const { pickRandomObjectives } = require('./objectives');
const { getCurrentGameId } = require('./game');
const { markObjectiveVisited } = require('./game');
const presets = require('./data/presets');
const { requestCatch, confirmCatch } = require('./game');


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.post('/api/game/start', (req, res) => {
  const { headStartMinutes, roundDurationMinutes, objectiveCount, revealIntervals } = req.body;

  if (!headStartMinutes || !roundDurationMinutes || !objectiveCount || !revealIntervals?.length) {
    return res.status(400).json({ error: 'Missing required game config fields' });
  }

  startGame({ headStartMinutes, roundDurationMinutes, objectiveCount, revealIntervals });
  res.json({ ok: true, started: Date.now() });
});

app.post('/api/game/stop', (req, res) => {
  const stopped = stopGame();
  res.json({ ok: true, stopped });
});

app.post('/api/game/catch', (req, res) => {
  const success = requestCatch();
  res.json({ ok: success });
});

app.post('/api/game/catch/confirm', (req, res) => {
  const { wasCaught } = req.body;
  const success = confirmCatch(!!wasCaught);
  res.json({ ok: success });
});

app.post('/api/ping', (req, res) => {
  if (!isGameRunning()) return res.status(403).json({ error: 'No game currently running' });
  const { runner_id, lat, lng, accuracy } = req.body;
  if (!runner_id || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'runner_id, lat, and lng are required' });
  }
  const timestamp = Date.now();
  db.prepare(`
    INSERT INTO runner_locations (game_id, runner_id, lat, lng, accuracy, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(getCurrentGameId(), runner_id, lat, lng, accuracy ?? null, timestamp);
  res.json({ ok: true, timestamp });
});

app.get('/api/reveals/latest', (req, res) => {
  const latest = db.prepare('SELECT * FROM reveals WHERE game_id = ? ORDER BY revealed_at DESC LIMIT 1').get(getCurrentGameId());
  if (!latest) return res.status(404).json({ error: 'No reveals yet' });
  const stations = nearestStations(latest.lat, latest.lng, 2);
  res.json({ ...latest, nearestStations: stations });
});

app.get('/api/reveals/history', (req, res) => {
  const all = db.prepare('SELECT * FROM reveals WHERE game_id = ? ORDER BY revealed_at DESC LIMIT 20').all(getCurrentGameId());
  res.json(all);
});

app.get('/api/objectives', (req, res) => {
  const objectives = db.prepare('SELECT * FROM objectives WHERE game_id = ?').all(getCurrentGameId());
  const withStations = objectives.map(o => ({
    ...o,
    nearestStations: nearestStations(o.lat, o.lng, 2)
  }));
  res.json(withStations);
});

app.get('/api/presets', (req, res) => res.json(presets));

app.get('/api/game/status', (req, res) => res.json(getStatus()));

app.post('/api/objectives/:id/visit', (req, res) => {
  const ok = markObjectiveVisited(parseInt(req.params.id));
  res.json({ ok });
});


process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (server stayed alive):', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server stayed alive):', err);
});