import { render } from "@testing-library/react";
import { I18nProvider } from "../i18n/index.jsx";
import { PERSIST_KEY, PERSIST_VERSION, StoreProvider } from "../state/store.jsx";
import { RouterProvider } from "../lib/router.jsx";
import { DEFAULT_LOCATION } from "../services/location.js";

/**
 * İlk açılış keçilmiş kimi göstərir. Bunu etməsək qeydiyyat axını qalxır
 * və digər testlərdə ekranı örtür.
 */
export function seedLocation(location = DEFAULT_LOCATION) {
  seedState({ location, onboarded: true });
}

/**
 * İlk açılış keçilib, amma rayon seçilməyib. Yer seçimi panelinin
 * "hələ seçilməyib" davranışını yoxlamaq üçün.
 */
export function seedOnboarded() {
  seedState({ location: null, onboarded: true });
}

export function seedState(state) {
  window.localStorage.setItem(
    `agrifin:${PERSIST_KEY}`,
    JSON.stringify({ version: PERSIST_VERSION, state }),
  );
}

/** Tətbiqin bütün provayderləri ilə render edir */
export function renderApp(ui) {
  return render(
    <I18nProvider>
      <StoreProvider>
        <RouterProvider>{ui}</RouterProvider>
      </StoreProvider>
    </I18nProvider>,
  );
}

export const WEATHER_FIXTURE = {
  daily: {
    time: ["2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"],
    weather_code: [0, 1, 3, 61, 95],
    temperature_2m_max: [34.2, 33.1, 31.8, 28.4, 27.9],
    temperature_2m_min: [21, 20, 19, 18, 18],
    precipitation_sum: [0, 0, 0, 12, 4],
    et0_fao_evapotranspiration: [5, 5, 5, 3, 3],
  },
  hourly: {
    // İlk 24 saat 29-u, qalanı 30-u — saatlıq panel gün seçimini yoxlayır
    time: Array.from({ length: 36 }, (_, i) =>
      i < 24 ? `2026-07-29T${String(i).padStart(2, "0")}:00` : `2026-07-30T${String(i - 24).padStart(2, "0")}:00`,
    ),
    temperature_2m: Array.from({ length: 36 }, (_, i) => 22 + (i % 12)),
    precipitation: Array.from({ length: 36 }, () => 0),
    wind_speed_10m: Array.from({ length: 36 }, () => 8),
    wind_gusts_10m: Array.from({ length: 36 }, () => 14),
    precipitation_probability: Array.from({ length: 36 }, () => 5),
    relative_humidity_2m: Array.from({ length: 36 }, () => 55),
    dew_point_2m: Array.from({ length: 36 }, () => 12),
    soil_temperature_6cm: Array.from({ length: 36 }, () => 19),
    soil_moisture_0_to_7cm: Array.from({ length: 36 }, () => 0.24),
  },
};
