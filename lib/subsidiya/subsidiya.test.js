import { describe, expect, it } from "vitest";
import { GELIR_CONFIG, gelirModeli } from "../gelir.js";
import { QAYDALAR_2026 } from "./qaydalar2026.js";
import {
  SUVARMA_USULLARI,
  kreditUcunHektarDereceleri,
  kreditUcunSubsidiya,
  muracietDovru,
  sonIsGunu,
  subsidiyaHesabla,
} from "./index.js";

/** Bərdə, 10,02 ha — fixture-lərin hamısı bu sahə üzərindədir */
const BERDE = { hektar: 10.02, rayonKod: "berde" };
const hesabla = (p) => subsidiyaHesabla({ ...BERDE, indi: new Date("2026-10-10T00:00:00Z"), ...p });

describe("2026 modeli — buğda/arpa, üç suvarma halı", () => {
  for (const bitki of ["bugda", "arpa"]) {
    it(`${bitki}: dəmyə 2.004 · ənənəvi 2.404,80 · müasir 2.905,80`, () => {
      expect(hesabla({ bitki, suvarma: "demye" }).ekin.deyer).toBe(2004);
      expect(hesabla({ bitki, suvarma: "enenevi" }).ekin.deyer).toBe(2404.8);
      expect(hesabla({ bitki, suvarma: "muasir" }).ekin.deyer).toBe(2905.8);
      const n = hesabla({ bitki, suvarma: "muasir" });
      expect(n.estimateStatus).toBe("hesablanib");
      expect(n.ekin.setirler[0]).toMatchObject({ baza: 200, bitkiEmsali: 1, suvarmaEmsali: 1.45, derece: 290 });
    });
  }

  it("suvarma bilinmirsə tək rəqəm yox, 2.004–2.905,80 aralığı", () => {
    const n = hesabla({ bitki: "bugda" });
    expect(n.estimateStatus).toBe("araliq");
    expect(n.ekin.deyer).toBeNull();
    expect(n.ekin.min).toBe(2004);
    expect(n.ekin.max).toBe(2905.8);
    expect(n.ekin.setirler.map((s) => s.suvarma)).toEqual(SUVARMA_USULLARI);
  });

  it("ənənəvi suvarma əmsalı təsdiqsizdir → sourceVerified false; dəmyə/müasir üçün true", () => {
    expect(hesabla({ bitki: "bugda", suvarma: "enenevi" }).sourceVerified).toBe(false);
    expect(hesabla({ bitki: "bugda", suvarma: "demye" }).sourceVerified).toBe(true);
    expect(hesabla({ bitki: "arpa", suvarma: "muasir" }).sourceVerified).toBe(true);
    // Aralıqda üç sətirdən biri təsdiqsizdir → bütövlükdə təsdiqsiz
    expect(hesabla({ bitki: "bugda" }).sourceVerified).toBe(false);
  });

  it("sənəd üzrə hektar ölçülmüşdən azdırsa KİÇİYİ götürülür", () => {
    const n = hesabla({ bitki: "bugda", suvarma: "demye", senedHektar: 8 });
    expect(n.hektar).toBe(8);
    expect(n.olculmusHektar).toBe(10.02);
    expect(n.ekin.deyer).toBe(1600);
  });
});

describe("2026 modeli — qarğıdalı əsas / təkrar əkin", () => {
  it("əsas əkin hesablanır, dövr yazlıqdır", () => {
    const n = hesabla({ bitki: "qargidali", suvarma: "muasir", indi: new Date("2026-03-01T00:00:00Z") });
    expect(n.ekin.deyer).toBe(2905.8);
    expect(n.dovr.nov).toBe("yazliq");
    // Qarğıdalı əmsalı rəsmi mənbə ilə tutuşdurulmayıb
    expect(n.sourceVerified).toBe(false);
  });

  it("təkrar əkin əmsalı mənbədə yoxdur → rəqəm uydurulmur, çatışmayan sahə adlanır", () => {
    const n = hesabla({ bitki: "qargidali", suvarma: "muasir", tekrarEkin: true, indi: new Date("2026-06-15T00:00:00Z") });
    expect(n.estimateStatus).toBe("menbeLazim");
    expect(n.catismayan).toContain("ekin.tekrarEkinEmsali");
    expect(n.dovr.nov).toBe("tekrar");
    expect(n.kreditLimitindeNezereAlinan).toBe(0);
  });
});

