// API route to fetch forecast from OpenWeatherMap
// Cache in-memory for 30 minutes to avoid hammering the API.
// Important: keep the route dynamic/no-store so Vercel does not serve stale forecast JSON.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_KEY = process.env.NEXT_PUBLIC_OWM_KEY;
const BUENOS_AIRES_LAT = -34.6037;
const BUENOS_AIRES_LON = -58.3816;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

let cachedData = null;
let cacheTime = null;

function jsonNoStore(payload, init = {}) {
  return Response.json(payload, {
    ...init,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ...(init.headers || {}),
    },
  });
}

export async function GET(request) {
  try {
    // Check cache
    if (!API_KEY) {
      return jsonNoStore(
        { ok: false, error: 'OpenWeatherMap API key is not configured' },
        { status: 500 }
      );
    }

    if (cachedData && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      return jsonNoStore({
        ok: true,
        data: cachedData,
        cached: true,
        cacheAge: Math.floor((Date.now() - cacheTime) / 1000),
        fetchedAt: new Date(cacheTime).toISOString(),
      });
    }

    // Fetch from OpenWeatherMap
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${BUENOS_AIRES_LAT}&lon=${BUENOS_AIRES_LON}&appid=${API_KEY}&units=metric`;

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      return jsonNoStore(
        { ok: false, error: 'Failed to fetch weather data', upstreamStatus: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Transform data
    const hourly = data.list.map((hour) => ({
      dt: hour.dt,
      temp: hour.main.temp,
      feels_like: hour.main.feels_like,
      humidity: hour.main.humidity,
      wind_speed: Math.round(hour.wind.speed * 1.94384), // m/s to knots
      wind_deg: hour.wind.deg, // keep precision for directional filtering
      wind_gust: hour.wind.gust ? Math.round(hour.wind.gust * 1.94384) : null,
      clouds: hour.clouds.all,
      rain: hour.rain ? hour.rain['1h'] : 0,
      precipitation_probability: hour.pop * 100, // pop is 0-1
      description: hour.weather[0].main,
      icon: hour.weather[0].icon,
      visibility: hour.visibility,
      pressure: hour.main.pressure,
    }));

    const result = {
      city: data.city.name,
      lat: data.city.coord.lat,
      lon: data.city.coord.lon,
      hourly,
    };

    // Cache it
    cachedData = result;
    cacheTime = Date.now();

    return jsonNoStore({
      ok: true,
      data: result,
      cached: false,
      fetchedAt: new Date(cacheTime).toISOString(),
    });
  } catch (error) {
    console.error('Forecast API error:', error);
    return jsonNoStore(
      { ok: false, error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
