import { describe, expect, it } from "vitest";
import { MAX_NOQTE, cerceve, polygonaCevir } from "./geoJson.js";

// Bərdə yaxınlığında kiçik dördbucaqlı — [en, uzunluq] sırasında
const SAHE = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

describe("polygonaCevir", () => {
  // ƏSAS TEST: sıra dəyişməsə sahə başqa qitəyə düşür və Copernicus
  // heç bir xəta vermədən boş nəticə qaytarır — tapılması çətin səhv.
  it("en/uzunluq sırasını GeoJSON üçün dəyişir", () => {
    const p = polygonaCevir(SAHE);
    // Girişdə [40.4, 47.1] idi; çıxışda [47.1, 40.4] olmalıdır
    expect(p.coordinates[0][0]).toEqual([47.1, 40.4]);
    // Azərbaycan üçün uzunluq 44–51, en 38–42 aralığındadır:
    // hər nöqtədə birinci ədəd böyük olmalıdır
    for (const [uz, en] of p.coordinates[0]) {
      expect(uz).toBeGreaterThan(en);
    }
  });

  it("halqanı qapadır", () => {
    const halqa = polygonaCevir(SAHE).coordinates[0];
    expect(halqa).toHaveLength(SAHE.length + 1);
    expect(halqa[0]).toEqual(halqa[halqa.length - 1]);
  });

  it("artıq qapalı halqaya ikinci dəfə nöqtə əlavə etmir", () => {
    const qapali = [...SAHE, [40.4, 47.1]];
    const halqa = polygonaCevir(qapali).coordinates[0];
    expect(halqa).toHaveLength(qapali.length);
    expect(halqa[0]).toEqual(halqa[halqa.length - 1]);
  });

  it("düzgün GeoJSON tipi qaytarır", () => {
    expect(polygonaCevir(SAHE).type).toBe("Polygon");
  });

  it("yararsız girişi rədd edir", () => {
    expect(polygonaCevir(null)).toBeNull();
    expect(polygonaCevir([])).toBeNull();
    expect(polygonaCevir([[40, 47]])).toBeNull();
    expect(polygonaCevir([[40, 47], [41, 47]])).toBeNull();
    // Yararsız ədədlər
    expect(polygonaCevir([[40, 47], [41, 47], ["x", 48]])).toBeNull();
    expect(polygonaCevir([[40, 47], [41, 47], [NaN, 48]])).toBeNull();
    // Hədddən kənar koordinat
    expect(polygonaCevir([[95, 47], [41, 47], [40, 48]])).toBeNull();
    expect(polygonaCevir([[40, 200], [41, 47], [40, 48]])).toBeNull();
    // Çox nöqtə — sorğunu şişirtməyə imkan verməmək üçün
    const cox = Array.from({ length: MAX_NOQTE + 1 }, (_, i) => [40 + i * 1e-4, 47]);
    expect(polygonaCevir(cox)).toBeNull();
  });
});

describe("cerceve", () => {
  it("sahənin dərəcə ölçüsünü verir", () => {
    const { enFerq, uzFerq } = cerceve(SAHE);
    expect(enFerq).toBeCloseTo(0.0023, 4);
    expect(uzFerq).toBeCloseTo(0.0029, 4);
  });
});
