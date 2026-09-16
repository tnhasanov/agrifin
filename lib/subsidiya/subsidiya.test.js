import { describe, expect, it } from "vitest";
import { GELIR_CONFIG, gelirModeli } from "../gelir.js";
import { MENBELER, menbeYoxlanib } from "./menbeler.js";
import { KAMPANIYALAR, MEHSUL_SUBSIDIYASI, QAYDALAR_2026, QAYDALAR_2026_27, SERTIFIKATLI_TOXUM, TARIFLER } from "./qaydalar2026.js";
import { TEQVIM_2026, isGunudur } from "./teqvim.js";
import {
  SUVARMA_USULLARI,
  bitkiUsullari,
  kreditUcunHektarDereceleri,
  kreditUcunSubsidiya,
  muracietDovru,
  sonIsGunu,
  subsidiyaHesabla,
} from "./index.js";

/** Bərdə, 10,02 ha — fixture-lərin çoxu bu sahə üzərindədir */
const BERDE = { hektar: 10.02, rayonKod: "berde" };
const hesabla = (p) => subsidiyaHesabla({ ...BERDE, indi: new Date("2026-10-10T00:00:00Z"), ...p });
const on = (p) => subsidiyaHesabla({ hektar: 10, indi: new Date("2026-10-10T00:00:00Z"), ...p });

// ═══ TARİF MATRİSİ ═══════════════════════════════════════════════════════

describe("2026 tarif matrisi — bitki × suvarma", () => {
  it("buğda 10 ha: müasir 2.900 · qeyri-müasir 2.300 · dəmyə 2.000", () => {
    expect(on({ bitki: "bugda", suvarma: "muasir" }).ekin.deyer).toBe(2900);
    expect(on({ bitki: "bugda", suvarma: "enenevi" }).ekin.deyer).toBe(2300);
    expect(on({ bitki: "bugda", suvarma: "demye" }).ekin.deyer).toBe(2000);
    expect(on({ bitki: "bugda", suvarma: "muasir" }).ekin.derece).toBe(290);
  });

  it("arpa buğda ilə eyni tarifdədir; Bərdə 10,02 ha: 2.004 / 2.304,60 / 2.905,80", () => {
    expect(hesabla({ bitki: "arpa", suvarma: "demye" }).ekin.deyer).toBe(2004);
    expect(hesabla({ bitki: "arpa", suvarma: "enenevi" }).ekin.deyer).toBe(2304.6);
    expect(hesabla({ bitki: "arpa", suvarma: "muasir" }).ekin.deyer).toBe(2905.8);
  });

  it("qarğıdalı müasir (160) buğda tarifi (290) DEYİL; qeyri-müasir 100", () => {
    const q = on({ bitki: "qargidali", suvarma: "muasir", indi: new Date("2026-03-01T00:00:00Z") });
    expect(q.ekin.derece).toBe(160);
    expect(q.ekin.deyer).toBe(1600);
    expect(q.ekin.derece).not.toBe(on({ bitki: "bugda", suvarma: "muasir" }).ekin.derece);
    expect(on({ bitki: "qargidali", suvarma: "enenevi", indi: new Date("2026-03-01T00:00:00Z") }).ekin.deyer).toBe(1000);
  });

  it("kartof 360/300, tərəvəzlər (pomidor, soğan) 310/250", () => {
    const yaz = new Date("2026-04-01T00:00:00Z");
    expect(on({ bitki: "kartof", suvarma: "muasir", indi: yaz }).ekin.derece).toBe(360);
    expect(on({ bitki: "kartof", suvarma: "enenevi", indi: yaz }).ekin.derece).toBe(300);
    for (const bitki of ["pomidor", "sogan"]) {
      expect(on({ bitki, suvarma: "muasir", indi: yaz }).ekin.derece).toBe(310);
      expect(on({ bitki, suvarma: "enenevi", indi: yaz }).ekin.derece).toBe(250);
    }
  });

  it("matris tariflərin özünü daşıyır: tarif[2026][qrup][suvarma]", () => {
    expect(TARIFLER[2026].bugda.muasir.derece).toBe(290);
    expect(TARIFLER[2026].qargidali.demye).toBeUndefined();
    expect(TARIFLER[2026].terevez.enenevi.derece).toBe(250);
  });
});

