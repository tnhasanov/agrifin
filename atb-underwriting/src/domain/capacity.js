// Ödəmə qabiliyyəti və limit.
//
// Sual həmişə eynidir: bu müştəri ayda nə qədər ödəyə bilər, və bu ödənişə
// hansı məbləğ uyğun gəlir? Cavab üç məhdudiyyətdən ən kiçiyidir — pul axını,
// girov, dövriyyə. Hansının bağlayıcı olduğu ekranda göstərilir, çünki
// müştəriyə "niyə bu qədər?" sualının cavabı elə odur.

/** Aylıq annuitet ödənişi. Faiz sıfırdırsa sadə bölgü. */
export function annuityPayment(principal, annualRatePct, months) {
  if (!(principal > 0) || !(months > 0)) return 0;
  const i = annualRatePct / 100 / 12;
  if (i <= 0) return principal / months;
  const f = Math.pow(1 + i, months);
  return (principal * i * f) / (f - 1);
}

/** Verilmiş ödənişə uyğun gələn maksimum əsas məbləğ — annuitetin tərsi. */
export function maxPrincipal(payment, annualRatePct, months) {
  if (!(payment > 0) || !(months > 0)) return 0;
  const i = annualRatePct / 100 / 12;
  if (i <= 0) return payment * months;
  const f = Math.pow(1 + i, months);
  return (payment * (f - 1)) / (i * f);
}

/**
 * Ödəniş cədvəli. Güzəşt dövründə (grace) yalnız faiz ödənilir — mövsümi
 * biznesdə (əkinçilik, tikinti) bu istisna deyil, normadır.
 */
export function schedule(principal, annualRatePct, months, graceMonths = 0) {
  const rows = [];
  const i = annualRatePct / 100 / 12;
  const amortMonths = Math.max(1, months - graceMonths);
  const pay = annuityPayment(principal, annualRatePct, amortMonths);
  let balance = principal;

  for (let m = 1; m <= months; m += 1) {
    const interest = balance * i;
    const inGrace = m <= graceMonths;
    const total = inGrace ? interest : Math.min(pay, balance + interest);
    const principalPart = total - interest;
    balance = Math.max(0, balance - principalPart);
    rows.push({ month: m, payment: total, interest, principal: principalPart, balance, grace: inGrace });
  }
  return rows;
}

/** Cədvəlin ilk 12 ayının borc xidməti — DSCR illik baxıldığı üçün. */
export function firstYearDebtService(rows) {
  return rows.slice(0, 12).reduce((sum, r) => sum + r.payment, 0);
}

/**
 * Mövcud öhdəliklərin illik borc xidməti. Kredit xətti və overdraft üzrə
 * əsas məbləğ qaytarılmır, yalnız faiz yükü sayılır.
 */
export function existingDebtService(obligations = []) {
  return obligations.reduce((sum, o) => {
    if (o.revolving) return sum + (Number(o.outstanding) || 0) * ((Number(o.rate) || 0) / 100);
    return sum + (Number(o.monthlyPayment) || 0) * 12;
  }, 0);
}

/**
 * Borc xidmətinə yönələ bilən illik pul axını.
 *
 * EBITDA-dan vergi, dəstəkləyici kapital qoyuluşu və sahibkarın ailə xərci
 * çıxılır. Sonuncu SME-də mütləqdir: sahibkar biznesdən yaşayır, o pul
 * banka qalmır.
 */
export function availableCashflow(spread, inputs = {}) {
  if (!spread) return 0;
  const maintenanceCapex = Number(inputs.maintenanceCapex) || 0;
  const ownerDrawings = Number(inputs.ownerDrawings) || 0;
  const workingCapitalNeed = Number(inputs.workingCapitalNeed) || 0;
  const base =
    spread.annualEbitda - (Number(spread.tax) || 0) - maintenanceCapex - ownerDrawings - workingCapitalNeed;
  return Math.max(0, base);
}

export const DEFAULT_POLICY = {
  minDscr: 1.3,
  // Dövriyyə tavanı: illik satışın bu payından çox işlək kapital verilmir.
  turnoverCapWorkingCapital: 0.35,
  turnoverCapInvestment: 0.6,
  // Stress: gəlir bu qədər azalsa da DSCR 1.0-dan aşağı düşməməlidir.
  stressRevenueDrop: 0.2,
};

/**
 * Bütün hesablama bir yerdə. Nəticə komitəyə göstərilən cədvəlin özüdür.
 */
export function assessCapacity({
  spread,
  request,
  obligations = [],
  collateralLendingValue = 0,
  cashflowInputs = {},
  policy = DEFAULT_POLICY,
}) {
  const amount = Number(request?.amount) || 0;
  const rate = Number(request?.rate) || 0;
  const months = Number(request?.months) || 0;
  const grace = Number(request?.graceMonths) || 0;
  const investment = request?.purpose === "investment";

  const cashflow = availableCashflow(spread, cashflowInputs);
  const existing = existingDebtService(obligations);
  const availableForNew = Math.max(0, cashflow - existing);

  const rows = amount > 0 && months > 0 ? schedule(amount, rate, months, grace) : [];
  const newDebtService = rows.length ? firstYearDebtService(rows) : 0;
  const totalDebtService = existing + newDebtService;

  const dscr = totalDebtService > 0 ? cashflow / totalDebtService : null;

  // Stress: satış düşəndə EBITDA marjası saxlanılır, yəni EBITDA da eyni
  // nisbətdə azalır. Kobud, amma müdafiə oluna bilən fərziyyə.
  const stressed = cashflow * (1 - policy.stressRevenueDrop);
  const dscrStressed = totalDebtService > 0 ? stressed / totalDebtService : null;

  // Pul axınına görə tavan. DSCR ümumi borc xidmətinə görə ölçülür, ona görə
  // əvvəlcə icazə verilən ümumi xidmət tapılır (pul axını / hədəf DSCR),
  // mövcud öhdəliklər ondan çıxılır — qalan yeni kreditə qalır. Güzəşt dövrü
  // amortizasiya müddətini qısaldır, yəni ödənişi ağırlaşdırır.
  const allowedTotalService = cashflow / policy.minDscr;
  const targetAnnualService = Math.max(0, allowedTotalService - existing);
  const amortMonths = Math.max(1, months - grace);
  const byCashflow = months > 0 ? maxPrincipal(targetAnnualService / 12, rate, amortMonths) : 0;

  const turnoverCap = investment
    ? policy.turnoverCapInvestment
    : policy.turnoverCapWorkingCapital;
  const byTurnover = (spread?.annualRevenue || 0) * turnoverCap;

  const byCollateral = collateralLendingValue;

  const constraints = [
    { key: "cashflow", value: byCashflow },
    { key: "collateral", value: byCollateral },
    { key: "turnover", value: byTurnover },
  ];
  const binding = constraints.reduce((a, b) => (b.value < a.value ? b : a));
  const recommendedLimit = Math.max(0, Math.floor(binding.value / 1000) * 1000);

  return {
    cashflow,
    existingDebtService: existing,
    availableForNew,
    // Hədəf DSCR-də yeni kreditə qalan illik ödəniş imkanı.
    serviceCapacity: targetAnnualService,
    newDebtService,
    totalDebtService,
    monthlyPayment: rows.find((r) => !r.grace)?.payment ?? 0,
    dscr,
    dscrStressed,
    dscrPass: dscr !== null && dscr >= policy.minDscr,
    schedule: rows,
    constraints,
    binding: binding.key,
    recommendedLimit,
    requestedAmount: amount,
    withinRecommended: amount <= recommendedLimit,
  };
}
