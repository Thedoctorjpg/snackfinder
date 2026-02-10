import { useState } from 'react'
import MapView from './components/MapView'
import SnackSearch from './components/SnackSearch'
import './App.css'

function App() {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [snacks, setSnacks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="app-container">
      <header>
        <h1>🍫 Snack Radar 🍦</h1>
        <p>Find snacks, candy, drinks, bubble tea, convenience stores near you</p>
      </header>

      <SnackSearch
        onResults={(results, center) => {
          setSnacks(results)
          if (center) setPosition(center)
        }}
        setLoading={setLoading}
        setError={setError}
      />

      {error && <div className="error">{error}</div>}

      <main>
        <MapView
          position={position}
          markers={snacks}
          loading={loading}
        />
      </main>

      <footer>
        <small>Data from OpenStreetMap • Overpass API • Not all shops are tagged 😿</small>
      </footer>
    </div>
  )
}

export default App