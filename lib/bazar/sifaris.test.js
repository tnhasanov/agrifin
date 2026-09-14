import { describe, expect, it } from "vitest";
import {
  FERMER_LEGV_OLAR,
  MAX_SETIR,
  SIFARIS_HALLARI,
  SIFARIS_KECIDLERI,
  catdirilmaYoxla,
  gozlenilenCatdirilma,
  kecidMumkun,
  sayiSix,
  sebetiHesabla,
  setirleriYoxla,
} from "./sifaris.js";
import { mehsulTap } from "./kataloq.js";

const hesabla = (setirler, secim) => {
  const netice = setirleriYoxla(setirler);
  if (!netice.ok) throw new Error(netice.sebeb);
  return sebetiHesabla(netice.setirler, secim);
};

describe("setirleriYoxla — klient girişi", () => {
  it("boş, çox və naməlum sətirləri rədd edir", () => {
    expect(setirleriYoxla([])).toEqual({ ok: false, sebeb: "setirYoxdur" });
    expect(setirleriYoxla(null)).toEqual({ ok: false, sebeb: "setirYoxdur" });
    expect(setirleriYoxla(Array.from({ length: MAX_SETIR + 1 }, () => ({ kod: "karbamid-46-50kq", say: 1 }))).sebeb).toBe(
      "setirCoxdur",
    );
    expect(setirleriYoxla([{ kod: "uydurma", say: 1 }])).toMatchObject({ ok: false, sebeb: "mehsulYoxdur" });
  });

  it("say tam və müsbət olmalıdır — 0, mənfi, kəsr, mətn keçmir", () => {
    for (const say of [0, -1, 1.5, "iki", null, undefined, NaN, Infinity]) {
      expect(setirleriYoxla([{ kod: "karbamid-46-50kq", say }]).sebeb, String(say)).toBe("sayYanlis");
    }
  });

  it("minimum və maksimum sifariş sərhədləri tətbiq olunur", () => {
    // Toxumluq kartof minSay 4
    expect(setirleriYoxla([{ kod: "kartof-toxumu-aqra", say: 2 }]).sebeb).toBe("minSay");
    // Mini traktor maxSay 3
    expect(setirleriYoxla([{ kod: "mini-traktor-25", say: 4 }]).sebeb).toBe("maxSay");
  });

  it("eyni kod təkrar gələndə saylar toplanır — dublikat sətir yaranmır", () => {
    const netice = setirleriYoxla([
      { kod: "karbamid-46-50kq", say: 3 },
      { kod: "karbamid-46-50kq", say: 2 },
    ]);
    expect(netice.ok).toBe(true);
    expect(netice.setirler).toHaveLength(1);
    expect(netice.setirler[0].say).toBe(5);
  });

  it("klientin göndərdiyi qiymət/cəmi/təchizatçı OXUNMUR", () => {
    const netice = setirleriYoxla([{ kod: "karbamid-46-50kq", say: 1, qiymet: 0.01, cemi: 0.01, tedarukcu: "saxta" }]);
    expect(netice.ok).toBe(true);
    const hesab = sebetiHesabla(netice.setirler);
    expect(hesab.setirler[0].vahidQiymet).toBe(22.5);
    expect(hesab.setirler[0].tedarukcu).toBe("agrosupply");
    expect(hesab.araCem).toBe(22.5);
  });
});

