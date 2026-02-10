import { useState } from 'react';
import MapView from './components/MapView';
import SnackSearch from './components/SnackSearch';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function exportToGPX(markers: any[], userPos: [number, number] | null) {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Snack Radar" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Snack Radar Export</name></metadata>`;

  markers.forEach(m => {
    const name = (m.name || 'Snack Spot').replace(/[<>&]/g, '');
    gpx += `
  <wpt lat="${m.lat}" lon="${m.lon}">
    <name>${name}</name>
    <desc>${m.tags?.shop || ''} ${m.is24h ? '24/7' : ''}</desc>
    <type>snack</type>
  </wpt>`;
  });

  if (userPos) {
    gpx += `
  <wpt lat="${userPos[0]}" lon="${userPos[1]}">
    <name>You are here</name>
    <type>start</type>
  </wpt>`;
  }
  gpx += '\n</gpx>';

  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `snack-radar-${new Date().toISOString().slice(0,10)}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}

function navigateTo(lat: number, lon: number, name: string, app: 'google' | 'osmand' | 'apple') {
  const encodedName = encodeURIComponent(name);
  let url = '';
  switch (app) {
    case 'google':
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving&avoid=tolls,highways&query=${encodedName}`;
      break;
    case 'osmand':
      url = `osmand://navigate?lat=${lat}&lon=${lon}&z=16&title=${encodedName}`;
      break;
    case 'apple':
      url = `maps://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`;
      break;
  }
  window.open(url, '_blank');
}

function App() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [snacks, setSnacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="app-container">
      <header>
        <h1>🍫 Snack Radar 🏍️</h1>
        <p>Find 24/7 konbini, candy, drinks, hot food — then ride there</p>
      </header>

      <SnackSearch
        onResults={(results, center) => {
          setSnacks(results);
          if (center) setPosition(center);
        }}
        setLoading={setLoading}
        setError={setError}
      />

      {error && <div className="error">{error}</div>}

      <main className="main-split">
        <div className="map-container">
          <MapView
            position={position}
            markers={snacks}
            userPosition={position}
            loading={loading}
          />
        </div>

        <div className="results-list">
          <h3>Found {snacks.length} snack spots</h3>
          {snacks.length === 0 ? (
            <p>Hit search above — then ride! 🍬</p>
          ) : (
            <ul>
              {snacks.map(m => {
                const dist = position
                  ? haversineDistance(position[0], position[1], m.lat, m.lon).toFixed(1)
                  : null;
                return (
                  <li key={m.id} className="result-item">
                    <div className="item-name">
                      {m.name}{' '}
                      {m.isOpenNow ? <span style={{ color: '#4caf50' }}>🟢 Open now!</span> : <span style={{ color: '#f44336' }}>🔴 Closed</span>}
                    </div>
                    <div className="item-info">
                      {m.tags?.shop || m.tags?.amenity || 'Spot'}
                      {dist && <span> • {dist} km</span>}
                      {m.openingHoursHuman && <div className="hours-summary">{m.openingHoursHuman}</div>}
                    </div>
                    <div className="item-tags">
                      {m.is24h && <span>🕛 </span>}
                      {m.hasToilet && <span>🚽 </span>}
                      {m.acceptsCard && <span>💳 </span>}
                      {m.hasAtm && <span>🏧 </span>}
                      {m.sellsCigarettes && <span>🚬 </span>}
                      {m.hasMicrowave && <span>🍜 </span>}
                      {m.outdoorSeating && <span>☀️ </span>}
                      {m.hasLottery && <span>🎟️ </span>}
                    </div>
                    <div className="nav-buttons">
                      <button onClick={() => navigateTo(m.lat, m.lon, m.name, 'google')}>🏍️ Google Maps</button>
                      <button onClick={() => navigateTo(m.lat, m.lon, m.name, 'osmand')}>📍 OsmAnd</button>
                      <button onClick={() => navigateTo(m.lat, m.lon, m.name, 'apple')}>🍎 Apple Maps</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {snacks.length > 0 && (
            <button className="export-btn" onClick={() => exportToGPX(snacks, position)}>
              Export to GPX → load in Garmin / OsmAnd / Rever
            </button>
          )}
        </div>
      </main>

      <footer>
        <small>Data from OpenStreetMap • Overpass API • Ride safe, stay sugared 🖤</small>
      </footer>
    </div>
  );
}

export default App;