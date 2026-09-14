import { describe, expect, it } from "vitest";
import {
  duzgunSahe,
  merkez,
  mesafeMetr,
  ozunuKesir,
  perimetrMetr,
  sahəHektar,
  sahəMetrKv,
  sahəniYoxla,
} from "./geo.js";

// Bərdə ətrafında (≈40.4°N) düzbucaqlı sahə yaradır.
// 40°N-də: 1° en ≈ 111.0 km, 1° uzunluq ≈ 85.4 km — planar düstur burada çökür.
function duzbucaqli({ lat = 40.4, lon = 47.1, enMetr, uzMetr }) {
  const dLat = enMetr / 111_000;
  const dLon = uzMetr / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat, lon],
    [lat + dLat, lon],
    [lat + dLat, lon + dLon],
    [lat, lon + dLon],
  ];
}

describe("sahəMetrKv / sahəHektar", () => {
  it("300×300 m sahə ≈ 9 hektardır (±1%)", () => {
    const hektar = sahəHektar(duzbucaqli({ enMetr: 300, uzMetr: 300 }));
    expect(hektar).toBeGreaterThan(8.91);
    expect(hektar).toBeLessThan(9.09);
  });

  it("kiçik həyətyanı sahəni (50×20 m = 0.1 ha) düzgün ölçür", () => {
    const hektar = sahəHektar(duzbucaqli({ enMetr: 50, uzMetr: 20 }));
    expect(hektar).toBeCloseTo(0.1, 2);
  });

  // Reqressiya: planar şoelace 40°N-də uzunluq dərəcəsini en dərəcəsinə
  // bərabər sayır və sahəni ~30% şişirdir. Sferik düstur bunu etməməlidir.
  it("40°N-də planar düsturun şişirtməsinə uğramır", () => {
    // Dərəcə ilə "kvadrat" — həqiqətdə 111 km × 85 km düzbucaqlıdır
    const derecelerle = [
      [40, 47],
      [41, 47],
      [41, 48],
      [40, 48],
    ];
    const hektar = sahəHektar(derecelerle);
    // Həqiqi sahə ≈ 947 min ha; planar (111km)² isə ≈ 1.23 milyon ha verərdi
    expect(hektar).toBeGreaterThan(900_000);
    expect(hektar).toBeLessThan(1_000_000);
  });

  it("nöqtələrin sırasından (saat əqrəbi və əksi) asılı deyil", () => {
    const kontur = duzbucaqli({ enMetr: 200, uzMetr: 400 });
    expect(sahəHektar(kontur)).toBe(sahəHektar([...kontur].reverse()));
  });

  it("3-dən az nöqtə üçün 0 qaytarır", () => {
    expect(sahəMetrKv([])).toBe(0);
    expect(sahəMetrKv([[40, 47]])).toBe(0);
    expect(
      sahəMetrKv([
        [40, 47],
        [40.001, 47],
      ]),
    ).toBe(0);
  });
});

describe("mesafeMetr / perimetrMetr", () => {
  it("1 km şimala doğru ≈ 1000 m", () => {
    expect(mesafeMetr([40.4, 47.1], [40.4 + 1 / 111.195, 47.1])).toBeCloseTo(1000, -1);
  });

  it("Bakı–Gəncə məsafəsi ağlabatandır (≈ 300 km düz xətt)", () => {
    const m = mesafeMetr([40.4093, 49.8671], [40.6828, 46.3606]);
    expect(m).toBeGreaterThan(280_000);
    expect(m).toBeLessThan(310_000);
  });

  it("perimetr konturu qapalı sayır", () => {
    const p = perimetrMetr(duzbucaqli({ enMetr: 300, uzMetr: 300 }));
    expect(p).toBeCloseTo(1200, -2);
  });
});

