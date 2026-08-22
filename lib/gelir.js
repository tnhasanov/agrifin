/**
 * GƏLİR MODELİ — sahədən gözlənilən mövsümlük gəlir.
 *
 * ═══ BU NƏ ÜÇÜNDÜR ════════════════════════════════════════════════════
 * Kredit qərarı ödəniş qabiliyyətinə söykənir, ödəniş qabiliyyəti isə
 * gəlirə. Fermerin gəliri isə sahədən çıxır: məhsuldarlıq × sahə × qiymət
 * − xərc. Bu modul həmin zənciri AÇIQ və MÜBAHİSƏ EDİLƏ BİLƏN şəkildə
 * qurur — kredit mütəxəssisi hər sətri ayrıca dartışa bilməlidir.
 *
 * ═══ AQRO İNDEKSLƏ KƏSİŞMƏ ════════════════════════════════════════════
 * Regional norma "bu rayonda buğda orta hesabla nə verir" deyir. Aqro
 * indeks isə "BU sahə həmin ortadan yaxşıdır, yoxsa pisdir" deyir. İkisini
 * kəsişdirmək modelin bütün mənasıdır: peyk tarixçəsi olmadan biz sadəcə
 * rayon ortalamasını təkrarlayardıq, bank isə onu onsuz da bilir.
 *
 * İndeksin təsiri MƏHDUDdur (±25%) və qəsdən belədir: indeks aqronomik
 * göstəricidir, məhsuldarlıq proqnozu kimi kalibrlənməyib. Ona 2 dəfə
 * fərq yaratmaq səlahiyyəti vermək onu olmadığı bir şeyə çevirərdi.
 *
 * ═══ NƏ QAYTARIR VƏ NƏ QAYTARMIR ══════════════════════════════════════
 * QAYTARIR: üç ssenarili gəlir ARALIĞI + hər rəqəmin arxasındakı fərziyyə.
 * QAYTARMIR: tək "dəqiq" rəqəm. Kalibrlənməmiş modeldən nöqtə proqnozu
 * vermək onu olduğundan dəqiq göstərir. Kredit qərarı PESSİMİST ssenariyə
 * baxmalıdır (bax: lib/odenis.js) — optimist rəqəm yalnız fermerə
 * "yaxşı gedərsə" mənzərəsini göstərmək üçündür.
 *
 * ═══ KALİBRLƏMƏ VƏZİYYƏTİ ═════════════════════════════════════════════
 * ⚠ AŞAĞIDAKI HEÇ BİR RƏQƏM ÖLÇÜLMƏYİB. Hamısı ekspert təxminidir və
 * Azərbaycan şəraiti üçün yoxlanılmayıb. Model YALNIZ real biçin
 * məlumatı toplandıqdan sonra etibarlı sayıla bilər.
 *
 * TODO(kalibrləmə): biçindən sonra fermerdən HƏQİQİ məhsuldarlığı soruşub
 * saxlamaq lazımdır (t/ha, sahə ID-si, il, bitki). 200-300 müşahidədən
 * sonra `MEHSULDARLIQ` normaları rayon-bitki kəsiyində məlumatdan
 * çıxarılmalı, `indeksTesiri` isə indeks bandı ilə həqiqi məhsuldarlıq
 * arasındakı reqressiyadan gəlməlidir. O vaxta qədər bu modul
 * `yoxlanilib: false` qaytarır və interfeys bunu gizlətməməlidir.
 */

export const GELIR_TESDIQ = {
  aqronom: false,
  maliyye: false,
  tarix: null,
  qeyd:
    "Məhsuldarlıq, qiymət və xərc normaları ekspert təxminidir — ölçülməyib, " +
    "statistik kalibrlənməyib. Real biçin məlumatı toplanana qədər model " +
    "yalnız ilkin qiymətləndirmə üçündür.",
};

/**
 * BÜTÜN RƏQƏMLƏR BURADADIR — koda səpələnmir, çünki hər biri ayrıca
 * mübahisə ediləcək və məlumat gələndə ayrıca əvəzlənəcək.
 *
 * `mehsuldarliq` — t/ha, suvarılan şəraitdə orta məhsuldarlıq.
 * `qiymet` — ₼/t, təsərrüfat qapısı qiyməti (emal və daşınma çıxılmış).
 * `xerc` — ₼/ha, mövsümlük istehsal xərci (toxum, gübrə, yanacaq, əmək).
 *
 * ⚠ HAMISI: ekspert / müvəqqəti / təsdiqlənməmiş.
 */
