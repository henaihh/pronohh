'use client';

import { useEffect, useMemo, useState } from 'react';
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
      setGoodWindows(windows); // Show every available window from the forecast horizon
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
  const groupedWindows = useMemo(() => {
    if (!goodWindows.length) return [];
    const map = new Map();
    goodWindows.forEach((window) => {
      const key = window.startTime.toISOString().split('T')[0];
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: window.startTime.toLocaleDateString('es-AR', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          }),
          windows: [],
        });
      }
      map.get(key).windows.push(window);
    });
    return Array.from(map.values());
  }, [goodWindows]);
  const totalWindowCount = goodWindows.length;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#000' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
        padding: '2rem 1rem'
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #00d9ff, #0099ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            PronoHH 🌊
          </h1>
          <p style={{ color: '#999', fontSize: '1.1rem' }}>
            Wind forecast for Rio de la Plata sailors
          </p>
          {lastUpdate && (
            <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Last update: {lastUpdate.toLocaleTimeString('es-AR')}
            </p>
          )}
        </div>
      </header>

      {error && (
        <div style={{
          backgroundColor: 'rgba(127, 29, 29, 0.2)',
          border: '1px solid rgba(127, 29, 29, 0.5)',
          color: '#fca5a5',
          padding: '1rem',
          margin: '1rem',
          borderRadius: '0.5rem'
        }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div style={{
          maxWidth: '80rem',
          margin: '0 auto',
          paddingY: '3rem',
          textAlign: 'center'
        }}>
          <p style={{ color: '#666' }}>Loading forecast...</p>
        </div>
      ) : (
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1rem' }}>
          {/* Wind Threshold Slider */}
          <section style={{
            backgroundColor: 'rgba(0, 100, 200, 0.1)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#ccc',
                marginBottom: '1rem'
              }}>
                Minimum Wind Speed: <span style={{ color: '#00d9ff', fontSize: '1.1rem' }}>
                  {minWind} knots
                </span>
              </label>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={minWind}
                onChange={(e) => setMinWind(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '0.5rem',
                  backgroundColor: '#444',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  accentColor: '#00d9ff'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#666',
                marginTop: '0.5rem'
              }}>
                <span>5 knots</span>
                <span>40 knots</span>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#999' }}>
              Looking for SE winds (90°–170°) with {'<20%'} rain chance
            </p>
          </section>

          {/* Current Conditions */}
          {currentConditions && (
            <section style={{
              backgroundColor: 'rgba(0, 100, 200, 0.1)',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem'
              }}>
                Right Now
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div>
                  <p style={{ color: '#999', fontSize: '0.875rem' }}>Wind Speed</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00d9ff' }}>
                    {currentConditions.wind_speed} kts
                  </p>
                </div>
                <div>
                  <p style={{ color: '#999', fontSize: '0.875rem' }}>Direction</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00d9ff' }}>
                    {currentConditions.wind_deg}°
                  </p>
                </div>
                <div>
                  <p style={{ color: '#999', fontSize: '0.875rem' }}>Temperature</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00d9ff' }}>
                    {currentConditions.temp}°C
                  </p>
                </div>
                <div>
                  <p style={{ color: '#999', fontSize: '0.875rem' }}>Conditions</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00d9ff' }}>
                    {currentConditions.description}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Good Windows */}
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '0.75rem',
              borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
              paddingBottom: '1rem'
            }}>
              Next Good Windows
            </h2>
            {totalWindowCount > 0 && (
              <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                All qualifying SE windows over the next 10-day outlook • {totalWindowCount} total
              </p>
            )}
            {totalWindowCount === 0 ? (
              <div style={{
                backgroundColor: 'rgba(180, 83, 9, 0.1)',
                border: '1px solid rgba(180, 83, 9, 0.3)',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                textAlign: 'center'
              }}>
                <p style={{ color: '#fcd34d', fontSize: '1.1rem', fontWeight: '600' }}>
                  No good windows in the next 10 days at {minWind}+ knots SE wind
                </p>
                <p style={{ color: '#999', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  Try lowering the wind threshold
                </p>
              </div>
            ) : (
              groupedWindows.map((group) => (
                <div key={group.key} style={{ marginBottom: '2rem' }}>
                  <p style={{
                    color: '#ccc',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '0.75rem'
                  }}>
                    {group.label}
                  </p>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {group.windows.map((window) => {
                      const label = getConditionLabel(parseFloat(window.avgWind), minWind);
                      const labelColor = label === 'GO'
                        ? { text: '#4ade80', bg: 'rgba(34, 197, 94, 0.2)' }
                        : label === 'MAYBE'
                        ? { text: '#facc15', bg: 'rgba(202, 138, 4, 0.2)' }
                        : { text: '#f87171', bg: 'rgba(239, 68, 68, 0.2)' };
                      const windowKey = `${group.key}-${window.startTime.getTime()}-${window.endTime.getTime()}`;

                      return (
                        <div
                          key={windowKey}
                          style={{
                            backgroundColor: 'rgba(0, 100, 200, 0.1)',
                            border: '1px solid rgba(0, 217, 255, 0.2)',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            transition: 'all 0.3s',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.1)';
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '0.5rem'
                          }}>
                            <div>
                              <p style={{ color: '#999', fontSize: '0.875rem' }}>
                                {formatTimeRange(window.startTime, window.endTime)}
                              </p>
                              <p style={{
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                color: '#fff',
                                marginTop: '0.25rem'
                              }}>
                                {window.duration}h window • Avg {window.avgWind} knots
                              </p>
                            </div>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              color: labelColor.text,
                              backgroundColor: labelColor.bg
                            }}>
                              {label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              border: '1px solid rgba(0, 217, 255, 0.3)',
                              borderRadius: '999px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <span
                                aria-hidden="true"
                                style={{
                                  display: 'inline-block',
                                  color: '#00d9ff',
                                  fontSize: '1.1rem',
                                  transform: `rotate(${Math.round(window.hours[0]?.wind_deg ?? 0)}deg)`,
                                  transition: 'transform 0.2s ease'
                                }}
                              >
                                ↑
                              </span>
                            </div>
                            <div style={{ color: '#999', fontSize: '0.85rem', lineHeight: 1.4 }}>
                              <p style={{ margin: 0 }}>
                                Wind: {Math.round(window.hours[0]?.wind_deg ?? 0)}° (from)
                              </p>
                              <p style={{ margin: 0 }}>
                                Rain: {'<20%'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Webcams */}
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
              borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
              paddingBottom: '1rem'
            }}>
              Live Cameras
            </h2>
            <div style={{
              display: 'grid',
              gap: '1.5rem'
            }}>
              <div style={{
                backgroundColor: 'rgba(0, 100, 200, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                borderRadius: '0.5rem',
                overflow: 'hidden'
              }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  padding: '1rem',
                  backgroundColor: 'rgba(0, 100, 200, 0.2)'
                }}>
                  Puerto Tablas Webcam
                </h3>
                <div style={{ aspectRatio: '16/9', backgroundColor: '#000' }}>
                  <iframe
                    src="https://player.twitch.tv/?channel=nauticanewsok&parent=localhost&parent=pronohh.vercel.app"
                    height="100%"
                    width="100%"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
          </section>

          {/* Links */}
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
              borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
              paddingBottom: '1rem'
            }}>
              Resources
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              <a
                href="https://www.comisionriodelaplata.org/servicios_main.php?sid=VM"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: 'rgba(0, 100, 200, 0.1)',
                  border: '1px solid rgba(0, 217, 255, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  textDecoration: 'none',
                  transition: 'all 0.3s',
                  display: 'block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.1)';
                }}
              >
                <p style={{ fontWeight: '600', color: '#00d9ff' }}>Live Wind Station</p>
                <p style={{ fontSize: '0.875rem', color: '#999' }}>Pilote Norden - Real-time conditions</p>
              </a>
              <a
                href="https://tablademareas.com/ar/buenos-aires/ciudad-de-buenos-aires"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: 'rgba(0, 100, 200, 0.1)',
                  border: '1px solid rgba(0, 217, 255, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  textDecoration: 'none',
                  transition: 'all 0.3s',
                  display: 'block'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.1)';
                }}
              >
                <p style={{ fontWeight: '600', color: '#00d9ff' }}>Tide Charts</p>
                <p style={{ fontSize: '0.875rem', color: '#999' }}>Tabla de Mareas - Water height</p>
              </a>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
