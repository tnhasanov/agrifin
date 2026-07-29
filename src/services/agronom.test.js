import { describe, expect, it } from "vitest";
import { summarizeForecast } from "./weather.js";

describe("summarizeForecast", () => {
  const daily = {
    temperature_2m_max: [30, 34.2, 31, 28, 27, 29, 33, 40],
    precipitation_sum: [0, 2, 0, 12, 4, 0, 0, 99],
    et0_fao_evapotranspiration: [5, 5, 5, 3, 3, 4, 5, 99],
  };

  it("yalnız ilk 7 günü nəzərə alır", () => {
    const result = summarizeForecast(daily);
    expect(result.maxTemp).toBe(34); // 8-ci günün 40°C-i sayılmır
    expect(result.yagis).toBe(18);
    expect(result.balans).toBe(30 - 18);
  });

  it("məlumat olmayanda null qaytarır", () => {
    expect(summarizeForecast(undefined)).toBeNull();
    expect(summarizeForecast({})).toBeNull();
  });
});
