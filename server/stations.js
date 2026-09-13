// server/stations.js
const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/stations.json')));

const seenNames = new Set();
const stations = raw.features
  .filter(f => f.properties.name)
  .map(f => ({
    name: f.properties.name,
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0]
  }))
  .filter(s => {
    if (seenNames.has(s.name)) return false;
    seenNames.add(s.name);
    return true;
  });

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestStations(lat, lng, count = 2) {
  return stations
    .map(s => ({ ...s, distance: haversineMeters(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

const rawTram = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/tramStations.json')));

const seenTramNames = new Set();
const tramStations = rawTram.features
  .filter(f => f.properties.name)
  .map(f => ({ name: f.properties.name, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }))
  .filter(s => {
    if (seenTramNames.has(s.name)) return false;
    seenTramNames.add(s.name);
    return true;
  });

function nearestOfList(list, lat, lng, count = 1) {
  return list
    .map(s => ({ ...s, distance: haversineMeters(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

function nearestMixed(lat, lng) {
  const nearestU = nearestOfList(stations, lat, lng, 1)[0];
  const nearestTram = nearestOfList(tramStations, lat, lng, 1)[0];
  const result = [];
  if (nearestU) result.push({ ...nearestU, type: 'U' });
  if (nearestTram) result.push({ ...nearestTram, type: 'Tram' });
  return result;
}

module.exports = { nearestStations, nearestMixed };