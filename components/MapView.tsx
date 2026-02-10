import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

interface Props {
  position: [number, number] | null;
  markers: any[];
  userPosition: [number, number] | null;
  loading: boolean;
}

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

function CenterMap({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (position) map.setView(position, 15); }, [position, map]);
  return null;
}

const getMarkerIcon = (marker: any) => {
  const brand = (marker.brand || '').toLowerCase();
  if (brand.includes('7-eleven') || brand.includes('セブン')) return L.divIcon({ className: 'custom-marker seven', html: '<span style="font-size:28px;">🟢</span>', iconSize: [32, 32], iconAnchor: [16, 32] });
  if (brand.includes('familymart') || brand.includes('ファミリー')) return L.divIcon({ className: 'custom-marker family', html: '<span style="font-size:28px;">🔵</span>', iconSize: [32, 32], iconAnchor: [16, 32] });
  if (brand.includes('lawson') || brand.includes('ローソン')) return L.divIcon({ className: 'custom-marker lawson', html: '<span style="font-size:28px;">🔴</span>', iconSize: [32, 32], iconAnchor: [16, 32] });
  return new L.Icon.Default();
};

export default function MapView({ position, markers, userPosition, loading }: Props) {
  const defaultCenter: [number, number] = [-36.8485, 174.7633]; // Auckland NZ

  return (
    <div className="map-wrapper">
      {loading && <div className="loading-overlay">Hunting snacks... 🍫</div>}
      <MapContainer center={position || defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {position && <Marker position={position}><Popup>You are here! 🏍️</Popup></Marker>}
        {markers.map(m => (
          <Marker key={m.id} position={[m.lat, m.lon]} icon={getMarkerIcon(m)}>
            <Popup>
              <strong>{m.name}</strong><br />
              {m.tags?.shop && <>{m.tags.shop}<br /></>}
              {m.isVending && m.tags?.vending && <>Vending: {m.tags.vending}<br /></>}
              {m.brand && <><small>Brand: {m.brand}</small><br /></>}

              <div style={{ marginTop: '8px', fontSize: '0.95em', lineHeight: '1.5' }}>
                {m.isOpenNow ? <div style={{ color: '#4caf50' }}>🟢 Open now!</div> : <div style={{ color: '#f44336' }}>🔴 Closed</div>}
                {m.openingHoursHuman && <div>Hours: {m.openingHoursHuman}</div>}
                {m.is24h && <div>🕛 24/7</div>}
                {m.hasToilet && <div>🚽 Toilet</div>}
                {m.acceptsCard && <div>💳 Cards</div>}
                {m.hasAtm && <div>🏧 ATM inside</div>}
                {m.sellsCigarettes && <div>🚬 Cigarettes</div>}
                {m.hasMicrowave && <div>🍜 Microwave</div>}
                {m.outdoorSeating && <div>☀️ Outdoor seating</div>}
                {m.hasLottery && <div>🎟️ Lottery</div>}
              </div>

              {userPosition && (
                <div style={{ color: '#ffeb3b', marginTop: '6px' }}>
                  📍 {haversineDistance(userPosition[0], userPosition[1], m.lat, m.lon).toFixed(1)} km away
                </div>
              )}
            </Popup>
          </Marker>
        ))}
        <CenterMap position={position} />
      </MapContainer>
    </div>
  );
}