export const GELIR_CONFIG = {
  mehsuldarliq: {
    // Suvarılan Aran şəraiti. Dəmyə (suvarısız) əkin bunun yarısını verir —
    // model hazırda suvarma rejimini bilmir (bax: TODO(suvarma))
    bugda: 3.5,
    arpa: 3,
    qargidali: 5.5,
    pambiq: 2.4,
    kartof: 15,
    pomidor: 28,
    sogan: 20,
    uzum: 8,
    alma: 14,
    findiq: 1.2,
  },

  qiymet: {
    bugda: 360,
    arpa: 300,
    qargidali: 320,
    pambiq: 1200,
    kartof: 500,
    pomidor: 600,
    sogan: 400,
    uzum: 800,
    alma: 1090,
    findiq: 6000,
  },

  /**
   * Dövlət subsidiyası (₼/ha). Taxılda bu, marjanın ƏHƏMİYYƏTLİ hissəsidir
   * — nəzərə almasaq buğda əkini modeldə həmişə zərərli görünür və heç bir
   * taxılçı kredit ala bilməz. Rəqəmlər siyasətlə dəyişir, ona görə ayrıca
   * sətirdədir.
   *
   * TODO(subsidiya): rəsmi Aqrar Subsidiya portalından illik yenilənməlidir.
   */
  subsidiya: {
    bugda: 250,
    arpa: 250,
    qargidali: 200,
    pambiq: 300,
    kartof: 0,
    pomidor: 0,
    sogan: 0,
    uzum: 0,
    alma: 0,
    findiq: 0,
  },

  xerc: {
    bugda: 850,
    arpa: 780,
    qargidali: 1400,
    pambiq: 1900,
    kartof: 4200,
    pomidor: 6500,
    sogan: 3800,
    uzum: 3500,
    alma: 4000,
    findiq: 2200,
  },

  /**
   * Zonaya görə məhsuldarlıq düzəlişi. Zonalar bilik bazasındakı ilə
   * eynidir (bax: lib/knowledge.js — aran, lenkeran, daglik).
   * Dağlıq: qısa vegetasiya dövrü, suvarma məhdudiyyəti.
   */
  zona: { aran: 1, lenkeran: 1.05, daglik: 0.8 },

  /**
   * Aqro indeks bandının məhsuldarlığa təsiri. Bant sərhədləri
   * lib/mehsuldarliq.js-dəki BANTLAR ilə eynidir.
   *
   * Diapazon qəsdən dardır (0.75–1.25): indeks aqronomik göstəricidir,
   * məhsuldarlıq proqnozu deyil. Genişləndirmək yalnız kalibrlədikdən
   * sonra mümkündür.
   */
  indeksTesiri: {
    yuksek: 1.25,
    yaxsi: 1.1,
    orta: 1,
    zeif: 0.8,
    // Bal/bant yoxdursa (tarixçə azdır və ya müqayisə alınmayıb) indeks
    // heç bir düzəliş etmir — 1.0. Məlumatın olmaması yaxşı xəbər deyil,
    // amma cəza da deyil (bax: lib/mehsuldarliq.js, qayda 4)
    yoxdur: 1,
  },

  /**
   * Ssenari əmsalları məhsuldarlığa VƏ qiymətə birlikdə tətbiq olunur:
   * pis il həm az məhsul, həm də çox vaxt aşağı keyfiyyət (yəni aşağı
   * qiymət) deməkdir. İkisini müstəqil saymaq riski azaldıb göstərərdi.
   */
  ssenari: {
    pessimist: { mehsul: 0.7, qiymet: 0.85 },
    baza: { mehsul: 1, qiymet: 1 },
    optimist: { mehsul: 1.15, qiymet: 1.1 },
  },

  /** Cari mövsümdə risk bayrağı qalxıbsa pessimist ssenariyə əlavə endirim */
  cariRiskEmsali: 0.85,
};

/** Modelin tanıdığı ssenarilər — sıra göstərilmə sırasıdır */
export const SSENARILER = ["pessimist", "baza", "optimist"];

const yuvarla = (deyer) => Math.round(deyer);

/**
 * Bir ssenari üçün hesablama. Hər addım `ferziyyeler` siyahısına yazılır
 * ki, nəticə "qara qutu" olmasın.
 */
