// server/game.js
const db = require('./db');

let startTime;
let futureRevealTimes;
let nextRevealTime;

function startGame(revealTimings) {
    startTime = Date.now();
    futureRevealTimes = calculateRevealTimestamps(revealTimings);
    nextRevealTime = futureRevealTimes[0];

    setInterval(checkIfRevealTimeHasPassed, 5000);
}

function checkIfRevealTimeHasPassed() {
    if (nextRevealTime === undefined) return;

    if (Date.now() > nextRevealTime) {
        sendReveal();
        const currentIndex = futureRevealTimes.indexOf(nextRevealTime);
        nextRevealTime = futureRevealTimes[currentIndex + 1];
    }
}

function calculateRevealTimestamps(revealTimings) {
    const revealTimestamps = [];

    revealTimings.forEach(timing => {
        revealTimestamps.push(startTime + timing * 60 * 1000);
    });

    return revealTimestamps;
}

const { notifyHunters } = require('./telegram');
const { nearestStations } = require('./stations');

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

    const snapped = snapToGrid(closestPing.lat, closestPing.lng, 50);
    const stations = nearestStations(snapped.lat, snapped.lng, 2);

    db.prepare(`
        INSERT INTO reveals (runner_id, revealed_at, lat, lng, accuracy)
        VALUES (?, ?, ?, ?, ?)
    `).run(closestPing.runner_id, Date.now(), snapped.lat, snapped.lng, closestPing.accuracy);

    const mapsLink = `https://www.google.com/maps?q=${snapped.lat},${snapped.lng}`;
    const stationText = stations.map(s => `${s.name} (${Math.round(s.distance)}m)`).join(', ');

    const message = `📍 <b>New location revealed!</b>\n${mapsLink}\nNearest stations: ${stationText}`;
    notifyHunters(message);

    console.log('Revealed:', snapped);
}

module.exports = { startGame };