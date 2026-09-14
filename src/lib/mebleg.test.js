import { describe, expect, it } from "vitest";
import { meblegMetni, meblegParcala } from "./mebleg.js";

describe("meblegParcala", () => {
  it("auto: qəpik yalnız sıfırdan fərqli olanda", () => {
    expect(meblegMetni(798)).toBe("798 ₼");
    expect(meblegMetni(39.9)).toBe("39,90 ₼");
    expect(meblegMetni(1234.5)).toBe("1.234,50 ₼");
  });

  it("hemise: həmişə iki rəqəm; hec: tam ədəd", () => {
    expect(meblegMetni(798, "az", { qepik: "hemise" })).toBe("798,00 ₼");
    expect(meblegMetni(39.9, "az", { qepik: "hec" })).toBe("40 ₼");
  });

  it("mənfi: həqiqi minus, defis deyil", () => {
    const p = meblegParcala(-51.7);
    expect(p.menfi).toBe(true);
    expect(p.isare).toBe("−");
    expect(meblegMetni(-51.7)).toBe("−51,70 ₼");
  });

  it("dilə görə ayırıcı", () => {
    expect(meblegMetni(1234.5, "en")).toBe("1,234.50 ₼");
    // ru qruplaşdırma ayırıcısı qırılmaz boşluqdur (U+00A0 / U+202F) — rəqəm sətir
    // sonunda iki yerə bölünməsin
    expect(meblegMetni(1234.5, "ru").replace(/[\u00a0\u202f]/g, " ")).toBe("1 234,50 ₼");
  });

  it("yararsız dəyər tire verir, sıfır isə 0", () => {
    expect(meblegMetni(NaN)).toBe("—");
    expect(meblegMetni(null)).toBe("—");
    expect(meblegMetni(0)).toBe("0 ₼");
  });

  it("qəpik yuvarlaqlama sərhədi: 0,995 → 1,00", () => {
    expect(meblegMetni(0.995)).toBe("1 ₼");
    expect(meblegMetni(0.995, "az", { qepik: "hemise" })).toBe("1,00 ₼");
  });
});
