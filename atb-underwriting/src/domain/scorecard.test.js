import { describe, it, expect } from "vitest";
import {
  computeScore,
  applyOverride,
  gradeFor,
  suggestedRate,
  QUANT_FACTORS,
  QUAL_FACTORS,
} from "./scorecard.js";

const strong = {
  ratios: {
    netDebtToEbitda: { value: 1.2 },
    equityRatio: { value: 0.55 },
    ebitdaMargin: { value: 0.22 },
    currentRatio: { value: 1.9 },
    revenueGrowth: { value: 0.25 },
  },
  capacity: { dscr: 2.4 },
  qualitative: {
    creditHistory: "clean3y",
    management: "strong",
    yearsInBusiness: "over10",
    bankRelationship: "mainBank",
    marketPosition: "diversified",
    accountingQuality: "audited",
    sectorOutlook: "growing",
  },
};

const weak = {
  ratios: {
    netDebtToEbitda: { value: 7 },
    equityRatio: { value: 0.02 },
    ebitdaMargin: { value: 0.01 },
    currentRatio: { value: 0.6 },
    revenueGrowth: { value: -0.3 },
  },
  capacity: { dscr: 0.8 },
  qualitative: {
    creditHistory: "overdueNow",
    management: "weak",
    yearsInBusiness: "y1to3",
    bankRelationship: "newClient",
    marketPosition: "singleBuyer",
    accountingQuality: "informal",
    sectorOutlook: "declining",
  },
};

describe("computeScore", () => {
  it("güclü müştəriyə yüksək bal və aşağı sinif verir", () => {
    const s = computeScore(strong);
    expect(s.total).toBe(100);
    expect(s.grade).toBe(1);
    expect(s.stance).toBe("preferred");
  });

  it("zəif müştəriyə aşağı bal verir və imtina mövqeyinə çıxarır", () => {
    const s = computeScore(weak);
    expect(s.total).toBeLessThan(25);
    expect(s.grade).toBe(10);
    expect(s.stance).toBe("decline");
  });

  it("çəkilərin cəmi 100-dür", () => {
    const total = [...QUANT_FACTORS, ...QUAL_FACTORS].reduce((s, f) => s + f.weight, 0);
    expect(total).toBe(100);
  });

  it("kəmiyyət hissəsi 60, keyfiyyət 40 çəkidədir", () => {
    expect(QUANT_FACTORS.reduce((s, f) => s + f.weight, 0)).toBe(60);
    expect(QUAL_FACTORS.reduce((s, f) => s + f.weight, 0)).toBe(40);
  });

  it("məlumatı olmayan amil sıfır bal deyil — çəkidən çıxır", () => {
    const partial = computeScore({
      ratios: strong.ratios,
      capacity: strong.capacity,
      qualitative: {},
    });
    expect(partial.total).toBe(100);
    expect(partial.completeness).toBeCloseTo(0.6, 6);
  });

  it("doldurulma faizini hesablayır", () => {
    const s = computeScore(strong);
    expect(s.completeness).toBe(1);
  });

  it("töhfələrin cəmi ümumi bala bərabərdir", () => {
    const s = computeScore({
      ...strong,
      qualitative: { ...strong.qualitative, management: "adequate", sectorOutlook: "cyclical" },
    });
    const sum = s.lines.reduce((acc, l) => acc + l.contribution, 0);
    expect(sum).toBeCloseTo(s.total, 1);
  });

  it("heç bir məlumat yoxdursa çökmür", () => {
    const s = computeScore({ ratios: {}, capacity: null, qualitative: {} });
    expect(s.total).toBe(0);
    expect(s.completeness).toBe(0);
  });
});

describe("gradeFor", () => {
  it("sərhəd dəyərləri aşağı sinifə düşür", () => {
    expect(gradeFor(85).grade).toBe(1);
    expect(gradeFor(84.9).grade).toBe(2);
    expect(gradeFor(0).grade).toBe(10);
  });

  it("yüksək sinif daha aşağı defolt ehtimalı deməkdir", () => {
    expect(gradeFor(90).pd).toBeLessThan(gradeFor(40).pd);
  });
});

describe("applyOverride", () => {
  const base = computeScore(strong);

  it("əsaslandırma olmadan düzəliş tətbiq olunmur", () => {
    expect(applyOverride(base, { grade: 5, reason: "  " }).grade).toBe(base.grade);
    expect(applyOverride(base, { grade: 5 }).overridden).toBe(false);
  });

  it("əsaslandırma varsa sinfi dəyişir və modelin sinfini saxlayır", () => {
    const o = applyOverride(base, { grade: 5, reason: "Sahə üzrə əlavə risk", by: "L. Rəhimli" });
    expect(o.grade).toBe(5);
    expect(o.overridden).toBe(true);
    expect(o.modelGrade).toBe(base.grade);
    expect(o.pd).toBeGreaterThan(base.pd);
  });

  it("mövcud olmayan sinfi qəbul etmir", () => {
    expect(applyOverride(base, { grade: 42, reason: "səbəb" }).grade).toBe(base.grade);
  });
});

describe("suggestedRate", () => {
  it("riskli müştəriyə daha yüksək faiz təklif edir", () => {
    const low = suggestedRate({ pd: 0.006, coverage: 1.5 });
    const high = suggestedRate({ pd: 0.28, coverage: 1.5 });
    expect(high).toBeGreaterThan(low);
  });

  it("girov örtüyü artdıqca faiz azalır", () => {
    const thin = suggestedRate({ pd: 0.1, coverage: 0.4 });
    const thick = suggestedRate({ pd: 0.1, coverage: 1.5 });
    expect(thick).toBeLessThan(thin);
  });

  it("girov yoxdursa da rəqəm qaytarır", () => {
    expect(Number.isFinite(suggestedRate({ pd: 0.05, coverage: null }))).toBe(true);
  });
});
