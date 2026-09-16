/**
 * ƏKİN VƏ MƏHSUL SUBSİDİYASI — 2026 KAMPANİYASININ RƏSMİ QAYDA MODELİ.
 *
 * ═══ KÖHNƏ MODELDƏN FƏRQ ═══════════════════════════════════════════════
 * Köhnə model universal "200 × bitki əmsalı × suvarma əmsalı" düsturu idi.
 * Rəsmi tariflər isə BİTKİ × SUVARMA MATRİSİDİR: buğda müasir 290,
 * qarğıdalı müasir 160 — bunlar bir bazadan əmsalla çıxmır. Ona görə:
 *   tarif[campaignYear][bitkiQrupu][suvarmaNovu] = { derece, ...metadata }
 *
 * ═══ ÜÇ AYRI ANLAYIŞ (dəyişmir) ═══════════════════════════════════════
 *   sourceVerified    — bu tarif rəsmi səhifə ilə tutuşdurulubmu? Hər
 *                       tarifin öz metadata-sı var; URL + qərar tarixi +
 *                       yoxlama tarixi üçü də doludursa `true`. HAZIRDA
 *                       HAMISI `false` (bax: menbeler.js — səhifələr bu
 *                       mühitdən açılmayıb, rəqəmlər təkrar yoxlanmayıb).
 *   eligibilityStatus — BU fermer uyğundurmu? Heç vaxt avtomatik "tesdiq".
 *   estimateStatus    — hesablama nə haldadır.
 *
 * ═══ MƏLUM OLMAYAN HƏR ŞEY `null`/"unknown"-dur ══════════════════════
 *   • qarğıdalı/kartof/tərəvəz üçün dəmyə tarifi bilinmir → matrisdə YOXDUR
 *     (0 deyil): mühərrik həmin üsul üçün "mənbə lazımdır" qaytarır;
 *   • pambıq: hektar subsidiyası DEYİL, məhsul subsidiyasıdır (₼/ton);
 *     215 və 200 ₼/ton variantlarının şərtləri təsdiqlənməyib → "unknown";
 *   • sertifikatlı toxum: blanket tələb YOX; hektar həddi, kampaniya ili və
 *     keçid qaydası bilinmir → hər bitkidə "unknown";
 *   • sığorta, kooperativ, minimum hektar — bilinmir;
 *   • bağlar — dərəcə yoxdur;
 *   • rayon/məhsul növü/əlavə şərt fərqləri — səhifədən tutuşdurulana
 *     qədər `qeyd: "digər ərazilər"` işarəsi ilə qalır.
 */

import { MENBELER, menbeMetadata, menbeYoxlanib } from "./menbeler.js";
import { TEQVIM_2026 } from "./teqvim.js";

/** Suvarma növləri — açarlar sahə vəziyyətində saxlanılır (store), dəyişmir */
export const SUVARMA_NOVLERI = ["muasir", "enenevi", "demye"];

const tarif = (derece, menbe, campaignYear, qeyd = null) => ({
  derece,
  vahid: "AZN/ha",
  qeyd,
  verifiedFields: [],
  ...menbeMetadata(menbe, campaignYear),
});

/**
 * TARİF MATRİSİ — tarif[campaignYear][qrup][suvarma].
 * "enenevi" = rəsmi mətndəki "qeyri-müasir suvarma".
 * Rəqəmlər istifadəçinin verdiyi 2026 cədvəlindəndir; səhifədən təkrar
 * yoxlanmayıb (verifiedAt: null).
 */
export const TARIFLER = {
  2026: {
    bugda: {
      muasir: tarif(290, MENBELER.agro2026Cedvel, 2026, "digər ərazilər"),
      enenevi: tarif(230, MENBELER.agro2026Cedvel, 2026, "digər ərazilər"),
      demye: tarif(200, MENBELER.agro2026Cedvel, 2026, "digər ərazilər"),
    },
    arpa: {
      muasir: tarif(290, MENBELER.agro2026Cedvel, 2026, "digər ərazilər"),
      enenevi: tarif(230, MENBELER.agro2026Cedvel, 2026, "digər ərazilər"),
      demye: tarif(200, MENBELER.agro2026Cedvel, 2026, "digər ərazilər"),
    },
    qargidali: {
      muasir: tarif(160, MENBELER.agro2026Cedvel, 2026),
      enenevi: tarif(100, MENBELER.agro2026Cedvel, 2026),
      // demye: bilinmir — YOXDUR
    },
    kartof: {
      muasir: tarif(360, MENBELER.agro2026Cedvel, 2026),
      enenevi: tarif(300, MENBELER.agro2026Cedvel, 2026),
    },
    terevez: {
      muasir: tarif(310, MENBELER.agro2026Cedvel, 2026),
      enenevi: tarif(250, MENBELER.agro2026Cedvel, 2026),
    },
  },
};

/** Tətbiqin bitki açarı → tarif qrupu. Siyahıda olmayan bitki = mənbə lazımdır. */
export const BITKI_QRUPU = {
  bugda: "bugda",
  arpa: "arpa",
  qargidali: "qargidali",
  kartof: "kartof",
  pomidor: "terevez",
  sogan: "terevez",
};

