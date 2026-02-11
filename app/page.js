'use client';

import { useEffect, useState } from 'react';
import { findGoodWindows, getConditionLabel, formatTimeRange } from '@/lib/windLogic';

export default function Home() {
  const [minWind, setMinWind] = useState(12);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [goodWindows, setGoodWindows] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch forecast on mount
  useEffect(() => {
    fetchForecast();
    const interval = setInterval(fetchForecast, 30 * 60 * 1000); // Refresh every 30 min
    return () => clearInterval(interval);
  }, []);

  // Recalculate windows when minWind changes
  useEffect(() => {
    if (forecast) {
      const windows = findGoodWindows(forecast.hourly, minWind);
      setGoodWindows(windows.slice(0, 7)); // Show top 7 windows
    }
  }, [minWind, forecast]);

  async function fetchForecast() {
    try {
      setLoading(true);
      const res = await fetch('/api/forecast');
      if (!res.ok) throw new Error('Failed to fetch forecast');
      const { data } = await res.json();
      setForecast(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const currentConditions = forecast?.hourly[0];

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-blue-900/30 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold gradient-text mb-2">PronoHH 🌊</h1>
          <p className="text-gray-400 text-lg">Wind forecast for Rio de la Plata sailors</p>
          {lastUpdate && (
            <p className="text-gray-600 text-sm mt-2">
              Last update: {lastUpdate.toLocaleTimeString('es-AR')}
            </p>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-red-900/20 border border-red-900/50 text-red-300 p-4 mx-4 my-4 rounded">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="max-w-5xl mx-auto py-12 px-4 text-center">
          <p className="text-gray-400">Loading forecast...</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Wind Threshold Slider */}
          <section className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-6 mb-8">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-300 mb-4">
                Minimum Wind Speed: <span className="text-cyan-400 text-lg">{minWind} knots</span>
              </label>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={minWind}
                onChange={(e) => setMinWind(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>5 knots</span>
                <span>40 knots</span>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Looking for SE winds (112.5°–157.5°) with &lt;20% rain chance
            </p>
          </section>

          {/* Current Conditions */}
          {currentConditions && (
            <section className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">Right Now</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Wind Speed</p>
                  <p className="text-2xl font-bold text-cyan-400">{currentConditions.wind_speed} kts</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Direction</p>
                  <p className="text-2xl font-bold text-cyan-400">{currentConditions.wind_deg}°</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Temperature</p>
                  <p className="text-2xl font-bold text-cyan-400">{currentConditions.temp}°C</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Conditions</p>
                  <p className="text-2xl font-bold text-cyan-400">{currentConditions.description}</p>
                </div>
              </div>
            </section>
          )}

          {/* Good Windows */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-6 border-b border-blue-900/30 pb-4">
              Next Good Windows
            </h2>
            {goodWindows.length === 0 ? (
              <div className="bg-yellow-900/10 border border-yellow-900/30 rounded-lg p-6 text-center">
                <p className="text-yellow-300 text-lg font-semibold">
                  No good windows in the next 5 days at {minWind}+ knots SE wind
                </p>
                <p className="text-gray-400 text-sm mt-2">Try lowering the wind threshold</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {goodWindows.map((window, idx) => {
                  const label = getConditionLabel(parseFloat(window.avgWind), minWind);
                  const labelColor =
                    label === 'GO'
                      ? 'text-green-400 bg-green-900/20'
                      : label === 'MAYBE'
                      ? 'text-yellow-400 bg-yellow-900/20'
                      : 'text-red-400 bg-red-900/20';

                  return (
                    <div
                      key={idx}
                      className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-4 hover:bg-blue-900/20 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-gray-400 text-sm">
                            {formatTimeRange(window.startTime, window.endTime)}
                          </p>
                          <p className="text-lg font-semibold text-white mt-1">
                            {window.duration}h window • Avg {window.avgWind} knots
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded font-bold text-sm ${labelColor}`}>
                          {label}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Wind: {window.hours[0].wind_deg}° • Rain: &lt;20%
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Webcams */}
          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-6 border-b border-blue-900/30 pb-4">Live Cameras</h2>
            <div className="grid gap-6">
              <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg overflow-hidden">
                <h3 className="text-xl font-semibold p-4 bg-blue-900/20">Puerto Tablas Webcam</h3>
                <div className="aspect-video bg-black">
                  <iframe
                    src="https://player.twitch.tv/?channel=nauticanewsok&parent=localhost&parent=pronohh.vercel.app"
                    height="360"
                    width="100%"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
          </section>

          {/* Links */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 border-b border-blue-900/30 pb-4">Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://www.comisionriodelaplata.org/servicios_main.php?sid=VM"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-4 hover:bg-blue-900/20 transition"
              >
                <p className="font-semibold text-cyan-400">Live Wind Station</p>
                <p className="text-sm text-gray-400">Pilote Norden - Real-time conditions</p>
              </a>
              <a
                href="https://tablademareas.com/ar/buenos-aires/ciudad-de-buenos-aires"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-4 hover:bg-blue-900/20 transition"
              >
                <p className="font-semibold text-cyan-400">Tide Charts</p>
                <p className="text-sm text-gray-400">Tabla de Mareas - Water height</p>
              </a>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
