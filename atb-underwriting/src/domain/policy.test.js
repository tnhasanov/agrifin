import { describe, it, expect } from "vitest";
import { evaluatePolicy, summarise, authorityFor, POLICY_LIMITS } from "./policy.js";

const ok = {
  borrower: { businessMonths: 96, sector: "manufacturing", legalForm: "llc", revenueCurrency: "AZN" },
  request: { amount: 300_000, currency: "AZN", months: 48 },
  spread: { equity: 500_000, adjustedNetProfit: 90_000, balanced: true, imbalancePct: 0 },
  spreads: [],
  ratios: {},
  capacity: { dscr: 1.8, dscrStressed: 1.4, recommendedLimit: 400_000, binding: "cashflow" },
  collateral: { coverage: 1.4, staleCount: 0, uninsuredCount: 0, hasPersonalGuarantee: true },
  score: { stance: "acceptable", grade: 4, completeness: 1 },
  qualitative: { creditHistory: "clean3y", marketPosition: "diversified" },
};

const codes = (ctx) => evaluatePolicy(ctx).map((f) => f.code);

describe("evaluatePolicy", () => {
  it("təmiz işdə yalnız məlumat xarakterli qeyd qalır", () => {
    const findings = evaluatePolicy(ok);
    expect(findings.every((f) => f.severity === "info")).toBe(true);
    expect(summarise(findings).clean).toBe(true);
  });

  it("mənfi kapitalı dayandırıcı sayır", () => {
    const f = evaluatePolicy({ ...ok, spread: { ...ok.spread, equity: -20_000 } });
    expect(f.find((x) => x.code === "negativeEquity").severity).toBe("stop");
  });

  it("DSCR 1-dən aşağıdırsa dayandırır, 1.3-dən aşağıdırsa xəbərdarlıq edir", () => {
    const below1 = evaluatePolicy({ ...ok, capacity: { ...ok.capacity, dscr: 0.9 } });
    expect(below1.find((x) => x.code === "dscrBelowOne").severity).toBe("stop");

    const belowMin = evaluatePolicy({ ...ok, capacity: { ...ok.capacity, dscr: 1.15 } });
    expect(belowMin.find((x) => x.code === "dscrBelowMin").severity).toBe("warn");
    expect(belowMin.find((x) => x.code === "dscrBelowOne")).toBeUndefined();
  });

  it("stress ssenarisində 1-dən aşağı düşməyi ayrıca qeyd edir", () => {
    const f = codes({ ...ok, capacity: { ...ok.capacity, dscr: 1.4, dscrStressed: 0.95 } });
    expect(f).toContain("stressFail");
  });

  it("cari gecikməni və 12 aydan gənc bizneslə işi dayandırır", () => {
    const arrears = evaluatePolicy({ ...ok, qualitative: { creditHistory: "overdueNow" } });
    expect(arrears.find((x) => x.code === "currentArrears").severity).toBe("stop");

    const young = evaluatePolicy({ ...ok, borrower: { ...ok.borrower, businessMonths: 7 } });
    expect(young.find((x) => x.code === "youngBusiness").severity).toBe("stop");
  });

  it("girov örtüyünə görə xəbərdarlıq və dayandırma fərqlidir", () => {
    const low = evaluatePolicy({ ...ok, collateral: { ...ok.collateral, coverage: 0.8 } });
    expect(low.find((x) => x.code === "collateralLow").severity).toBe("warn");

    const critical = evaluatePolicy({ ...ok, collateral: { ...ok.collateral, coverage: 0.3 } });
    expect(critical.find((x) => x.code === "collateralCritical").severity).toBe("stop");
  });

  it("valyuta uyğunsuzluğunu tutur", () => {
    expect(codes({ ...ok, request: { ...ok.request, currency: "USD" } })).toContain("currencyMismatch");
  });

  it("valyuta gəliri eyni olanda uyğunsuzluq yoxdur", () => {
    const f = codes({
      ...ok,
      request: { ...ok.request, currency: "USD" },
      borrower: { ...ok.borrower, revenueCurrency: "USD" },
    });
    expect(f).not.toContain("currencyMismatch");
  });

  it("üç dövr ardıcıl azalan satışı görür", () => {
    const declining = [
      { annualRevenue: 500 }, { annualRevenue: 400 }, { annualRevenue: 300 },
    ];
    expect(codes({ ...ok, spreads: declining })).toContain("revenueDeclining");

    const growing = [
      { annualRevenue: 300 }, { annualRevenue: 400 }, { annualRevenue: 500 },
    ];
    expect(codes({ ...ok, spreads: growing })).not.toContain("revenueDeclining");
  });

  it("məbləğ tövsiyədən yuxarıdırsa bildirir", () => {
    const f = evaluatePolicy({ ...ok, request: { ...ok.request, amount: 900_000 } });
    expect(f.find((x) => x.code === "aboveRecommended").params.limit).toBe(400_000);
  });

  it("dayandırıcılar siyahının başındadır", () => {
    const f = evaluatePolicy({
      ...ok,
      spread: { ...ok.spread, equity: -1 },
      collateral: { ...ok.collateral, uninsuredCount: 2 },
    });
    expect(f[0].severity).toBe("stop");
  });

  it("qadağan olunmuş sahəni dayandırır", () => {
    const f = evaluatePolicy({ ...ok, borrower: { ...ok.borrower, sector: "gambling" } });
    expect(f.find((x) => x.code === "restrictedSector").severity).toBe("stop");
  });

  it("vergi borcunu və məhkəmə mübahisəsini xəbərdarlıq kimi verir", () => {
    const f = codes({ ...ok, borrower: { ...ok.borrower, taxDebt: true, litigation: true } });
    expect(f).toContain("taxDebt");
    expect(f).toContain("litigation");
  });

  it("müddət məhdudiyyətini yoxlayır", () => {
    const f = codes({ ...ok, request: { ...ok.request, months: POLICY_LIMITS.maxTenorMonths + 12 } });
    expect(f).toContain("tenorTooLong");
  });
});

describe("summarise", () => {
  it("dayandırıcı varsa istisna qərarı tələb olunur", () => {
    const s = summarise([{ severity: "stop" }, { severity: "warn" }, { severity: "info" }]);
    expect(s.stopCount).toBe(1);
    expect(s.warnCount).toBe(1);
    expect(s.needsException).toBe(true);
    expect(s.clean).toBe(false);
  });
});

describe("authorityFor", () => {
  it("məbləğə görə səlahiyyət səviyyəsini seçir", () => {
    expect(authorityFor(100_000)).toBe("branch");
    expect(authorityFor(300_000)).toBe("regional");
    expect(authorityFor(1_200_000)).toBe("headOffice");
    expect(authorityFor(5_000_000)).toBe("board");
  });
});
