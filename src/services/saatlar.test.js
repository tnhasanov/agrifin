import { describe, expect, it } from "vitest";
import { enSoyuqSaat, gununSaatlari, torpaqOrtasi } from "./saatlar.js";

/** İki günlük saatlıq fikstur — hər saat üçün bir dəyər */
function hourly() {
  const time = [];
  const temp = [];
  const torpaq = [];
  for (const gun of ["2026-08-02", "2026-08-03"]) {
    for (let s = 0; s < 24; s += 1) {
      time.push(`${gun}T${String(s).padStart(2, "0")}:00`);
      // Gecə soyuq, günorta isti; ən aşağı nöqtə saat 3-dədir
      temp.push(gun === "2026-08-02" ? 20 - Math.max(0, 9 - Math.abs(s - 3)) : 20);
      torpaq.push(gun === "2026-08-02" ? 12 + (s % 2) : 18);
    }
  }
  return {
    time,
    temperature_2m: temp,
    soil_temperature_6cm: torpaq,
    precipitation: time.map(() => 0),
    precipitation_probability: time.map(() => 10),
    wind_speed_10m: time.map(() => 7),
    wind_gusts_10m: time.map(() => 15),
    relative_humidity_2m: time.map(() => 60),
  };
}

describe("günün saatları", () => {
  // 24 sətir telefonda oxunmur; 3 saatlıq addım qərar üçün kifayətdir
  it("yalnız seçilmiş günü və 3 saatlıq addımı verir", () => {
    const setirler = gununSaatlari(hourly(), "2026-08-02");
    expect(setirler).toHaveLength(8);
    expect(setirler.map((s) => s.saat)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
  });

  it("başqa günün saatlarını qarışdırmır", () => {
    const setirler = gununSaatlari(hourly(), "2026-08-03");
    expect(setirler.every((s) => s.temp === 20)).toBe(true);
  });

  it("naqis məlumatda çökmür", () => {
    expect(gununSaatlari(null, "2026-08-02")).toEqual([]);
    expect(gununSaatlari(hourly(), null)).toEqual([]);
    expect(gununSaatlari({ time: ["2026-08-02T00:00"] }, "2026-08-02")[0].temp).toBeNull();
  });
});

describe("ən soyuq saat", () => {
  // "Sabah şaxta" deyil, "sabah saat 4-də şaxta" — fermer örtük atmalıdır
  it("gecənin ən soyuq saatını tapır", () => {
    const setirler = gununSaatlari(hourly(), "2026-08-02");
    expect(enSoyuqSaat(setirler).saat).toBe(3);
  });

  it("ölçmə yoxdursa null qaytarır", () => {
    expect(enSoyuqSaat([])).toBeNull();
    expect(enSoyuqSaat([{ saat: 3, temp: null }])).toBeNull();
  });
});

describe("torpaq temperaturu", () => {
  it("günün ortasını verir", () => {
    const setirler = gununSaatlari(hourly(), "2026-08-03");
    expect(torpaqOrtasi(setirler)).toBe(18);
  });

  it("ölçmə yoxdursa null qaytarır", () => {
    expect(torpaqOrtasi([{ saat: 0, torpaq: null }])).toBeNull();
    expect(torpaqOrtasi([])).toBeNull();
  });
});
