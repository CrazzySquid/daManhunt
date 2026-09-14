const SCHEDULE_DISPLAY_MODE = 'clock'; //or clock
let scheduleExpanded = false;

function shortTime(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function relativeTime(ms) {
    const minutes = Math.round((Date.now() - ms) / 60000);
    if (minutes < 1) return 'just now';
    return `${minutes} min ago`;
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingCompass(lat1, lng1, lat2, lng2) {
    const toRad = deg => deg * Math.PI / 180;
    const dLng = toRad(lng2 - lng1);
    const y = Math.sin(dLng) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(bearing / 45) % 8];
}

function formatScheduleTime(ts, status) {
    if (SCHEDULE_DISPLAY_MODE === 'clock') {
        return shortTime(ts);
    }
    const elapsedMin = Math.round((ts - status.headStartEnd) / 60000);
    return `${elapsedMin}. Min.`;
}

function toggleSchedule() {
    scheduleExpanded = !scheduleExpanded;
}

function renderScheduleHTML(status) {
    if (!status.revealTimestamps || status.revealTimestamps.length === 0) return '';
    const now = Date.now();

    const labels = status.revealTimestamps.map((ts, i) => {
        const done = i < status.currentRevealIndex;
        const isNext = i === status.currentRevealIndex;
        let text;

        if (isNext) {
            const minsLeft = Math.max(0, Math.round((ts - now) / 60000));
            text = formatScheduleTime(ts, status) + ` (in ${minsLeft}min)`;
        } else {
            text = formatScheduleTime(ts, status);
        }

        return { text, done, isNext };
    });

    if (scheduleExpanded) {
        const spans = labels.map(l => `<span style="${l.done ? 'opacity:0.4;' : 'font-weight:bold;'}">${l.text}</span>`);
        return `<div class="scheduleScroll" onclick="toggleSchedule()">${spans.join(' . ')}</div>`;
    }

    const lastDoneIndex = labels.findLastIndex ? labels.findLastIndex(l => l.done) : (() => {
        let idx = -1;
        labels.forEach((l, i) => { if (l.done) idx = i; });
        return idx;
    })();
    const visible = labels.slice(Math.max(0, lastDoneIndex), labels.length);
    const spans = visible.map(l => `<span style="${l.done ? 'opacity:0.4;' : 'font-weight:bold;'}">${l.text}</span>`);
    return `<div class="scheduleScroll collapsed" onclick="toggleSchedule()">${spans.join(' · ')}</div>`;
}