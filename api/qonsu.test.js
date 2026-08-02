import { describe, expect, it } from "vitest";
import { QONSU_RADIUS_KM, qonsuCercevesi } from "./geoJson.js";
import { MIN_PIKSEL, dovrSec, faizAl } from "./qonsu.js";

const SAHE = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

describe("ətraf çərçivəsi", () => {
  it("GeoJSON bbox sırasında qaytarır: uzunluq, en, uzunluq, en", () => {
    const [uzMin, enMin, uzMax, enMax] = qonsuCercevesi(SAHE);
    // Bərdə: en ~40.4, uzunluq ~47.1. Səhv sıra dərhal görünür.
    expect(enMin).toBeGreaterThan(40);
    expect(enMax).toBeLessThan(41);
    expect(uzMin).toBeGreaterThan(46);
    expect(uzMax).toBeLessThan(48);
  });

  // 40° enində uzunluq dərəcəsi en dərəcəsindən ~23% qısadır. Kosinus
  // düzəlişi olmasa qərb-şərq radiusu 5 km əvəzinə 6.5 km olardı.
  it("uzunluq radiusunu enliyə görə genişləndirir", () => {
    const [uzMin, enMin, uzMax, enMax] = qonsuCercevesi(SAHE);
    const enGenislik = enMax - enMin;
    const uzGenislik = uzMax - uzMin;
    expect(uzGenislik).toBeGreaterThan(enGenislik);
    expect(uzGenislik / enGenislik).toBeCloseTo(1 / Math.cos((40.4 * Math.PI) / 180), 1);
  });

  it("radius təxminən istənilən qədərdir", () => {
    const [, enMin, , enMax] = qonsuCercevesi(SAHE);
    // Yarım hündürlük × 111.32 km = radius
    expect(((enMax - enMin) / 2) * 111.32).toBeCloseTo(QONSU_RADIUS_KM, 1);
  });

  it("yararsız girişdə null qaytarır", () => {
    expect(qonsuCercevesi(null)).toBeNull();
    expect(qonsuCercevesi([[40, 47]])).toBeNull();
    expect(qonsuCercevesi(SAHE, 0)).toBeNull();
    expect(qonsuCercevesi(SAHE, 500)).toBeNull();
    // Qütbdə kosinus sıfıra gedir və uzunluq bölməsi partlayır
    expect(qonsuCercevesi([[89.99, 10], [89.995, 10], [89.995, 10.01]])).toBeNull();
  });
});

describe("faiz oxunuşu", () => {
  // Sentinel Hub versiyadan asılı olaraq "25" və ya "0.25" açarı qaytarır
  it("hər iki yazılışı başa düşür", () => {
    expect(faizAl({ "25.0": 0.4, "50.0": 0.55, "75.0": 0.7 }, 0.25)).toBe(0.4);
    expect(faizAl({ 0.25: 0.4, 0.5: 0.55, 0.75: 0.7 }, 0.75)).toBe(0.7);
  });

  it("tapılmayan faizdə null qaytarır", () => {
    expect(faizAl({ "50.0": 0.55 }, 0.25)).toBeNull();
    expect(faizAl(null, 0.5)).toBeNull();
    expect(faizAl({ "25.0": "yox" }, 0.25)).toBeNull();
  });
});

/** Statistical API cavabının bir dövrü */
function dovr(son, { mean = 0.6, piksel = 5000, p = [0.45, 0.58, 0.72] } = {}) {
  return {
    interval: { from: `${son}T00:00:00Z`, to: `${son}T23:59:59Z` },
    outputs: {
      ndvi: {
        bands: {
          B0: {
            stats: {
              mean,
              sampleCount: piksel,
              percentiles: { "25.0": p[0], "50.0": p[1], "75.0": p[2] },
            },
          },
        },
      },
    },
  };
}

describe("dövr seçimi", () => {
  // Fərqli tarixləri müqayisə etmək yanlışdır: iki həftə əvvəlki qonşu ilə
  // bugünkü sahə eyni şey deyil
  it("sahənin öz ölçmə tarixi ilə eyni dövrü seçir", () => {
    const cavab = { data: [dovr("2026-07-20"), dovr("2026-07-25"), dovr("2026-07-30")] };
    expect(dovrSec(cavab, "2026-07-25").son).toBe("2026-07-25");
  });

  it("uyğun tarix yoxdursa ən sonuncunu seçir", () => {
    const cavab = { data: [dovr("2026-07-20"), dovr("2026-07-30")] };
    expect(dovrSec(cavab, "2026-08-15").son).toBe("2026-07-30");
  });

  it("faizləri və piksel sayını çıxarır", () => {
    const secilen = dovrSec({ data: [dovr("2026-07-30")] }, null);
    expect(secilen).toMatchObject({ p25: 0.45, medyan: 0.58, p75: 0.72, piksel: 5000 });
  });

  // Ətrafda əkin yoxdursa (səhra, şəhər, dağ) müqayisə mənasızdır
  it("bitki pikseli azdırsa dövrü atır", () => {
    const cavab = { data: [dovr("2026-07-30", { piksel: MIN_PIKSEL - 1 })] };
    expect(dovrSec(cavab, null)).toBeNull();
  });

  it("boş və ya naqis cavabda null qaytarır", () => {
    expect(dovrSec(null, null)).toBeNull();
    expect(dovrSec({ data: [] }, null)).toBeNull();
    expect(dovrSec({ data: [{ interval: { from: "2026-07-30" } }] }, null)).toBeNull();
  });
});
