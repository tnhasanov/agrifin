import { describe, expect, it } from "vitest";
import {
  MAX_NOQTE,
  cerceve,
  merkeziEn,
  olcuDereceye,
  polygonaCevir,
  qonsuCercevesi,
} from "./geoJson.js";

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

describe("olcuDereceye", () => {
  // ═══ İSTEHSALDA BAŞ VERƏN NASAZLIQ ═══════════════════════════════
  // resx/resy sorğunun KOORDİNAT SİSTEMİNİN vahidindədir. Biz EPSG:4326
  // göndəririk (dərəcə), amma metr yazırdıq. Copernicus cavabı:
  //   "Your request of 9991.58 meters per pixel exceeds the limit
  //    1500.00 meters per pixel of the collection S2L2A"
  // Nəticədə ətraf müqayisəsi HEÇ VAXT işləməmişdi.
  const HEDD_METR_PIKSEL = 1500;
  const METR_DERECE = 111320;

  it("metri dərəcəyə çevirir, uzunluğu kosinusla düzəldir", () => {
    const { resx, resy } = olcuDereceye(60, 40);
    expect(resy).toBeCloseTo(60 / METR_DERECE, 9);
    // 40° enlikdə uzunluq dərəcəsi ~0.766 dəfə qısadır → resx daha böyük
    expect(resx).toBeCloseTo(60 / (METR_DERECE * Math.cos((40 * Math.PI) / 180)), 9);
    expect(resx).toBeGreaterThan(resy);
  });

  it("5 km-lik ətraf kvadratı Copernicus həddini keçmir", () => {
    const en = merkeziEn(SAHE);
    const [uzMin, enMin, uzMax, enMax] = qonsuCercevesi(SAHE);
    const { resx, resy } = olcuDereceye(60, en);

    const enPiksel = (uzMax - uzMin) / resx;
    const boyPiksel = (enMax - enMin) / resy;
    // Bir piksel deyil, yüzlərlə piksel olmalıdır
    expect(enPiksel).toBeGreaterThan(100);
    expect(boyPiksel).toBeGreaterThan(100);

    // Metr/piksel həddin çox altındadır
    const metrPiksel = ((enMax - enMin) * METR_DERECE) / boyPiksel;
    expect(metrPiksel).toBeLessThan(HEDD_METR_PIKSEL);
    expect(metrPiksel).toBeCloseTo(60, 0);
  });

  it("sahənin öz sorğusu tək piksele yığılmır", () => {
    const en = merkeziEn(SAHE);
    const { enFerq, uzFerq } = cerceve(SAHE);
    const { resx, resy } = olcuDereceye(10, en);
    // ~250 m x ~250 m sahə 10 m-lik piksellərlə ~25x25 olmalıdır
    expect(uzFerq / resx).toBeGreaterThan(10);
    expect(enFerq / resy).toBeGreaterThan(10);
  });

  it("yararsız girişdə null qaytarır", () => {
    expect(olcuDereceye(0, 40)).toBeNull();
    expect(olcuDereceye(-10, 40)).toBeNull();
    expect(olcuDereceye(60, 95)).toBeNull();
    // Qütbdə kosinus sıfıra gedir — bölmə sonsuzluq verərdi
    expect(olcuDereceye(60, 89.9)).toBeNull();
  });
});

describe("merkeziEn", () => {
  it("konturun mərkəzi enliyini verir", () => {
    expect(merkeziEn(SAHE)).toBeCloseTo(40.40115, 5);
    expect(merkeziEn([])).toBeNull();
    expect(merkeziEn(null)).toBeNull();
  });
});