/**
 * MƏHSUL SUBSİDİYASI — hektara deyil, təhvil verilən tona görə.
 * Pambıq bura aiddir; hektar matrisində YOXDUR. Variantların hansı şərtlə
 * (məsələn, məhsuldarlıq/keyfiyyət/tədarükçü) tətbiq olunduğu təsdiqlənməyib.
 */
export const MEHSUL_SUBSIDIYASI = {
  2026: {
    pambiq: {
      vahid: "AZN/ton",
      variantlar: [
        { derece: 215, sert: null },
        { derece: 200, sert: null },
      ],
      sertler: "unknown",
      verifiedFields: [],
      ...menbeMetadata(MENBELER.agro2026Cedvel, 2026),
    },
  },
};

/**
 * SERTİFİKATLI TOXUM QAYDASI — kampaniya versiyaları ayrıdır.
 * `qayda: "unknown"` → uyğunluq şərti bilinmir; blanket tələb qoyulmur.
 */
export const SERTIFIKATLI_TOXUM = {
  2026: {
    kampaniya: "2026",
    qayda: "unknown",
    hektarHeddi: null,
    bitkiler: null,
    kecidQaydasi: null,
    ...menbeMetadata(MENBELER.akiaHesablama, 2026),
  },
  "2026-27": {
    kampaniya: "2026-27",
    qayda: "unknown",
    hektarHeddi: null,
    bitkiler: null,
    kecidQaydasi: null,
    ...menbeMetadata(MENBELER.agro2027Mexanizm, 2027),
  },
};

/** Tarif rəsmi mənbə ilə tutuşdurulubmu? (URL + qərar tarixi + yoxlama tarixi) */
export function tarifYoxlanib(t) {
  return menbeYoxlanib(t);
}

export const QAYDALAR_2026 = {
  kampaniya: "2026",
  campaignYear: 2026,
  versiya: "2026-02", // model versiyası: 02 = tarif matrisi (01 = köhnə əmsal modeli)
  status: "aktiv",

  /** Əsas tarif mənbəyi — nəticədəki `menbe` buradan surətlənir */
  menbe: menbeMetadata(MENBELER.agro2026Cedvel, 2026),
  menbeler: MENBELER,

  tarifler: TARIFLER[2026],
  bitkiQrupu: BITKI_QRUPU,
  mehsul: MEHSUL_SUBSIDIYASI[2026],
  sertifikatliToxum: SERTIFIKATLI_TOXUM[2026],

  /** Bağlar (çoxillik): ölçülər modeldə var, dərəcə mənbə gələnə qədər null */
  bag: {
    bitkiler: ["uzum", "alma", "findiq"],
    intensivlik: ["enenevi", "intensiv", "superintensiv"],
    derece: null,
  },

  /** Uyğunluq amilləri — bilinməyən hər şey "unknown"/null */
  uygunluq: {
    sigorta: { telebdir: "unknown" },
    kooperativ: { emsal: null },
    minHektar: { sened: null, olculmus: null },
  },

  /**
   * Müraciət dövrləri (AKİA). `sonIsGunu: true` — ayın son iş günü,
   * istehsalat təqvimi ilə (bax: teqvim.js).
   */
  dovr: {
    ...menbeMetadata(MENBELER.akiaMuraciet, 2026),
    payizliq: { bitkiler: ["bugda", "arpa"], baslangic: "09-01", son: "12-31", sonIsGunu: true },
    yazliq: { bitkiler: ["qargidali", "pambiq", "kartof", "pomidor", "sogan"], baslangic: "02-01", son: "06-01" },
    tekrar: { baslangic: "06-01", son: "08-01" },
  },

  teqvim: TEQVIM_2026,
};

/**
 * 2026–27 / 2027 KAMPANİYASI — yeni mexanizm elan edilib, məzmunu bu
 * modeldə hələ yoxdur. Mühərrik bu versiya ilə çağırılanda hər bitki üçün
 * "mənbə lazımdır" qaytarır; 2026 hesablamaları buna görə DƏYİŞMİR.
 */
export const QAYDALAR_2026_27 = {
  kampaniya: "2026-27",
  campaignYear: 2027,
  versiya: "2026-27-00",
  status: "unknown",
  menbe: menbeMetadata(MENBELER.agro2027Mexanizm, 2027),
  menbeler: MENBELER,
  tarifler: null,
  bitkiQrupu: BITKI_QRUPU,
  mehsul: null,
  sertifikatliToxum: SERTIFIKATLI_TOXUM["2026-27"],
  bag: { bitkiler: ["uzum", "alma", "findiq"], intensivlik: ["enenevi", "intensiv", "superintensiv"], derece: null },
  uygunluq: { sigorta: { telebdir: "unknown" }, kooperativ: { emsal: null }, minHektar: { sened: null, olculmus: null } },
  dovr: null,
  teqvim: null,
};

export const KAMPANIYALAR = {
  2026: QAYDALAR_2026,
  "2026-27": QAYDALAR_2026_27,
};
