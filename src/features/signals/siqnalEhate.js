/**
 * SİQNAL ƏHATƏSİ — mətn nə qədər iddia edə bilər?
 *
 * Sahə çəkilməyibsə proqnoz RAYON MƏRKƏZİNİN koordinatındandır (bax:
 * services/saheYeri.js — havaNoqtesi). O halda "Sahənizdən siqnallar" və
 * "sahənin koordinatı" cümlələri YALANDIR: fermerin sahəsi barədə heç nə
 * bilmirik, hətta harada olduğunu da. Rayon xəbərdarlığını sahə dəlili kimi
 * göstərmək etibarı bir dəfəyə itirir.
 *
 * Siqnalın ÖZÜ (ciddilik, hədlər, mətn) dəyişmir — bunlar services/siqnal.js
 * mühərrikindədir. Burada yalnız MƏNBƏ SƏTRİ rayon dilinə çevrilir.
 */

/** Sahəsiz halda hava mənbəyi rayon adı ilə danışır */
const RAYON_MENBESI = {
  "siqnal.menbe.hava": "siqnal.menbe.havaRayon",
  "siqnal.menbe.rutubet": "siqnal.menbe.rutubetRayon",
};

/**
 * Sahə yoxdursa peykə/sahəyə istinad edən siqnal ola bilməz: peyk sorğusu
 * onsuz da göndərilmir (useNdvi(null)), amma bu süzgəc niyyəti kodda saxlayır
 * — gələcəkdə kimsə sahəsiz peyk mənbəyi əlavə etsə, mətn yalan olmayacaq.
 */
const SAHE_MENBELERI = new Set([
  "siqnal.menbe.peyk",
  "siqnal.menbe.radar",
  "siqnal.menbe.hamisi",
]);

/** Sahəsiz fermerə göstərilə bilən siqnallar — yalnız hava mənbəli olanlar */
export function ehateliSiqnallar(siqnallar = [], saheVar) {
  if (saheVar) return siqnallar;
  return siqnallar.filter((siqnal) => !SAHE_MENBELERI.has(siqnal.menbeKey));
}

/**
 * Mənbə sətrinin açarı və dəyişənləri.
 * @returns {{key: string, vars: object|null}}
 */
export function menbeSetri(siqnal, { saheVar, rayon } = {}) {
  const acar = siqnal?.menbeKey;
  if (saheVar || !acar) return { key: acar, vars: null };
  const rayonAcari = RAYON_MENBESI[acar];
  if (!rayonAcari) return { key: acar, vars: null };
  return { key: rayonAcari, vars: { rayon } };
}
