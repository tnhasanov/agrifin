import { describe, expect, it } from "vitest";
import { GELIR_CONFIG, GELIR_TESDIQ, SSENARILER, gelirModeli } from "./gelir.js";
import { ODENIS_CONFIG, odenisQabiliyyeti } from "./odenis.js";
import { CROP_KEYS } from "../src/services/crops.js";

const bugda = (deyisiklik = {}) => gelirModeli({ bitki: "bugda", hektar: 10, ...deyisiklik });

describe("gəlir modelinin quruluşu", () => {
  // Bitki siyahısı bir yerdə dəyişəndə burada boşluq qalmamalıdır: naməlum
  // bitki modeli səssizcə söndürür və fermer səbəbini bilmir
  it("tətbiqin bütün bitkiləri üçün norma var", () => {
    for (const bitki of CROP_KEYS) {
      expect(GELIR_CONFIG.mehsuldarliq[bitki], bitki).toBeGreaterThan(0);
      expect(GELIR_CONFIG.qiymet[bitki], bitki).toBeGreaterThan(0);
      expect(GELIR_CONFIG.xerc[bitki], bitki).toBeGreaterThan(0);
    }
  });

  it("model kalibrlənməmiş kimi işarələnir", () => {
    expect(GELIR_TESDIQ.aqronom).toBe(false);
    expect(GELIR_TESDIQ.maliyye).toBe(false);
    expect(bugda().yoxlanilib).toBe(false);
  });

  // İndeksin səlahiyyəti MƏHDUD olmalıdır: o, aqronomik göstəricidir,
  // məhsuldarlıq proqnozu deyil
  it("aqro indeksin təsiri ±25%-i keçmir", () => {
    const emsallar = Object.values(GELIR_CONFIG.indeksTesiri);
    expect(Math.min(...emsallar)).toBeGreaterThanOrEqual(0.75);
    expect(Math.max(...emsallar)).toBeLessThanOrEqual(1.25);
  });
});

describe("gəlir modeli", () => {
  it("bitki seçilməyibsə təxmin uydurmur", () => {
    expect(gelirModeli({ hektar: 10 })).toMatchObject({
      hal: "olculmur",
      sebeb: "bitkiSecilmeyib",
    });
  });

  it("sahə çəkilməyibsə təxmin uydurmur", () => {
    expect(gelirModeli({ bitki: "bugda" })).toMatchObject({
      hal: "olculmur",
      sebeb: "saheYoxdur",
    });
  });

  it("üç ssenari qaytarır və sıra pessimistdən optimistə gedir", () => {
    const n = bugda();
    expect(n.ssenariler.map((s) => s.ad)).toEqual(SSENARILER);
    expect(n.pessimist.xalisGelir).toBeLessThan(n.baza.xalisGelir);
    expect(n.baza.xalisGelir).toBeLessThan(n.optimist.xalisGelir);
  });

  // MODELİN BÜTÜN MƏNASI BUDUR: peyk tarixçəsi rayon ortalamasını dəyişir
  it("aqro indeks bandı gəliri dəyişir", () => {
    const yuksek = bugda({ bant: "yuksek" }).baza.xalisGelir;
    const orta = bugda({ bant: "orta" }).baza.xalisGelir;
    const zeif = bugda({ bant: "zeif" }).baza.xalisGelir;
    expect(yuksek).toBeGreaterThan(orta);
    expect(orta).toBeGreaterThan(zeif);
  });

  // Məlumatın olmaması nə mükafat, nə cəzadır (bax: mehsuldarliq.js, qayda 4)
  it("bant yoxdursa düzəliş edilmir", () => {
    expect(bugda({ bant: null }).baza).toEqual(bugda({ bant: "orta" }).baza);
  });

  it("cari mövsüm riski YALNIZ pessimist ssenarini aşağı salır", () => {
    const risksiz = bugda();
    const riskli = bugda({ cariRisk: true });
    expect(riskli.pessimist.xalisGelir).toBeLessThan(risksiz.pessimist.xalisGelir);
    // Bayraq bu mövsümü deyir — baza və optimist toxunulmaz qalır
    expect(riskli.baza).toEqual(risksiz.baza);
    expect(riskli.optimist).toEqual(risksiz.optimist);
  });

  it("zona məhsuldarlığı dəyişir", () => {
    expect(bugda({ zona: "daglik" }).baza.hasil).toBeLessThan(bugda({ zona: "aran" }).baza.hasil);
  });

  it("sahə iki dəfə böyükdürsə ümumi gəlir də iki dəfədir", () => {
    const bir = gelirModeli({ bitki: "bugda", hektar: 5 }).baza;
    const iki = gelirModeli({ bitki: "bugda", hektar: 10 }).baza;
    expect(iki.ummumiGelir).toBe(bir.ummumiGelir * 2);
    expect(iki.xerc).toBe(bir.xerc * 2);
  });

  // Zərər GİZLƏDİLMİR: bəzi bitki-sahə birləşməsi həqiqətən zərərlidir və
  // kredit qərarı məhz bunu görməlidir
  it("xalis gəlir mənfi ola bilər", () => {
    const kicik = gelirModeli({ bitki: "pomidor", hektar: 0.2, bant: "zeif" });
    expect(kicik.pessimist.xalisGelir).toBeLessThan(kicik.pessimist.ummumiGelir);
  });

  it("hər fərziyyə mənbəyi ilə birlikdə açılır", () => {
    const f = bugda({ bant: "yuksek", cariRisk: true }).ferziyyeler;
    const acarlar = f.map((x) => x.acar);
    expect(acarlar).toContain("mehsuldarliq");
    expect(acarlar).toContain("qiymet");
    expect(acarlar).toContain("xerc");
    expect(acarlar).toContain("cariRisk");
    expect(f.find((x) => x.acar === "indeks").menbe).toBe("aqroIndeks");
    for (const sətir of f) expect(Number.isFinite(sətir.deyer), sətir.acar).toBe(true);
  });
});