describe("dəmyə tarifi bilinməyən bitkilər — 0 uydurulmur", () => {
  it("qarğıdalı/kartof/tərəvəzdə yalnız iki üsul var; dəmyə seçilsə 'mənbə lazımdır'", () => {
    expect(bitkiUsullari("bugda")).toEqual(["muasir", "enenevi", "demye"]);
    expect(bitkiUsullari("qargidali")).toEqual(["muasir", "enenevi"]);
    expect(bitkiUsullari("pomidor")).toEqual(["muasir", "enenevi"]);
    const n = on({ bitki: "qargidali", suvarma: "demye", indi: new Date("2026-03-01T00:00:00Z") });
    expect(n.estimateStatus).toBe("menbeLazim");
    expect(n.catismayan).toEqual(["tarif.2026.qargidali.demye"]);
    expect(n.kreditLimitindeNezereAlinan).toBe(0);
  });

  it("suvarma bilinmirsə aralıq YALNIZ bitkinin real tarifləri üzrədir", () => {
    const b = hesabla({ bitki: "bugda" });
    expect(b.estimateStatus).toBe("araliq");
    expect(b.ekin.deyer).toBeNull();
    expect(b.ekin.min).toBe(2004);
    expect(b.ekin.max).toBe(2905.8);
    expect(b.ekin.setirler.map((s) => s.suvarma)).toEqual(SUVARMA_USULLARI);

    const q = on({ bitki: "qargidali", indi: new Date("2026-03-01T00:00:00Z") });
    expect(q.ekin.min).toBe(1000);
    expect(q.ekin.max).toBe(1600);
    expect(q.ekin.usullar).toEqual(["muasir", "enenevi"]);
    expect(q.ekin.setirler).toHaveLength(2);
  });

  it("sənəd üzrə hektar ölçülmüşdən azdırsa KİÇİYİ götürülür", () => {
    const n = hesabla({ bitki: "bugda", suvarma: "demye", senedHektar: 8 });
    expect(n.hektar).toBe(8);
    expect(n.olculmusHektar).toBe(10.02);
    expect(n.ekin.deyer).toBe(1600);
  });

  it("təkrar əkin üçün tarif mənbədə yoxdur → rəqəm uydurulmur", () => {
    const n = on({ bitki: "qargidali", suvarma: "muasir", tekrarEkin: true, indi: new Date("2026-06-15T00:00:00Z") });
    expect(n.estimateStatus).toBe("menbeLazim");
    expect(n.catismayan).toEqual(["tarif.2026.tekrarEkin"]);
    expect(n.dovr.nov).toBe("tekrar");
  });
});

// ═══ PAMBIQ — MƏHSUL SUBSİDİYASI ══════════════════════════════════════════

describe("pambıq — məhsul subsidiyası, hektar modeli deyil", () => {
  it("200/240/290 hektar düsturuna DÜŞMÜR; ₼/ton variantları 215 və 200", () => {
    const n = hesabla({ bitki: "pambiq", suvarma: "muasir", indi: new Date("2026-04-01T00:00:00Z") });
    expect(n.estimateStatus).toBe("mehsulModeli");
    expect(n.ekin).toBeNull();
    expect(n.mehsul.vahid).toBe("AZN/ton");
    expect(n.mehsul.variantlar.map((v) => v.derece)).toEqual([215, 200]);
    expect(n.mehsul.sertler).toBe("unknown");
    expect(n.mehsul.mebleg).toBeNull();
    expect(n.kreditLimitindeNezereAlinan).toBe(0);
    expect(n.sourceVerified).toBe(false);
  });

  it("təsdiqsiz 100 ₼/ton silinib", () => {
    expect(JSON.stringify(MEHSUL_SUBSIDIYASI)).not.toContain('"derece":100');
  });

  it("miqdar verilsə belə məbləğ aralıqdır və kreditə girmir", () => {
    const n = hesabla({ bitki: "pambiq", mehsulMiqdari: 30, indi: new Date("2026-04-01T00:00:00Z") });
    expect(n.mehsul.mebleg).toEqual({ min: 6000, max: 6450 });
    expect(kreditUcunSubsidiya(n)).toBe(0);
  });
});

