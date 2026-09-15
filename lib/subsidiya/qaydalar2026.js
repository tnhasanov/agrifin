/**
 * ƏKİN VƏ MƏHSUL SUBSİDİYASI — 2026 KAMPANİYASININ QAYDA MODELİ.
 *
 * ═══ ÜÇ AYRI ANLAYIŞ ══════════════════════════════════════════════════
 * Köhnə `tesdiqli: true/false` bir bayraqla üç fərqli sualı qarışdırırdı:
 *   • sourceVerified   — bu cədvəl rəsmi mənbə ilə tutuşdurulubmu?
 *                        (cədvəlin xüsusiyyəti; aşağıda `menbe` ilə birlikdə)
 *   • eligibilityStatus — BU fermer uyğundurmu? (fermerin xüsusiyyəti;
 *                        HEÇ VAXT avtomatik "tesdiq" olmur — qeydiyyat, sənəd
 *                        və ölçmə yoxlaması bizim əlimizdə deyil)
 *   • estimateStatus   — hesablama nə haldadır? (hesablanıb / aralıq /
 *                        mənbə lazımdır / giriş çatmır)
 * Üçü mühərrikdən ayrı-ayrı qayıdır (bax: ./index.js).
 *
 * ═══ MƏNBƏ VƏ TƏSDİQ VƏZİYYƏTİ ═════════════════════════════════════════
 * `yoxlanmis` siyahısı hansı rəqəmlərin rəsmi qayda ilə tutuşdurulduğunu
 * deyir; siyahıda OLMAYAN hər rəqəm hələ təsdiqsizdir. `sourceVerified`
 * yalnız bütün istifadə olunan rəqəmlər siyahıda olanda `true` olur.
 * Dəyəri `null` olan sahə "mənbə lazımdır" deməkdir — mühərrik onun
 * üçün rəqəm uydurmur, `estimateStatus: "menbeLazim"` qaytarır.
 *
 * Təsdiqsiz məbləğ GƏLİRƏ VƏ KREDİT TAVANINA DAXİL OLMUR (bax: index.js →
 * kreditUcunHektarDereceleri). Ekranda isə "Təxmini" ilə göstərilir.
 *
 * ═══ MODEL ═════════════════════════════════════════════════════════════
 *   əkin subsidiyası (₼/ha) = baza × bitki əmsalı × suvarma əmsalı
 *                             × (təkrar əkin ? təkrar əmsalı : 1)
 *   məhsul subsidiyası (₼/t) = yalnız məhsul üzrə ödənən bitkilərdə (pambıq)
 *   bağlar (çoxillik)        = salınma ili, intensivlik, ting sıxlığına görə
 *                              — dərəcələr hələ `null`
 */

export const QAYDALAR_2026 = {
  campaignYear: 2026,
  versiya: "2026-01",

  menbe: {
    ad: "Aqrar sahədə subsidiyaların verilməsi qaydaları — 2026 kampaniyası",
    url: null, // rəsmi mənbə URL-i — DOLDURULMALIDIR
    qerarTarixi: null, // qərarın tarixi (YYYY-MM-DD) — DOLDURULMALIDIR
    quvvedenBaslayir: "2026-01-01",
    quvvedenBitir: "2026-12-31",
  },

  /** Rəsmi qayda ilə tutuşdurulmuş sahələr (açar yolu). Qalanı təsdiqsizdir. */
  yoxlanmis: [
    "ekin.baza",
    "suvarma.demye",
    "suvarma.muasir",
    "bitkiEmsali.bugda",
    "bitkiEmsali.arpa",
    "dovr.payizliq",
    "dovr.yazliq",
    "dovr.tekrar",
  ],

  ekin: {
    /** Hektar başına baza məbləği (₼/ha) */
    baza: 200,
    /** Bitki əmsalı; null = mənbə lazımdır */
    bitkiEmsali: {
      bugda: 1.0,
      arpa: 1.0,
      qargidali: 1.0,
      pambiq: 1.0,
      kartof: 1.0,
      pomidor: 1.0,
      sogan: 1.0,
      // Bağlar əkin subsidiyası ilə deyil, bağ modeli ilə hesablanır
      uzum: null,
      alma: null,
      findiq: null,
    },
    /** Suvarma üsulu əmsalı — sahə üçün fermerdən soruşulur */
    suvarma: {
      demye: 1.0,
      enenevi: 1.2, // TƏSDİQSİZ — rəsmi qayda ilə tutuşdurulmalıdır
      muasir: 1.45,
    },
    /** Təkrar əkin əmsalı (eyni ildə ikinci məhsul); null = mənbə lazımdır */
    tekrarEkinEmsali: null,
    /** Sertifikatlı toxum tələbi olan bitkilər — uyğunluq şərti, əmsal deyil */
    sertifikatliToxumTelebi: ["bugda", "arpa", "pambiq"],
    /** Minimum hektar: sənəd üzrə və ölçülmüş (ikisinin kiçiyi götürülür); null = hədd bilinmir */
    minHektar: { sened: null, olculmus: null },
  },

  /** Məhsul subsidiyası — ₼/ton, təhvil verilən məhsula görə; null = yoxdur/bilinmir */
  mehsul: {
    pambiq: 100, // 0,1 ₼/kq — TƏSDİQSİZ
  },

  /**
   * Bağlar (çoxillik): salınma ili, intensivlik və ting sıxlığı ölçüləri
   * modeldə var, dərəcələr isə mənbə gələnə qədər null.
   */
  bag: {
    bitkiler: ["uzum", "alma", "findiq"],
    intensivlik: ["enenevi", "intensiv", "superintensiv"],
    derece: null,
  },

  /** Uyğunluq amilləri — hesablamaya girmir, yalnız yoxlama siyahısında görünür */
  uygunluq: {
    sigorta: { telebdir: false }, // 2026-da sığorta tələbi — TƏSDİQSİZ
    kooperativ: { emsal: null }, // kooperativ üzvlüyü üçün güzəşt — mənbə lazımdır
  },

  /**
   * Müraciət dövrləri. `sonIsGunu: true` — ayın son iş günü (şənbə/bazar
   * atlanır). Tarixlər həmin kampaniya ilinə aiddir.
   */
  dovr: {
    payizliq: { bitkiler: ["bugda", "arpa"], baslangic: "09-01", son: "12-31", sonIsGunu: true },
    yazliq: { bitkiler: ["qargidali", "pambiq", "kartof", "pomidor", "sogan"], baslangic: "02-01", son: "06-01" },
    tekrar: { baslangic: "06-01", son: "08-01" },
  },
};
