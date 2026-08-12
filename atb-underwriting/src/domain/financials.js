// Maliyyə hesabatlarının açılışı (spreading).
//
// Müştəri hesabatı necə verirsə, elə saxlanılır — `raw`. Bankın istifadə etdiyi
// rəqəmlər isə həmişə buradan hesablanır. Səbəb sadədir: təhlil zamanı kimsə
// "EBITDA-nı haradan aldın?" soruşanda cavab bir funksiyada olmalıdır.
//
// SME seqmentində rəsmi hesabat çox vaxt tam mənzərəni göstərmir. Ona görə
// düzəlişlər (`adjustments`) ayrıca sahədir və hesablamada görünür — gizli
// deyil. Kredit komitəsi düzəlişin özünü də mübahisə edə bilməlidir.

/** Boş dövr — yeni müraciətdə forma bununla doldurulur. */
export function emptyPeriod(label = "", months = 12) {
  return {
    label,
    months,
    audited: false,
    balance: {
      cash: 0,
      receivables: 0,
      inventory: 0,
      otherCurrentAssets: 0,
      fixedAssets: 0,
      otherLongTermAssets: 0,
      payables: 0,
      shortTermDebt: 0,
      otherCurrentLiabilities: 0,
      longTermDebt: 0,
      equity: 0,
    },
    income: {
      revenue: 0,
      cogs: 0,
      opex: 0,
      depreciation: 0,
      otherIncome: 0,
      interestExpense: 0,
      tax: 0,
    },
    adjustments: {
      // Uçota düşməyən dövriyyə — rəsmi satışa əlavə olunur, eyni marja ilə.
      unrecordedRevenue: 0,
      // Sahibkarın şəxsi xərcləri xərc kimi yazılıbsa, geri qaytarılır.
      ownerAddBacks: 0,
      // Təkrarlanmayan gəlir/xərc — mənfi rəqəm gəliri azaldır.
      nonRecurring: 0,
      note: "",
    },
  };
}

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Bir dövrü açır: cəmlər, EBITDA, düzəliş edilmiş göstəricilər və balans yoxlanışı.
 * Heç bir dəyər dairəvi deyil — hamısı girişdən çıxır.
 */
export function spreadPeriod(period) {
  const b = period.balance ?? {};
  const p = period.income ?? {};
  const a = period.adjustments ?? {};

  const currentAssets =
    n(b.cash) + n(b.receivables) + n(b.inventory) + n(b.otherCurrentAssets);
  const nonCurrentAssets = n(b.fixedAssets) + n(b.otherLongTermAssets);
  const totalAssets = currentAssets + nonCurrentAssets;

  const currentLiabilities =
    n(b.payables) + n(b.shortTermDebt) + n(b.otherCurrentLiabilities);
  const totalLiabilities = currentLiabilities + n(b.longTermDebt);
  const equity = n(b.equity);

  const totalDebt = n(b.shortTermDebt) + n(b.longTermDebt);
  const netDebt = totalDebt - n(b.cash);
  const workingCapital = currentAssets - currentLiabilities;

  // Balans tutmalıdır. Tutmursa təhlil dayanmır, amma rəqəm görünür.
  const imbalance = totalAssets - (totalLiabilities + equity);
  const imbalancePct = totalAssets > 0 ? imbalance / totalAssets : 0;

  const revenue = n(p.revenue);
  const cogs = n(p.cogs);
  const grossProfit = revenue - cogs;
  const grossMargin = revenue > 0 ? grossProfit / revenue : 0;
  const ebitda = grossProfit - n(p.opex) + n(p.otherIncome);
  const ebit = ebitda - n(p.depreciation);
  const pbt = ebit - n(p.interestExpense);
  const netProfit = pbt - n(p.tax);

  // Düzəlişlər. Uçota düşməyən dövriyyə rəsmi marja ilə mənfəətə çevrilir —
  // bütün satışı mənfəət saymaq SME təhlilində ən çox rast gəlinən səhvdir.
  const unrecorded = Math.max(0, n(a.unrecordedRevenue));
  const unrecordedProfit = unrecorded * grossMargin;
  const adjustedRevenue = revenue + unrecorded;
  const adjustedEbitda =
    ebitda + unrecordedProfit + n(a.ownerAddBacks) + n(a.nonRecurring);
  const adjustedNetProfit =
    netProfit + unrecordedProfit + n(a.ownerAddBacks) + n(a.nonRecurring);

  const months = n(period.months) || 12;
  const annualise = (v) => (months === 12 ? v : (v * 12) / months);

  return {
    label: period.label ?? "",
    months,
    audited: !!period.audited,

    currentAssets,
    nonCurrentAssets,
    totalAssets,
    currentLiabilities,
    totalLiabilities,
    equity,
    totalDebt,
    netDebt,
    workingCapital,
    imbalance,
    imbalancePct,
    balanced: Math.abs(imbalancePct) <= 0.005,

    revenue,
    cogs,
    grossProfit,
    grossMargin,
    opex: n(p.opex),
    depreciation: n(p.depreciation),
    interestExpense: n(p.interestExpense),
    tax: n(p.tax),
    ebitda,
    ebit,
    pbt,
    netProfit,

    unrecordedRevenue: unrecorded,
    unrecordedProfit,
    ownerAddBacks: n(a.ownerAddBacks),
    nonRecurring: n(a.nonRecurring),
    adjustedRevenue,
    adjustedEbitda,
    adjustedNetProfit,

    // 12 aya çevrilmiş — natamam dövrü tam ilə müqayisə etmək üçün.
    annualRevenue: annualise(adjustedRevenue),
    annualEbitda: annualise(adjustedEbitda),
  };
}

/** Bütün dövrlər, köhnədən yeniyə. Sıra hesabatın oxunuşunu müəyyən edir. */
export function spreadAll(periods = []) {
  return periods.map(spreadPeriod);
}

/** Ən son dövr — göstəricilərin çoxu buna baxır. */
export function latest(spreads = []) {
  return spreads.length ? spreads[spreads.length - 1] : null;
}

/** Ondan əvvəlki — artım hesablamaq üçün. */
export function previous(spreads = []) {
  return spreads.length > 1 ? spreads[spreads.length - 2] : null;
}