describe("2026 modeli — kartof və tərəvəz", () => {
  for (const bitki of ["kartof", "pomidor", "sogan"]) {
    it(`${bitki}: baza əmsalı ilə hesablanır, təsdiqsiz, yazlıq dövr`, () => {
      const n = hesabla({ bitki, suvarma: "enenevi", indi: new Date("2026-04-01T00:00:00Z") });
      expect(n.estimateStatus).toBe("hesablanib");
      expect(n.ekin.deyer).toBe(2404.8);
      expect(n.sourceVerified).toBe(false);
      expect(n.dovr.nov).toBe("yazliq");
      expect(n.mehsul).toBeNull();
    });
  }
});

describe("2026 modeli — pambıq: əkin + ₼/ton məhsul subsidiyası", () => {
  it("əkin sətri + məhsul dərəcəsi ayrı modellərdir", () => {
    const n = hesabla({ bitki: "pambiq", suvarma: "muasir", indi: new Date("2026-04-01T00:00:00Z") });
    expect(n.ekin.deyer).toBe(2905.8);
    expect(n.mehsul).toEqual({ derece: 100, vahid: "ton", yoxlanib: false });
    expect(n.uygunluqQeydleri.some((q) => q.acar === "sertifikatliToxum" && q.teleb)).toBe(true);
  });
});

describe("2026 modeli — bağlar", () => {
  it("üzüm/alma/fındıq: ölçülər qəbul edilir, dərəcə yoxdur → mənbə lazımdır", () => {
    const n = hesabla({ bitki: "alma", bag: { salinmaIli: 2021, intensivlik: "intensiv", tingSixligi: 2500 } });
    expect(n.estimateStatus).toBe("menbeLazim");
    expect(n.catismayan).toEqual(["bag.derece"]);
    expect(n.bag).toEqual({ salinmaIli: 2021, intensivlik: "intensiv", tingSixligi: 2500 });
    expect(n.kreditLimitindeNezereAlinan).toBe(0);
  });
});

