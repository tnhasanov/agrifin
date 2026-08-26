/**
 * KREDİTİN FAKTİKİ ÖDƏNİŞ MƏNTİQİ — verilmiş kreditin faiz/əsas borc hesabı.
 *
 * ═══ UNDERWRİTİNQDƏN AYRIDIR ══════════════════════════════════════════
 * Limitin hesablanması (lib/odenis.js + useKredit.js) konservativdir və
 * dəyişmir. Bu modul isə kredit VERİLƏNDƏN SONRAKI qaydanı daşıyır:
 *
 *   - faiz aylıq ödənilir;
 *   - faiz yalnız QALAN əsas borca hesablanır:
 *       faiz = qalıqƏsas × (illikFaiz/100) × (1/12)
 *   - əsas borc mövsüm ərzində istənilən vaxt, istənilən addımla azaldıla
 *     bilər — azaldıqca sonrakı faizin bazası da azalır;
 *   - əsas borc sıfırdırsa sonrakı faiz yoxdur;
 *   - əsas borcun tam bağlanması üçün son tarix biçin ayıdır
 *     (bax: services/movsum.js → bicinTarixi).
 *
 * "Sonda birdəfəlik məbləğ" YOXDUR: faktiki faiz yükü fermerin əsas borcu
 * nə vaxt və nə qədər azaltdığından asılıdır, öncədən bir rəqəmlə deyilə
 * bilməz. Ona görə UI heç yerdə maturity-də yekun ödəniş göstərmir.
 *
 * Faiz konvensiyası layihədə olduğu kimidir: illik faiz FAİZLƏ saxlanılır
 * (LOAN_TERMS.annualRate = 11.5 → 11.5%).
 */

/**
 * Bir aylıq faiz — qalan əsas borca görə.
 *
 * @param {number} qaliqEsas  qalan əsas borc (₼)
 * @param {number} illikFaiz  illik faiz dərəcəsi, faizlə (məs. 11.5)
 * @returns {number} aylıq faiz (₼, tam ədədə yuvarlaq)
 */
export function ayliqFaiz(qaliqEsas, illikFaiz) {
  if (!Number.isFinite(qaliqEsas) || qaliqEsas <= 0) return 0;
  return Math.round(qaliqEsas * (illikFaiz / 100) / 12);
}

/**
 * Əsas borcdan ödəniş: qalıq azalır, mənfiyə düşmür.
 *
 * @param {number} qaliqEsas  cari qalıq (₼)
 * @param {number} mebleg     ödənilən əsas borc (₼)
 * @returns {number} yeni qalıq (₼)
 */
export function esasOde(qaliqEsas, mebleg) {
  if (!Number.isFinite(mebleg) || mebleg <= 0) return qaliqEsas;
  return Math.max(0, qaliqEsas - mebleg);
}