// ═══ MƏNBƏ METADATA VƏ sourceVerified ═══════════════════════════════════

describe("mənbə metadata — hər tarifdə", () => {
  it("hər tarifdə sourceUrl, sourceTitle, decisionDate, effectiveFrom/To, campaignYear, verifiedAt, verifiedFields var", () => {
    for (const [qrup, cedvel] of Object.entries(TARIFLER[2026])) {
      for (const [usul, t] of Object.entries(cedvel)) {
        for (const acar of ["sourceUrl", "sourceTitle", "decisionDate", "effectiveFrom", "effectiveTo", "campaignYear", "verifiedAt", "verifiedFields"]) {
          expect(t, `${qrup}.${usul}.${acar}`).toHaveProperty(acar);
        }
        expect(t.sourceUrl).toBe("https://agro.gov.az/az/news/010920254");
        expect(t.campaignYear).toBe(2026);
      }
    }
  });

  it("URL və ya qərar tarixi yoxdursa sourceVerified=false qaytarılmır… yəni true OLA BİLMƏZ", () => {
    // Hazırkı cədvəldə decisionDate/verifiedAt null → hamısı false
    expect(hesabla({ bitki: "bugda", suvarma: "muasir" }).sourceVerified).toBe(false);
    expect(hesabla({ bitki: "bugda" }).sourceVerified).toBe(false);
    expect(menbeYoxlanib({ sourceUrl: "https://x", decisionDate: null, verifiedAt: "2026-01-01" })).toBe(false);
    expect(menbeYoxlanib({ sourceUrl: null, decisionDate: "2025-09-01", verifiedAt: "2026-01-01" })).toBe(false);
    expect(menbeYoxlanib({ sourceUrl: "https://x", decisionDate: "2025-09-01", verifiedAt: null })).toBe(false);
    expect(menbeYoxlanib({ sourceUrl: "https://x", decisionDate: "2025-09-01", verifiedAt: "2026-01-01" })).toBe(true);
  });

  it("nəticə istifadə olunan tarifin mənbəsini daşıyır (URL kliklənə bilər)", () => {
    const n = hesabla({ bitki: "bugda", suvarma: "muasir" });
    expect(n.menbe.sourceUrl).toBe(MENBELER.agro2026Cedvel.url);
    expect(n.menbe.sourceTitle).toMatch(/2026/);
    expect(n.menbe.decisionDate).toBeNull();
    expect(n.menbe.verifiedAt).toBeNull();
  });

  it("tam metadata + uyğunluq təsdiqi olanda kredit > 0; biri çatmasa 0", () => {
    const yoxlanmis = structuredClone(QAYDALAR_2026);
    for (const cedvel of Object.values(yoxlanmis.tarifler)) {
      for (const t of Object.values(cedvel)) {
        t.decisionDate = "2025-09-01";
        t.verifiedAt = "2026-09-16";
        t.verifiedFields = ["derece", "suvarma", "bitki"];
      }
    }
    const tam = hesabla({ bitki: "bugda", suvarma: "muasir", eligibilityStatus: "tesdiq", qaydalar: yoxlanmis });
    expect(tam.sourceVerified).toBe(true);
    expect(kreditUcunSubsidiya(tam)).toBe(2905.8);
    expect(tam.kreditLimitindeNezereAlinan).toBe(2905.8);
    // Uyğunluq təsdiq deyil → 0
    expect(kreditUcunSubsidiya(hesabla({ bitki: "bugda", suvarma: "muasir", qaydalar: yoxlanmis })).valueOf()).toBe(0);
    expect(hesabla({ bitki: "bugda", suvarma: "muasir", eligibilityStatus: "redd", qaydalar: yoxlanmis }).kreditLimitindeNezereAlinan).toBe(0);
    // Üsul bilinmir → 0
    expect(kreditUcunSubsidiya(hesabla({ bitki: "bugda", eligibilityStatus: "tesdiq", qaydalar: yoxlanmis }))).toBe(0);
    // Mənbə yoxlanmayıb (əsl cədvəl) → 0
    expect(kreditUcunSubsidiya(hesabla({ bitki: "bugda", suvarma: "muasir", eligibilityStatus: "tesdiq" }))).toBe(0);
  });

  it("gəlir modelinin subsidiya cədvəli bütövlükdə 0-dır və bütün bitkiləri əhatə edir", () => {
    expect(Object.values(GELIR_CONFIG.subsidiya).every((v) => v === 0)).toBe(true);
    const d = kreditUcunHektarDereceleri();
    expect(Object.values(d).every((v) => v === 0)).toBe(true);
    for (const b of ["bugda", "arpa", "qargidali", "pambiq", "kartof", "pomidor", "sogan", "uzum", "alma", "findiq"]) expect(d, b).toHaveProperty(b);
    expect(gelirModeli({ bitki: "bugda", hektar: 10.02 }).baza.subsidiya).toBe(0);
  });
});

