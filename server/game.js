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

    console.log('Revealed:', closestPing);
}

module.exports = { startGame };