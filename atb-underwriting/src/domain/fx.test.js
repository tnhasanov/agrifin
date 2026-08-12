import { describe, it, expect } from "vitest";
import { toAzn, rateFor, isMismatch, FX_RATES } from "./fx.js";
import { analyse } from "./analyse.js";
import { seedCases } from "./seed.js";

describe("valyuta çevrilməsi", () => {
  it("manat özü ilə eynidir", () => {
    expect(toAzn(100_000, "AZN")).toBe(100_000);
    expect(rateFor("AZN")).toBe(1);
  });

  it("dolları məzənnə ilə çevirir", () => {
    expect(toAzn(100_000, "USD")).toBe(100_000 * FX_RATES.USD);
  });

  it("tanınmayan valyutanı olduğu kimi saxlayır", () => {
    expect(toAzn(100_000, "XYZ")).toBe(100_000);
  });

  it("uyğunsuzluğu tanıyır", () => {
    expect(isMismatch("USD", "AZN")).toBe(true);
    expect(isMismatch("AZN", "AZN")).toBe(false);
  });
});

describe("təhlildə valyuta", () => {
  const usdCase = seedCases().find((c) => c.id === "ATB-2026-0167");

  it("dollarla kredit manat ekvivalenti ilə ölçülür", () => {
    const a = analyse(usdCase);
    expect(a.fx.converted).toBe(true);
    expect(a.fx.exposureAzn).toBe(600_000 * FX_RATES.USD);
    // Girov örtüyü də manat ekvivalentinə görə hesablanır.
    expect(a.collateral.coverage).toBeCloseTo(a.collateral.lendingTotal / a.fx.exposureAzn, 8);
  });

  it("valyuta dəyişəndə tələb olunan risk də dəyişir", () => {
    const inAzn = analyse({ ...usdCase, request: { ...usdCase.request, currency: "AZN" } });
    const inUsd = analyse(usdCase);
    expect(inUsd.capacity.requestedAmount).toBeGreaterThan(inAzn.capacity.requestedAmount);
    expect(inUsd.collateral.coverage).toBeLessThan(inAzn.collateral.coverage);
  });

  it("manatla kreditdə çevrilmə baş vermir", () => {
    const a = analyse(seedCases().find((c) => c.id === "ATB-2026-0141"));
    expect(a.fx.converted).toBe(false);
    expect(a.capacity.requestedAmount).toBe(250_000);
  });
});
