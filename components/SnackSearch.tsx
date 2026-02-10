import { useState } from 'react';
import axios from 'axios';
import openingHours from 'opening_hours';

const CATEGORIES = [
  { label: "Convenience", query: 'shop=convenience' },
  { label: "Supermarket", query: 'shop=supermarket' },
  { label: "Candy / Sweets", query: 'shop=confectionery' },
  { label: "Bakery", query: 'shop=bakery' },
  { label: "Ice Cream", query: 'amenity=ice_cream' },
  { label: "Bubble Tea", query: 'shop=bubble_tea' },
  { label: "Beverage", query: 'shop=beverages' },
  { label: "Vending (any)", query: 'vending=*' },
];

const CONVENIENCE_CHAINS = [
  '7-Eleven', 'Seven Eleven', 'セブン-イレブン',
  'FamilyMart', 'ファミリーマート',
  'Lawson', 'ローソン',
  'Ministop', 'ミニストップ',
  'Daily Yamazaki', 'デイリーヤマザキ',
  'NewDays', 'New Days', 'NewDay',
  'Popura', 'ポプラ',
  'Seicomart', 'セイコーマート',
];

interface Props {
  onResults: (results: any[], center?: [number, number]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export default function SnackSearch({ onResults, setLoading, setError }: Props) {
  const [lat, setLat] = useState<number | ''>('');
  const [lon, setLon] = useState<number | ''>('');
  const [radius, setRadius] = useState(2000);

  const [selectedTypes, setSelectedTypes] = useState<string[]>(['shop=convenience']);
  const [onlyVending, setOnlyVending] = useState(false);
  const [onlyKonbiniChains, setOnlyKonbiniChains] = useState(false);

  const [only24h, setOnly24h] = useState(false);
  const [hasToilet, setHasToilet] = useState(false);
  const [acceptsCard, setAcceptsCard] = useState(false);
  const [hasParking, setHasParking] = useState(false);
  const [wheelchair, setWheelchair] = useState(false);
  const [outdoorSeating, setOutdoorSeating] = useState(false);
  const [hasHotFood, setHasHotFood] = useState(false);
  const [hasLottery, setHasLottery] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [sellsCigarettes, setSellsCigarettes] = useState(false);
  const [hasAtm, setHasAtm] = useState(false);
  const [hasMicrowave, setHasMicrowave] = useState(false);

  const getMyLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setLoading(false);
      },
      () => {
        setError("Couldn't get location. Enter coords manually.");
        setLoading(false);
      }
    );
  };

  const search = async () => {
    if (!lat || !lon) {
      setError("Need a location first");
      return;
    }
    if (selectedTypes.length === 0 && !onlyVending && !onlyKonbiniChains) {
      setError("Pick at least one type");
      return;
    }

    setLoading(true);
    setError(null);

    let baseQuery = '';
    if (onlyVending) {
      baseQuery = '"vending"=*';
    } else if (onlyKonbiniChains) {
      const chainConditions = CONVENIENCE_CHAINS.map(name =>
        `["brand"="${name}"] OR ["name"="${name}"] OR ["brand:en"="${name}"] OR ["name:en"="${name}"] OR ["brand:ja"="${name}"] OR ["name:ja"="${name}"]`
      ).join(' OR ');
      baseQuery = `shop=convenience AND (${chainConditions})`;
    } else {
      baseQuery = selectedTypes.map(q => `"${q}"`).join(' ');
    }

    const filters: string[] = [];
    if (only24h) filters.push('["opening_hours"="24/7"]');
    if (hasToilet) filters.push('["toilets"="yes"]');
    if (acceptsCard) filters.push('["payment:credit_cards"="yes"]');
    if (hasParking) filters.push('["parking"="yes"]');
    if (wheelchair) filters.push('["wheelchair"="yes"]');
    if (outdoorSeating) filters.push('["outdoor_seating"="yes"]');
    if (hasHotFood) filters.push('["takeaway"="yes"]');
    if (hasLottery) filters.push('["lottery"="yes"] OR ["shop"="lottery"]');
    if (sellsCigarettes) filters.push('["tobacco"="yes"] OR ["shop"="tobacco"] OR ["vending"="cigarettes"]');
    if (hasAtm) filters.push('["atm"="yes"]');
    if (hasMicrowave) filters.push('["microwave"="yes"]');

    const filterPart = filters.join('');
    const overpassQuery = `
      [out:json][timeout:30];
      (
        node[${baseQuery}${filterPart}](around:${radius},${lat},${lon});
        way[${baseQuery}${filterPart}](around:${radius},${lat},${lon});
        relation[${baseQuery}${filterPart}](around:${radius},${lat},${lon});
      );
      out center;
    `;

    try {
      const { data } = await axios.get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
      let results = data.elements.map((el: any) => {
        const tags = el.tags || {};
        let isOpenNow = false;
        let openingHoursHuman = '';

        if (tags.opening_hours) {
          try {
            const oh = new openingHours(tags.opening_hours);
            isOpenNow = oh.getState(new Date());
            openingHoursHuman = oh.prettifyValue();
          } catch (e) {}
        }

        return {
          id: el.id,
          lat: el.center?.lat ?? el.lat,
          lon: el.center?.lon ?? el.lon,
          name: tags.name || tags.brand || tags.operator || (tags.vending ? `Vending: ${tags.vending}` : 'Snack Spot'),
          tags,
          is24h: tags.opening_hours === '24/7',
          hasToilet: tags.toilets === 'yes',
          acceptsCard: tags['payment:credit_cards'] === 'yes',
          hasParking: tags.parking === 'yes',
          wheelchair: tags.wheelchair === 'yes',
          isVending: !!tags.vending,
          outdoorSeating: tags.outdoor_seating === 'yes',
          hasHotFoodProxy: tags.takeaway === 'yes',
          hasLottery: tags.lottery === 'yes' || tags.shop === 'lottery',
          sellsCigarettes: tags.tobacco === 'yes' || tags.shop === 'tobacco' || tags.vending === 'cigarettes',
          hasAtm: tags.atm === 'yes',
          hasMicrowave: tags.microwave === 'yes',
          brand: tags.brand || tags['brand:en'] || tags.name || '',
          openingHours: tags.opening_hours,
          isOpenNow,
          openingHoursHuman,
        };
      });

      if (openNow) {
        results = results.filter((m: any) => m.isOpenNow);
      }

      onResults(results, [Number(lat), Number(lon)]);
    } catch (err) {
      setError("Overpass API error — try smaller radius");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-panel">
      <div className="location-row">
        <button onClick={getMyLocation}>📍 Use my location</button>
        <div><label>Lat</label><input type="number" step="any" value={lat} onChange={e => setLat(e.target.value ? Number(e.target.value) : '')} placeholder="-36.8485" /></div>
        <div><label>Lon</label><input type="number" step="any" value={lon} onChange={e => setLon(e.target.value ? Number(e.target.value) : '')} placeholder="174.7633" /></div>
      </div>

      <div className="radius-row">
        <label>Radius: {radius / 1000} km</label>
        <input type="range" min="500" max="10000" step="500" value={radius} onChange={e => setRadius(Number(e.target.value))} />
      </div>

      <div className="categories">
        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Type</div>
        {!onlyVending && !onlyKonbiniChains && CATEGORIES.map(cat => (
          <label key={cat.label}>
            <input type="checkbox" checked={selectedTypes.includes(cat.query)}
              onChange={() => setSelectedTypes(prev => prev.includes(cat.query) ? prev.filter(q => q !== cat.query) : [...prev, cat.query])} />
            {cat.label}
          </label>
        ))}
        <label style={{ marginLeft: '1.5rem', fontWeight: onlyVending ? 'bold' : 'normal', color: onlyVending ? '#ff9800' : 'inherit' }}>
          <input type="checkbox" checked={onlyVending} onChange={() => { setOnlyVending(p => !p); if (!onlyVending) { setSelectedTypes([]); setOnlyKonbiniChains(false); } }} />
          Only vending machines
        </label>
        <label style={{ marginLeft: '1.5rem', fontWeight: onlyKonbiniChains ? 'bold' : 'normal', color: onlyKonbiniChains ? '#e91e63' : 'inherit' }}>
          <input type="checkbox" checked={onlyKonbiniChains} onChange={() => { setOnlyKonbiniChains(p => !p); if (!onlyKonbiniChains) { setSelectedTypes([]); setOnlyVending(false); } }} />
          Only Japanese konbini
        </label>
      </div>

      <div className="filters-row">
        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Filters</div>
        <label><input type="checkbox" checked={only24h} onChange={e => setOnly24h(e.target.checked)} /> 24/7 🕛</label>
        <label><input type="checkbox" checked={openNow} onChange={e => setOpenNow(e.target.checked)} /> Open now ⏰</label>
        <label><input type="checkbox" checked={outdoorSeating} onChange={e => setOutdoorSeating(e.target.checked)} /> Outdoor seating ☀️</label>
        <label><input type="checkbox" checked={hasHotFood} onChange={e => setHasHotFood(e.target.checked)} /> Hot food 🔥</label>
        <label><input type="checkbox" checked={hasLottery} onChange={e => setHasLottery(e.target.checked)} /> Lottery 🎟️</label>
        <label><input type="checkbox" checked={hasToilet} onChange={e => setHasToilet(e.target.checked)} /> Toilet 🚽</label>
        <label><input type="checkbox" checked={acceptsCard} onChange={e => setAcceptsCard(e.target.checked)} /> Credit cards 💳</label>
        <label><input type="checkbox" checked={hasParking} onChange={e => setHasParking(e.target.checked)} /> Parking 🚗</label>
        <label><input type="checkbox" checked={wheelchair} onChange={e => setWheelchair(e.target.checked)} /> Wheelchair ♿</label>
        <label><input type="checkbox" checked={sellsCigarettes} onChange={e => setSellsCigarettes(e.target.checked)} /> Cigarettes 🚬</label>
        <label><input type="checkbox" checked={hasAtm} onChange={e => setHasAtm(e.target.checked)} /> ATM 🏧</label>
        <label><input type="checkbox" checked={hasMicrowave} onChange={e => setHasMicrowave(e.target.checked)} /> Microwave 🍜</label>
      </div>

      <button className="search-btn" onClick={search} disabled={(!onlyVending && !onlyKonbiniChains && selectedTypes.length === 0) || !lat || !lon}>
        🍬 Hunt Snacks!
      </button>
    </div>
  );
}