describe("müraciət dövrü — sərhəd tarixləri", () => {
  const dovr = (bitki, iso, tekrarEkin = false) => muracietDovru({ bitki, tekrarEkin, indi: new Date(iso) });

  it("payızlıq: 1 sentyabr – dekabrın son iş günü (2026: 31 dekabr, cümə axşamı)", () => {
    expect(dovr("bugda", "2026-08-31T23:59:59Z").hal).toBe("gozlenilir");
    expect(dovr("bugda", "2026-09-01T00:00:00Z").hal).toBe("acig");
    expect(dovr("bugda", "2026-12-31T23:59:59Z").hal).toBe("acig");
    expect(dovr("bugda", "2027-01-01T00:00:00Z").hal).toBe("bagli");
    expect(dovr("arpa", "2026-10-10T00:00:00Z")).toMatchObject({ nov: "payizliq", sonIsGunu: true });
    expect(dovr("bugda", "2026-10-10T00:00:00Z").son.toISOString().slice(0, 10)).toBe("2026-12-31");
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

  it("ayın son iş günü həftə sonuna düşəndə cüməyə çəkilir", () => {
    // 31 oktyabr 2026 şənbədir → 30 oktyabr (cümə)
    expect(sonIsGunu(2026, 10).toISOString().slice(0, 10)).toBe("2026-10-30");
    expect(sonIsGunu(2026, 12).toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it("dövrü olmayan bitkidə null", () => {
    expect(dovr("alma", "2026-10-10T00:00:00Z")).toBeNull();
  });
});

describe("kredit tavanı — təsdiqsiz məbləğ daxil olmur", () => {
  it("gəlir modelinin subsidiya cədvəli bütövlükdə 0-dır", () => {
    expect(Object.values(GELIR_CONFIG.subsidiya).every((v) => v === 0)).toBe(true);
    expect(Object.values(kreditUcunHektarDereceleri()).every((v) => v === 0)).toBe(true);
    const model = gelirModeli({ bitki: "bugda", hektar: 10.02 });
    expect(model.baza.subsidiya).toBe(0);
  });

  it("rəsmi cədvəl tutuşdurulmayıbsa fərdi hesablama da 0 verir", () => {
    const n = hesabla({ bitki: "bugda", suvarma: "muasir", eligibilityStatus: "tesdiq" });
    expect(n.sourceVerified).toBe(true);
    // Buğda + müasir tam yoxlanmış yoldur, uyğunluq da kənardan təsdiqlənib → daxil olur
    expect(kreditUcunSubsidiya(n)).toBe(2905.8);
    // Ənənəvi əmsalı təsdiqsizdir → eyni fermer üçün 0
    expect(kreditUcunSubsidiya(hesabla({ bitki: "bugda", suvarma: "enenevi", eligibilityStatus: "tesdiq" }))).toBe(0);
    // Aralıq (üsul bilinmir) → 0
    expect(kreditUcunSubsidiya(hesabla({ bitki: "bugda", eligibilityStatus: "tesdiq" }))).toBe(0);
  });
});

describe("uyğunluq — sourceVerified olsa belə avtomatik təsdiqlənmir", () => {
  it("standart vəziyyət 'yoxlanmayib'dir və kredit limitinə 0 gedir", () => {
    const n = hesabla({ bitki: "bugda", suvarma: "muasir" });
    expect(n.sourceVerified).toBe(true);
    expect(n.eligibilityStatus).toBe("yoxlanmayib");
    expect(n.kreditLimitindeNezereAlinan).toBe(0);
    expect(kreditUcunSubsidiya(n)).toBe(0);
  });

  it("mühərrik naməlum vəziyyəti 'tesdiq'ə çevirmir; 'redd' olduğu kimi qalır", () => {
    expect(hesabla({ bitki: "bugda", suvarma: "muasir", eligibilityStatus: "hazir" }).eligibilityStatus).toBe("yoxlanmayib");
    expect(hesabla({ bitki: "bugda", suvarma: "muasir", eligibilityStatus: "redd" }).kreditLimitindeNezereAlinan).toBe(0);
  });

  it("sertifikatlı toxum tələbi buğda/arpa/pambıqda qeyd olunur, cavab verilməyibsə null qalır", () => {
    const n = hesabla({ bitki: "bugda", suvarma: "demye" });
    expect(n.uygunluqQeydleri).toContainEqual({ acar: "sertifikatliToxum", teleb: true, deyer: null });
    expect(hesabla({ bitki: "kartof", suvarma: "demye" }).uygunluqQeydleri.some((q) => q.acar === "sertifikatliToxum")).toBe(false);
  });
});

describe("mənbə qeydləri", () => {
  it("kampaniya ili, qüvvədəolma və mənbə sahələri nəticədə daşınır; URL və qərar tarixi hələ boşdur", () => {
    const n = hesabla({ bitki: "bugda", suvarma: "demye" });
    expect(n.campaignYear).toBe(2026);
    expect(n.menbe).toMatchObject({ quvvedenBaslayir: "2026-01-01", quvvedenBitir: "2026-12-31" });
    expect(QAYDALAR_2026.menbe.url).toBeNull();
    expect(QAYDALAR_2026.menbe.qerarTarixi).toBeNull();
  });
});
