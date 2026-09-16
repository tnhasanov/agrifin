import { describe, expect, it } from "vitest";
import { BANTLAR, mehsuldarliqIndeksi } from "../mehsuldarliq.js";
import {
  SCORE_CONFIG_V3,
  SCORE_VERSION_V3,
  cariVeziyyetV3,
  farmScoreV3,
  multiplikatorHesabla,
  nisbiPerformansV3,
} from "./v3.js";

/** n mövsüm: zirvə = ətraf + fərq */
const tarixce = (say, ferq, etraf = 0.55, sonIl = 2025) =>
  Array.from({ length: say }, (_, i) => ({ il: sonIl - say + 1 + i, zirve: etraf + ferq, etrafMedyan: etraf }));
const etrafsiz = (say, zirve = 0.7, sonIl = 2025) =>
  Array.from({ length: say }, (_, i) => ({ il: sonIl - say + 1 + i, zirve }));
const INDI = new Date("2025-05-10T00:00:00Z");
const v3 = (p) => farmScoreV3({ indi: INDI, sonIl: 2025, ...p });
const setir = (n, id) => n.setirler.find((s) => s.id === id);

describe("SCORE_CONFIG_V3 — hədlər görünən və yoxlanılandır", () => {
  it("bant sərhədləri 85/70/50/0-dır, v2 isə 80/60/40/0 olaraq qalır", () => {
    expect(SCORE_CONFIG_V3.bantlar.map((b) => b.hedd)).toEqual([85, 70, 50, 0]);
    expect(BANTLAR.map((b) => b.hedd)).toEqual([80, 60, 40, 0]);
  });

  it("etibar tavanları: 3–4 → Orta, 5–7 → Yaxşı, 8+ → Yüksək", () => {
    expect(SCORE_CONFIG_V3.etibar).toEqual([
      { hedd: 8, ad: "yuksek", maxBant: "yuksek" },
      { hedd: 5, ad: "orta", maxBant: "yaxsi" },
      { hedd: 3, ad: "ilkin", maxBant: "orta" },
    ]);
  });

  it("tam 30 xal üçün ≥85% qalib payı VƏ median fərq ≥ +0.08 lazımdır", () => {
    expect(SCORE_CONFIG_V3.nisbiPerformans.qalibPayi[0]).toEqual({ hedd: 0.85, pay: 1 });
    expect(SCORE_CONFIG_V3.nisbiPerformans.ferqPayi[0]).toEqual({ hedd: 0.08, pay: 1 });
    expect(SCORE_CONFIG_V3.nisbiPerformans.birlesdirme).toBe("min");
  });

  it("multiplikatorlar: 1.05 / 1.00 / 0.90 / 0.75 / yoxdur 0.85", () => {
    expect(SCORE_CONFIG_V3.multiplikator).toMatchObject({ yuksek: 1.05, yaxsi: 1, orta: 0.9, zeif: 0.75, yoxdur: 0.85 });
  });
});

