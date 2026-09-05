// server/game.js
const db = require('./db');
const { notifyHunters } = require('./telegram');
const { nearestStations } = require('./stations');

let startTime;
let futureRevealTimes;
let nextRevealTime;
let intervalId = null;
// server/game.js
let currentRevealIndex = 0;

function startGame(revealTimings) {
    if (intervalId) clearInterval(intervalId);

    startTime = Date.now();
    futureRevealTimes = calculateRevealTimestamps(revealTimings);
    currentRevealIndex = 0;
    nextRevealTime = futureRevealTimes[currentRevealIndex];

    intervalId = setInterval(checkIfRevealTimeHasPassed, 5000);
}

function checkIfRevealTimeHasPassed() {
    if (nextRevealTime === undefined) return;

    if (Date.now() > nextRevealTime) {
        sendReveal();
        currentRevealIndex++;
        nextRevealTime = futureRevealTimes[currentRevealIndex]; // undefined once past the end — handled above
    }
}

function calculateRevealTimestamps(revealTimings) {
    const revealTimestamps = [];

    revealTimings.forEach(timing => {
        revealTimestamps.push(startTime + timing * 60 * 1000);
    });

    return revealTimestamps;
}

function sendReveal() {
    const targetTime = Date.now() - 2 * 60 * 1000;

    const closestPing = db.prepare(`
        SELECT * FROM runner_locations
        ORDER BY ABS(timestamp - ?)
        LIMIT 1
    `).get(targetTime);

    if (!closestPing) {
        console.log('No location data available yet for this reveal.');
        return;
    }

    db.prepare(`
        INSERT INTO reveals (runner_id, revealed_at, lat, lng, accuracy)
        VALUES (?, ?, ?, ?, ?)
    `).run(closestPing.runner_id, Date.now(), closestPing.lat, closestPing.lng, closestPing.accuracy);

    const stations = nearestStations(closestPing.lat, closestPing.lng, 2);
    const mapsLink = `https://www.google.com/maps?q=${closestPing.lat},${closestPing.lng}`;
    const stationText = stations.map(s => `${s.name} (${Math.round(s.distance)}m)`).join(', ');
    const message = `📍 New location revealed!\n${mapsLink}\nNearest stations: ${stationText}`;

    notifyHunters(message);

    console.log('Revealed:', closestPing);
}

module.exports = { startGame };