describe("ödəniş qabiliyyəti", () => {
  const gelir = bugda({ bant: "yaxsi" });

  it("gəlir modeli işləməyibsə qabiliyyət ölçülmür", () => {
    expect(odenisQabiliyyeti({ gelir: gelirModeli({}) })).toMatchObject({ hal: "olculmur" });
  });

  // ƏSAS QAYDA: bağlayıcı rəqəm pessimistdir
  it("qabiliyyət pessimist ssenaridən gəlir", () => {
    const n = odenisQabiliyyeti({ gelir });
    const pessimist = n.ssenariler.find((s) => s.ad === "pessimist");
    expect(n.qabiliyyet).toBe(pessimist.qabiliyyet);
    expect(n.qabiliyyet).toBeLessThan(n.ssenariler.find((s) => s.ad === "baza").qabiliyyet);
  });

  it("gəlirin hamısı borca açıq deyil", () => {
    const n = odenisQabiliyyeti({ gelir });
    const pessimist = n.ssenariler.find((s) => s.ad === "pessimist");
    // Dövriyyə ehtiyatı çıxılıb, qalanın da yalnız DSTI tavanı qədəri
    expect(pessimist.serbestGelir).toBeLessThan(gelir.pessimist.xalisGelir);
    expect(pessimist.tavan).toBeCloseTo(pessimist.serbestGelir * ODENIS_CONFIG.dstiTavani, 0);
    // İki qat qoruma: xalis gəlirin yarısından çoxu borca getmir
    expect(pessimist.tavan).toBeLessThan(gelir.pessimist.xalisGelir * 0.5);
  });

  // AŞAĞI MARJALI BİTKİ BORC DAŞIMIR — bu, xəta deyil, modelin tapıntısıdır.
  // Ucuz taxıl kiçik sahədə mövsüm gəlirindən borc xidməti çıxarmır; belə
  // fermerə nağd kredit yox, girov/subsidiya təminatlı məhsul lazımdır.
  it("bahalı bitki ucuz bitkidən qat-qat çox borc daşıyır", () => {
    const taxil = odenisQabiliyyeti({ gelir: gelirModeli({ bitki: "bugda", hektar: 10 }) });
    const tərəvəz = odenisQabiliyyeti({ gelir: gelirModeli({ bitki: "pomidor", hektar: 10 }) });
    expect(tərəvəz.qabiliyyet).toBeGreaterThan(taxil.qabiliyyet * 5);
  });

  it("mövcud borc qabiliyyəti azaldır", () => {
    // Taxılın qabiliyyəti onsuz da kiçikdir və sıfıra dirənərdi — çıxılmanın
    // özünü görmək üçün marjası geniş bitki lazımdır
    const genis = gelirModeli({ bitki: "pomidor", hektar: 10, bant: "yaxsi" });
    const bos = odenisQabiliyyeti({ gelir: genis }).qabiliyyet;
    const borclu = odenisQabiliyyeti({
      gelir: genis,
      movcudBorc: 1000,
      borcMenbeyi: "beyan",
    }).qabiliyyet;
    expect(borclu).toBe(bos - 1000);
  });

  it("qabiliyyət mənfi olmur, sıfırda dayanır", () => {
    const n = odenisQabiliyyeti({ gelir, movcudBorc: 10_000_000, borcMenbeyi: "akb" });
    expect(n.qabiliyyet).toBe(0);
    expect(n.xebardarliqlar).toContain("qabiliyyetSifir");
  });

  // Fermerin öz sözü ilə AKB arayışı eyni çəkidə deyil — fərq görünməlidir
  it("borcun mənbəyi AKB deyilsə xəbərdarlıq qalxır", () => {
    expect(
      odenisQabiliyyeti({ gelir, movcudBorc: 500, borcMenbeyi: "beyan" }).xebardarliqlar,
    ).toContain("borcBeyan");
    expect(odenisQabiliyyeti({ gelir }).xebardarliqlar).toContain("borcYoxlanilmayib");
    expect(
      odenisQabiliyyeti({ gelir, movcudBorc: 500, borcMenbeyi: "akb" }).xebardarliqlar,
    ).not.toContain("borcBeyan");
  });

  it("kalibrlənməmiş model xəbərdarlığı həmişə daşınır", () => {
    expect(odenisQabiliyyeti({ gelir }).xebardarliqlar).toContain("modelKalibrlenmeyib");
  });

  it("çox kiçik sahədə qabiliyyət sıfırdır", () => {
    const kicik = odenisQabiliyyeti({ gelir: gelirModeli({ bitki: "bugda", hektar: 0.3 }) });
    expect(kicik.qabiliyyet).toBe(0);
  });
});
