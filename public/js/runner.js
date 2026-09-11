const runnerId = 'runners';
const pingNote = document.getElementById('pingNote');
const wakeNote = document.getElementById('wakeNote');
let lastPingTime = null;
let currentState = 'idle';

// ---- Wake lock ----
let wakeLock = null;

async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeNote.textContent = '🔒 Screen staying awake';
        wakeNote.classList.remove('warningNote');
        wakeLock.addEventListener('release', () => {
            wakeNote.textContent = '⚠️ Wake lock inactive';
            wakeNote.classList.add('warningNote');
        });
    } catch (err) {
        wakeNote.textContent = '⚠️ Wake lock unavailable';
        wakeNote.classList.add('warningNote');
    }
}

document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
});

requestWakeLock();

// ---- Pings ----
function updatePingNote(success) {
    const now = new Date();
    if (success) {
        lastPingTime = now;
        pingNote.textContent = `Last ping: ${shortTime(now.getTime())}`;
        pingNote.classList.remove('warningNote');
    }
    checkPingStaleness();
}

function checkPingStaleness() {
    if (!lastPingTime) return;
    const ageSeconds = (Date.now() - lastPingTime.getTime()) / 1000;
    if (ageSeconds > 60) {
        pingNote.classList.add('warningNote');
    }
}

function sendPing() {
    navigator.geolocation.getCurrentPosition(pos => {
        fetch('/api/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                runner_id: runnerId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy
            })
        }).then(res => updatePingNote(res.ok))
            .catch(() => updatePingNote(false));
    }, () => updatePingNote(false));
}

sendPing();
setInterval(sendPing, 10000);
setInterval(checkPingStaleness, 5000);

// ---- Game state ----
async function refreshGameState() {
    try {
        const res = await fetch('/api/game/status');
        const status = await res.json();
        currentState = status.state;
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

        if (status.catchPending && !window.catchPromptShown) {
            window.catchPromptShown = true;
            const confirmed = confirm("A hunter says you've been caught. Is that true?");
            fetch('/api/game/catch/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wasCaught: confirmed })
            }).then(() => { window.catchPromptShown = false; });
        }

        const showExtras = status.state === 'active' || status.state === 'ended';
        document.getElementById('objectivesCard').style.display = showExtras ? 'block' : 'none';
        document.getElementById('revealCard').style.display = showExtras ? 'block' : 'none';
        if (showExtras) {
            loadObjectives();
            loadLastReveal();
        }
    } catch (err) {
        console.error('Game status error:', err);
    }
}

refreshGameState();
setInterval(refreshGameState, 1000);

// ---- Objectives ----
async function loadObjectives() {
    const res = await fetch('/api/objectives');
    const objectives = await res.json();
    const list = document.getElementById('objectivesList');
    list.innerHTML = '';

    objectives.forEach(o => {
        const li = document.createElement('li');
        li.className = 'objectiveItem';

        const stationText = o.nearestStations && o.nearestStations.length
            ? o.nearestStations.map(s => s.name).join(', ')
            : '';

        li.innerHTML = `<div>${o.name}<br><small style="opacity:0.7;">${stationText}</small></div>`;

        if (o.visited) {
            li.innerHTML += `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (currentState === 'active') {
            const btn = document.createElement('button');
            btn.textContent = 'There!';
            btn.className = 'secondaryButton';
            btn.onclick = () => confirmVisit(o.id);
            li.appendChild(btn);
        } else {
            li.innerHTML += `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        }
        list.appendChild(li);
    });
}

function confirmVisit(id) {
    const sure = confirm(
        "Are you sure you want to mark this as visited?\n\n" +
        "Make sure you've sent a picture first.\n" +
        "Usually if you're actually there, this happens automatically — " +
        "you shouldn't need to tap this."
    );
    if (!sure) return;
    fetch(`/api/objectives/${id}/visit`, { method: 'POST' }).then(loadObjectives);
}

// ---- Last reveal (own history) ----
async function loadLastReveal() {
    try {
        const res = await fetch('/api/reveals/latest');
        if (!res.ok) return;
        const reveal = await res.json();
        const mapsLink = `https://www.google.com/maps?q=${reveal.lat},${reveal.lng}`;
        document.getElementById('revealInfo').innerHTML =
            `You were revealed at ${shortTime(reveal.revealed_at)}<br>(${relativeTime(reveal.revealed_at)})<br><br>` +
            `<a href="${mapsLink}" target="_blank">View on map</a>`;
    } catch (err) {
        console.error('Reveal fetch error:', err);
    }
}