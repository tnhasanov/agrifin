import { describe, it, expect } from "vitest";
import {
  lendingValue,
  assessCollateral,
  isStale,
  COLLATERAL_TYPES,
  newCollateral,
} from "./collateral.js";

describe("lendingValue", () => {
  it("növün endirimini tətbiq edir", () => {
    expect(lendingValue({ type: "realEstateCommercial", marketValue: 1_000_000, firstRank: true })).toBe(600_000);
    expect(lendingValue({ type: "inventory", marketValue: 100_000, firstRank: true })).toBe(30_000);
  });

  it("ikinci növbəli ipotekanı yarıya endirir", () => {
    expect(lendingValue({ type: "realEstateCommercial", marketValue: 1_000_000, firstRank: false })).toBe(300_000);
  });

  it("əl ilə verilmiş əmsal növün əmsalını əvəz edir", () => {
    expect(lendingValue({ type: "realEstateCommercial", marketValue: 100_000, ltvOverride: 0.3, firstRank: true })).toBe(30_000);
  });

  it("sıfır əmsal da hörmətlə qarşılanır — boş sahə ilə qarışmır", () => {
    expect(lendingValue({ type: "realEstateCommercial", marketValue: 100_000, ltvOverride: 0, firstRank: true })).toBe(0);
  });

  it("şəxsi zaminlik məbləğ vermir", () => {
    expect(lendingValue({ type: "personalGuarantee", marketValue: 500_000, firstRank: true })).toBe(0);
  });

  it("tanınmayan növ sıfırdır", () => {
    expect(lendingValue({ type: "kosmik gəmi", marketValue: 1_000_000 })).toBe(0);
  });
});

describe("assessCollateral", () => {
  const items = [
    { id: "1", type: "realEstateCommercial", marketValue: 500_000, insured: true, firstRank: true, valuationDate: "2026-01-01" },
    { id: "2", type: "inventory", marketValue: 200_000, insured: false, firstRank: true, valuationDate: "2019-01-01" },
    { id: "3", type: "personalGuarantee", marketValue: 0, insured: false, firstRank: true, valuationDate: "" },
  ];

  it("bazar və kredit dəyərini ayrı sayır", () => {
    const a = assessCollateral(items, 300_000);
    expect(a.marketTotal).toBe(700_000);
    expect(a.lendingTotal).toBe(360_000);
  });

  it("örtük əmsalını kredit dəyərinə görə hesablayır", () => {
    const a = assessCollateral(items, 300_000);
    expect(a.coverage).toBeCloseTo(1.2, 6);
    expect(a.marketCoverage).toBeCloseTo(2.333, 3);
  });

  it("likvid girovu ayrıca cəmləyir", () => {
    const a = assessCollateral(items, 300_000);
    expect(a.hardTotal).toBe(300_000);
  });

  it("sığortasız və köhnə qiymətləndirməni sayır", () => {
    const a = assessCollateral(items, 300_000);
    expect(a.uninsuredCount).toBe(1);
    expect(a.staleCount).toBe(1);
  });

  it("şəxsi zaminliyin olmasını bildirir", () => {
    expect(assessCollateral(items, 1).hasPersonalGuarantee).toBe(true);
    expect(assessCollateral([items[0]], 1).hasPersonalGuarantee).toBe(false);
  });

  it("girov yoxdursa örtük sıfırdır, kredit isə hesablanır", () => {
    const a = assessCollateral([], 100_000);
    expect(a.lendingTotal).toBe(0);
    expect(a.coverage).toBe(0);
  });

  it("məbləğ sıfırdırsa örtük hesablanmır", () => {
    expect(assessCollateral(items, 0).coverage).toBe(null);
  });
});

describe("isStale", () => {
  const now = Date.parse("2026-08-12");
  it("2 ildən köhnə qiymətləndirməni köhnə sayır", () => {
    expect(isStale("2023-01-01", now)).toBe(true);
    expect(isStale("2025-06-01", now)).toBe(false);
  });

  it("tarix yoxdursa köhnə saymır", () => {
    expect(isStale("", now)).toBe(false);
    expect(isStale("filan tarix", now)).toBe(false);
  });
});

describe("newCollateral", () => {
  it("hər növ üçün əmsal təyin olunub", () => {
    for (const key of Object.keys(COLLATERAL_TYPES)) {
      expect(typeof COLLATERAL_TYPES[key].ltv).toBe("number");
    }
  });

  it("yeni girov standart növlə və unikal id ilə gəlir", () => {
    const a = newCollateral();
    const b = newCollateral();
    expect(a.id).not.toBe(b.id);
    expect(COLLATERAL_TYPES[a.type]).toBeTruthy();
  });
});
