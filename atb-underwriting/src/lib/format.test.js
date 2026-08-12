import { describe, it, expect } from "vitest";
import { group, money, amount, compact, percent, rate, times, date, dateTime, EMPTY } from "./format.js";

describe("group", () => {
  it("azərbaycanca minlikləri boşluqla, onluğu vergüllə ayırır", () => {
    expect(group(1_245_000, "az-AZ")).toBe("1 245 000");
    expect(group(1234.567, "az-AZ", 2)).toBe("1 234,57");
  });

  it("ingiliscə vergül və nöqtə istifadə edir", () => {
    expect(group(1_245_000, "en-GB")).toBe("1,245,000");
    expect(group(1234.567, "en-GB", 2)).toBe("1,234.57");
  });

  it("mənfi rəqəmi düzgün işarə ilə yazır", () => {
    expect(group(-5000, "az-AZ")).toBe("−5 000");
  });

  it("kiçik rəqəmdə ayırıcı əlavə etmir", () => {
    expect(group(999, "az-AZ")).toBe("999");
  });
});

describe("məlumat yoxdursa", () => {
  it("bütün formatlar eyni işarəni qaytarır", () => {
    for (const fn of [money, amount, compact, percent, rate, times]) {
      expect(fn(null, "az-AZ")).toBe(EMPTY);
      expect(fn(undefined, "az-AZ")).toBe(EMPTY);
      expect(fn(Number.NaN, "az-AZ")).toBe(EMPTY);
    }
    expect(date("", "az-AZ")).toBe(EMPTY);
    expect(date("filan tarix", "az-AZ")).toBe(EMPTY);
  });

  it("sıfır boşluq deyil — göstərilir", () => {
    expect(amount(0, "az-AZ")).toBe("0");
    expect(percent(0, "az-AZ")).toBe("0,0%");
  });
});

describe("formatlar", () => {
  it("məbləğ valyuta ilə", () => {
    expect(money(250_000, "az-AZ")).toBe("250 000 AZN");
    expect(money(250_000, "az-AZ", "USD")).toBe("250 000 USD");
  });

  it("faiz və dərəcə fərqlidir", () => {
    expect(percent(0.153, "az-AZ")).toBe("15,3%");
    expect(rate(14, "az-AZ")).toBe("14,0%");
  });

  it("əmsal dəfə işarəsi ilə", () => {
    expect(times(1.345, "az-AZ")).toBe("1,35×");
  });

  it("yarım yuxarı yuvarlaqlaşır — ikilik sürüşmə nəticəni dəyişmir", () => {
    // toFixed bu üç halda aşağı yuvarlaqlaşdırır.
    expect(group(1.345, "az-AZ", 2)).toBe("1,35");
    expect(group(8.475, "az-AZ", 2)).toBe("8,48");
    expect(percent(0.1005, "az-AZ")).toBe("10,1%");
  });

  it("qısa forma milyon və mini ayırır", () => {
    expect(compact(2_300_000, "az-AZ")).toBe("2,3 mln");
    expect(compact(850_000, "az-AZ")).toBe("850 min");
    expect(compact(2_300_000, "en-GB")).toBe("2.3 m");
  });

  it("tarix dilə görə ayırıcı seçir", () => {
    expect(date("2026-08-12T10:00:00.000Z", "az-AZ")).toMatch(/^\d{2}\.\d{2}\.2026$/);
    expect(date("2026-08-12T10:00:00.000Z", "en-GB")).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });

  it("tarix və saat birlikdə", () => {
    expect(dateTime("2026-08-12T10:05:00.000Z", "az-AZ")).toMatch(/^\d{2}\.\d{2}\.2026 \d{2}:\d{2}$/);
  });

  it("format brauzerin ICU məlumatından asılı deyil", () => {
    // Eyni rəqəm hər mühitdə eyni görünməlidir — memorandum kağıza düşəndə də.
    expect(group(1_245_000.5, "az-AZ", 2)).toBe("1 245 000,50");
  });
});
