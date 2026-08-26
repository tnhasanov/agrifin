/**
 * KREDİT ŞƏRTLƏRİ VƏ LİMİT DÜSTURU — server və klient üçün TƏK MƏNBƏ.
 *
 * Əvvəl bunlar iki yerə səpələnmişdi: faiz dərəcəsi `src/services/farm.js`-də,
 * limit düsturu isə `src/features/loan/useKredit.js`-in içində — yəni server
 * eyni rəqəmi hesablaya bilmirdi. Kredit qərarı serverdə verildiyinə görə
 * düstur da paylaşılan, saf və test edilə bilən olmalıdır.
 *
 * ⚠ Dərəcə və hədlər ekspert təklifidir, kalibrlənməyib (bax: lib/odenis.js).
 */

export const KREDIT_SERTLERI = {
  /** İllik faiz dərəcəsi, FAİZLƏ (11.5 = 11.5%) — layihədəki konvensiya */
  illikFaiz: 11.5,
  /** Bundan aşağı tavan "imkan var" sayılmır */
  minKredit: 500,
  /** Slayder addımı — 100 ₼-dən xırda məbləğ kredit söhbətində səs-küydür */
  addim: 100,
  /** Müddət sərhədləri (baza CHECK-i ilə eyni) */
  minMuddetAy: 1,
  maxMuddetAy: 24,
  /** Ağlabatan yuxarı hədd — zibil giriş bazaya düşməsin */
  mumkunMaxMebleg: 1_000_000,
  /**
   * Ödəniş quruluşu: faiz dövri olaraq QALAN əsas borca hesablanır, əsas borc
   * mövsüm ərzində istənilən vaxt azaldıla bilər (bax: lib/kreditOdenis.js).
   * Sonda birdəfəlik "yekun məbləğ" YOXDUR.
   */
  odenisQurulusu: "aylik_faiz_cevik_esas",
};

/**
 * Ödəniş qabiliyyətindən kredit tavanı.
 *
 * KONSERVATİVDİR: kredit tam müddət boyu heç azaldılmasa belə əsas + faiz
 * qabiliyyətə sığmalıdır. Faktiki ödənişdə fermer əsas borcu erkən azaldıb
 * daha az faiz verə bilər — bu, limitin ölçüsünü genişləndirmir.
 *
 *   maxKredit = qabiliyyət / (1 + illikFaiz/100 × müddət/12), addıma yuvarlaq
 *
 * @param {number} qabiliyyet  mövsümlük borc xidməti qabiliyyəti (₼)
 * @param {number} muddetAy    biçinə qalan ay
 * @returns {number} tavan (₼) — 0-dan kiçik olmur
 */
export function kreditTavani(qabiliyyet, muddetAy) {
  if (!Number.isFinite(qabiliyyet) || qabiliyyet <= 0) return 0;
  if (!Number.isFinite(muddetAy) || muddetAy <= 0) return 0;
  const { illikFaiz, addim } = KREDIT_SERTLERI;
  const faizEmsali = 1 + (illikFaiz / 100) * (muddetAy / 12);
  return Math.max(0, Math.floor(qabiliyyet / faizEmsali / addim) * addim);
}
