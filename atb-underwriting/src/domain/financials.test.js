import { describe, it, expect } from "vitest";
import { spreadPeriod, emptyPeriod, spreadAll, latest, previous } from "./financials.js";

const period = {
  label: "2025",
  months: 12,
  balance: {
    cash: 100, receivables: 200, inventory: 300, otherCurrentAssets: 0,
    fixedAssets: 400, otherLongTermAssets: 0,
    payables: 150, shortTermDebt: 250, otherCurrentLiabilities: 0,
    longTermDebt: 200, equity: 400,
  },
  income: {
    revenue: 1000, cogs: 600, opex: 200, depreciation: 50,
    otherIncome: 0, interestExpense: 40, tax: 20,
  },
  adjustments: { unrecordedRevenue: 0, ownerAddBacks: 0, nonRecurring: 0 },
};

describe("spreadPeriod", () => {
  it("cəmləri maddələrdən çıxarır", () => {
    const s = spreadPeriod(period);
    expect(s.currentAssets).toBe(600);
    expect(s.totalAssets).toBe(1000);
    expect(s.currentLiabilities).toBe(400);
    expect(s.totalLiabilities).toBe(600);
    expect(s.workingCapital).toBe(200);
    expect(s.totalDebt).toBe(450);
    expect(s.netDebt).toBe(350);
  });

  it("mənfəət pilləsini ardıcıl hesablayır", () => {
    const s = spreadPeriod(period);
    expect(s.grossProfit).toBe(400);
    expect(s.ebitda).toBe(200);
    expect(s.ebit).toBe(150);
    expect(s.pbt).toBe(110);
    expect(s.netProfit).toBe(90);
  });

  it("balans tutanda uyğunsuzluq sıfırdır", () => {
    const s = spreadPeriod(period);
    expect(s.imbalance).toBe(0);
    expect(s.balanced).toBe(true);
  });

  it("balans tutmayanda fərqi göstərir, hesablamanı dayandırmır", () => {
    const broken = { ...period, balance: { ...period.balance, equity: 300 } };
    const s = spreadPeriod(broken);
    expect(s.imbalance).toBe(100);
    expect(s.balanced).toBe(false);
    expect(s.ebitda).toBe(200);
  });

  it("uçota düşməyən dövriyyəni bütöv yox, marja ilə mənfəətə çevirir", () => {
    const s = spreadPeriod({
      ...period,
      adjustments: { unrecordedRevenue: 500, ownerAddBacks: 0, nonRecurring: 0 },
    });
    // Ümumi marja 40% → 500-dən 200 mənfəət.
    expect(s.unrecordedProfit).toBe(200);
    expect(s.adjustedRevenue).toBe(1500);
    expect(s.adjustedEbitda).toBe(400);
  });

  it("sahibkar düzəlişini və birdəfəlik maddəni əlavə edir", () => {
    const s = spreadPeriod({
      ...period,
      adjustments: { unrecordedRevenue: 0, ownerAddBacks: 30, nonRecurring: -10 },
    });
    expect(s.adjustedEbitda).toBe(220);
    expect(s.adjustedNetProfit).toBe(110);
  });

  it("natamam dövrü 12 aya çevirir", () => {
    const s = spreadPeriod({ ...period, months: 9 });
    expect(s.annualRevenue).toBeCloseTo(1333.33, 1);
    expect(s.annualEbitda).toBeCloseTo(266.67, 1);
  });

  it("mənfi uçotsuz dövriyyəni nəzərə almır", () => {
    const s = spreadPeriod({
      ...period,
      adjustments: { unrecordedRevenue: -500, ownerAddBacks: 0, nonRecurring: 0 },
    });
    expect(s.unrecordedProfit).toBe(0);
    expect(s.adjustedRevenue).toBe(1000);
  });

  it("boş dövrdə sıfıra bölmə baş vermir", () => {
    const s = spreadPeriod(emptyPeriod("yeni"));
    expect(s.grossMargin).toBe(0);
    expect(Number.isFinite(s.annualRevenue)).toBe(true);
  });
});

describe("spreadAll", () => {
  it("sıranı saxlayır, sonuncu və əvvəlkini verir", () => {
    const all = spreadAll([
      { ...period, label: "2024" },
      { ...period, label: "2025" },
    ]);
    expect(latest(all).label).toBe("2025");
    expect(previous(all).label).toBe("2024");
  });

  it("tək dövrdə əvvəlki yoxdur", () => {
    expect(previous(spreadAll([period]))).toBe(null);
  });
});
