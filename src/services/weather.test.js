import { describe, expect, it } from "vitest";
import { buildAdvisory, forecastUrl, iconForCode, summarizeForecast } from "./weather.js";

describe("iconForCode", () => {
  it("WMO kodlarını ikonlara uyğunlaşdırır", () => {
    expect(iconForCode(0)).toEqual({ name: "Sun", wet: false });
    expect(iconForCode(2)).toEqual({ name: "CloudSun", wet: false });
    expect(iconForCode(45)).toEqual({ name: "Cloud", wet: false });
    expect(iconForCode(61)).toEqual({ name: "CloudRain", wet: true });
    expect(iconForCode(71)).toEqual({ name: "CloudSnow", wet: true });
    expect(iconForCode(95)).toEqual({ name: "CloudLightning", wet: true });
  });
});

describe("buildAdvisory", () => {
  const dryHourly = {
    time: Array.from({ length: 36 }, (_, i) => `2026-07-29T${String(i % 24).padStart(2, "0")}:00`),
    wind_speed_10m: Array.from({ length: 36 }, () => 8),
    precipitation_probability: Array.from({ length: 36 }, () => 5),
    soil_moisture_0_to_7cm: [0.24],
  };

  it("yaxın 3 gündə çox yağış olanda suvarmanı saxlamağı deyir", () => {
    const advisory = buildAdvisory(
      { precipitation_sum: [6, 5, 4, 0, 0, 0, 0], et0_fao_evapotranspiration: [3, 3, 3, 3, 3, 3, 3] },
      dryHourly,
    );
    expect(advisory).toMatchObject({ key: "weather.rainHold", tone: "wet", vars: { mm: 15 } });
  });

  it("buxarlanma yağışı üstələyəndə su çatışmazlığını bildirir", () => {
    const advisory = buildAdvisory(
      { precipitation_sum: [0, 0, 0, 0, 0, 0, 0], et0_fao_evapotranspiration: [6, 6, 6, 6, 6, 6, 6] },
      dryHourly,
    );
    expect(advisory).toMatchObject({ key: "weather.deficit", tone: "dry", vars: { mm: 42 } });
  });

  it("külək zəif və yağış ehtimalı azdırsa dərmanlama vaxtı təklif edir", () => {
    const advisory = buildAdvisory(
      { precipitation_sum: [0, 0, 0, 0, 0, 0, 0], et0_fao_evapotranspiration: [3, 3, 3, 3, 3, 3, 3] },
      dryHourly,
    );
    expect(advisory.key).toBe("weather.sprayWindow");
    // İlk 12 saat "bu gün" sayılır
    expect(advisory.vars.when).toEqual({ key: "common.today" });
  });

  it("dərmanlama pəncərəsi yoxdursa torpaq nəmliyini göstərir", () => {
    const advisory = buildAdvisory(
      { precipitation_sum: [0, 0, 0, 0, 0, 0, 0], et0_fao_evapotranspiration: [3, 3, 3, 3, 3, 3, 3] },
      { ...dryHourly, wind_speed_10m: Array.from({ length: 36 }, () => 20) },
    );
    expect(advisory).toMatchObject({ key: "weather.normal", vars: { pct: 24 } });
  });

  it("məlumat çatmayanda çökmür", () => {
    const advisory = buildAdvisory(undefined, undefined);
    expect(advisory.key).toBe("weather.normal");
    expect(advisory.vars.pct).toBe("—");
  });
});

describe("forecastUrl", () => {
  it("lazımi sahələri və Bakı vaxt qurşağını sorğuya salır", () => {
    const url = forecastUrl({ lat: 40.3705, lon: 47.1265, days: 7 });
    expect(url).toContain("latitude=40.3705");
    expect(url).toContain("longitude=47.1265");
    expect(url).toContain("forecast_days=7");
    expect(decodeURIComponent(url)).toContain("timezone=Asia/Baku");
    expect(decodeURIComponent(url)).toContain("et0_fao_evapotranspiration");
    expect(decodeURIComponent(url)).toContain("soil_moisture_0_to_7cm");
  });
});

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
