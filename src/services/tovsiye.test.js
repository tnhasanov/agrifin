import { describe, expect, it } from "vitest";
import { MIN_KESIR_MM, baxisNoqteleri, suKesiri, tovsiyeleriQur } from "./tovsiye.js";
import { ICONS } from "../components/icons.js";

const hava = (et0, yagis) => ({
  et0_fao_evapotranspiration: Array.from({ length: 7 }, () => et0),
  precipitation_sum: Array.from({ length: 7 }, () => yagis),
});

const TEQVIM = {
  ad: "Payızlıq buğda",
  yoxlanildi: false,
  cari: [{ ad: "Boruya çıxma", isler: "İkinci azot. Suvarma kritikdir." }],
  novbeti: [{ ad: "Sünbülləmə" }],
  kc: 1.15,
};

describe("su kəsiri", () => {
  // 7 × 5 mm × 1.15 = 40 mm tələbat, yağış 7 × 1 = 7 mm → kəsir 33 mm
  it("tələbatı Kc ilə hesablayır və yağışı çıxır", () => {
    const netice = suKesiri({ daily: hava(5, 1), kc: 1.15, hektar: 5 });
    expect(netice.telebat).toBe(40);
    expect(netice.yagis).toBe(7);
    expect(netice.mm).toBe(33);
  });

  // Fermer mm ilə düşünmür — sisternlə düşünür. 1 mm × 1 ha = 10 m³
  it("hektara görə kubmetrə çevirir", () => {
    expect(suKesiri({ daily: hava(5, 1), kc: 1.15, hektar: 5 }).m3).toBe(33 * 10 * 5);
    expect(suKesiri({ daily: hava(5, 1), kc: 1.15, hektar: 1 }).m3).toBe(330);
  });

  it("kəsir kiçikdirsə tövsiyə vermir", () => {
    // 7 × 2 × 0.5 = 7 mm tələbat, 7 mm yağış → kəsir 0
    expect(suKesiri({ daily: hava(2, 1), kc: 0.5, hektar: 5 })).toBeNull();
    // Həddin dibində: 9 mm kəsir hələ az sayılır
    const az = suKesiri({ daily: hava(2, 0), kc: 0.6, hektar: 5 });
    expect(az).toBeNull();
    expect(MIN_KESIR_MM).toBe(10);
  });

  it("Kc və ya ölçü yoxdursa hesablamır", () => {
    expect(suKesiri({ daily: hava(5, 0), kc: null, hektar: 5 })).toBeNull();
    expect(suKesiri({ daily: hava(5, 0), kc: 1.15, hektar: null })).toBeNull();
    expect(suKesiri({ daily: {}, kc: 1.15, hektar: 5 })).toBeNull();
  });
});

describe("baxış nöqtələri", () => {
  // Böyük sahədə xətti artım praktik deyil: 50 ha-da 25 nöqtə heç kim gəzmir
  it("sahə ilə artır, amma sürətlə yox", () => {
    expect(baxisNoqteleri(1)).toBe(4);
    expect(baxisNoqteleri(5)).toBe(5);
    expect(baxisNoqteleri(25)).toBe(8);
    expect(baxisNoqteleri(100)).toBe(12);
  });

  it("həddləri aşmır", () => {
    expect(baxisNoqteleri(0.1)).toBe(3);
    expect(baxisNoqteleri(1000)).toBe(12);
    expect(baxisNoqteleri(0)).toBeNull();
    expect(baxisNoqteleri(NaN)).toBeNull();
  });
});

describe("tövsiyə siyahısı", () => {
  it("bilik bazasının mərhələsini hazır cümlə kimi verir", () => {
    const [ilk] = tovsiyeleriQur({ teqvim: TEQVIM, daily: hava(5, 1), hektar: 5 });
    // Mətn tərcümə açarı deyil — bilik bazasından olduğu kimi gəlir
    expect(ilk.basliq).toBe("Boruya çıxma");
    expect(ilk.metn).toContain("İkinci azot");
    expect(ilk.menbeKey).toBe("tovsiye.menbe.teqvim");
  });

  it("suvarma miqdarını mm və m³ ilə verir", () => {
    const su = tovsiyeleriQur({ teqvim: TEQVIM, daily: hava(5, 1), hektar: 5 }).find(
      (t) => t.nov === "su",
    );
    expect(su.vars.mm).toBe(33);
    expect(su.vars.m3).toEqual({ number: 1650 });
  });

  it("zəif künc ölçülübsə ona ayrıca tövsiyə verir", () => {
    const zona = { zeif: { ad: "simalSerq", ferq: -18 }, tarix: "2026-08-01" };
    const kart = tovsiyeleriQur({ teqvim: TEQVIM, daily: hava(5, 1), hektar: 5, zona }).find(
      (t) => t.nov === "zona",
    );
    expect(kart.vars.kunc).toEqual({ key: "zona.simalSerq" });
    expect(kart.vars.faiz).toBe(18);
  });

  it("zəif künc yoxdursa o kart olmur", () => {
    const siyahi = tovsiyeleriQur({ teqvim: TEQVIM, daily: hava(5, 1), hektar: 5, zona: null });
    expect(siyahi.some((t) => t.nov === "zona")).toBe(false);
  });

  // Təqvim gəlməsə də sahə ölçüsündən çıxan tövsiyə verilə bilər
  it("təqvim olmadan da baxış planı qurulur", () => {
    const siyahi = tovsiyeleriQur({ teqvim: null, daily: hava(5, 1), hektar: 5 });
    expect(siyahi.map((t) => t.nov)).toEqual(["baxis"]);
  });

  it("heç nə olmadan boş siyahı qaytarır", () => {
    expect(tovsiyeleriQur()).toEqual([]);
  });

  // Metodologiya ekrandan çıxarıldı, mənbə isə qaldı: fermerə "FAO-56 əmsalı"
  // lazım deyil, "bu rəqəm sizin sahənizdən gəlir" isə lazımdır
  it("hər kartda mənbə var, metodologiya izahı yoxdur", () => {
    const siyahi = tovsiyeleriQur({
      teqvim: TEQVIM,
      daily: hava(5, 1),
      hektar: 5,
      zona: { zeif: { ad: "simalSerq", ferq: -18 }, tarix: "2026-08-01" },
    });
    for (const kart of siyahi) {
      expect(kart.menbeKey, kart.nov).toBeTruthy();
      expect(kart.qeydKey, kart.nov).toBeUndefined();
    }
  });

  it("hər kartın ikonu Icon siyahısındadır", () => {
    const siyahi = tovsiyeleriQur({
      teqvim: TEQVIM,
      daily: hava(5, 1),
      hektar: 5,
      zona: { zeif: { ad: "simalSerq", ferq: -18 }, tarix: "2026-08-01" },
    });
    expect(siyahi.length).toBeGreaterThanOrEqual(5);
    for (const kart of siyahi) {
      expect(ICONS[kart.icon], `${kart.nov} → ${kart.icon}`).toBeTruthy();
    }
  });
});
