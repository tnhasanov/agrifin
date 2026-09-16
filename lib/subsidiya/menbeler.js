/**
 * RƏSMİ MƏNBƏLƏR — subsidiya modelinin hər rəqəmi bunlardan birinə istinad edir.
 *
 * ═══ TƏSDİQ VƏZİYYƏTİ ═══════════════════════════════════════════════════
 * `verifiedAt` və `decisionDate` HƏLƏ BOŞDUR. Model qurulan mühitdən bu
 * səhifələr açıla bilməyib (şəbəkə siyasəti), ona görə rəqəmlər səhifədən
 * TƏKRAR YOXLANMAYIB. Bu boşluq uydurma tarixlə doldurulmur:
 *   • sourceVerified yalnız url + decisionDate + verifiedAt üçü də dolu
 *     olanda `true` olur (bax: qaydalar2026.js → tarifYoxlanib);
 *   • hər tarifin `verifiedFields` siyahısı hansı sahələrin səhifədən
 *     tutuşdurulduğunu deyir — hazırda boşdur.
 * Səhifələr açılıb tutuşdurulanda YALNIZ bu fayl doldurulur; mühərrik
 * dəyişmir.
 */

export const MENBELER = {
  /** 2026-cı il əkin subsidiyası cədvəli (bitki × suvarma) */
  agro2026Cedvel: {
    id: "agro2026Cedvel",
    url: "https://agro.gov.az/az/news/010920254",
    title: "Kənd Təsərrüfatı Nazirliyi — 2026-cı il üçün əkin subsidiyası tarifləri",
    nasir: "agro.gov.az",
    decisionDate: null, // qərarın tarixi — səhifədən tutuşdurulmalıdır
    effectiveFrom: null,
    effectiveTo: null,
    verifiedAt: null,
  },
  /** Hesablama qaydası və EKTİS-də müraciət */
  akiaHesablama: {
    id: "akiaHesablama",
    url: "https://www.akia.gov.az/az/content/20-83.html",
    title: "AKİA — Əkin subsidiyasının hesablanması (EKTİS)",
    nasir: "akia.gov.az",
    decisionDate: null,
    effectiveFrom: null,
    effectiveTo: null,
    verifiedAt: null,
  },
  /** Müraciət dövrləri */
  akiaMuraciet: {
    id: "akiaMuraciet",
    url: "https://www.akia.gov.az/az/content/24.html",
    title: "AKİA — Subsidiya müraciətlərinin qəbul dövrləri",
    nasir: "akia.gov.az",
    decisionDate: null,
    effectiveFrom: null,
    effectiveTo: null,
    verifiedAt: null,
  },
  /** 2026-cı il istehsalat təqvimi (qeyri-iş günləri, köçürülmüş günlər) */
  sosialTeqvim2026: {
    id: "sosialTeqvim2026",
    url: "https://www.sosial.gov.az/az/media/xeberler/2026-ci-il-ucun-is-vaxti-normasi-ve-istehsalat-teqvimi-tesdiq-edilib-8777",
    title: "Əmək və Əhalinin Sosial Müdafiəsi Nazirliyi — 2026-cı il üçün iş vaxtı norması və istehsalat təqvimi",
    nasir: "sosial.gov.az",
    decisionDate: null,
    effectiveFrom: null,
    effectiveTo: null,
    verifiedAt: null,
  },
  /** 2026–27 / 2027 kampaniyası üçün yeni mexanizm */
  agro2027Mexanizm: {
    id: "agro2027Mexanizm",
    url: "https://www.agro.gov.az/az/news/070920261",
    title: "Kənd Təsərrüfatı Nazirliyi — 2026–2027-ci illər üçün subsidiya mexanizmində dəyişikliklər",
    nasir: "agro.gov.az",
    decisionDate: null,
    effectiveFrom: null,
    effectiveTo: null,
    verifiedAt: null,
  },
  /** Bayram və qeyri-iş günlərinin sabit siyahısı — qanunla müəyyən olunur */
  emekMecellesi105: {
    id: "emekMecellesi105",
    url: "https://e-qanun.az/framework/46943",
    title: "Azərbaycan Respublikasının Əmək Məcəlləsi, maddə 105 — bayram günləri",
    nasir: "e-qanun.az",
    decisionDate: null,
    effectiveFrom: null,
    effectiveTo: null,
    verifiedAt: null,
  },
};

/** Mənbə metadata-sı tarifə köçürülür ki, nəticə mənbə obyektinə istinad etməsin (surət) */
export function menbeMetadata(menbe, campaignYear) {
  return {
    sourceUrl: menbe.url,
    sourceTitle: menbe.title,
    decisionDate: menbe.decisionDate,
    effectiveFrom: menbe.effectiveFrom,
    effectiveTo: menbe.effectiveTo,
    campaignYear,
    verifiedAt: menbe.verifiedAt,
  };
}

/**
 * Mənbə ilə tutuşdurulubmu? Üç şərt birlikdə: URL var, qərar tarixi var,
 * yoxlama tarixi var. Biri boşdursa `false` — heç bir istisna yoxdur.
 */
export function menbeYoxlanib(meta) {
  return Boolean(meta?.sourceUrl && meta?.decisionDate && meta?.verifiedAt);
}