describe("ozunuKesir", () => {
  it("düzgün dördbucaqlını buraxır", () => {
    expect(ozunuKesir(duzbucaqli({ enMetr: 100, uzMetr: 100 }))).toBe(false);
  });

  it("papyon formasını tutur", () => {
    // Nöqtələrin sırası kənarları çarpazlaşdırır
    expect(
      ozunuKesir([
        [40.4, 47.1],
        [40.41, 47.11],
        [40.41, 47.1],
        [40.4, 47.11],
      ]),
    ).toBe(true);
  });

  it("qabarıq olmayan (L-şəkilli) sahəni səhvən bloklamır", () => {
    expect(
      ozunuKesir([
        [40.4, 47.1],
        [40.42, 47.1],
        [40.42, 47.11],
        [40.41, 47.11],
        [40.41, 47.13],
        [40.4, 47.13],
      ]),
    ).toBe(false);
  });

  it("üçbucaq heç vaxt öz-özünü kəsmir", () => {
    expect(
      ozunuKesir([
        [40.4, 47.1],
        [40.41, 47.1],
        [40.4, 47.12],
      ]),
    ).toBe(false);
  });
});

describe("sahəniYoxla", () => {
  const yer = { lat: 40.3705, lon: 47.1265 }; // Bərdə

  it("normal sahəni qəbul edir və hektarı qaytarır", () => {
    const netice = sahəniYoxla(duzbucaqli({ enMetr: 260, uzMetr: 250 }), { yer });
    expect(netice.ok).toBe(true);
    expect(netice.hektar).toBeCloseTo(6.5, 1);
    expect(netice.xeberdarlıqAcari).toBeNull();
  });

  it("2 nöqtəni rədd edir", () => {
    const netice = sahəniYoxla([
      [40.4, 47.1],
      [40.41, 47.1],
    ]);
    expect(netice.ok).toBe(false);
    expect(netice.xetaAcari).toBe("field.errorTooFewPoints");
  });

  it("öz-özünü kəsən konturu rədd edir", () => {
    const netice = sahəniYoxla([
      [40.4, 47.1],
      [40.41, 47.11],
      [40.41, 47.1],
      [40.4, 47.11],
    ]);
    expect(netice.xetaAcari).toBe("field.errorSelfCrossing");
  });

  it("səhv toxunuşdan yaranan mikro-sahəni rədd edir", () => {
    const netice = sahəniYoxla(duzbucaqli({ enMetr: 5, uzMetr: 5 }));
    expect(netice.xetaAcari).toBe("field.errorTooSmall");
  });

  it("bütöv rayon boyda konturu rədd edir", () => {
    const netice = sahəniYoxla(duzbucaqli({ enMetr: 40_000, uzMetr: 40_000 }));
    expect(netice.xetaAcari).toBe("field.errorTooLarge");
  });

  it("seçilmiş rayondan çox uzaq sahəyə xəbərdarlıq verir, amma qadağan etmir", () => {
    // Bərdə seçilib, sahə Lənkəran yaxınlığında çəkilib (~250 km)
    const netice = sahəniYoxla(duzbucaqli({ lat: 38.75, lon: 48.85, enMetr: 300, uzMetr: 300 }), {
      yer,
    });
    expect(netice.ok).toBe(true);
    expect(netice.xeberdarlıqAcari).toBe("field.warnFarFromDistrict");
  });
});

describe("merkez / duzgunSahe", () => {
  it("mərkəz nöqtələrin ortasıdır", () => {
    expect(
      merkez([
        [40, 47],
        [42, 49],
      ]),
    ).toEqual([41, 48]);
    expect(merkez([])).toBeNull();
  });

  it("düzgün saxlanmış sahəni tanıyır", () => {
    expect(
      duzgunSahe({ noqteler: duzbucaqli({ enMetr: 100, uzMetr: 100 }), hektar: 1 }),
    ).toBe(true);
  });

  it("zədələnmiş saxlanmanı rədd edir", () => {
    expect(duzgunSahe(null)).toBe(false);
    expect(duzgunSahe({ noqteler: [[40, 47]], hektar: 1 })).toBe(false);
    expect(duzgunSahe({ noqteler: [[40, 47], [41, 48], ["x", 49]], hektar: 1 })).toBe(false);
    expect(duzgunSahe({ noqteler: [[95, 47], [41, 48], [40, 49]], hektar: 1 })).toBe(false);
    expect(duzgunSahe({ noqteler: duzbucaqli({ enMetr: 100, uzMetr: 100 }) })).toBe(false);
  });
});