describe("nisbi performans — qalib payı × fərqin böyüklüyü", () => {
  it("+0.005 və +0.20 fərq eyni xalı ALMIR (v2-də alırdı)", () => {
    const cuzi = nisbiPerformansV3({ ustde: 3, hamisi: 3, medyanFerq: 0.005 });
    const boyuk = nisbiPerformansV3({ ustde: 3, hamisi: 3, medyanFerq: 0.2 });
    expect(cuzi.xal).toBeLessThan(boyuk.xal);
    expect(boyuk.xal).toBe(30);
    expect(cuzi.xal).toBeLessThanOrEqual(5);
    // v2: hər ikisi 30
    const v2Cuzi = mehsuldarliqIndeksi({ movsumler: tarixce(3, 0.005), sonIl: 2025 });
    const v2Boyuk = mehsuldarliqIndeksi({ movsumler: tarixce(3, 0.2), sonIl: 2025 });
    expect(setir(v2Cuzi, "nisbiPerformans").xal).toBe(30);
    expect(setir(v2Boyuk, "nisbiPerformans").xal).toBe(30);
  });

  it("tam 30 yalnız ≥85% qalib VƏ ≥+0.08 median fərqlə", () => {
    expect(nisbiPerformansV3({ ustde: 9, hamisi: 10, medyanFerq: 0.08 }).xal).toBe(30);
    // 8/10 = 80% → tavan 0.8 payı
    expect(nisbiPerformansV3({ ustde: 8, hamisi: 10, medyanFerq: 0.2 }).xal).toBe(24);
    // 100% qalib, amma fərq 0.06 → 0.75 payı
    expect(nisbiPerformansV3({ ustde: 10, hamisi: 10, medyanFerq: 0.06 }).xal).toBe(23);
  });

  it("monotondur: fərq böyüdükcə xal azalmır", () => {
    const xallar = [0, 0.005, 0.01, 0.03, 0.05, 0.08, 0.2].map((f) => nisbiPerformansV3({ ustde: 5, hamisi: 5, medyanFerq: f }).xal);
    for (let i = 1; i < xallar.length; i += 1) expect(xallar[i]).toBeGreaterThanOrEqual(xallar[i - 1]);
  });

  it("2 mövsümdən az müqayisə ilə ölçülmür", () => {
    expect(nisbiPerformansV3({ ustde: 1, hamisi: 1, medyanFerq: 0.2 })).toBeNull();
  });
});

describe("etibar tavanı — mövsüm sayı banda tavan qoyur", () => {
  it("3 mövsüm +0.005: v2-də Yüksək (86), v3-də Yüksək OLA BİLMƏZ", () => {
    const movsumler = tarixce(3, 0.005, 0.7);
    const cari = { ndvi: 0.75, etrafMedyan: 0.6 };
    const v2 = mehsuldarliqIndeksi({ movsumler, cari, sonIl: 2025 });
    expect(v2.bant).toBe("yuksek");
    expect(v2.bal).toBeGreaterThanOrEqual(80);

    const n = v3({ movsumler, cari });
    expect(n.scoreVersion).toBe(SCORE_VERSION_V3);
    expect(n.adjustedBand).not.toBe("yuksek");
    expect(n.adjustedBand).toBe("orta");
    expect(n.confidence).toBe("ilkin");
    // Xam bal onsuz da Orta çıxır (nisbi 30 → ~5), tavan işə düşmür
    expect(n.rawBand).toBe("orta");
    expect(n.bandCapReason).toBeNull();
  });

  it("3–4 mövsüm: güclü sahə də ən çoxu Orta alır", () => {
    for (const say of [3, 4]) {
      const n = v3({ movsumler: tarixce(say, 0.2, 0.7), cari: { ndvi: 0.9, etrafMedyan: 0.6 } });
      expect(n.rawBand, `${say} mövsüm`).toBe("yuksek");
      expect(n.adjustedBand, `${say} mövsüm`).toBe("orta");
      expect(n.adjustedScore).toBeLessThanOrEqual(69);
      expect(n.rawScore).toBeGreaterThan(n.adjustedScore);
    }
  });

  it("5–7 mövsüm: ən çoxu Yaxşı", () => {
    for (const say of [5, 6, 7]) {
      const n = v3({ movsumler: tarixce(say, 0.2, 0.7), cari: { ndvi: 0.9, etrafMedyan: 0.6 } });
      expect(n.adjustedBand, `${say} mövsüm`).toBe("yaxsi");
      expect(n.bandCapReason).toBe("etibar.orta");
      expect(n.adjustedScore).toBeLessThanOrEqual(84);
    }
  });

  it("yalnız 8+ mövsüm VƏ güclü nəticə Yüksək verir", () => {
    const guclu = v3({ movsumler: tarixce(8, 0.2, 0.7), cari: { ndvi: 0.9, etrafMedyan: 0.6 } });
    expect(guclu.adjustedBand).toBe("yuksek");
    expect(guclu.bandCapReason).toBeNull();
    expect(guclu.adjustedScore).toBe(guclu.rawScore);
    expect(guclu.underwritingMultiplier).toBe(1.05);

    // 8+ mövsüm, amma cüzi fərq → Yüksək deyil
    const cuzi = v3({ movsumler: tarixce(9, 0.005, 0.7), cari: { ndvi: 0.75, etrafMedyan: 0.6 } });
    expect(cuzi.adjustedBand).not.toBe("yuksek");
  });

  it("tavan zəif sahəni QALDIRMIR — yalnız yuxarıdan kəsir", () => {
    const n = v3({ movsumler: tarixce(3, -0.15, 0.7) });
    expect(n.rawBand).toBe("zeif");
    expect(n.adjustedBand).toBe("zeif");
    expect(n.bandCapReason).toBeNull();
  });

  it("kritik müqayisə yoxdursa bant göstərilmir", () => {
    const n = v3({ movsumler: etrafsiz(9) });
    expect(n.rawBand).toBeNull();
    expect(n.adjustedBand).toBeNull();
    expect(n.bandCapReason).toBe("muqayiseYoxdur");
    expect(n.missingInputs).toContain("muqayise");
    expect(n.underwritingMultiplier).toBe(0.85);
    expect(n.manualReview.teleb).toBe(true);
  });
});

