
const ALL_LOCATIONS = [
  { name: 'Stephansdom', lat: 48.2084114, lng: 16.3734707 },
  { name: 'Hbf McDonald\'s', lat: 48.1854446, lng: 16.3752193 },
  { name: 'Maria-Theresien-Platz Denkmal', lat: 48.204495, lng: 16.3607676 },
  { name: 'TU Wien Karlsplatz', lat: 48.1989781, lng: 16.3699152 },
  { name: 'McFit Jägerstraße', lat: 48.236598, lng: 16.370666 },
  { name: 'Schloss Schönbrunn', lat: 48.1858124, lng: 16.3127641 },
  { name: 'Prater Riesenrad', lat: 48.2166995, lng: 16.3959008 },
  //{ name: 'Staatsoper', lat: 48.2034306, lng: 16.3692034 },
  { name: 'Stadtbücherei (Rooftop)', lat: 48.2025768, lng: 16.3374857 },
  { name: 'Türkis Meidling Bhf', lat: 48.1744667, lng: 16.3319486 },
  { name: 'Haus des Meeres', lat: 48.1976502, lng: 16.3528868 },
  { name: 'Johannes Nepomuk Statue', lat: 48.2196046, lng: 16.3683203 },
  //{ name: 'Johannes-Nepomuk-Kapelle', lat: 48.2187451, lng: 16.3714615 },
  { name: 'Magic Corner', lat: 48.2292722, lng: 16.356622 },
  { name: 'Starbucks Landstr. Draußen', lat: 48.2058711, lng: 16.3858681 },
  { name: 'Billa Imamovic', lat: 48.1860217, lng: 16.4139363 },
  { name: 'Rosensteingasse Schule', lat: 48.22139, lng: 16.32638 }

 // { name: 'Naschmarkt', lat: 48.1984, lng: 16.3651 },
 // { name: 'Rathaus', lat: 48.2107, lng: 16.3564 },
 // { name: 'Belvedere Palace', lat: 48.1913, lng: 16.3799 },
  //{ name: 'Votivkirche', lat: 48.2153, lng: 16.3603 }
];

function pickRandomObjectives(count = 3) {
  const shuffled = [...ALL_LOCATIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { ALL_LOCATIONS, pickRandomObjectives };