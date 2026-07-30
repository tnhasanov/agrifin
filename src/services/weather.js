import * as storage from "../lib/storage.js";

// Kənd yerlərində şəbəkə zəifdir: təzə keş varsa sorğu göndərmirik,
// sorğu alınmasa köhnə keşi "stale" işarəsi ilə qaytarırıq.
const CACHE_TTL_MS = 30 * 60 * 1000;

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "et0_fao_evapotranspiration",
];

const HOURLY_FIELDS = ["wind_speed_10m", "precipitation_probability", "soil_moisture_0_to_7cm"];

export function forecastUrl({ lat, lon, days = 7 }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: DAILY_FIELDS.join(","),
    hourly: HOURLY_FIELDS.join(","),
    timezone: "Asia/Baku",
    forecast_days: String(days),
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** WMO hava kodu -> ikon adı + yaş/quru bayrağı */
export function iconForCode(code) {
  if (code === 0) return { name: "Sun", wet: false };
  if (code <= 2) return { name: "CloudSun", wet: false };
  if (code <= 48) return { name: "Cloud", wet: false };
  if (code <= 67) return { name: "CloudRain", wet: true };
  if (code <= 77) return { name: "CloudSnow", wet: true };
  if (code <= 82) return { name: "CloudRain", wet: true };
  if (code <= 86) return { name: "CloudSnow", wet: true };
  return { name: "CloudLightning", wet: true };
}

const sumFirst = (values, count) =>
  (values ?? []).slice(0, count).reduce((total, value) => total + (value || 0), 0);

/**
 * Real rəqəmlərdən aqronomik tövsiyə qurur. Mətn yerinə tərcümə açarı
 * qaytarır, belədə eyni məntiq üç dildə işləyir.
 */
export function buildAdvisory(daily, hourly) {
  const rain3 = sumFirst(daily?.precipitation_sum, 3);
  if (rain3 >= 10) {
    return { key: "weather.rainHold", tone: "wet", vars: { mm: Math.round(rain3) } };
  }

  const rain7 = sumFirst(daily?.precipitation_sum, 7);
  const et7 = sumFirst(daily?.et0_fao_evapotranspiration, 7);
  const deficit = et7 - rain7;
  if (deficit > 25) {
    return { key: "weather.deficit", tone: "dry", vars: { mm: Math.round(deficit) } };
  }

  const times = hourly?.time ?? [];
  for (let i = 0; i < Math.min(36, times.length); i += 1) {
    const wind = hourly?.wind_speed_10m?.[i] ?? 99;
    const rainChance = hourly?.precipitation_probability?.[i] ?? 100;
    if (wind < 12 && rainChance < 20) {
      const day = new Date(times[i]).getDay();
      return {
        key: "weather.sprayWindow",
        tone: "normal",
        vars: { when: { key: i < 12 ? "common.today" : `weather.day.${day}` } },
      };
    }
  }

  const moisture = hourly?.soil_moisture_0_to_7cm?.[0];
  return {
    key: "weather.normal",
    tone: "normal",
    vars: { pct: moisture == null ? "—" : Math.round(moisture * 100) },
  };
}

/** Aqronom çatına ötürülən qısa hava xülasəsi (7 gün) */
export function summarizeForecast(daily) {
  if (!daily?.temperature_2m_max?.length) return null;
  const rain = sumFirst(daily.precipitation_sum, 7);
  const et = sumFirst(daily.et0_fao_evapotranspiration, 7);
  return {
    maxTemp: Math.round(Math.max(...daily.temperature_2m_max.slice(0, 7))),
    yagis: Math.round(rain),
    balans: Math.round(et - rain),
  };
}

/**
 * @returns {Promise<{data: object, stale: boolean}>} stale=true olduqda
 *          məlumat keşdəndir və istifadəçiyə bunu bildirmək lazımdır.
 */
export async function fetchForecast({ lat, lon, days = 7, signal } = {}) {
  const cacheKey = `weather:${lat},${lon},${days}`;
  const cached = storage.read(cacheKey);

  if (cached?.savedAt && Date.now() - cached.savedAt < CACHE_TTL_MS && cached.data) {
    return { data: cached.data, stale: false };
  }

  try {
    const response = await fetch(forecastUrl({ lat, lon, days }), { signal });
    if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
    const data = await response.json();
    storage.write(cacheKey, { savedAt: Date.now(), data });
    return { data, stale: false };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    if (cached?.data) return { data: cached.data, stale: true };
    throw error;
  }
}