describe("cari mövsüm — fenologiya sübutu", () => {
  it("aşağı NDVI + bitki mövsümdən kənarda → 'ölçülməyib' (risk deyil)", () => {
    // Buğda: oktyabr → iyun; avqustda mövsümdən kənardadır
    const c = cariVeziyyetV3({ cari: { ndvi: 0.2, etrafMedyan: 0.6 }, bitki: "bugda", indi: new Date("2025-08-10") });
    expect(c).toMatchObject({ olculub: false, hal: "olculmeyib", sebeb: "cari.ekinYox", risk: false, qeyriMueyyen: false });
  });

  it("aşağı NDVI + açıq fenoloji sübut → 'ölçülməyib'", () => {
    const c = cariVeziyyetV3({ cari: { ndvi: 0.2, etrafMedyan: 0.6, fenologiya: "bicilib" }, bitki: null, indi: INDI });
    expect(c.hal).toBe("olculmeyib");
  });

  it("aşağı NDVI, fenologiya bilinmir → 'qeyri-müəyyən': nə xal, nə risk, amma çatışmayan giriş", () => {
    const c = cariVeziyyetV3({ cari: { ndvi: 0.2, etrafMedyan: 0.6 }, bitki: null, indi: INDI });
    expect(c).toMatchObject({ olculub: false, hal: "qeyriMueyyen", risk: false, qeyriMueyyen: true, catismayan: "fenologiya" });
    // Bitki mövsüm içindədir, amma NDVI aşağı — yenə qeyri-müəyyən (biçilib deyilə bilməz)
    const d = cariVeziyyetV3({ cari: { ndvi: 0.2, etrafMedyan: 0.6 }, bitki: "bugda", indi: INDI });
    expect(d.hal).toBe("qeyriMueyyen");
  });

  it("ölçülən cari mövsümdə risk v2 ilə eyni şərtlə qalxır", () => {
    const risk = cariVeziyyetV3({ cari: { ndvi: 0.39, etrafMedyan: 0.55 }, bitki: "bugda", indi: INDI });
    expect(risk).toMatchObject({ olculub: true, hal: "zeif", risk: true, xal: 0 });
    const yaxsi = cariVeziyyetV3({ cari: { ndvi: 0.75, etrafMedyan: 0.6 }, bitki: "bugda", indi: INDI });
    expect(yaxsi).toMatchObject({ olculub: true, hal: "yaxsi", risk: false, xal: 10 });
  });
});

