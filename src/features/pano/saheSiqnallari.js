/**
 * SAHƏ EKRANINDA GÖRÜNƏN siqnal növləri.
 *
 * Bu siyahı Sahələr ekranı ilə "Bu gün nə etməli?" kartı arasında ORTAQ
 * həqiqətdir: kart yalnız burada olan siqnal üçün "Sahəyə bax" deyə bilər.
 * Əks halda fermer şaxta xəbərdarlığına toxunub Sahələr ekranına düşür və
 * orada "Sahə yaxşı vəziyyətdədir" oxuyur — bir-birini təkzib edən iki mesaj.
 *
 * Hava siqnalları (şaxta, isti, yağış) sahəyə xas deyil — onlar hava zolağında
 * və Kömək ekranındakı tam siyahıdadır.
 */
export const SAHE_SIQNALLARI = new Set([
  "bitkiZeifleyir",
  "qonsu",
  "suGolu",
  "xesteliyRiski",
  "suvar",
  "suvarmaDayan",
]);

/** Siqnal Sahələr ekranında görünürmü? */
export function saheSiqnalidir(siqnal) {
  return Boolean(siqnal && SAHE_SIQNALLARI.has(siqnal.nov));
}
