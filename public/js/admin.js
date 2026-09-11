async function refreshGameState() {
    try {
        const res = await fetch('/api/game/status');
        const status = await res.json();
        const now = Date.now();
        const stateEl = document.getElementById('gameStateText');
        if (status.state === 'idle') stateEl.textContent = 'No game running';
        else if (status.state === 'headstart') stateEl.textContent = `Head start — ${formatTime(Math.max(0, Math.round((status.headStartEnd - now) / 1000)))} remaining`;
        else if (status.state === 'active') stateEl.textContent = `Round active — ${formatTime(Math.max(0, Math.round((status.roundEnd - now) / 1000)))} remaining`;
        else if (status.state === 'ended') stateEl.textContent = `Game over — ${status.winner} win!`;
    } catch (err) { console.error(err); }
}
refreshGameState();
setInterval(refreshGameState, 1000);

let presets = {};

async function loadPresets() {
    const res = await fetch('/api/presets');
    presets = await res.json();
    applyPreset('balanced');
}

function applyPreset(name) {
    if (name === 'custom') return;
    const p = presets[name];
    if (!p) return;
    document.getElementById('headStartInput').value = p.headStartMinutes;
    document.getElementById('roundDurationInput').value = p.roundDurationMinutes;
    document.getElementById('objectiveCountInput').value = p.objectiveCount;
    document.getElementById('revealIntervalsInput').value = p.revealIntervals.join(',');
}

document.getElementById('presetSelect').addEventListener('change', (e) => {
    applyPreset(e.target.value);
});

function checkScheduleFits() {
    const roundDuration = parseFloat(document.getElementById('roundDurationInput').value);
    const intervals = document.getElementById('revealIntervalsInput').value
        .split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const total = intervals.reduce((a, b) => a + b, 0);
    const warningEl = document.getElementById('scheduleWarning');

    if (!roundDuration || intervals.length === 0) {
        warningEl.textContent = '';
        return;
    }

    const diff = roundDuration - total;
    if (diff < 0) {
        warningEl.textContent = `⚠️ Schedule is ${Math.abs(diff).toFixed(1)} min too long.`;
    } else {
        warningEl.textContent = `✅ Fits, ${diff.toFixed(1)} min to spare.`;
    }
}

document.getElementById('revealIntervalsInput').addEventListener('input', checkScheduleFits);
document.getElementById('roundDurationInput').addEventListener('input', checkScheduleFits);

document.getElementById('gameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('statusMsg');

    const revealIntervals = document.getElementById('revealIntervalsInput').value
        .split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

    const payload = {
        headStartMinutes: parseFloat(document.getElementById('headStartInput').value),
        roundDurationMinutes: parseFloat(document.getElementById('roundDurationInput').value),
        objectiveCount: parseInt(document.getElementById('objectiveCountInput').value),
        revealIntervals
    };

    try {
        const res = await fetch('/api/game/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            statusEl.textContent = 'Error: ' + (data.error || 'unknown');
            return;
        }
        statusEl.textContent = `Game started at ${shortTime(data.started)}`;
    } catch (err) {
        statusEl.textContent = 'Request failed: ' + err.message;
    }
});

loadPresets();