// ═══ UYĞUNLUQ — "unknown" blanket tələb deyil ════════════════════════════

describe("uyğunluq — sourceVerified olsa belə avtomatik təsdiqlənmir", () => {
  it("standart vəziyyət 'yoxlanmayib'dir; mühərrik naməlum halı 'tesdiq'ə çevirmir", () => {
    const n = hesabla({ bitki: "bugda", suvarma: "muasir" });
    expect(n.eligibilityStatus).toBe("yoxlanmayib");
    expect(n.kreditLimitindeNezereAlinan).toBe(0);
    expect(hesabla({ bitki: "bugda", suvarma: "muasir", eligibilityStatus: "hazir" }).eligibilityStatus).toBe("yoxlanmayib");
  });

  it("sertifikatlı toxum: blanket tələb yoxdur — qayda bilinmir → 'unknown', hər bitkidə", () => {
    for (const bitki of ["bugda", "kartof", "pambiq"]) {
      const n = hesabla({ bitki, suvarma: "muasir", indi: new Date("2026-04-01T00:00:00Z") });
      const q = n.uygunluqQeydleri.find((x) => x.acar === "sertifikatliToxum");
      expect(q, bitki).toMatchObject({ teleb: "unknown", deyer: null, hektarHeddi: null, kampaniya: "2026" });
    }
    expect(SERTIFIKATLI_TOXUM[2026].qayda).toBe("unknown");
    expect(SERTIFIKATLI_TOXUM["2026-27"].qayda).toBe("unknown");
    expect(SERTIFIKATLI_TOXUM["2026-27"].sourceUrl).toBe(MENBELER.agro2027Mexanizm.url);
  });

  it("qayda bilinəndə bitki siyahısına görə tələb qoyulur", () => {
    const q = structuredClone(QAYDALAR_2026);
    q.sertifikatliToxum = { ...q.sertifikatliToxum, qayda: "melum", bitkiler: ["bugda"], hektarHeddi: 5 };
    expect(hesabla({ bitki: "bugda", suvarma: "muasir", qaydalar: q }).uygunluqQeydleri.find((x) => x.acar === "sertifikatliToxum").teleb).toBe(true);
    expect(hesabla({ bitki: "kartof", suvarma: "muasir", qaydalar: q }).uygunluqQeydleri.find((x) => x.acar === "sertifikatliToxum").teleb).toBe(false);
  });

  it("sığorta tələbi bilinmir → 'unknown'; çatışmayan məlumatlar siyahısı ayrıca gəlir", () => {
    const n = hesabla({ bitki: "bugda" });
    expect(n.uygunluqQeydleri.find((x) => x.acar === "sigorta").teleb).toBe("unknown");
    expect(n.catismayanMelumatlar).toEqual(["suvarma", "uygunluq", "toxumQaydasi", "menbeYoxlanisi"]);
    expect(hesabla({ bitki: "bugda", suvarma: "muasir" }).catismayanMelumatlar).not.toContain("suvarma");
  });
});