describe("sebetiHesabla — yekunlar kataloqdan", () => {
  it("bazar qiyməti: 20 × 22,50 = 450", () => {
    const hesab = hesabla([{ kod: "karbamid-46-50kq", say: 20 }]);
    expect(hesab.setirler[0].cemi).toBe(450);
    expect(hesab.araCem).toBe(450);
    // 450 < AgroSupply pulsuz həddi (500) → çatdırılma 15
    expect(hesab.catdirilma).toBe(15);
    expect(hesab.cemi).toBe(465);
    expect(hesab.sayCemi).toBe(20);
  });

  it("qəpik dəqiqliyi: 3 × 22,50 = 67,50", () => {
    const hesab = hesabla([{ kod: "karbamid-46-50kq", say: 3 }]);
    expect(hesab.araCem).toBe(67.5);
  });

  it("çatdırılma tədarükçü başına, pulsuz həddin altında haqq tutulur", () => {
    // AgroSupply: 15 ₼, 500-dən yuxarı pulsuz; AzərToxum: həmişə pulsuz
    const hesab = hesabla([
      { kod: "karbamid-46-50kq", say: 2 }, // 45 < 500 → 15
      { kod: "pomidor-toxumu-f1", say: 2 }, // 220 → 0
    ]);
    expect(hesab.tedarukculer).toHaveLength(2);
    expect(hesab.tedarukculer.find((t) => t.kod === "agrosupply").catdirilma).toBe(15);
    expect(hesab.tedarukculer.find((t) => t.kod === "azertoxum").catdirilma).toBe(0);
    expect(hesab.catdirilma).toBe(15);
    expect(hesab.cemi).toBe(45 + 220 + 15);
  });

  it("səbət nümunəsi: karbamid 20 + pomidor toxumu 2 = 685 (çatdırılma ilə)", () => {
    const hesab = hesabla([
      { kod: "karbamid-46-50kq", say: 20 },
      { kod: "pomidor-toxumu-f1", say: 2 },
    ]);
    expect(hesab.araCem).toBe(670);
    expect(hesab.catdirilma).toBe(15);
    expect(hesab.cemi).toBe(685);
  });

  it("maliyyələşdirilə bilən məbləğ yalnız uyğun sətirlərdən yığılır", () => {
    const hesab = hesabla([
      { kod: "karbamid-46-50kq", say: 10 }, // maliyye: true → 225
      { kod: "fungisid-mis-1kq", say: 2 }, // maliyye: false → 48
    ]);
    expect(hesab.maliyyeMeblegi).toBe(225);
    expect(hesab.maliyyeHamisi).toBe(false);
    expect(hesabla([{ kod: "karbamid-46-50kq", say: 1 }]).maliyyeHamisi).toBe(true);
  });

  it("rayona çatdırılmayan məhsul ayrıca sadalanır", () => {
    const hesab = hesabla([{ kod: "pambiq-toxumu-25kq", say: 2 }], { rayonKod: "quba" });
    expect(hesab.catdirilmayanlar).toEqual(["pambiq-toxumu-25kq"]);
    expect(hesab.setirler[0].catdirilir).toBe(false);
  });

  it("gözlənilən çatdırılma ən uzun tədarükçü müddətinə görədir", () => {
    const hesab = hesabla([
      { kod: "karbamid-46-50kq", say: 1 }, // 2–4 gün
      { kod: "nasos-1-5kvt", say: 1 }, // 3–7 gün
    ]);
    const tarix = gozlenilenCatdirilma(hesab.tedarukculer, new Date("2026-09-13T10:00:00Z"));
    expect(tarix.toISOString().slice(0, 10)).toBe("2026-09-20");
  });
});

describe("sayiSix", () => {
  it("sərhədlərə sıxır, sıfır və aşağı 'sil' deməkdir", () => {
    const kartof = mehsulTap("kartof-toxumu-aqra"); // 4..400
    expect(sayiSix(kartof, 1)).toBe(4);
    expect(sayiSix(kartof, 999)).toBe(400);
    expect(sayiSix(kartof, 10)).toBe(10);
    expect(sayiSix(kartof, 0)).toBe(0);
    expect(sayiSix(kartof, -5)).toBe(0);
    expect(sayiSix(kartof, "abc")).toBe(0);
  });
});

describe("vəziyyət maşını", () => {
  it("hər hal siyahıdadır və yalnız icazəli keçidlər mümkündür", () => {
    for (const hal of Object.keys(SIFARIS_KECIDLERI)) expect(SIFARIS_HALLARI).toContain(hal);
    expect(kecidMumkun("new", "confirmed")).toBe(true);
    expect(kecidMumkun("new", "completed")).toBe(false);
    expect(kecidMumkun("completed", "cancelled")).toBe(false);
    expect(kecidMumkun("delivering", "cancelled")).toBe(false);
  });

  it("fermer yalnız hazırlanmağa başlamamış sifarişi ləğv edə bilər", () => {
    expect(FERMER_LEGV_OLAR).toEqual(["new", "confirmed"]);
    for (const hal of FERMER_LEGV_OLAR) expect(kecidMumkun(hal, "cancelled")).toBe(true);
  });
});

describe("catdirilmaYoxla", () => {
  const duzgun = { rayonKod: "semkir", ad: "Tural Həsənov", telefon: "050 123 45 67", unvan: "Dəllər kəndi", qeyd: "" };

  it("düzgün formanı normallaşdırır", () => {
    const netice = catdirilmaYoxla(duzgun);
    expect(netice.ok).toBe(true);
    expect(netice.catdirilma).toEqual({
      rayonKod: "semkir",
      ad: "Tural Həsənov",
      telefon: "+994501234567",
      unvan: "Dəllər kəndi",
      qeyd: null,
    });
  });

  it("naməlum rayon, qısa ad və yararsız telefon keçmir", () => {
    expect(catdirilmaYoxla({ ...duzgun, rayonKod: "moskva" }).sebeb).toBe("rayonYanlis");
    expect(catdirilmaYoxla({ ...duzgun, ad: "T" }).sebeb).toBe("adYanlis");
    expect(catdirilmaYoxla({ ...duzgun, telefon: "123" }).sebeb).toBe("telefonYanlis");
  });

  it("uzun mətnləri kəsir — zibil sətir bazaya düşməsin", () => {
    const netice = catdirilmaYoxla({ ...duzgun, unvan: "x".repeat(1000), qeyd: "y".repeat(1000) });
    expect(netice.catdirilma.unvan).toHaveLength(200);
    expect(netice.catdirilma.qeyd).toHaveLength(300);
  });
});