describe("anderraytinq multiplikatoru", () => {
  it("banda görə: 1.05 / 1.00 / 0.90 / 0.75", () => {
    expect(multiplikatorHesabla({ bant: "yuksek" }).emsal).toBe(1.05);
    expect(multiplikatorHesabla({ bant: "yaxsi" }).emsal).toBe(1);
    expect(multiplikatorHesabla({ bant: "orta" }).emsal).toBe(0.9);
    expect(multiplikatorHesabla({ bant: "zeif" }).emsal).toBe(0.75);
  });

  it("bant yoxdursa 0.85 + əl ilə baxış siqnalı", () => {
    expect(multiplikatorHesabla({ bant: null })).toEqual({ emsal: 0.85, manualBaxis: true, sebebler: ["bantYoxdur"] });
  });

  it("cari riskli sahə müsbət multiplikator ALMIR", () => {
    const n = v3({ movsumler: tarixce(9, 0.2, 0.7), cari: { ndvi: 0.39, etrafMedyan: 0.55 }, bitki: "bugda" });
    expect(n.adjustedBand).toBe("yuksek");
    expect(n.currentRisk.risk).toBe(true);
    expect(n.underwritingMultiplier).toBeLessThanOrEqual(1);
    expect(n.manualReview.sebebler).toContain("cariRisk");
  });

  it("qeyri-müəyyən cari mövsüm də müsbət artım vermir", () => {
    const n = v3({ movsumler: tarixce(9, 0.2, 0.7), cari: { ndvi: 0.2, etrafMedyan: 0.6 } });
    expect(n.currentRisk.qeyriMueyyen).toBe(true);
    expect(n.underwritingMultiplier).toBe(1);
    expect(n.missingInputs).toContain("fenologiya");
  });

  it("tarixçəsiz sahə 1.00 və ya 1.25 almır — 0.85 + əl ilə baxış", () => {
    expect(farmScoreV3({ movsumler: [] })).toBeNull();
    const az = v3({ movsumler: tarixce(2, 0.2) });
    expect(az.hal).toBe("kifayetsiz");
    expect(az.underwritingMultiplier).toBe(0.85);
    expect(az.manualReview.teleb).toBe(true);
  });
});

describe("çıxış sahələri və metodologiya qeydləri", () => {
  it("bütün tələb olunan sahələr var", () => {
    const n = v3({ movsumler: tarixce(6, 0.1, 0.6), cari: { ndvi: 0.7, etrafMedyan: 0.6 }, bitki: "bugda" });
    for (const acar of [
      "rawScore", "adjustedScore", "rawBand", "adjustedBand", "confidence", "bandCapReason",
      "methodology", "scoreVersion", "underwritingMultiplier", "currentRisk", "missingInputs",
    ]) {
      expect(n, acar).toHaveProperty(acar);
    }
    expect(Number.isInteger(n.rawScore)).toBe(true);
    expect(n.adjustedScore).toBeLessThanOrEqual(n.rawScore);
  });

  it("proxy qeyri-müəyyənliyi qeyd olunur, amma balda ikiqat cəzalanmır", () => {
    const n = v3({ movsumler: tarixce(9, 0.2, 0.7), cari: { ndvi: 0.9, etrafMedyan: 0.6 } });
    expect(n.methodology.nisbiPerformans).toBe("proxy-yerli-etraf");
    expect(n.methodology.vegetasiya).toBe("zirveProxy");
    expect(n.missingInputs).toEqual(expect.arrayContaining(["hemyasQrupu", "ayliqSeriya"]));
    // Tam dəlil: proxy olmasına baxmayaraq Yüksək bant mümkündür (sabit
    // seriyada meyl "sabit" 7/10 verir, ona görə 97)
    expect(n.rawScore).toBeGreaterThanOrEqual(95);
    expect(n.adjustedScore).toBe(n.rawScore);
    expect(n.adjustedBand).toBe("yuksek");
  });

  it("v2 hesablaması dəyişməyib — eyni girişdə v2 nəticəsi köhnə kimi qalır", () => {
    const movsumler = tarixce(3, 0.005, 0.7);
    const v2 = mehsuldarliqIndeksi({ movsumler, cari: { ndvi: 0.75, etrafMedyan: 0.6 }, sonIl: 2025 });
    expect(v2).not.toHaveProperty("scoreVersion");
    expect(v2.bant).toBe("yuksek");
  });
});