// ═══ BAĞLAR ═══════════════════════════════════════════════════════════════

describe("bağlar", () => {
  it("üzüm/alma/fındıq: ölçülər qəbul edilir, dərəcə yoxdur → mənbə lazımdır", () => {
    const n = hesabla({ bitki: "alma", bag: { salinmaIli: 2021, intensivlik: "intensiv", tingSixligi: 2500 } });
    expect(n.estimateStatus).toBe("menbeLazim");
    expect(n.catismayan).toEqual(["bag.derece"]);
    expect(n.bag).toEqual({ salinmaIli: 2021, intensivlik: "intensiv", tingSixligi: 2500 });
    expect(n.kreditLimitindeNezereAlinan).toBe(0);
  });
});

// ═══ TƏQVİM VƏ MÜRACİƏT DÖVRLƏRİ ═════════════════════════════════════════

describe("iş günü təqvimi — 2026", () => {
  it("31 dekabr qeyri-iş günüdür → dekabrın son iş günü 30 dekabrdır", () => {
    expect(isGunudur(new Date("2026-12-31T00:00:00Z"))).toBe(false);
    expect(sonIsGunu(2026, 12).toISOString().slice(0, 10)).toBe("2026-12-30");
    expect(sonIsGunu(2026, 12).toISOString().slice(0, 10)).not.toBe("2026-12-31");
  });

  it("həftə sonu atlanır: 31 oktyabr 2026 şənbədir → 30 oktyabr", () => {
    expect(sonIsGunu(2026, 10).toISOString().slice(0, 10)).toBe("2026-10-30");
  });

  it("sabit bayramlar Əmək Məcəlləsi m.105-dəndir; dəyişən və köçürülmüş günlər yüklənməyib (uydurulmur)", () => {
    expect(TEQVIM_2026.sabit).toContain("12-31");
    expect(TEQVIM_2026.sabit).toContain("03-20");
    expect(TEQVIM_2026.deyisen).toBeNull();
    expect(TEQVIM_2026.kocurulmus).toBeNull();
    expect(TEQVIM_2026.verifiedAt).toBeNull();
    expect(isGunudur(new Date("2026-05-28T00:00:00Z"))).toBe(false);
    expect(isGunudur(new Date("2026-05-27T00:00:00Z"))).toBe(true);
  });

  it("bayram həftə sonuna düşəndə növbəti iş günü istirahətdir (9 may 2026 şənbə → 11 may)", () => {
    expect(isGunudur(new Date("2026-05-11T00:00:00Z"))).toBe(false);
    expect(isGunudur(new Date("2026-05-12T00:00:00Z"))).toBe(true);
  });
});

