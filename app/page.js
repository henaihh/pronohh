'use client';

import { useEffect, useMemo, useState } from 'react';
import { findGoodWindows, getConditionLabel, formatTimeRange } from '@/lib/windLogic';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function getWeatherEmoji(description) {
  const d = description?.toLowerCase() || '';
  if (d.includes('thunder')) return '🌩️';
  if (d.includes('drizzle') || d.includes('rain')) return '🌧️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return '🌫️';
  if (d.includes('clear')) return '☀️';
  if (d.includes('few clouds') || d.includes('scattered')) return '🌤️';
  if (d.includes('cloud')) return '⛅';
  return '🌤️';
}

function getRainColor(pct) {
  if (pct < 20) return '#4ade80';
  if (pct <= 50) return '#facc15';
  return '#f87171';
}

function WindBar({ knots, gust }) {
  const pct = Math.min((knots / 40) * 100, 100);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#aaa', marginBottom: 2 }}>
        <span>{knots} kts{gust ? ` (G${gust})` : ''}</span>
        <span style={{ color: '#666' }}>40</span>
      </div>
      <div style={{ width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 3,
          background: `linear-gradient(90deg, #facc15, #00d9ff)`,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

function RainBadge({ pct }) {
  return (
    <span style={{ color: getRainColor(pct), fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
      💧 {Math.round(pct)}%
    </span>
  );
}

export default function Home() {
  const [minWind, setMinWind] = useState(12);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [goodWindows, setGoodWindows] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    fetchForecast();
    const interval = setInterval(fetchForecast, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (forecast) {
      const windows = findGoodWindows(forecast.hourly, minWind);
      setGoodWindows(windows);
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

  const windowStatusByDate = useMemo(() => {
    const status = {};
    goodWindows.forEach((window) => {
      const key = window.startTime.toISOString().split('T')[0];
      const label = getConditionLabel(parseFloat(window.avgWind), minWind);
      if (label === 'GO') {
        status[key] = 'good';
      } else if (label === 'MAYBE' && status[key] !== 'good') {
        status[key] = 'maybe';
      }
    });
    return status;
  }, [goodWindows, minWind]);

  // Weather description by date (most common from hourly data)
  const weatherByDate = useMemo(() => {
    if (!forecast) return {};
    const map = {};
    forecast.hourly.forEach((h) => {
      const key = new Date(h.dt * 1000).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    const result = {};
    Object.entries(map).forEach(([key, hours]) => {
      // Pick midday hour or first available
      const mid = hours.find(h => new Date(h.dt * 1000).getHours() >= 12) || hours[0];
      result[key] = {
        description: mid.description,
        temp: Math.round(mid.temp),
        rain: Math.round(mid.precipitation_probability),
      };
    });
    return result;
  }, [forecast]);

  // 10-day strip data
  const dayStrip = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    const days = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const status = windowStatusByDate[key] || null;
      const weather = weatherByDate[key] || null;
      days.push({
        key,
        date: d,
        dayName: DAY_NAMES[d.getDay()],
        dayNum: d.getDate(),
        isToday: key === todayKey,
        status,
        emoji: weather ? getWeatherEmoji(weather.description) : '—',
        temp: weather?.temp,
      });
    }
    return days;
  }, [windowStatusByDate, weatherByDate]);

  const groupedWindows = useMemo(() => {
    if (!goodWindows.length) return [];
    let filtered = goodWindows;
    if (selectedDay) {
      filtered = goodWindows.filter(w => w.startTime.toISOString().split('T')[0] === selectedDay);
    }
    const map = new Map();
    filtered.forEach((window) => {
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
  }, [goodWindows, selectedDay]);

  const totalWindowCount = goodWindows.length;

  const cardBase = {
    backgroundColor: 'rgba(0, 100, 200, 0.08)',
    border: '1px solid rgba(0, 217, 255, 0.15)',
    borderRadius: 12,
    padding: '1rem',
    transition: 'background-color 0.2s, border-color 0.2s',
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(0, 217, 255, 0.2)', padding: '1.5rem 1rem' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '0.25rem',
            background: 'linear-gradient(135deg, #00d9ff, #0099ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            PronoHH 🌊
          </h1>
          <p style={{ color: '#888', fontSize: '0.95rem' }}>
            Wind forecast for Rio de la Plata sailors
            {lastUpdate && (
              <span style={{ color: '#555', marginLeft: '0.75rem', fontSize: '0.8rem' }}>
                Updated {lastUpdate.toLocaleTimeString('es-AR')}
              </span>
            )}
          </p>
        </div>
      </header>

      {error && (
        <div style={{
          backgroundColor: 'rgba(127, 29, 29, 0.2)',
          border: '1px solid rgba(127, 29, 29, 0.5)',
          color: '#fca5a5',
          padding: '1rem',
          margin: '1rem',
          borderRadius: 12,
        }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>Loading forecast...</p>
        </div>
      ) : (
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem 1rem' }}>

          {/* Current Conditions */}
          {currentConditions && (
            <section style={{ ...cardBase, marginBottom: '1.5rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '2.5rem' }}>{getWeatherEmoji(currentConditions.description)}</span>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <p style={{ color: '#888', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Right Now</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 600, margin: '2px 0 0', color: '#eee' }}>
                    {currentConditions.description} • {currentConditions.temp}°C
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#00d9ff', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{currentConditions.wind_speed}</p>
                    <p style={{ color: '#666', fontSize: '0.7rem', margin: 0 }}>kts</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#00d9ff', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{currentConditions.wind_deg}°</p>
                    <p style={{ color: '#666', fontSize: '0.7rem', margin: 0 }}>dir</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <RainBadge pct={currentConditions.precipitation_probability} />
                    <p style={{ color: '#666', fontSize: '0.7rem', margin: 0 }}>rain</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Wind Threshold Slider */}
          <section style={{ ...cardBase, marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.85rem', color: '#aaa', whiteSpace: 'nowrap' }}>
                Min wind: <span style={{ color: '#00d9ff', fontWeight: 700, fontSize: '1.05rem' }}>{minWind} kts</span>
              </label>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={minWind}
                onChange={(e) => setMinWind(Number(e.target.value))}
                style={{ flex: 1, minWidth: 120, height: 6, accentColor: '#00d9ff', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#555' }}>SE 90°–170° only</span>
            </div>
          </section>

          {/* 10-Day Strip */}
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ccc', marginBottom: '0.75rem' }}>
              10-Day Outlook
            </h2>
            <div style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
              WebkitOverflowScrolling: 'touch',
            }}>
              {dayStrip.map((day) => {
                const bg = day.status === 'good'
                  ? 'rgba(34, 197, 94, 0.2)'
                  : day.status === 'maybe'
                  ? 'rgba(250, 204, 21, 0.15)'
                  : 'rgba(255,255,255,0.03)';
                const borderColor = day.status === 'good'
                  ? 'rgba(34, 197, 94, 0.6)'
                  : day.status === 'maybe'
                  ? 'rgba(234, 179, 8, 0.5)'
                  : 'rgba(255,255,255,0.1)';
                const isSelected = selectedDay === day.key;
                return (
                  <div
                    key={day.key}
                    onClick={() => setSelectedDay(isSelected ? null : day.key)}
                    style={{
                      flex: '1 0 auto',
                      minWidth: 62,
                      padding: '0.5rem 0.4rem',
                      borderRadius: 12,
                      border: `1.5px solid ${borderColor}`,
                      background: bg,
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: day.isToday ? '0 0 0 2px rgba(0, 217, 255, 0.5)' : isSelected ? '0 0 0 2px rgba(0, 217, 255, 0.3)' : 'none',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.7rem', color: day.isToday ? '#00d9ff' : '#888', fontWeight: day.isToday ? 700 : 400 }}>
                      {day.isToday ? 'HOY' : day.dayName}
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '1.1rem', fontWeight: 700, color: '#eee' }}>{day.dayNum}</p>
                    <p style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1 }}>{day.emoji}</p>
                    {day.temp != null && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#888' }}>{day.temp}°</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#777', marginTop: '0.5rem' }}>
              <span>🟢 GO</span>
              <span>🟡 MAYBE</span>
              {selectedDay && (
                <span
                  onClick={() => setSelectedDay(null)}
                  style={{ marginLeft: 'auto', color: '#00d9ff', cursor: 'pointer' }}
                >
                  Show all ✕
                </span>
              )}
            </div>
          </section>

          {/* Good Windows */}
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', color: '#eee' }}>
              Next Good Windows
              {totalWindowCount > 0 && (
                <span style={{ fontSize: '0.85rem', fontWeight: 400, color: '#666', marginLeft: '0.5rem' }}>
                  {totalWindowCount} found
                </span>
              )}
            </h2>
            {totalWindowCount === 0 ? (
              <div style={{
                ...cardBase,
                backgroundColor: 'rgba(180, 83, 9, 0.1)',
                border: '1px solid rgba(180, 83, 9, 0.3)',
                textAlign: 'center',
                padding: '1.5rem',
              }}>
                <p style={{ color: '#fcd34d', fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>
                  No good windows at {minWind}+ knots SE
                </p>
                <p style={{ color: '#999', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Try lowering the wind threshold
                </p>
              </div>
            ) : (
              groupedWindows.map((group) => (
                <div key={group.key} style={{ marginBottom: '1.25rem' }}>
                  <p style={{
                    color: '#aaa',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '0.5rem',
                  }}>
                    {group.label}
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '0.75rem',
                  }}>
                    {group.windows.map((window) => {
                      const label = getConditionLabel(parseFloat(window.avgWind), minWind);
                      const labelColor = label === 'GO'
                        ? { text: '#4ade80', bg: 'rgba(34, 197, 94, 0.2)' }
                        : label === 'MAYBE'
                        ? { text: '#facc15', bg: 'rgba(202, 138, 4, 0.2)' }
                        : { text: '#f87171', bg: 'rgba(239, 68, 68, 0.2)' };
                      const windowKey = `${group.key}-${window.startTime.getTime()}`;
                      const firstHour = window.hours[0];
                      const avgRain = Math.round(window.hours.reduce((s, h) => s + h.precipitation_probability, 0) / window.hours.length);
                      const maxGust = window.hours.reduce((m, h) => Math.max(m, h.wind_gust || 0), 0);

                      return (
                        <div
                          key={windowKey}
                          style={{
                            ...cardBase,
                            padding: '0.85rem 1rem',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.16)';
                            e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.15)';
                          }}
                        >
                          {/* Top row: time, label, emoji */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1.3rem' }}>{getWeatherEmoji(firstHour.description)}</span>
                              <div>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>
                                  {formatTimeRange(window.startTime, window.endTime)}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#eee' }}>
                                  {window.duration}h • {Math.round(firstHour.temp)}°C
                                </p>
                              </div>
                            </div>
                            <span style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              color: labelColor.text,
                              backgroundColor: labelColor.bg,
                            }}>
                              {label}
                            </span>
                          </div>

                          {/* Wind bar */}
                          <WindBar knots={parseFloat(window.avgWind)} gust={maxGust || null} />

                          {/* Bottom row: direction + rain */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{
                                display: 'inline-block',
                                width: 24,
                                height: 24,
                                border: '1px solid rgba(0, 217, 255, 0.25)',
                                borderRadius: '50%',
                                textAlign: 'center',
                                lineHeight: '22px',
                                fontSize: '0.8rem',
                                color: '#00d9ff',
                                transform: `rotate(${((Math.round(firstHour.wind_deg) + 180) % 360)}deg)`,
                              }}>↑</span>
                              <span style={{ color: '#888', fontSize: '0.75rem' }}>{Math.round(firstHour.wind_deg)}°</span>
                            </div>
                            <RainBadge pct={avgRain} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Webcams + Resources side by side on desktop */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            {/* Webcam */}
            <section>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: '#eee' }}>
                Live Camera
              </h2>
              <div style={{ ...cardBase, padding: 0, overflow: 'hidden' }}>
                <h3 style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  padding: '0.75rem 1rem',
                  margin: 0,
                  backgroundColor: 'rgba(0, 100, 200, 0.15)',
                  color: '#ccc',
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
            </section>

            {/* Resources */}
            <section>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: '#eee' }}>
                Resources
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { href: 'https://www.comisionriodelaplata.org/servicios_main.php?sid=VM', title: 'Live Wind Station', desc: 'Pilote Norden - Real-time conditions' },
                  { href: 'https://tablademareas.com/ar/buenos-aires/ciudad-de-buenos-aires', title: 'Tide Charts', desc: 'Tabla de Mareas - Water height' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...cardBase,
                      textDecoration: 'none',
                      display: 'block',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.16)';
                      e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 100, 200, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(0, 217, 255, 0.15)';
                    }}
                  >
                    <p style={{ fontWeight: 600, color: '#00d9ff', margin: 0 }}>{link.title}</p>
                    <p style={{ fontSize: '0.8rem', color: '#888', margin: '0.25rem 0 0' }}>{link.desc}</p>
                  </a>
                ))}
              </div>
            </section>
          </div>

          {/* Windguru Forecast */}
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.75rem', color: '#eee' }}>
              🌬️ Windguru — Buenos Aires
            </h2>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 217, 255, 0.15)',
            }}>
              <iframe
                src="https://www.windguru.cz/261"
                width="100%"
                height="500"
                style={{ border: 'none', display: 'block' }}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
              ></iframe>
            </div>
            <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Source: <a href="https://www.windguru.cz/261" target="_blank" rel="noopener noreferrer" style={{ color: '#00d9ff', textDecoration: 'none' }}>windguru.cz/261</a>
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
