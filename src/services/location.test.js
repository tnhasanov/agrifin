import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCATION,
  DISTRICTS,
  isValidLocation,
  nearestDistrict,
  readLegacyLocation,
  searchDistricts,
} from "./location.js";

describe("DISTRICTS", () => {
  it("hər rayonun adı və koordinatı var", () => {
    const broken = DISTRICTS.filter(
      (district) =>
        !district.name ||
        typeof district.lat !== "number" ||
        typeof district.lon !== "number",
    );
    expect(broken).toEqual([]);
  });

  it("təkrarlanan ad yoxdur", () => {
    const names = DISTRICTS.map((district) => district.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("koordinatlar Azərbaycanın sərhədləri daxilindədir", () => {
    const outside = DISTRICTS.filter(
      (district) =>
        district.lat < 38 || district.lat > 42 || district.lon < 44 || district.lon > 50,
    );
    expect(outside).toEqual([]);
  });

  it("əlifba sırası ilə düzülüb", () => {
    const names = DISTRICTS.map((d) => d.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "az")));
  });

  it("default yer siyahıdadır", () => {
    expect(DISTRICTS.some((district) => district.name === DEFAULT_LOCATION.name)).toBe(true);
  });
});

describe("nearestDistrict", () => {
  it("rayonun öz koordinatı üçün həmin rayonu qaytarır", () => {
    for (const district of [DISTRICTS[0], DISTRICTS[10], DISTRICTS.at(-1)]) {
      expect(nearestDistrict(district.lat, district.lon).name).toBe(district.name);
    }
  });

  it("yaxınlıqdaki nöqtə üçün ən yaxın rayonu tapır", () => {
    // Gəncənin bir qədər şərqi
    expect(nearestDistrict(40.68, 46.4).name).toBe("Gəncə");
  });

  it("ölkədən kənar nöqtə üçün də cavab qaytarır", () => {
    expect(nearestDistrict(0, 0).name).toBeTruthy();
  });
});

describe("searchDistricts", () => {
  it("boş sorğuda hamısını qaytarır", () => {
    expect(searchDistricts("")).toHaveLength(DISTRICTS.length);
    expect(searchDistricts(undefined)).toHaveLength(DISTRICTS.length);
  });

  it("adın bir hissəsinə görə süzür", () => {
    expect(searchDistricts("gən").map((d) => d.name)).toContain("Gəncə");
  });

  it("böyük-kiçik hərfə həssas deyil", () => {
    expect(searchDistricts("QUBA").map((d) => d.name)).toContain("Quba");
  });

  it("boşluqları kəsir", () => {
    expect(searchDistricts("  quba  ").map((d) => d.name)).toContain("Quba");
  });

  it("tapılmayan ad üçün boş siyahı qaytarır", () => {
    expect(searchDistricts("belərayonyoxdur")).toEqual([]);
  });
});

describe("isValidLocation", () => {
  it("koordinatı olmayanı qəbul etmir", () => {
    expect(isValidLocation(null)).toBe(false);
    expect(isValidLocation({})).toBe(false);
    expect(isValidLocation({ lat: "40", lon: "47" })).toBe(false);
    expect(isValidLocation({ lat: 40, lon: 47 })).toBe(true);
  });
});

describe("readLegacyLocation", () => {
  it("köhnə açardaki yeri yeni formaya çevirir", () => {
    window.localStorage.setItem(
      "agrifin.yer",
      JSON.stringify({ ad: "Gəncə", lat: 40.6828, lon: 46.3606, gps: false }),
    );
    expect(readLegacyLocation()).toEqual({
      name: "Gəncə",
      lat: 40.6828,
      lon: 46.3606,
      gps: false,
    });
  });

  it("açar yoxdursa null qaytarır", () => {
    expect(readLegacyLocation()).toBeNull();
  });

  it("zədələnmiş məlumatda çökmür", () => {
    window.localStorage.setItem("agrifin.yer", "{bu json deyil");
    expect(readLegacyLocation()).toBeNull();
  });

  it("koordinatı olmayan köhnə qeydi rədd edir", () => {
    window.localStorage.setItem("agrifin.yer", JSON.stringify({ ad: "Gəncə" }));
    expect(readLegacyLocation()).toBeNull();
  });
});
