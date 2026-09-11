// server/game.js
const db = require('./db');
const { notifyHunters } = require('./telegram');
const { nearestStations } = require('./stations');
const { pickRandomObjectives } = require('./objectives');

const GRID_SIZE_METERS = 50;           // fixed, easy to tweak here
const OBJECTIVE_RADIUS_METERS = 50;    // fixed, "how close counts as arrived"
const LOCATION_DELAY_MS = 1 * 60 * 1000; // 1 minute, fixed

let state = 'idle'; // 'idle' | 'headstart' | 'active' | 'ended'
let headStartEnd = null;
let roundEnd = null;
let revealTimestamps = [];
let currentRevealIndex = 0;
let intervalId = null;
let objectives = [];
let winner = null;
let pendingConfig = null;
let catchPending = false;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function snapToGrid(lat, lng, gridMeters = GRID_SIZE_METERS) {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);
  const latStep = gridMeters / metersPerDegreeLat;
  const lngStep = gridMeters / metersPerDegreeLng;
  return {
    lat: Math.round(lat / latStep) * latStep,
    lng: Math.round(lng / lngStep) * lngStep
  };
}

const crypto = require('crypto');
let currentGameId = null;

function startGame(config) {
  if (intervalId) clearInterval(intervalId);

  currentGameId = crypto.randomUUID();

  const picked = pickRandomObjectives(config.objectiveCount);
  picked.forEach(loc => {
    db.prepare('INSERT INTO objectives (game_id, name, lat, lng) VALUES (?, ?, ?, ?)').run(currentGameId, loc.name, loc.lat, loc.lng);
  });
  objectives = db.prepare('SELECT * FROM objectives WHERE game_id = ?').all(currentGameId);

  state = 'headstart';
  const now = Date.now();
  headStartEnd = now + config.headStartMinutes * 60 * 1000;
  roundEnd = null;
  revealTimestamps = [];
  currentRevealIndex = 0;
  winner = null;
  pendingConfig = config;
  catchPending = false;

  intervalId = setInterval(tick, 2000);

  notifyHunters(`🏁 Game starting. Head start: ${config.headStartMinutes} min.`);
  console.log('Game started, head start until', new Date(headStartEnd).toLocaleTimeString());
}

function tick() {
  const now = Date.now();

  if (state === 'headstart') {
    if (now >= headStartEnd) {
      state = 'active';
      roundEnd = headStartEnd + pendingConfig.roundDurationMinutes * 60 * 1000;
      revealTimestamps = pendingConfig.revealIntervals.map(m => headStartEnd + m * 60 * 1000);
      currentRevealIndex = 0;

      notifyHunters(`🎯 Head start over! The hunt is on. Round ends at ${new Date(roundEnd).toLocaleTimeString()}.`);
      console.log('Head start ended, round active until', new Date(roundEnd).toLocaleTimeString());
      sendReveal();
    }
    return;
  }

  if (state !== 'active') return;

  if (now >= roundEnd) {
    endGame('hunters', 'Time ran out.');
    return;
  }

  if (currentRevealIndex < revealTimestamps.length && now >= revealTimestamps[currentRevealIndex]) {
    sendReveal();
    currentRevealIndex++;
  }

  checkObjectiveArrivals();
}

function sendReveal() {
  const targetTime = Date.now() - LOCATION_DELAY_MS;

  const closestPing = db.prepare(`
    SELECT * FROM runner_locations
    WHERE game_id = ?
    ORDER BY ABS(timestamp - ?)
    LIMIT 1
  `).get(currentGameId, targetTime);

  if (!closestPing) {
    console.log('No location data available yet for this reveal.');
    return;
  }

  const snapped = snapToGrid(closestPing.lat, closestPing.lng);

  db.prepare(`
   INSERT INTO reveals (game_id, runner_id, revealed_at, lat, lng, accuracy)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(currentGameId, closestPing.runner_id, Date.now(), snapped.lat, snapped.lng, closestPing.accuracy);

  const stations = nearestStations(snapped.lat, snapped.lng, 2);
  const mapsLink = `https://www.google.com/maps?q=${snapped.lat},${snapped.lng}`;
  const stationText = stations.map(s => `${s.name} (${Math.round(s.distance)}m)`).join(', ');
  const ageMinutes = Math.round((Date.now() - closestPing.timestamp) / 60000);

  const message = `📍 New location revealed!\n${mapsLink}\nPing from ${ageMinutes} min ago\nNearest stations: ${stationText}`;
  notifyHunters(message);

  console.log('Revealed:', snapped, `(${ageMinutes} min old)`);
}

function markObjectiveVisited(id) {
  if (state !== 'active') {
    return false;
  }

  const obj = objectives.find(o => o.id === id);
  if (!obj || obj.visited) return false;

  db.prepare('UPDATE objectives SET visited = 1 WHERE id = ?').run(id);
  obj.visited = 1;
  console.log(`Objective visited: ${obj.name}`);

  const remaining = objectives.filter(x => !x.visited);
  if (remaining.length === 1) {
    const last = remaining[0];
    notifyHunters(`🔥 FINALE! Only one objective left: ${last.name} — https://www.google.com/maps?q=${last.lat},${last.lng}`);
  } else if (remaining.length === 0 && (state !== 'idle' && state !== 'ended')) {
    endGame('runners', 'All objectives visited.');
  }
  return true;
}

function checkObjectiveArrivals() {
  const latest = db.prepare('SELECT * FROM runner_locations WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1').get(currentGameId);
  if (!latest) return;

  const unvisited = objectives.filter(o => !o.visited);
  if (unvisited.length === 0) return;

  for (const o of unvisited) {
    const dist = haversineMeters(latest.lat, latest.lng, o.lat, o.lng);
    if (dist <= OBJECTIVE_RADIUS_METERS) {
      markObjectiveVisited(o.id);
    }
  }
}

function endGame(who, reason) {
  state = 'ended';
  winner = who;
  clearInterval(intervalId);
  notifyHunters(`🏆 Game over — ${who} win! (${reason})`);
  console.log(`Game ended. Winner: ${who}. Reason: ${reason}`);
}

function requestCatch() {
  if (state !== 'active') return false;
  catchPending = true;
  return true;
}

function confirmCatch(wasCaught) {
  if (!catchPending) return false;
  catchPending = false;
  if (wasCaught) {
    endGame('hunters', 'Runners caught (confirmed by runner).');
  } else {
    notifyHunters('❌ Catch denied — runners say they were not actually caught. Keep looking!');
  }
  return true;
}

function isGameRunning() {
  return state === 'headstart' || state === 'active';
}

function stopGame() {
  if (state === 'idle' && state === 'ended') return false;
  endGame('none', 'Manually stopped by admin.');
  return true;
}

function getStatus() {
  const unvisited = objectives.filter(o => !o.visited);
  const finaleObjective = unvisited.length === 1 ? unvisited[0] : null;
  return { state, headStartEnd, roundEnd, winner, finaleObjective, catchPending };
}

function getCurrentGameId() { return currentGameId; }

module.exports = { startGame, getStatus, isGameRunning, stopGame, markObjectiveVisited, getCurrentGameId, requestCatch, confirmCatch };