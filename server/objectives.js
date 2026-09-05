// server/objectives.js
const ALL_LOCATIONS = [
  { name: 'Stephansplatz', lat: 48.2082, lng: 16.3738 },
  { name: 'Prater', lat: 48.2165, lng: 16.3958 },
  { name: 'Schönbrunn', lat: 48.1847, lng: 16.3122 },
  { name: 'Naschmarkt', lat: 48.1984, lng: 16.3651 },
  { name: 'Donauinsel', lat: 48.2333, lng: 16.4167 },
  { name: 'Karlsplatz', lat: 48.1986, lng: 16.3721 },
  { name: 'MuseumsQuartier', lat: 48.2033, lng: 16.3593 },
  { name: 'Rathaus', lat: 48.2107, lng: 16.3564 },
  { name: 'Belvedere', lat: 48.1913, lng: 16.3799 },
  { name: 'Votivkirche', lat: 48.2153, lng: 16.3603 },
  // add more of your own — I'd get this to ~20 total, pick spots you actually know
];

function pickRandomObjectives(count = 3) {
  const shuffled = [...ALL_LOCATIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { ALL_LOCATIONS, pickRandomObjectives };