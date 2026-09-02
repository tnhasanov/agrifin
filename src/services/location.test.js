import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCATION,
  DISTRICTS,
  isValidLocation,
  nearestDistrict,
  districtByKod,
  districtByName,
  normalizeAz,
  readLegacyLocation,
  searchDistricts,
  vurguParcasi,
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
      kod: "gence",
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

describe("rayon kodları", () => {
  it("hər rayonun kodu var və kodlar TƏKRARSIZDIR", () => {
    const kodlar = DISTRICTS.map((d) => d.kod);
    expect(kodlar.every(Boolean)).toBe(true);
    expect(new Set(kodlar).size).toBe(kodlar.length);
  });

  it("kodlar ASCII-dir — URL və analitikada təhrif olunmur", () => {
    for (const { kod } of DISTRICTS) expect(kod).toMatch(/^[a-z0-9]+$/);
  });

  it("koda görə rayon tapılır", () => {
    expect(districtByKod("berde")?.name).toBe("Bərdə");
    expect(districtByKod("yoxdur")).toBeNull();
  });

  it("köhnə qeyddəki «(GPS)» sonluğu adı tapmağa mane olmur", () => {
    expect(districtByName("Bərdə (GPS)")?.kod).toBe("berde");
    expect(districtByName("Gence")?.kod).toBe("gence");
    expect(districtByName("")).toBeNull();
  });
});

describe("AZ normalizasiyası", () => {
  it("aksentləri qatlayır və hərf sayını dəyişmir", () => {
    expect(normalizeAz("Gəncə")).toBe("gence");
    expect(normalizeAz("Şəki")).toBe("seki");
    expect(normalizeAz("İsmayıllı")).toBe("ismayilli");
    expect(normalizeAz("Ağdaş")).toHaveLength("Ağdaş".length);
  });

  it("böyük/kiçik hərfə həssas deyil", () => {
    expect(normalizeAz("BƏRDƏ")).toBe(normalizeAz("bərdə"));
  });
});

describe("rayon axtarışı", () => {
  it("iki hərfdən az yazılıbsa süzgəc işləmir", () => {
    expect(searchDistricts("")).toHaveLength(DISTRICTS.length);
    expect(searchDistricts("b")).toHaveLength(DISTRICTS.length);
  });

  it("aksentsiz yazılış da tapır — fermerin klaviaturasında ə olmaya bilər", () => {
    expect(searchDistricts("gence")[0].kod).toBe("gence");
    expect(searchDistricts("seki")[0].kod).toBe("seki");
    expect(searchDistricts("berde")[0].kod).toBe("berde");
  });

  it("«başlayır» nəticələri «içində» olanlardan əvvəl gəlir", () => {
    const netice = searchDistricts("ba");
    expect(netice[0].kod).toBe("balaken");
    // Sabirabad da "ba" saxlayır, amma sonra gəlir
    expect(netice.map((d) => d.kod)).toContain("sabirabad");
    expect(netice.findIndex((d) => d.kod === "balaken")).toBeLessThan(
      netice.findIndex((d) => d.kod === "sabirabad"),
    );
  });

  it("ingilis transliterasiyası da tanınır", () => {
    expect(searchDistricts("ganja")[0].kod).toBe("gence");
    expect(searchDistricts("sheki")[0].kod).toBe("seki");
    expect(searchDistricts("nakhchivan")[0].kod).toBe("naxcivan");
  });

  it("uyğun gəlməyən sorğu BOŞ nəticə verir — uydurma rayon təklif olunmur", () => {
    expect(searchDistricts("zzzz")).toEqual([]);
  });

  it("seçim SEÇİLƏN adı dəyişmir: yazılış üsulu göstərilən adı təhrif etmir", () => {
    expect(searchDistricts("gence")[0].name).toBe("Gəncə");
  });
});

describe("uyğunluğun vurğulanması", () => {
  it("aksentsiz sorğuda da düzgün hissəni işarələyir", () => {
    expect(vurguParcasi("Gəncə", "gen")).toEqual(["", "Gən", "cə"]);
    expect(vurguParcasi("Bərdə", "rd")).toEqual(["Bə", "rd", "ə"]);
  });

  it("qısa və uyğunsuz sorğuda heç nə vurğulanmır", () => {
    expect(vurguParcasi("Bərdə", "b")).toEqual(["Bərdə", "", ""]);
    expect(vurguParcasi("Bərdə", "zzz")).toEqual(["Bərdə", "", ""]);
  });
});
