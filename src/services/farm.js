import { KREDIT_SERTLERI } from "../../lib/kreditSertler.js";

// Prototip məlumatları. 3-cü mərhələdə bu modul real API-ni çağıracaq,
// qalan kod isə dəyişməyəcək — ekranlar yalnız bu formaya baxır.
export const FARM = {
  farmerName: "Samir",
  cardHolder: "SAMİR ƏLİYEV",
  hectares: 6.5,
  ndvi: 0.72,
  creditLimit: 12000,
  card: { last4: "4127" },
  // Mərkəzi Aran bölgəsi — hava sorğusu bu koordinatlardan gedir
  location: { lat: 40.3705, lon: 47.1265 },
};


// LEGACY: yalnız köhnə `loan/take` reducer-i və onun testləri üçün qalır —
// heç bir ekran bunu çağırmır. Faiz dərəcəsi PAYLAŞILAN mənbədən gəlir
// (lib/kreditSertler.js): iki yerdə yazılsa sürüşərdi.
export const LOAN_TERMS = {
  annualRate: KREDIT_SERTLERI.illikFaiz,
  termMonths: 5,
  min: 1000,
  step: 500,
};

/**
 * LEGACY bullet ödəniş. Məhsul qaydası ARTIQ BU DEYİL: faiz aylıq ödənilir
 * və qalan əsas borca hesablanır (bax: lib/kreditOdenis.js). Funksiya yalnız
 * köhnə reducer yolunu və onun testlərini yaşatmaq üçün qalıb.
 */
export function computeRepayment(amount, terms = LOAN_TERMS) {
  const { annualRate, termMonths } = terms;
  return Math.round(amount * (1 + (annualRate / 100) * (termMonths / 12)));
}
