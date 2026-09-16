import { describe, expect, it } from "vitest";
import { bantPaylanmasi, muqayiseSetirleri } from "../../scripts/farmscore-muqayise.mjs";

/**
 * Müqayisə cədvəlinin özü də testdir: v3 heç bir nümunədə v2-dən YUXARI
 * bant vermir və qısa tarixçəli sahələr Yüksək ala bilmir.
 */
describe("v2 vs v3 müqayisə nümunələri", () => {
  const setirler = muqayiseSetirleri();
  const sira = { yuksek: 0, yaxsi: 1, orta: 2, zeif: 3 };

  it("ən azı 10 nümunə var", () => {
    expect(setirler.length).toBeGreaterThanOrEqual(10);
  });

  it("v3 bantı heç bir nümunədə v2-dən yuxarı deyil", () => {
    for (const s of setirler) {
      if (!s.v2Bant || !s.v3Bant) continue;
      expect(sira[s.v3Bant], s.ad).toBeGreaterThanOrEqual(sira[s.v2Bant]);
    }
  });

  it("8 mövsümdən az heç bir nümunə v3-də Yüksək deyil", () => {
    for (const s of setirler) {
      if (s.movsum < 8) expect(s.v3Bant, s.ad).not.toBe("yuksek");
    }
  });

  it("v3 əmsalı heç vaxt 1.05-dən yuxarı, cari riskdə 1.00-dan yuxarı deyil", () => {
    for (const s of setirler) {
      expect(s.v3Emsal, s.ad).toBeLessThanOrEqual(1.05);
      if (s.v3Cari === "zeif" || s.v3Cari === "qeyriMueyyen") expect(s.v3Emsal, s.ad).toBeLessThanOrEqual(1);
    }
  });

  it("bant paylanması v3-də sola (aşağı) sürüşür", () => {
    const p = bantPaylanmasi(setirler);
    expect(p.v3.yuksek).toBeLessThan(p.v2.yuksek);
    expect(p.v2.yuksek + p.v2.yaxsi + p.v2.orta + p.v2.zeif + p.v2.yoxdur).toBe(setirler.length);
  });
});
