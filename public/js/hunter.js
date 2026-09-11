let hunterLat = null;
let hunterLng = null;
let lastRevealId = null;
let lastRevealData = null;

navigator.geolocation.watchPosition(pos => {
    hunterLat = pos.coords.latitude;
    hunterLng = pos.coords.longitude;
}, err => console.error('Hunter geolocation error:', err));

function renderReveal() {
    if (!lastRevealData) return;
    const reveal = lastRevealData;
    const mapsLink = `https://www.google.com/maps?q=${reveal.lat},${reveal.lng}`;
    let html = `<strong>Revealed at ${shortTime(reveal.revealed_at)}</strong><br>(${relativeTime(reveal.revealed_at)})<br><br>`;
    html += `<a href="${mapsLink}" target="_blank">Open in Google Maps</a><br>`;

    if (hunterLat !== null) {
        const dist = Math.round(haversineMeters(hunterLat, hunterLng, reveal.lat, reveal.lng));
        const dir = bearingCompass(hunterLat, hunterLng, reveal.lat, reveal.lng);
        html += `≈${dist}m ${dir} of you<br>`;
    }

    if (reveal.nearestStations && reveal.nearestStations.length) {
        html += 'Nearest stations: ' + reveal.nearestStations.map(s => `${s.name} (${Math.round(s.distance)}m)`).join(', ');
    }

    document.getElementById('revealInfo').innerHTML = html;
}

async function checkForReveal() {
    try {
        const res = await fetch('/api/reveals/latest');
        if (!res.ok) return;
        const reveal = await res.json();
        document.getElementById('revealCard').style.display = 'block';

        if (reveal.id !== lastRevealId) {
            lastRevealId = reveal.id;
            lastRevealData = reveal;
            loadHistory();
        }
        renderReveal();
    } catch (err) {
        console.error('Error checking reveal:', err);
    }
}

async function loadHistory() {
    try {
        const res = await fetch('/api/reveals/history');
        const reveals = await res.json();
        if (reveals.length <= 1) return;

        const historyCard = document.getElementById('historyCard');
        const list = document.getElementById('historyList');
        list.innerHTML = '';

        reveals.slice(1).forEach(r => {
            const li = document.createElement('li');
            li.className = 'objectiveItem';
            const mapsLink = `https://www.google.com/maps?q=${r.lat},${r.lng}`;
            li.innerHTML = `${shortTime(r.revealed_at)} — <a href="${mapsLink}" target="_blank">map</a>`;
            list.appendChild(li);
        });

        historyCard.style.display = 'block';
    } catch (err) {
        console.error('History fetch error:', err);
    }
}

checkForReveal();
setInterval(checkForReveal, 5000);
setInterval(renderReveal, 3000);

// ---- Game state + finale ----
async function refreshGameState() {
    try {
        const res = await fetch('/api/game/status');
        const status = await res.json();
        const now = Date.now();
        const stateEl = document.getElementById('gameStateText');

        if (status.state === 'idle') {
            stateEl.textContent = 'No game running';
        } else if (status.state === 'headstart') {
            const remaining = Math.max(0, Math.round((status.headStartEnd - now) / 1000));
            stateEl.textContent = `Head start — ${formatTime(remaining)} remaining`;
        } else if (status.state === 'active') {
            const remaining = Math.max(0, Math.round((status.roundEnd - now) / 1000));
            stateEl.textContent = `Round active — ${formatTime(remaining)} remaining`;
        } else if (status.state === 'ended') {
            stateEl.textContent = `Game over — ${status.winner} win!`;
        }

        const finaleCard = document.getElementById('finaleCard');
        if (status.finaleObjective) {
            const o = status.finaleObjective;
            const mapsLink = `https://www.google.com/maps?q=${o.lat},${o.lng}`;
            document.getElementById('finaleInfo').innerHTML =
                `Only one objective left: <strong>${o.name}</strong><br><a href="${mapsLink}" target="_blank">Open in Google Maps</a>`;
            finaleCard.style.display = 'block';
        } else {
            finaleCard.style.display = 'none';
        }

        catchBtnCard.style.display = status.state === 'active' ? 'block' : 'none';

    } catch (err) {
        console.error('Game status error:', err);
    }
}

document.getElementById('catchBtn').addEventListener('click', () => {
    const sure = confirm("Are you sure? This will ask the runners to confirm they were caught.");
    if (!sure) return;

    fetch('/api/game/catch', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            if (!data.ok) alert('Could not send catch request (is a round actually active?)');
        });
});

refreshGameState();
setInterval(refreshGameState, 1000);