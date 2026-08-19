import { describe, expect, it } from "vitest";
import { ILK_IL, MIN_ETRAF_PIKSEL, aylariCixar, movsumlereBol } from "./tarixce.js";

/**
 * @param {string} faizAcari xidmətin qaytardığı faizlik açarı — formatı
 *   yerləşdirmədən asılı olaraq dəyişir, ona görə testdə parametrdir
 */
const dovr = (ay, orta, { medyan = null, piksel = 500, faizAcari = "50.0" } = {}) => ({
  interval: { from: `${ay}-01T00:00:00Z`, to: `${ay}-28T00:00:00Z` },
  outputs: {
    ndvi: {
      bands: {
        B0: {
          stats: {
            mean: orta,
            sampleCount: piksel,
            ...(medyan != null ? { percentiles: { [faizAcari]: medyan } } : {}),
          },
        },
      },
    },
  },
});

describe("ayların çıxarılması", () => {
  it("aylıq statistikanı xəritəyə salır", () => {
    const aylar = aylariCixar({
      data: [dovr("2024-04", 0.61), dovr("2024-05", 0.72, { medyan: 0.58 })],
    });
    expect(aylar.get("2024-04").orta).toBe(0.61);
    expect(aylar.get("2024-05").medyan).toBe(0.58);
  });

  // HƏQİQİ NASAZLIQ: yalnız "50.0" açarı qəbul edilirdi. Xidmət faizliyi
  // başqa formada qaytaranda BÜTÜN ayların medianı boş qalır, indeksin ən
  // ağır amili (nisbi performans) isə "ölçülməyib" sayılırdı — hər sahə
  // 100-dən yalnız 60 xal ala bilirdi. api/qonsu.js bunu onsuz da tolerant
  // oxuyurdu; fərq səssiz idi, çünki test yalnız bir formatı yoxlayırdı.
  it("faizlik açarının bütün formalarını oxuyur", () => {
    for (const acar of ["50.0", "50", "0.5"]) {
      const aylar = aylariCixar({
        data: [dovr("2024-05", 0.72, { medyan: 0.58, faizAcari: acar })],
      });
      expect(aylar.get("2024-05").medyan, `açar: ${acar}`).toBe(0.58);
    }
  });

  it("median yoxdursa null qalır — sıfır yox", () => {
    const aylar = aylariCixar({ data: [dovr("2024-05", 0.72)] });
    expect(aylar.get("2024-05").medyan).toBeNull();
  });

  // Tam buludlu ay ölçmə deyil — xəritəyə düşməməlidir
  it("boş ayı atır", () => {
    const aylar = aylariCixar({ data: [dovr("2024-04", 0.6, { piksel: 0 })] });
    expect(aylar.size).toBe(0);
  });

  it("naqis cavabda çökmür", () => {
    expect(aylariCixar(null).size).toBe(0);
    expect(aylariCixar({}).size).toBe(0);
  });
});

describe("mövsümlərə bölmə", () => {
  const sahe = new Map([
    ["2024-04", { orta: 0.55, piksel: 400 }],
    ["2024-05", { orta: 0.72, piksel: 400 }],
    ["2024-06", { orta: 0.6, piksel: 400 }],
    ["2025-05", { orta: 0.68, piksel: 400 }],
  ]);
  const etraf = new Map([
    ["2024-05", { orta: 0.6, medyan: 0.58, piksel: 5000 }],
    ["2025-05", { orta: 0.6, medyan: 0.61, piksel: 5000 }],
  ]);

  it("ilin zirvəsini və zirvə ayını tapır", () => {
    const movsumler = movsumlereBol(sahe, etraf, 2025);
    const m24 = movsumler.find((m) => m.il === 2024);
    expect(m24.zirve).toBe(0.72);
    expect(m24.zirveAyi).toBe("2024-05");
    expect(m24.olcmeSayi).toBe(3);
  });

  // Müqayisə eyni ayda olmalıdır: sahənin zirvəsi mayda, ətrafın medianı da
  // MAYDA götürülür — başqa ayın medianı başqa havadır
  it("ətraf medianını zirvə ayından götürür", () => {
    const movsumler = movsumlereBol(sahe, etraf, 2025);
    expect(movsumler.find((m) => m.il === 2024).etrafMedyan).toBe(0.58);
    expect(movsumler.find((m) => m.il === 2025).etrafMedyan).toBe(0.61);
  });

  it("ölçməsiz ili null zirvə ilə saxlayır", () => {
    const movsumler = movsumlereBol(sahe, etraf, 2025);
    const bos = movsumler.find((m) => m.il === 2020);
    expect(bos.zirve).toBeNull();
    expect(bos.olcmeSayi).toBe(0);
  });

  it("ilk ildən son ilə qədər hər ili qaytarır", () => {
    const movsumler = movsumlereBol(sahe, etraf, 2025);
    expect(movsumler).toHaveLength(2025 - ILK_IL + 1);
  });

  // Az pikselli ətraf medianı təsadüfdür — müqayisəyə girməməlidir
  it("piksel sayı azdırsa ətraf medianını atır", () => {
    const azPiksel = new Map([
      ["2024-05", { orta: 0.6, medyan: 0.58, piksel: MIN_ETRAF_PIKSEL - 1 }],
    ]);
    const movsumler = movsumlereBol(sahe, azPiksel, 2025);
    expect(movsumler.find((m) => m.il === 2024).etrafMedyan).toBeNull();
  });
});
