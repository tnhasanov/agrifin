import { describe, expect, it } from "vitest";
import { formatDelta, formatMoney, formatNumber, formatSignedMoney } from "./format.js";

describe("formatMoney", () => {
  it("azərbaycanca minlikləri nöqtə ilə ayırır", () => {
    expect(formatMoney(7280, "az")).toBe("7.280 ₼");
  });

  it("ingiliscə vergüldən istifadə edir", () => {
    expect(formatMoney(7280, "en")).toBe("7,280 ₼");
  });

  it("kəsr hissəni yuvarlaqlaşdırır", () => {
    expect(formatMoney(8379.6, "az")).toBe("8.380 ₼");
  });

  it("dil verilməyəndə azərbaycancaya keçir", () => {
    expect(formatMoney(1000)).toBe("1.000 ₼");
  });
});

describe("formatNumber", () => {
  it("rəqəm olmayanı tire ilə göstərir", () => {
    expect(formatNumber(undefined, "az")).toBe("—");
    expect(formatNumber(Number.NaN, "az")).toBe("—");
  });

  it("kəsr rəqəmləri dilə uyğun yazır", () => {
    expect(formatNumber(6.5, "az")).toBe("6,5");
    expect(formatNumber(6.5, "en")).toBe("6.5");
  });

  it("rusca minlikləri boşluqla ayırır", () => {
    // ru-RU qırılmayan boşluq (U+00A0) istifadə edir
    expect(formatNumber(7280, "ru")).toBe("7\u00A0280");
  });
});

describe("formatDelta", () => {
  it("artımı plus, azalmanı həqiqi minus işarəsi ilə yazır", () => {
    expect(formatDelta(2.4)).toBe("+2.4%");
    expect(formatDelta(-1.1)).toBe("−1.1%");
  });

  it("sıfıra işarə qoymur", () => {
    expect(formatDelta(0)).toBe("0.0%");
  });
});

describe("formatSignedMoney", () => {
  it("gələn və gedən əməliyyatları ayırır", () => {
    expect(formatSignedMoney(3150, "az")).toBe("+3.150 ₼");
    expect(formatSignedMoney(-530, "az")).toBe("−530 ₼");
  });
});