describe("müraciət dövrü — sərhəd tarixləri", () => {
  const dovr = (bitki, iso, tekrarEkin = false) => muracietDovru({ bitki, tekrarEkin, indi: new Date(iso) });

  it("payızlıq: 1 sentyabr – dekabrın son iş günü (2026: 30 dekabr)", () => {
    expect(dovr("bugda", "2026-08-31T23:59:59Z").hal).toBe("gozlenilir");
    expect(dovr("bugda", "2026-09-01T00:00:00Z").hal).toBe("acig");
    expect(dovr("bugda", "2026-12-30T23:59:59Z").hal).toBe("acig");
    expect(dovr("bugda", "2026-12-31T10:00:00Z").hal).toBe("bagli");
    expect(dovr("arpa", "2026-10-10T00:00:00Z")).toMatchObject({ nov: "payizliq", sonIsGunu: true, teqvimTam: false });
    expect(dovr("bugda", "2026-10-10T00:00:00Z").son.toISOString().slice(0, 10)).toBe("2026-12-30");
    expect(dovr("bugda", "2026-10-10T00:00:00Z").sourceUrl).toBe(MENBELER.akiaMuraciet.url);
  });

  it("yazlıq: 1 fevral – 1 iyun (daxil)", () => {
    expect(dovr("qargidali", "2026-01-31T12:00:00Z").hal).toBe("gozlenilir");
    expect(dovr("qargidali", "2026-02-01T00:00:00Z").hal).toBe("acig");
    expect(dovr("kartof", "2026-06-01T23:59:59Z").hal).toBe("acig");
    expect(dovr("pambiq", "2026-06-02T00:00:00Z").hal).toBe("bagli");
  });

  it("təkrar əkin: 1 iyun – 1 avqust", () => {
    expect(dovr("qargidali", "2026-05-31T12:00:00Z", true).hal).toBe("gozlenilir");
    expect(dovr("qargidali", "2026-06-01T00:00:00Z", true).hal).toBe("acig");
    expect(dovr("qargidali", "2026-08-01T23:59:59Z", true).hal).toBe("acig");
    expect(dovr("qargidali", "2026-08-02T00:00:00Z", true).hal).toBe("bagli");
  });

  it("dövrü olmayan bitkidə null", () => {
    expect(dovr("alma", "2026-10-10T00:00:00Z")).toBeNull();
  });
});

// ═══ KAMPANİYA VERSİYALARI ════════════════════════════════════════════════

describe("kampaniya versiyaları — köhnə hesablama dəyişmir", () => {
  it("nəticə kampaniya və qaydalar versiyasını daşıyır", () => {
    const n = hesabla({ bitki: "bugda", suvarma: "muasir" });
    expect(n).toMatchObject({ kampaniya: "2026", campaignYear: 2026, qaydalarVersiyasi: "2026-02" });
  });

  it("2026-27 kampaniyası hələ 'unknown'dur: tarif uydurulmur, 2026 nəticəsi eyni qalır", () => {
    expect(KAMPANIYALAR["2026-27"]).toBe(QAYDALAR_2026_27);
    expect(QAYDALAR_2026_27.status).toBe("unknown");
    expect(QAYDALAR_2026_27.tarifler).toBeNull();
    const yeni = hesabla({ bitki: "bugda", suvarma: "muasir", kampaniya: "2026-27" });
    expect(yeni.estimateStatus).toBe("menbeLazim");
    expect(yeni.kampaniya).toBe("2026-27");
    expect(yeni.menbe.sourceUrl).toBe(MENBELER.agro2027Mexanizm.url);

    const kohne = hesabla({ bitki: "bugda", suvarma: "muasir", kampaniya: "2026" });
    expect(kohne.ekin.deyer).toBe(2905.8);
    expect(kohne.qaydalarVersiyasi).toBe("2026-02");
  });

  it("yeni kampaniyada tarif dəyişsə 2026 ilə çağırılan nəticə dəyişmir", () => {
    const dəyişik = structuredClone(QAYDALAR_2026_27);
    dəyişik.tarifler = { bugda: { muasir: { ...TARIFLER[2026].bugda.muasir, derece: 999 } } };
    dəyişik.status = "aktiv";
    const yeni = subsidiyaHesabla({ ...BERDE, bitki: "bugda", suvarma: "muasir", qaydalar: dəyişik });
    expect(yeni.ekin.deyer).toBe(yuvarla(999 * 10.02));
    expect(hesabla({ bitki: "bugda", suvarma: "muasir" }).ekin.deyer).toBe(2905.8);
  });
});

const yuvarla = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
