/**
 * ÖDƏNİŞ QABİLİYYƏTİ — sahə nə qədər borc xidmətini daşıya bilər.
 *
 * ═══ ZƏNCİRDƏ YERİ ════════════════════════════════════════════════════
 *   lib/mehsuldarliq.js  → aqro indeks (sahə necə becərilir)
 *   lib/gelir.js         → gəlir aralığı (sahə nə qazandırır)
 *   BU MODUL            → ödəniş qabiliyyəti (nə qədərini borca verə bilər)
 *   lib/risk.js         → risk səviyyəsi (AKB × aqro)          [növbəti]
 *   lib/qerar.js        → limit, müddət, qərar                 [növbəti]
 *
 * ═══ İKİ QAYDA ════════════════════════════════════════════════════════
 * 1. BAĞLAYICI RƏQƏM PESSİMİST SSENARİDİR. Kalibrlənməmiş modeldə baza
 *    ssenari ilə kredit vermək riski fermerin üstünə atmaqdır: model
 *    səhv çıxsa borcu o ödəyəcək. Baza və optimist yalnız göstərilir.
 * 2. GƏLİRİN HAMISI BORCA GETMİR. Fermer ailəsi mövsüm boyu yaşayır;
 *    növbəti mövsümün toxumu və gübrəsi də həmin gəlirdən alınır. Ona
 *    görə xalis gəlirin yalnız bir HİSSƏSİ borc xidmətinə açıqdır.
 *
 * ═══ NƏ ETMİR ═════════════════════════════════════════════════════════
 * Qərar vermir, limit təyin etmir, faiz hesablamır. Yalnız "bu sahə ildə
 * ən çoxu bu qədər borc xidməti daşıyar" deyir. Qərar lib/qerar.js-dədir
 * və AKB skorunu da nəzərə alır — sahə yaxşı ola bilər, fermerin isə
 * başqa bankda gecikmiş borcu.
 *
 * ⚠ Bütün hədlər ekspert təklifidir — kalibrlənməyib (bax: ODENIS_TESDIQ).
 */

export const ODENIS_TESDIQ = {
  maliyye: false,
  tarix: null,
  qeyd:
    "DSTI həddi və ailə xərci normaları ekspert təklifidir — Azərbaycan " +
    "kənd təsərrüfatı portfeli üzrə statistik kalibrlənməyib.",
};

export const ODENIS_CONFIG = {
  /**
   * Xalis gəlirin borc xidmətinə açıq payı (DSTI tavanı).
   * 0.4 = xalis mövsüm gəlirinin ən çoxu 40%-i borca gedə bilər.
   *
   * Beynəlxalq praktikada istehlak kreditində 40-50% işlədilir. Kənd
   * təsərrüfatında gəlir MÖVSÜMLÜdür və bir dəfə gəlir — ona görə burada
   * daha mühafizəkar olmaq lazımdır, 0.4 yuxarı hədddir.
   */
  dstiTavani: 0.4,

  /**
   * Xalis gəlirin təsərrüfatın öz dövriyyəsi üçün saxlanan payı.
   * Növbəti mövsümün toxumu, gübrəsi və şumu bu gəlirdən alınır; hamısını
   * borca vermək fermeri növbəti il yeni krediti almağa məcbur edir.
   *
   * PAYDIR, HEKTARA GÖRƏ SABİT MƏBLƏĞ DEYİL. Sabit ₼/ha ilə yazılmışdı və
   * aşağı marjalı bitkilərdə (buğda, arpa) bütün xalis gəliri yeyirdi —
   * yəni heç bir taxılçı kredit ala bilmirdi. Ehtiyat gəlirlə birlikdə
   * böyüməlidir, ondan asılı olmadan yox.
   */
  dovriyyePayi: 0.25,

  /** Bundan aşağı xalis gəlirdə borc xidməti qabiliyyəti SIFIR sayılır */
  minXalisGelir: 500,

  /**
   * Fermerin bəyan etdiyi mövcud borc xidməti nəzərə alınır. AKB
   * inteqrasiyası gələnə qədər bu, fermerin öz sözüdür — mənbə
   * `menbe` sahəsində açıq yazılır və qərar onu nəzərə alır.
   */
  menbeler: ["akb", "beyan", "yoxdur"],
};

/**
 * Ödəniş qabiliyyəti.
 *
 * @param {object} p
 * @param {object} p.gelir        lib/gelir.js nəticəsi
 * @param {number} [p.movcudBorc] Mövsüm ərzində mövcud borc xidməti (₼)
 * @param {string} [p.borcMenbeyi] "akb" | "beyan" | "yoxdur"
 *
 * @returns {object}
 *   {hal:"olculmur"} → gəlir modeli işləməyib
 *   {hal:"hazir", qabiliyyet, dsti, ssenariler, xebardarliqlar}
 */
export function odenisQabiliyyeti({ gelir, movcudBorc = 0, borcMenbeyi = "yoxdur" } = {}) {
  if (gelir?.hal !== "hazir") {
    return {
      hal: "olculmur",
      sebeb: gelir?.sebeb ?? "gelirYoxdur",
      qabiliyyet: null,
      yoxlanilib: false,
    };
  }

  const { dstiTavani, dovriyyePayi, minXalisGelir } = ODENIS_CONFIG;

  const hesabla = (ssenari) => {
    // Dövriyyə ehtiyatı xalis gəlirdən ƏVVƏL çıxılır: o pul təsərrüfatın
    // öz işi üçündür, sərbəst gəlir deyil
    const serbest = ssenari.xalisGelir * (1 - dovriyyePayi);
    if (serbest < minXalisGelir) {
      return { ad: ssenari.ad, serbestGelir: Math.round(serbest), tavan: 0, qabiliyyet: 0 };
    }
    const tavan = serbest * dstiTavani;
    // Mövcud borc xidməti tavandan çıxılır — fermerin ümumi yükü sayılır
    return {
      ad: ssenari.ad,
      serbestGelir: Math.round(serbest),
      tavan: Math.round(tavan),
      qabiliyyet: Math.max(0, Math.round(tavan - movcudBorc)),
    };
  };

  const ssenariler = gelir.ssenariler.map(hesabla);
  const pessimist = ssenariler.find((s) => s.ad === "pessimist");

  const xebardarliqlar = [];
  // Mənbə gizlədilmir: fermerin öz sözü ilə AKB arayışı eyni çəkidə deyil
  if (borcMenbeyi !== "akb") {
    xebardarliqlar.push(movcudBorc > 0 ? "borcBeyan" : "borcYoxlanilmayib");
  }
  if (pessimist.qabiliyyet === 0) xebardarliqlar.push("qabiliyyetSifir");
  if (!gelir.yoxlanilib) xebardarliqlar.push("modelKalibrlenmeyib");

  return {
    hal: "hazir",
    // BAĞLAYICI RƏQƏM PESSİMİSTDİR — qərar buna baxır
    qabiliyyet: pessimist.qabiliyyet,
    ssenariler,
    movcudBorc,
    borcMenbeyi,
    // DSTI: mövcud + mümkün borcun sərbəst gəlirə nisbəti
    dsti:
      pessimist.serbestGelir > 0
        ? Math.round(((movcudBorc + pessimist.qabiliyyet) / pessimist.serbestGelir) * 100) / 100
        : null,
    xebardarliqlar,
    yoxlanilib: false,
    tesdiq: ODENIS_TESDIQ,
  };
}
