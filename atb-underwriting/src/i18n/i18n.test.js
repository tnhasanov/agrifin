import { describe, it, expect } from "vitest";
import az from "./az.js";
import en from "./en.js";
import { lookup, fill, translate } from "./index.jsx";

/** Bütün nöqtəli açarların düz siyahısı. */
function keys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null ? keys(v, path) : [path];
  });
}

/** Mətndəki {yer tutucular}. */
function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

const azKeys = keys(az);
const enKeys = keys(en);

describe("lüğətlər", () => {
  it("hər iki dildə eyni açarlar var", () => {
    expect(enKeys.filter((k) => !azKeys.includes(k))).toEqual([]);
    expect(azKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it("boş tərcümə yoxdur", () => {
    for (const key of azKeys) {
      expect(`${key}: ${lookup(az, key)}`.trim()).not.toBe(`${key}: `);
      expect(`${key}: ${lookup(en, key)}`.trim()).not.toBe(`${key}: `);
    }
  });

  it("yer tutucular üst-üstə düşür", () => {
    for (const key of azKeys) {
      const a = lookup(az, key);
      const e = lookup(en, key);
      if (typeof a === "string" && typeof e === "string") {
        expect(`${key}: ${placeholders(e).join(",")}`).toBe(`${key}: ${placeholders(a).join(",")}`);
      }
    }
  });
});

describe("fill", () => {
  it("yer tutucunu əvəz edir", () => {
    expect(fill("DSCR {dscr}, minimum {min}", { dscr: "1.15", min: "1.30" })).toBe(
      "DSCR 1.15, minimum 1.30",
    );
  });

  it("verilməyən yer tutucunu olduğu kimi saxlayır", () => {
    expect(fill("{a} və {b}", { a: "bir" })).toBe("bir və {b}");
  });
});

describe("translate", () => {
  it("dilə görə mətn qaytarır", () => {
    expect(translate("az", "tabs.profile")).toBe("Profil");
    expect(translate("en", "tabs.profile")).toBe("Profile");
  });

  it("tanınmayan dildə əsas dilə qayıdır", () => {
    expect(translate("de", "tabs.profile")).toBe("Profil");
  });

  it("tapılmayan açarı özü kimi qaytarır — ekranda boşluq qalmasın", () => {
    expect(translate("az", "yoxdur.belə.açar")).toBe("yoxdur.belə.açar");
  });
});
