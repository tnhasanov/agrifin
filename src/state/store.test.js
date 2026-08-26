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

  // `loan/take` reducer-i SİLİNDİ: kredit vəziyyəti artıq serverdədir
  // (bax: api/kredit.js). Pulqabına dərhal pul yazan yol qalmadı.
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

  it("hesab telefonu yazılır və çıxışda silinir", () => {
    const girdi = reducer(initialState, { type: "hesab/set", telefon: "+994501234567" });
    expect(girdi.hesab).toEqual({ telefon: "+994501234567" });
    const cixdi = reducer(girdi, { type: "hesab/set", telefon: null });
    expect(cixdi.hesab).toEqual({ telefon: null });
  });

  it("serverdən qəbul edilən sahə yoxlanılır", () => {
    const sahe = {
      noqteler: [
        [40.37, 47.12],
        [40.38, 47.13],
        [40.37, 47.14],
      ],
      hektar: 4.2,
    };
    expect(reducer(initialState, { type: "sahe/qebul", sahe }).sahe).toEqual(sahe);
    // Zibil kontur qəbul edilmir
    expect(reducer(initialState, { type: "sahe/qebul", sahe: { noqteler: "yox" } })).toBe(
      initialState,
    );
  });
});

describe("computeRepayment", () => {
  it("bir ödənişli sadə faizi hesablayır", () => {
    // 5000 × (1 + 0.115 × 5/12) = 5239.58 -> 5240
    expect(computeRepayment(5000, LOAN_TERMS)).toBe(5240);
  });
});
