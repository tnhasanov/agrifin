import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./store.jsx";
import { carbonPayout } from "../services/carbon.js";
import { LOAN_TERMS, computeRepayment } from "../services/farm.js";

describe("reducer", () => {
  it("bağlanan siqnalı yadda saxlayır", () => {
    const next = reducer(initialState, { type: "siqnal/bagla", id: "saxta:2026-08-04" });
    expect(next.bagliSiqnallar).toEqual(["saxta:2026-08-04"]);
  });

  it("eyni siqnalı iki dəfə əlavə etmir", () => {
    const once = reducer(initialState, { type: "siqnal/bagla", id: "saxta:2026-08-04" });
    const twice = reducer(once, { type: "siqnal/bagla", id: "saxta:2026-08-04" });
    expect(twice).toBe(once);
  });

  it("karbon kreditləri satılanda pulqabını və əməliyyatları yeniləyir", () => {
    const next = reducer(initialState, { type: "carbon/sell" });
    expect(next.creditsSold).toBe(true);
    expect(next.wallet).toBe(initialState.wallet + carbonPayout());
    expect(next.txns).toHaveLength(initialState.txns.length + 1);
    expect(next.txns[0]).toMatchObject({ nameKey: "txn.carbon.name", amount: carbonPayout() });
  });

  it("kreditləri yalnız bir dəfə satır", () => {
    const once = reducer(initialState, { type: "carbon/sell" });
    const twice = reducer(once, { type: "carbon/sell" });
    expect(twice).toBe(once);
  });

  it("kredit götürüləndə məbləği köçürür və ödənişi hesablayır", () => {
    const next = reducer(initialState, { type: "loan/take", amount: 5000 });
    expect(next.wallet).toBe(initialState.wallet + 5000);
    expect(next.loan).toMatchObject({
      active: true,
      amount: 5000,
      repay: computeRepayment(5000, LOAN_TERMS),
    });
    expect(next.txns[0]).toMatchObject({ nameKey: "txn.loan.name", amount: 5000 });
  });

  it("sıfır və mənfi kredit məbləğini rədd edir", () => {
    expect(reducer(initialState, { type: "loan/take", amount: 0 })).toBe(initialState);
    expect(reducer(initialState, { type: "loan/take", amount: -100 })).toBe(initialState);
  });

  it("hər yeni əməliyyata unikal id verir", () => {
    const afterSell = reducer(initialState, { type: "carbon/sell" });
    const afterLoan = reducer(afterSell, { type: "loan/take", amount: 1000 });
    const ids = afterLoan.txns.map((txn) => txn.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("demo sıfırlanması ilk vəziyyətə qaytarır", () => {
    const dirty = reducer(reducer(initialState, { type: "carbon/sell" }), {
      type: "rec/complete",
      id: "aphid",
    });
    expect(reducer(dirty, { type: "demo/reset" })).toEqual(initialState);
  });

  it("naməlum əməliyyatda vəziyyəti dəyişmir", () => {
    expect(reducer(initialState, { type: "yoxdur" })).toBe(initialState);
  });
});

describe("computeRepayment", () => {
  it("bir ödənişli sadə faizi hesablayır", () => {
    // 5000 × (1 + 0.115 × 5/12) = 5239.58 -> 5240
    expect(computeRepayment(5000, LOAN_TERMS)).toBe(5240);
  });
});
