// API route to fetch forecast from OpenWeatherMap
// Cache for 30 minutes to avoid hammering the API

const API_KEY = process.env.NEXT_PUBLIC_OWM_KEY;
const BUENOS_AIRES_LAT = -34.6037;
const BUENOS_AIRES_LON = -58.3816;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

let cachedData = null;
let cacheTime = null;

export async function GET(request) {
  try {
    // Check cache
    if (cachedData && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      return Response.json({
        data: cachedData,
        cached: true,
        cacheAge: Math.floor((Date.now() - cacheTime) / 1000),
      });
    }

    // Fetch from OpenWeatherMap
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${BUENOS_AIRES_LAT}&lon=${BUENOS_AIRES_LON}&appid=${API_KEY}&units=metric`;

    const response = await fetch(url);

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to fetch weather data', status: response.status },
        { status: 500 }
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
      wind_deg: Math.round(hour.wind.deg),
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

    return Response.json({
      data: result,
      cached: false,
    });
  } catch (error) {
    console.error('Forecast API error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
