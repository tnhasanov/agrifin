import { describe, expect, it } from "vitest";
import { initialState, reducer } from "./store.jsx";
import { mehsulTap } from "../../lib/bazar/kataloq.js";

/**
 * SƏBƏT REDUCER-İ — yalnız {kod, say}, sərhədlər kataloqdan.
 *
 * Səbətdə qiymət YOXDUR: localStorage-da nə dəyişdirilsə də sifarişin
 * rəqəmini server kataloqdan hesablayır. Burada yoxlanılan şey sayın heç
 * vaxt yararsız (0, kəsr, minimumdan az, maksimumdan çox) olmamasıdır.
 */
describe("səbət", () => {
  const karbamid = mehsulTap("karbamid-46-50kq"); // 1..500
  const kartof = mehsulTap("kartof-toxumu-aqra"); // 4..400

  it("məhsul əlavə olunur, təkrar əlavə sayı artırır", () => {
    let s = reducer(initialState, { type: "sebet/elave", kod: karbamid.kod, say: 2 });
    expect(s.sebet).toEqual([{ kod: karbamid.kod, say: 2 }]);
    s = reducer(s, { type: "sebet/elave", kod: karbamid.kod, say: 3 });
    expect(s.sebet).toEqual([{ kod: karbamid.kod, say: 5 }]);
  });

  it("naməlum məhsul səbətə düşmür", () => {
    expect(reducer(initialState, { type: "sebet/elave", kod: "uydurma", say: 1 })).toBe(initialState);
  });

  it("say minimumdan aşağı enmir, maksimumu keçmir", () => {
    let s = reducer(initialState, { type: "sebet/elave", kod: kartof.kod, say: 1 });
    expect(s.sebet[0].say).toBe(kartof.minSay);
    s = reducer(s, { type: "sebet/say", kod: kartof.kod, say: 10000 });
    expect(s.sebet[0].say).toBe(kartof.maxSay);
    s = reducer(s, { type: "sebet/say", kod: kartof.kod, say: 2 });
    expect(s.sebet[0].say).toBe(kartof.minSay);
    // Kəsr say tam ədədə yuvarlaqlanır
    s = reducer(s, { type: "sebet/say", kod: kartof.kod, say: 7.6 });
    expect(s.sebet[0].say).toBe(8);
  });

  it("sıfır say sətri silir; silmə və təmizləmə işləyir", () => {
    let s = reducer(initialState, { type: "sebet/elave", kod: karbamid.kod, say: 1 });
    s = reducer(s, { type: "sebet/elave", kod: kartof.kod, say: 5 });
    s = reducer(s, { type: "sebet/say", kod: karbamid.kod, say: 0 });
    expect(s.sebet.map((x) => x.kod)).toEqual([kartof.kod]);
    s = reducer(s, { type: "sebet/sil", kod: kartof.kod });
    expect(s.sebet).toEqual([]);
    // Boş səbətdə təmizləmə vəziyyəti dəyişmir (lazımsız render yox)
    expect(reducer(s, { type: "sebet/temizle" })).toBe(s);
  });

  it("səbətdə olmayan məhsulun sayı dəyişdirilə bilmir", () => {
    expect(reducer(initialState, { type: "sebet/say", kod: karbamid.kod, say: 3 })).toBe(initialState);
    expect(reducer(initialState, { type: "sebet/sil", kod: karbamid.kod })).toBe(initialState);
  });

  it("çatdırılma məlumatı saxlanılır və uzunluğu məhdudlaşdırılır", () => {
    const s = reducer(initialState, {
      type: "catdirilma/set",
      catdirilma: { ad: "Tural", telefon: "0501234567", unvan: "x".repeat(500), artiq: "atılır" },
    });
    expect(s.catdirilma).toEqual({ ad: "Tural", telefon: "0501234567", unvan: "x".repeat(200) });
    expect(reducer(initialState, { type: "catdirilma/set", catdirilma: "yox" })).toBe(initialState);
  });

  it("demo sıfırlanması səbəti də boşaldır", () => {
    const s = reducer(initialState, { type: "sebet/elave", kod: karbamid.kod, say: 1 });
    expect(reducer(s, { type: "demo/reset" }).sebet).toEqual([]);
  });
});