function ssenariHesabla({ bitki, hektar, zona, bant, cariRisk, ad }) {
  const { mehsuldarliq, qiymet, xerc, ssenari, indeksTesiri } = GELIR_CONFIG;
  const emsal = ssenari[ad];

  const bazaMehsul = mehsuldarliq[bitki];
  const zonaEmsali = GELIR_CONFIG.zona[zona] ?? 1;
  const indeksEmsali = indeksTesiri[bant ?? "yoxdur"] ?? 1;

  // Cari mövsüm riski YALNIZ pessimist ssenarini daha da aşağı salır:
  // bayraq bu mövsümün pis getdiyini deyir, gələcək mövsümləri yox
  const riskEmsali = ad === "pessimist" && cariRisk ? GELIR_CONFIG.cariRiskEmsali : 1;

  const tHa = bazaMehsul * zonaEmsali * indeksEmsali * emsal.mehsul * riskEmsali;
  const tonQiymeti = qiymet[bitki] * emsal.qiymet;

  // Subsidiya məhsuldan ASILI DEYİL: pis ildə də hektara görə ödənilir və
  // məhz ona görə pis ili yumşaldır
  const subsidiyaCemi = (GELIR_CONFIG.subsidiya[bitki] ?? 0) * hektar;
  const ummumi = tHa * hektar * tonQiymeti + subsidiyaCemi;
  const xercCemi = xerc[bitki] * hektar;

  return {
    ad,
    mehsuldarliq: Math.round(tHa * 100) / 100,
    hasil: Math.round(tHa * hektar * 100) / 100,
    tonQiymeti: yuvarla(tonQiymeti),
    subsidiya: yuvarla(subsidiyaCemi),
    ummumiGelir: yuvarla(ummumi),
    xerc: yuvarla(xercCemi),
    // Xalis gəlir mənfi ola bilər — gizlətmirik: bəzi bitki-sahə
    // birləşməsində mövsüm həqiqətən zərərlə bağlanır və kredit qərarı
    // məhz bunu görməlidir
    xalisGelir: yuvarla(ummumi - xercCemi),
  };
}

/**
 * Mövsümlük gəlir modeli.
 *
 * @param {object} p
 * @param {string} p.bitki    Bitki açarı (bax: services/crops.js, CROP_KEYS)
 * @param {number} p.hektar   Sahə — GEODEZİK ölçmədən, fermerin sözündən yox
 * @param {string} [p.zona]   aran | lenkeran | daglik
 * @param {string} [p.bant]   Aqro indeks bandı: yuksek | yaxsi | orta | zeif
 * @param {boolean} [p.cariRisk] Cari mövsüm risk bayrağı (bax: cariVeziyyetHali)
 *
 * @returns {null | object}
 *   null → bitki və ya sahə bilinmir: TƏXMİN UYDURULMUR
 *   {hal:"hazir", ssenariler, baza, pessimist, optimist, ferziyyeler, yoxlanilib}
 */
export function gelirModeli({ bitki, hektar, zona = "aran", bant = null, cariRisk = false } = {}) {
  const taninir = Boolean(GELIR_CONFIG.mehsuldarliq[bitki]);
  const sahaVar = Number.isFinite(hektar) && hektar > 0;

  // Bitki seçilməyibsə və ya sahə çəkilməyibsə model işləmir. Orta bitki
  // uydurmaq kredit qərarını uydurma üzərinə qurmaq olardı.
  if (!taninir || !sahaVar) {
    return {
      hal: "olculmur",
      sebeb: !taninir ? "bitkiSecilmeyib" : "saheYoxdur",
      ssenariler: null,
      yoxlanilib: false,
    };
  }

  const ssenariler = SSENARILER.map((ad) =>
    ssenariHesabla({ bitki, hektar, zona, bant, cariRisk, ad }),
  );

  const tap = (ad) => ssenariler.find((s) => s.ad === ad);

  return {
    hal: "hazir",
    ssenariler,
    pessimist: tap("pessimist"),
    baza: tap("baza"),
    optimist: tap("optimist"),

    // Hər fərziyyə ayrıca göstərilir: kredit mütəxəssisi hansı sətirlə
    // razılaşmadığını dəqiq deyə bilməlidir
    ferziyyeler: [
      { acar: "mehsuldarliq", deyer: GELIR_CONFIG.mehsuldarliq[bitki], vahid: "t/ha", menbe: "ekspert" },
      { acar: "qiymet", deyer: GELIR_CONFIG.qiymet[bitki], vahid: "₼/t", menbe: "ekspert" },
      { acar: "xerc", deyer: GELIR_CONFIG.xerc[bitki], vahid: "₼/ha", menbe: "ekspert" },
      { acar: "zona", deyer: GELIR_CONFIG.zona[zona] ?? 1, vahid: "×", menbe: "ekspert" },
      { acar: "indeks", deyer: GELIR_CONFIG.indeksTesiri[bant ?? "yoxdur"] ?? 1, vahid: "×", menbe: bant ? "aqroIndeks" : "yoxdur" },
      ...(cariRisk ? [{ acar: "cariRisk", deyer: GELIR_CONFIG.cariRiskEmsali, vahid: "×", menbe: "peyk" }] : []),
    ],

    // Model kalibrlənməyib — interfeys bunu GİZLƏTMƏMƏLİDİR
    yoxlanilib: false,
    tesdiq: GELIR_TESDIQ,
  };
}
