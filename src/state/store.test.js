import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./store.jsx";
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

  // GÖRÜNMƏYƏN PULQABI ARTIQ DƏYİŞMİR. `carbon/sell` reducer-i SİLİNDİ:
  // karbon ekranındakı "sat" düyməsi heç bir ekranda göstərilməyən demo
  // balansı 360 ₼ artırırdı. İstifadəçinin görmədiyi balansı dəyişən gizli
  // hərəkət audit oluna bilməyən pul hərəkətidir (bax: store.jsx DEMO qeydi).
  it("karbon satışı gizli demo pulqabını DƏYİŞMİR", () => {
    const next = reducer(initialState, { type: "carbon/sell" });
    expect(next).toBe(initialState);
    expect(next.wallet).toBe(initialState.wallet);
    expect(next.creditsSold).toBe(false);
    expect(next.txns).toHaveLength(initialState.txns.length);
  });

  // `loan/take` reducer-i də SİLİNMİŞDİ: kredit vəziyyəti serverdədir
  // (bax: api/kredit.js). Pulqabına dərhal pul yazan heç bir yol qalmadı.
  it("heç bir köhnə demo əməliyyatı vəziyyəti dəyişmir", () => {
    for (const type of ["carbon/sell", "loan/take", "rec/complete"]) {
      expect(reducer(initialState, { type, amount: 1000, id: "aphid" })).toBe(initialState);
    }
  });

  it("demo sıfırlanması ilk vəziyyətə qaytarır", () => {
    const dirty = reducer(initialState, { type: "hesab/set", telefon: "+994501234567" });
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
