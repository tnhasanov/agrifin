import { describe, expect, it } from "vitest";
import { acigSiqnallar, siqnallariQur } from "./siqnal.js";
import { ICONS } from "../components/icons.js";

const GUNLER = [
  "2026-08-02",
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
];

/** Sakit, mülayim həftə — heç bir hava siqnalı doğurmayan baza */
function hava(deyisiklik = {}) {
  return {
    daily: {
      time: GUNLER,
      temperature_2m_max: [28, 27, 29, 28, 27, 28, 28],
      temperature_2m_min: [17, 16, 18, 17, 16, 17, 17],
      precipitation_sum: [0, 0, 0, 0, 0, 0, 0],
      // 7 × 3 = 21 mm — su balansı həddindən (25 mm) aşağıdır, baza sakit qalsın
      et0_fao_evapotranspiration: [3, 3, 3, 3, 3, 3, 3],
      ...deyisiklik,
    },
    // Külək güclüdür: dərmanlama pəncərəsi öz-özünə açılıb testləri
    // qarışdırmasın deyə
    hourly: {
      time: Array.from({ length: 48 }, (_, i) => `2026-08-02T${String(i % 24).padStart(2, "0")}:00`),
      wind_speed_10m: Array.from({ length: 48 }, () => 25),
      precipitation_probability: Array.from({ length: 48 }, () => 60),
    },
  };
}

/** Peyk xülasəsi — services/ndvi.js `xulase()` çıxışının forması */
function peyk(deyisiklik = {}) {
  return {
    ndvi: 0.62,
    nemlik: 0.3,
    suSeviyyesi: "kafi",
    tarix: "2026-08-01",
    ferq: 0,
    istiqamet: "sabit",
    olcmeSayi: 12,
    ...deyisiklik,
  };
}

const INDI = Date.parse("2026-08-02T12:00:00Z");
const novler = (siqnallar) => siqnallar.map((s) => s.nov);
const tap = (siqnallar, nov) => siqnallar.find((s) => s.nov === nov);

describe("hava siqnalları", () => {
  it("mənfi temperatur təcili şaxta xəbərdarlığı verir", () => {
    const s = tap(siqnallariQur({ ...hava({ temperature_2m_min: [17, 16, -2, 17, 16, 17, 17] }) }), "saxta");
    expect(s.ciddilik).toBe("tecili");
    expect(s.vars.derece).toBe(-2);
    // Id-də hadisənin tarixi var: növbəti şaxta ayrıca siqnaldır
    expect(s.id).toBe("saxta:2026-08-04");
  });

  // Stansiya 2 m hündürlükdə ölçür; yer səthində şaxta +2°-də başlaya bilir
  it("+2°-də də xəbərdarlıq verir, amma təcili yox", () => {
    const s = tap(siqnallariQur(hava({ temperature_2m_min: [17, 2, 18, 17, 16, 17, 17] })), "saxta");
    expect(s.ciddilik).toBe("diqqet");
  });

  it("+3°-də şaxta siqnalı yoxdur", () => {
    expect(tap(siqnallariQur(hava({ temperature_2m_min: [17, 3, 18, 17, 16, 17, 17] })), "saxta")).toBeUndefined();
  });

  it("40°-dən yuxarı istilik təcilidir", () => {
    const s = tap(siqnallariQur(hava({ temperature_2m_max: [28, 41, 29, 28, 27, 28, 28] })), "isti");
    expect(s.ciddilik).toBe("tecili");
    expect(s.vars.derece).toBe(41);
  });

  // Bir isti gün hadisə deyil — hər yayda olur. Ardıcıl iki gün stresdir.
  it("tək isti gün siqnal doğurmur, ardıcıl iki gün doğurur", () => {
    expect(tap(siqnallariQur(hava({ temperature_2m_max: [28, 36, 29, 28, 27, 28, 28] })), "isti")).toBeUndefined();

    const s = tap(siqnallariQur(hava({ temperature_2m_max: [28, 36, 37, 28, 27, 28, 28] })), "isti");
    expect(s.ciddilik).toBe("diqqet");
    expect(s.vars.derece).toBe(37);
  });

  it("güclü yağışda gübrə və dərmanlamanı təxirə salmağı deyir", () => {
    const s = tap(siqnallariQur(hava({ precipitation_sum: [6, 8, 4, 0, 0, 0, 0] })), "yagis");
    expect(s.vars.mm).toBe(18);
  });

  it("külək zəif və yağış yoxdursa dərmanlama pəncərəsi açılır", () => {
    const arqument = hava();
    arqument.hourly.wind_speed_10m = Array.from({ length: 48 }, () => 6);
    arqument.hourly.precipitation_probability = Array.from({ length: 48 }, () => 5);
    expect(tap(siqnallariQur(arqument), "dermanlama")).toBeTruthy();
  });

  // Ziddiyyətli məsləhət etibarı öldürür: "yağış gəlir" + "dərmanla" olmaz
  it("yağış gələndə dərmanlama pəncərəsi göstərilmir", () => {
    const arqument = hava({ precipitation_sum: [6, 8, 4, 0, 0, 0, 0] });
    arqument.hourly.wind_speed_10m = Array.from({ length: 48 }, () => 6);
    arqument.hourly.precipitation_probability = Array.from({ length: 48 }, () => 5);
    expect(tap(siqnallariQur(arqument), "dermanlama")).toBeUndefined();
  });
});

