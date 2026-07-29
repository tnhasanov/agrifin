import { describe, expect, it } from "vitest";
import az from "./az.js";
import en from "./en.js";
import ru from "./ru.js";
import { interpolate } from "./index.jsx";

const DICTS = { en, ru };
const azKeys = Object.keys(az).sort();

// Azərbaycanca əsas dildir; qalan dillərdə açar əskik qalsa mətn az-a düşür.
// Bu test belə boşluqları CI-da tutur.
describe("tərcümə lüğətləri", () => {
  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`${lang} bütün açarları əhatə edir`, () => {
      const missing = azKeys.filter((key) => !(key in dict));
      expect(missing).toEqual([]);
    });

    it(`${lang} artıq açar saxlamır`, () => {
      const extra = Object.keys(dict).filter((key) => !(key in az));
      expect(extra).toEqual([]);
    });

    it(`${lang} boş mətn saxlamır`, () => {
      const empty = Object.entries(dict)
        .filter(([, value]) => typeof value !== "string" || value.trim() === "")
        .map(([key]) => key);
      expect(empty).toEqual([]);
    });
  }

  it("hər dildə eyni yer tutucular istifadə olunur", () => {
    const placeholders = (text) => (text.match(/\{(\w+)\}/g) ?? []).sort().join(",");
    const mismatched = azKeys.filter((key) =>
      Object.values(DICTS).some((dict) => placeholders(dict[key] ?? "") !== placeholders(az[key])),
    );
    expect(mismatched).toEqual([]);
  });
});

describe("interpolate", () => {
  it("yer tutucuları dəyərlərlə əvəz edir", () => {
    expect(interpolate("{count} kredit hazırdır", { count: 9 })).toBe("9 kredit hazırdır");
  });

  it("dəyər verilməyən yer tutucuya toxunmur", () => {
    expect(interpolate("{a} və {b}", { a: 1 })).toBe("1 və {b}");
  });

  it("dəyişən olmadan mətni olduğu kimi qaytarır", () => {
    expect(interpolate("sadə mətn")).toBe("sadə mətn");
  });
});
