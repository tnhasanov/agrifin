import { describe, expect, it } from "vitest";
import { KVADRANTLAR, duzbucaqlaKes, kvadrantlar } from "../lib/geoJson.js";
import { MIN_FERQ_FAIZ, MIN_PIKSEL, kvadrantOxu, zeifTap } from "./zona.js";

/** Sadə kvadrat sahə: 40.40–40.41 en, 47.10–47.11 uzunluq */
const KVADRAT = [
  [40.4, 47.1],
  [40.41, 47.1],
  [40.41, 47.11],
  [40.4, 47.11],
];

describe("düzbucaqla kəsmə", () => {
  it("tam içəridəki sahəni dəyişmir", () => {
    const netice = duzbucaqlaKes(KVADRAT, { enMin: 40.3, enMax: 40.5, uzMin: 47, uzMax: 47.2 });
    expect(netice).toHaveLength(4);
  });

  it("yarısını kəsir və kəsik nöqtələri əlavə edir", () => {
    // Yuxarı yarı: en >= 40.405
    const netice = duzbucaqlaKes(KVADRAT, { enMin: 40.405, enMax: 41, uzMin: 47, uzMax: 48 });
    expect(netice.length).toBeGreaterThanOrEqual(4);
    // Kəsikdən sonra heç bir nöqtə həddin altında qalmamalıdır
    for (const [en] of netice) expect(en).toBeGreaterThanOrEqual(40.405 - 1e-9);
  });

  it("tamamilə kənarda qalan sahə boş qaytarır", () => {
    expect(duzbucaqlaKes(KVADRAT, { enMin: 41, enMax: 42, uzMin: 47, uzMax: 48 })).toEqual([]);
  });
});

describe("kvadrantlar", () => {
  it("kvadrat sahəni dörd hissəyə bölür", () => {
    const hisseler = kvadrantlar(KVADRAT);
    expect(hisseler).toHaveLength(4);
    expect(hisseler.map((h) => h.ad).sort()).toEqual([...KVADRANTLAR].sort());
  });

  // GeoJSON [uzunluq, en] istəyir — səhv sıra sahəni Hind okeanına atır
  it("GeoJSON poliqonunda uzunluq əvvəl gəlir", () => {
    const [ilk] = kvadrantlar(KVADRAT);
    for (const [uz, en] of ilk.polygon.coordinates[0]) {
      expect(uz).toBeGreaterThan(46);
      expect(en).toBeGreaterThan(40);
      expect(en).toBeLessThan(41);
    }
  });

  it("şimal kvadrantları həqiqətən şimaldadır", () => {
    const hisseler = kvadrantlar(KVADRAT);
    const simal = hisseler.find((h) => h.ad === "simalSerq");
    const cenub = hisseler.find((h) => h.ad === "cenubQerb");
    const enler = (h) => h.polygon.coordinates[0].map(([, en]) => en);
    expect(Math.min(...enler(simal))).toBeGreaterThanOrEqual(Math.max(...enler(cenub)) - 1e-9);
  });

  it("yararsız girişdə null qaytarır", () => {
    expect(kvadrantlar(null)).toBeNull();
    expect(kvadrantlar([[40, 47]])).toBeNull();
  });
});

describe("kvadrant ölçməsi", () => {
  const dovr = (tarix, mean, piksel) => ({
    interval: { from: `${tarix}T00:00:00Z`, to: `${tarix}T23:59:59Z` },
    outputs: { ndvi: { bands: { B0: { stats: { mean, sampleCount: piksel } } } } },
  });

  it("ən son dövrü seçir", () => {
    const netice = kvadrantOxu({ data: [dovr("2026-07-20", 0.5, 100), dovr("2026-07-30", 0.6, 100)] });
    expect(netice).toMatchObject({ ndvi: 0.6, tarix: "2026-07-30" });
  });

  // Kiçik kvadrantda bir neçə piksel qalırsa ölçmə təsadüfidir
  it("piksel azdırsa dövrü atır", () => {
    expect(kvadrantOxu({ data: [dovr("2026-07-30", 0.6, MIN_PIKSEL - 1)] })).toBeNull();
  });

  it("boş cavabda null qaytarır", () => {
    expect(kvadrantOxu({ data: [] })).toBeNull();
    expect(kvadrantOxu(null)).toBeNull();
  });
});

describe("zəif künc", () => {
  const zona = (ad, ndvi) => ({ ad, ndvi });

  it("ortadan mənalı dərəcədə aşağı olan küncü tapır", () => {
    const netice = zeifTap([
      zona("simalQerb", 0.7),
      zona("simalSerq", 0.5),
      zona("cenubQerb", 0.7),
      zona("cenubSerq", 0.7),
    ]);
    expect(netice.ad).toBe("simalSerq");
    // orta 0.65, zəif 0.5 → −23%
    expect(netice.ferq).toBe(-23);
  });

  // Fermeri sahənin o başına 3% üçün göndərmək olmaz
  it("fərq kiçikdirsə heç nə demir", () => {
    const netice = zeifTap([
      zona("simalQerb", 0.7),
      zona("simalSerq", 0.68),
      zona("cenubQerb", 0.7),
      zona("cenubSerq", 0.69),
    ]);
    expect(netice).toBeNull();
    expect(MIN_FERQ_FAIZ).toBe(8);
  });

  it("çılpaq sahədə faiz mənasızdır — null qaytarır", () => {
    expect(zeifTap([zona("simalQerb", 0.03), zona("simalSerq", 0.01)])).toBeNull();
  });

  it("iki kvadrantdan az olsa müqayisə etmir", () => {
    expect(zeifTap([zona("simalQerb", 0.7)])).toBeNull();
    expect(zeifTap(null)).toBeNull();
  });
});