describe("peyk + hava birləşməsi", () => {
  it("sahə quraqdır və yağış gözlənmirsə suvarmağı deyir", () => {
    const s = tap(
      siqnallariQur({ ...hava(), xulase: peyk({ suSeviyyesi: "az", nemlik: -0.08 }), indi: INDI }),
      "suvar",
    );
    expect(s.ciddilik).toBe("tecili");
    expect(s.menbeKey).toBe("siqnal.menbe.hamisi");
  });

  // ƏSAS DƏYƏR: quraq sahəyə yağış gəlirsə suvarmamaq fermerə birbaşa
  // su və yanacaq qənaətidir. Tək NDMI bunu deyə bilməz.
  it("quraq sahəyə yağış gəlirsə suvarmağı DAYANDIRMAĞI deyir", () => {
    const siqnallar = siqnallariQur({
      ...hava({ precipitation_sum: [0, 9, 3, 0, 0, 0, 0] }),
      xulase: peyk({ suSeviyyesi: "az", nemlik: -0.08 }),
      indi: INDI,
    });
    expect(tap(siqnallar, "suvarmaDayan").vars.mm).toBe(12);
    expect(tap(siqnallar, "suvar")).toBeUndefined();
  });

  it("orta nəmlikdə yalnız su balansı mənfi olanda suvarma təklif edir", () => {
    const orta = peyk({ suSeviyyesi: "orta", nemlik: 0.1 });
    expect(tap(siqnallariQur({ ...hava(), xulase: orta, indi: INDI }), "suvar")).toBeUndefined();

    // 7 gün × 6 mm buxarlanma = 42 mm, yağış 0 → balans 42 mm mənfi
    const quru = hava({ et0_fao_evapotranspiration: [6, 6, 6, 6, 6, 6, 6] });
    const s = tap(siqnallariQur({ ...quru, xulase: orta, indi: INDI }), "suvar");
    expect(s.ciddilik).toBe("diqqet");
    expect(s.vars.mm).toBe(42);
  });

  it("su kifayət edəndə suvarma siqnalı yoxdur", () => {
    expect(tap(siqnallariQur({ ...hava(), xulase: peyk(), indi: INDI }), "suvar")).toBeUndefined();
  });

  // NDVI düşməsinin İKİ tamam fərqli səbəbi var və iş də fərqlidir
  it("NDVI düşür, su kifayətdirsə səbəbi yarpaqda axtarmağı deyir", () => {
    const s = tap(
      siqnallariQur({
        ...hava(),
        xulase: peyk({ istiqamet: "azalir", ferq: -0.09 }),
        indi: INDI,
      }),
      "bitkiZeifleyir",
    );
    expect(s.hereket).toBe("chat");
    expect(s.icon).toBe("Camera");
  });

  it("NDVI düşür, su da azdırsa səbəb sudur — ikinci siqnal verilmir", () => {
    const siqnallar = siqnallariQur({
      ...hava(),
      xulase: peyk({ istiqamet: "azalir", ferq: -0.09, suSeviyyesi: "az", nemlik: -0.06 }),
      indi: INDI,
    });
    expect(tap(siqnallar, "bitkiZeifleyir")).toBeUndefined();
    expect(tap(siqnallar, "suvar")).toBeTruthy();
  });

  it("kiçik dəyişmə ölçmə səs-küyüdür, siqnal doğurmur", () => {
    const siqnallar = siqnallariQur({
      ...hava(),
      xulase: peyk({ istiqamet: "azalir", ferq: -0.03 }),
      indi: INDI,
    });
    expect(tap(siqnallar, "bitkiZeifleyir")).toBeUndefined();
  });

  it("uzun müddət buludlu olubsa ölçmənin köhnəldiyini deyir", () => {
    const siqnallar = siqnallariQur({
      ...hava(),
      xulase: peyk({ tarix: "2026-07-10" }),
      indi: INDI,
    });
    expect(tap(siqnallar, "olcmeKohne").vars.gun).toBe(23);
  });
});

