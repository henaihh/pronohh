// Wind direction constants (degrees)
const SE_MIN = 90;
const SE_MAX = 170;
const RAIN_THRESHOLD = 20; // percentage

export function isGoodWindDirection(direction) {
  return direction >= SE_MIN && direction <= SE_MAX;
}

export function isNotRainy(precipitation) {
  return precipitation <= RAIN_THRESHOLD;
}

export function findGoodWindows(hourlyData, minWindKnots) {
  const windows = [];
  let currentWindow = null;
  const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds

  hourlyData.forEach((hour, index) => {
    // Skip past hours - only process future data
    if (hour.dt <= now) {
      return;
    }
    const isGood =
      isGoodWindDirection(hour.wind_deg) &&
      hour.wind_speed >= minWindKnots &&
      isNotRainy(hour.precipitation_probability);

    if (isGood) {
      if (!currentWindow) {
        // Start new window
        currentWindow = {
          startIndex: index,
          startTime: new Date(hour.dt * 1000),
          hours: [hour],
          totalWindSpeed: hour.wind_speed,
        };
      } else {
        // Continue window
        currentWindow.hours.push(hour);
        currentWindow.totalWindSpeed += hour.wind_speed;
      }
    } else {
      // Not good - close window if open
      if (currentWindow) {
        windows.push({
          startTime: currentWindow.startTime,
          endTime: new Date(currentWindow.hours[currentWindow.hours.length - 1].dt * 1000),
          duration: currentWindow.hours.length,
          avgWind: (currentWindow.totalWindSpeed / currentWindow.hours.length).toFixed(1),
          hours: currentWindow.hours,
        });
        currentWindow = null;
      }
    }
  });

  // Close last window if still open
  if (currentWindow) {
    windows.push({
      startTime: currentWindow.startTime,
      endTime: new Date(currentWindow.hours[currentWindow.hours.length - 1].dt * 1000),
      duration: currentWindow.hours.length,
      avgWind: (currentWindow.totalWindSpeed / currentWindow.hours.length).toFixed(1),
      hours: currentWindow.hours,
    });
  }

  return windows;
}

export function getConditionLabel(avgWind, minWind) {
  if (avgWind >= minWind * 1.2) return 'GO';
  if (avgWind >= minWind * 0.9) return 'MAYBE';
  return 'NO';
}

export function formatTimeRange(startTime, endTime) {
  const start = startTime.toLocaleString('es-AR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const end = endTime.toLocaleString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${start} → ${end}`;
}
