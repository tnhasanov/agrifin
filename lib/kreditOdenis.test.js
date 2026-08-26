import { describe, expect, it } from "vitest";
import { ayliqFaiz, esasOde } from "./kreditOdenis.js";

const FAIZ = 11.5;

describe("kreditin faktiki ödəniş məntiqi", () => {
  it("faiz ilkin əsas borca hesablanır", () => {
    // 2.000 × 11.5% / 12 = 19,17 → 19 ₼/ay
    expect(ayliqFaiz(2000, FAIZ)).toBe(19);
  });

  it("əsas borcdan 500 ₼ ödəniş qalığı 1.500 ₼ edir", () => {
    expect(esasOde(2000, 500)).toBe(1500);
  });

  it("növbəti faiz qalığa hesablanır, ilkin məbləğə yox", () => {
    const qaliq = esasOde(2000, 500);
    // 1.500 × 11.5% / 12 = 14,375 → 14 ₼ — 19 ₼ deyil
    expect(ayliqFaiz(qaliq, FAIZ)).toBe(14);
    expect(ayliqFaiz(qaliq, FAIZ)).toBeLessThan(ayliqFaiz(2000, FAIZ));
  });

  it("əsas borc tam bağlananda sonrakı faiz sıfırdır", () => {
    const qaliq = esasOde(1500, 1500);
    expect(qaliq).toBe(0);
    expect(ayliqFaiz(qaliq, FAIZ)).toBe(0);
  });

  it("artıq ödəniş qalığı mənfiyə salmır", () => {
    expect(esasOde(1000, 5000)).toBe(0);
  });

  it("sıfır və ya səhv ödəniş qalığı dəyişmir", () => {
    expect(esasOde(1000, 0)).toBe(1000);
    expect(esasOde(1000, -50)).toBe(1000);
    expect(esasOde(1000, NaN)).toBe(1000);
  });
});