describe("sıralama və filtr", () => {
  it("təcili siqnal həmişə birinci gəlir", () => {
    const siqnallar = siqnallariQur({
      ...hava({
        temperature_2m_min: [17, 16, -1, 17, 16, 17, 17],
        precipitation_sum: [6, 8, 4, 0, 0, 0, 0],
      }),
      xulase: peyk({ tarix: "2026-07-10" }),
      indi: INDI,
    });
    expect(novler(siqnallar)[0]).toBe("saxta");
    expect(siqnallar.at(-1).ciddilik).toBe("melumat");
  });

  it("bağlanmış siqnal siyahıdan çıxır", () => {
    const siqnallar = siqnallariQur({
      ...hava({ temperature_2m_min: [17, 16, -1, 17, 16, 17, 17] }),
      indi: INDI,
    });
    expect(acigSiqnallar(siqnallar, ["saxta:2026-08-04"])).toHaveLength(siqnallar.length - 1);
  });

  // Proqnoz gəlməyəndə tətbiq çökməməlidir — sahə siqnalları yenə işləməlidir
  it("hava məlumatı olmadan da peyk siqnalları qurulur", () => {
    const siqnallar = siqnallariQur({ xulase: peyk({ suSeviyyesi: "az", nemlik: -0.1 }), indi: INDI });
    expect(novler(siqnallar)).toContain("suvar");
  });

  it("heç bir məlumat olmadan boş siyahı qaytarır", () => {
    expect(siqnallariQur()).toEqual([]);
    expect(siqnallariQur({ daily: {}, hourly: {}, xulase: null })).toEqual([]);
  });
});

// Icon komponenti yalnız açıq siyahıdakı ikonları tanıyır (bax: icons.js) —
// siyahıda olmayan ad ekranda SƏSSİZCƏ boşluq kimi görünür
describe("siqnal ikonları", () => {
  it("hər siqnal növünün ikonu Icon siyahısındadır", () => {
    const senarilər = [
      { ...hava({ temperature_2m_min: [17, -3, 18, 17, 16, 17, 17] }), indi: INDI },
      { ...hava({ temperature_2m_max: [28, 41, 29, 28, 27, 28, 28] }), indi: INDI },
      { ...hava({ precipitation_sum: [6, 8, 4, 0, 0, 0, 0] }), indi: INDI },
      { ...hava(), xulase: peyk({ suSeviyyesi: "az", nemlik: -0.08 }), indi: INDI },
      {
        ...hava({ precipitation_sum: [0, 9, 3, 0, 0, 0, 0] }),
        xulase: peyk({ suSeviyyesi: "az", nemlik: -0.08 }),
        indi: INDI,
      },
      { ...hava(), xulase: peyk({ istiqamet: "azalir", ferq: -0.09 }), indi: INDI },
      { ...hava(), xulase: peyk({ tarix: "2026-07-10" }), indi: INDI },
      {
        ...hava(),
        xulase: peyk(),
        muqayise: { pille: "alt", ferq: -17, medyan: 0.82, tarix: "2026-08-01" },
        indi: INDI,
      },
    ];
    const sakit = hava();
    sakit.hourly.wind_speed_10m = Array.from({ length: 48 }, () => 6);
    sakit.hourly.precipitation_probability = Array.from({ length: 48 }, () => 5);
    senarilər.push({ ...sakit, indi: INDI });

    const gorulen = new Set();
    for (const arqument of senarilər) {
      for (const siqnal of siqnallariQur(arqument)) {
        gorulen.add(siqnal.nov);
        expect(ICONS[siqnal.icon], `${siqnal.nov} → ${siqnal.icon}`).toBeTruthy();
      }
    }
    // Senarilər bütün növləri əhatə etməlidir, yoxsa test heç nə qorumur
    expect(gorulen.size).toBe(9);
  });
});
