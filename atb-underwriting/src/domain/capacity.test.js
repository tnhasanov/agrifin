import { describe, it, expect } from "vitest";
import {
  annuityPayment,
  maxPrincipal,
  schedule,
  firstYearDebtService,
  existingDebtService,
  availableCashflow,
  assessCapacity,
  DEFAULT_POLICY,
} from "./capacity.js";

describe("annuityPayment", () => {
  it("bilinən annuiteti hesablayır", () => {
    // 100 000, 12%, 24 ay → ~4 707.35
    expect(annuityPayment(100_000, 12, 24)).toBeCloseTo(4707.35, 1);
  });

  it("faizsiz kreditdə əsas məbləği bərabər bölür", () => {
    expect(annuityPayment(12_000, 0, 12)).toBe(1000);
  });

  it("məbləğ və ya müddət yoxdursa sıfırdır", () => {
    expect(annuityPayment(0, 12, 24)).toBe(0);
    expect(annuityPayment(100_000, 12, 0)).toBe(0);
  });
});

describe("maxPrincipal", () => {
  it("annuitetin tərsidir", () => {
    const pay = annuityPayment(250_000, 14, 36);
    expect(maxPrincipal(pay, 14, 36)).toBeCloseTo(250_000, 4);
  });
});

describe("schedule", () => {
  it("kredit müddətin sonunda tam bağlanır", () => {
    const rows = schedule(100_000, 15, 36);
    expect(rows).toHaveLength(36);
    expect(rows[35].balance).toBeCloseTo(0, 4);
  });

  it("güzəşt dövründə yalnız faiz ödənilir, qalıq azalmır", () => {
    const rows = schedule(120_000, 12, 24, 6);
    expect(rows[0].grace).toBe(true);
    expect(rows[0].principal).toBeCloseTo(0, 8);
    expect(rows[5].balance).toBeCloseTo(120_000, 4);
    expect(rows[6].grace).toBe(false);
    expect(rows[23].balance).toBeCloseTo(0, 4);
  });

  it("güzəşt ödənişi sonrakı aylarda ağırlaşdırır", () => {
    const withGrace = schedule(120_000, 12, 24, 6).find((r) => !r.grace).payment;
    const without = schedule(120_000, 12, 24, 0)[0].payment;
    expect(withGrace).toBeGreaterThan(without);
  });

  it("ilk il borc xidməti 12 ayın cəmidir", () => {
    const rows = schedule(100_000, 12, 36);
    const sum = rows.slice(0, 12).reduce((s, r) => s + r.payment, 0);
    expect(firstYearDebtService(rows)).toBeCloseTo(sum, 6);
  });
});

describe("existingDebtService", () => {
  it("müddətli kreditdə illik ödənişi, dövriyyə xəttində yalnız faizi sayır", () => {
    const total = existingDebtService([
      { monthlyPayment: 1000, revolving: false },
      { outstanding: 100_000, rate: 16, revolving: true },
    ]);
    expect(total).toBe(12_000 + 16_000);
  });
});

describe("availableCashflow", () => {
  it("EBITDA-dan vergi, kapital qoyuluşu və sahibkarın xərcini çıxır", () => {
    const cf = availableCashflow(
      { annualEbitda: 200_000, tax: 15_000 },
      { maintenanceCapex: 40_000, ownerDrawings: 36_000, workingCapitalNeed: 9_000 },
    );
    expect(cf).toBe(100_000);
  });

  it("mənfi nəticəni sıfıra qədər kəsir", () => {
    expect(availableCashflow({ annualEbitda: 10_000, tax: 0 }, { ownerDrawings: 50_000 })).toBe(0);
  });
});

describe("assessCapacity", () => {
  const spread = { annualEbitda: 300_000, tax: 20_000, annualRevenue: 2_000_000 };
  const base = {
    spread,
    request: { amount: 400_000, rate: 14, months: 48, graceMonths: 0, purpose: "workingCapital" },
    obligations: [{ monthlyPayment: 5000, revolving: false }],
    collateralLendingValue: 600_000,
    cashflowInputs: { maintenanceCapex: 30_000, ownerDrawings: 50_000 },
  };

  it("DSCR-i ümumi borc xidmətinə görə hesablayır", () => {
    const a = assessCapacity(base);
    expect(a.cashflow).toBe(200_000);
    expect(a.existingDebtService).toBe(60_000);
    expect(a.dscr).toBeCloseTo(a.cashflow / a.totalDebtService, 8);
  });

  it("stress ssenarisi DSCR-i azaldır", () => {
    const a = assessCapacity(base);
    expect(a.dscrStressed).toBeLessThan(a.dscr);
    expect(a.dscrStressed).toBeCloseTo(a.dscr * (1 - DEFAULT_POLICY.stressRevenueDrop), 8);
  });

  it("bağlayıcı məhdudiyyəti düzgün seçir — girov az olanda girovdur", () => {
    const a = assessCapacity({ ...base, collateralLendingValue: 120_000 });
    expect(a.binding).toBe("collateral");
    expect(a.recommendedLimit).toBe(120_000);
  });

  it("dövriyyə tavanı işlək kapitalda daha sərtdir", () => {
    const wc = assessCapacity({ ...base, spread: { ...spread, annualRevenue: 300_000 } });
    const inv = assessCapacity({
      ...base,
      spread: { ...spread, annualRevenue: 300_000 },
      request: { ...base.request, purpose: "investment" },
    });
    expect(wc.constraints.find((c) => c.key === "turnover").value).toBe(105_000);
    expect(inv.constraints.find((c) => c.key === "turnover").value).toBe(180_000);
  });

  it("tövsiyə olunan limit hədəf DSCR-i ödəyir", () => {
    const a = assessCapacity({ ...base, collateralLendingValue: 10_000_000 });
    const check = assessCapacity({
      ...base,
      collateralLendingValue: 10_000_000,
      request: { ...base.request, amount: a.recommendedLimit },
    });
    expect(check.dscr).toBeGreaterThanOrEqual(DEFAULT_POLICY.minDscr);
  });

  it("məbləğ tövsiyədən yuxarıdırsa bunu bildirir", () => {
    const a = assessCapacity({ ...base, collateralLendingValue: 100_000 });
    expect(a.withinRecommended).toBe(false);
  });

  it("güzəşt dövrü ilk il borc xidmətini azaldır", () => {
    const withGrace = assessCapacity({
      ...base,
      request: { ...base.request, graceMonths: 12 },
    });
    const without = assessCapacity(base);
    expect(withGrace.newDebtService).toBeLessThan(without.newDebtService);
    expect(withGrace.dscr).toBeGreaterThan(without.dscr);
  });
});
