import { render } from "@testing-library/react";
import { I18nProvider } from "../i18n/index.jsx";
import { StoreProvider } from "../state/store.jsx";
import { RouterProvider } from "../lib/router.jsx";

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
    time: Array.from({ length: 36 }, (_, i) => `2026-07-29T${String(i % 24).padStart(2, "0")}:00`),
    wind_speed_10m: Array.from({ length: 36 }, () => 8),
    precipitation_probability: Array.from({ length: 36 }, () => 5),
    soil_moisture_0_to_7cm: Array.from({ length: 36 }, () => 0.24),
  },
};
