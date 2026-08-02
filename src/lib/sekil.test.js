import { describe, expect, it } from "vitest";
import { MAX_OLCU, baytOlcusu, dataUrlAyir, miqyasHesabla, novDuzgun } from "./sekil.js";

describe("novDuzgun", () => {
  it("adi telefon şəkillərini qəbul edir", () => {
    expect(novDuzgun("image/jpeg")).toBe(true);
    expect(novDuzgun("image/png")).toBe(true);
    expect(novDuzgun("IMAGE/JPEG")).toBe(true);
  });

  it("şəkil olmayanı rədd edir", () => {
    expect(novDuzgun("application/pdf")).toBe(false);
    expect(novDuzgun("text/html")).toBe(false);
    expect(novDuzgun("image/svg+xml")).toBe(false); // skript daşıya bilər
    expect(novDuzgun(undefined)).toBe(false);
  });
});

describe("miqyasHesabla", () => {
  it("böyük şəkli uzun tərəfə görə kiçildir", () => {
    // 4000×3000 telefon şəkli
    expect(miqyasHesabla(4000, 3000)).toBeCloseTo(MAX_OLCU / 4000, 5);
    // Hündür şəkildə də uzun tərəf əsasdır
    expect(miqyasHesabla(3000, 4000)).toBeCloseTo(MAX_OLCU / 4000, 5);
  });

  // Kiçik şəkli böyütmək detal əlavə etmir, yalnız faylı şişirdir
  it("kiçik şəkli böyütmür", () => {
    expect(miqyasHesabla(640, 480)).toBe(1);
    expect(miqyasHesabla(MAX_OLCU, MAX_OLCU)).toBe(1);
  });

  it("yararsız ölçüdə çökmür", () => {
    expect(miqyasHesabla(0, 0)).toBe(1);
    expect(miqyasHesabla(NaN, 100)).toBe(1);
  });
});

describe("dataUrlAyir", () => {
  it("növü və məzmunu ayırır", () => {
    expect(dataUrlAyir("data:image/jpeg;base64,QUJD")).toEqual({
      mediaType: "image/jpeg",
      data: "QUJD",
    });
  });

  it("yararsız girişdə null qaytarır", () => {
    expect(dataUrlAyir("")).toBeNull();
    expect(dataUrlAyir("filan")).toBeNull();
    expect(dataUrlAyir("data:image/jpeg,QUJD")).toBeNull(); // base64 yoxdur
    expect(dataUrlAyir(null)).toBeNull();
  });
});

describe("baytOlcusu", () => {
  it("base64 uzunluğundan bayt sayını təxmin edir", () => {
    // 4 simvol ≈ 3 bayt
    expect(baytOlcusu("QUJD")).toBe(3);
    expect(baytOlcusu("")).toBe(0);
    expect(baytOlcusu(null)).toBe(0);
  });

  it("böyük şəkli tanıyır", () => {
    // ~2 MB base64 → 1.5 MB-dan böyük
    expect(baytOlcusu("a".repeat(2_000_000))).toBeGreaterThan(1_400_000);
  });
});
