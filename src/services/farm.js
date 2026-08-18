// Prototip məlumatları. 3-cü mərhələdə bu modul real API-ni çağıracaq,
// qalan kod isə dəyişməyəcək — ekranlar yalnız bu formaya baxır.
export const FARM = {
  farmerName: "Samir",
  cardHolder: "SAMİR ƏLİYEV",
  farmNameKey: "farm.name",
  hectares: 6.5,
  ndvi: 0.72,
  creditLimit: 12000,
  card: { last4: "4127" },
  // Mərkəzi Aran bölgəsi — hava sorğusu bu koordinatlardan gedir
  location: { lat: 40.3705, lon: 47.1265 },
};


export const LOAN_TERMS = {
  annualRate: 11.5,
  termMonths: 5,
  min: 1000,
  step: 500,
};

/** Bir ödənişli sadə faiz: məbləğ + illik faizin müddətə düşən hissəsi */
export function computeRepayment(amount, terms = LOAN_TERMS) {
  const { annualRate, termMonths } = terms;
  return Math.round(amount * (1 + (annualRate / 100) * (termMonths / 12)));
}
