// Valyuta çevrilməsi.
//
// Təhlil bir valyutada aparılır — AZN-də. Səbəb: pul axını manatla gəlir,
// borc xidməti isə kreditin valyutasındadır. İkisini qarışdırmaq DSCR-i
// mənasız edir, ona görə kredit məbləği əvvəlcə manata çevrilir.
//
// Məzənnə burada sabitdir və konfiqurasiya dəyəridir, canlı kurs deyil.
// Real qurulumda Mərkəzi Bankın günlük məzənnəsindən oxunmalıdır; sənəddə
// hansı məzənnənin işlədildiyi görünməlidir, çünki qərar ona bağlıdır.

export const FX_RATES = {
  AZN: 1,
  USD: 1.7,
  EUR: 1.85,
};

export function rateFor(currency, rates = FX_RATES) {
  return rates[currency] ?? 1;
}

/** Məbləği manata çevirir. Tanınmayan valyuta 1-ə bərabər sayılır. */
export function toAzn(amount, currency, rates = FX_RATES) {
  return (Number(amount) || 0) * rateFor(currency, rates);
}

/** Valyuta uyğunsuzluğu: gəlir bir valyutada, kredit başqasında. */
export function isMismatch(loanCurrency, revenueCurrency) {
  return !!loanCurrency && !!revenueCurrency && loanCurrency !== revenueCurrency;
}
