// Maliyyə əmsalları.
//
// Hər əmsal üç şey qaytarır: dəyər, necə oxunmalı olduğu (`band`) və hansı
// düsturla çıxdığı (`formula`). Sonuncu təsadüfi deyil — kredit işçisi ekranda
// gördüyü rəqəmi komitə qarşısında izah edə bilməlidir.
//
// Məxrəc sıfır olanda dəyər `null`-dur, 0 deyil. "Borcu yoxdur" ilə
// "əmsal sıfırdır" fərqli hallardır və ekranda da fərqli görünməlidir.

const div = (a, b) => (b > 0 ? a / b : null);
const days = (stock, flow, months = 12) =>
  flow > 0 ? (stock / flow) * (months * 30.4) : null;

/** Dəyəri bantlara görə qiymətləndirir: good | fair | weak. */
function band(value, { good, fair, higherIsBetter = true }) {
  if (value === null || !Number.isFinite(value)) return "na";
  if (higherIsBetter) {
    if (value >= good) return "good";
    if (value >= fair) return "fair";
    return "weak";
  }
  if (value <= good) return "good";
  if (value <= fair) return "fair";
  return "weak";
}

/**
 * Bir dövrün əmsalları. `prev` verilirsə artım göstəriciləri də hesablanır.
 * Bütün mənfəət göstəriciləri düzəliş edilmiş rəqəmlərdən çıxır — bank
 * ödənişi rəsmi mənfəətdən yox, real pul axınından alır.
 */
export function computeRatios(s, prev = null) {
  if (!s) return {};

  const r = {};
  const add = (key, value, opts, formula) => {
    r[key] = { key, value, band: band(value, opts), formula };
  };

  // Likvidlik
  add(
    "currentRatio",
    div(s.currentAssets, s.currentLiabilities),
    { good: 1.5, fair: 1.1 },
    "cari aktivlər / cari öhdəliklər",
  );
  add(
    "quickRatio",
    div(s.currentAssets - (s.inventoryValue ?? 0), s.currentLiabilities),
    { good: 1.0, fair: 0.7 },
    "(cari aktivlər − ehtiyat) / cari öhdəliklər",
  );

  // Kapital və borc yükü
  add(
    "equityRatio",
    div(s.equity, s.totalAssets),
    { good: 0.35, fair: 0.2 },
    "kapital / aktivlər",
  );
  add(
    "debtToEquity",
    s.equity > 0 ? s.totalLiabilities / s.equity : null,
    { good: 1.5, fair: 3, higherIsBetter: false },
    "öhdəliklər / kapital",
  );
  add(
    "netDebtToEbitda",
    s.adjustedEbitda > 0 ? s.netDebt / s.adjustedEbitda : null,
    { good: 2.5, fair: 4, higherIsBetter: false },
    "xalis borc / düzəliş edilmiş EBITDA",
  );
  add(
    "interestCover",
    div(s.adjustedEbitda, s.interestExpense),
    { good: 3, fair: 1.5 },
    "düzəliş edilmiş EBITDA / faiz xərci",
  );

  // Rentabellik
  add(
    "grossMargin",
    div(s.grossProfit, s.revenue),
    { good: 0.25, fair: 0.12 },
    "ümumi mənfəət / satış",
  );
  add(
    "ebitdaMargin",
    div(s.adjustedEbitda, s.adjustedRevenue),
    { good: 0.15, fair: 0.07 },
    "düzəliş edilmiş EBITDA / düzəliş edilmiş satış",
  );
  add(
    "netMargin",
    div(s.adjustedNetProfit, s.adjustedRevenue),
    { good: 0.08, fair: 0.03 },
    "düzəliş edilmiş xalis mənfəət / satış",
  );
  add(
    "roe",
    div(s.adjustedNetProfit, s.equity),
    { good: 0.18, fair: 0.08 },
    "düzəliş edilmiş xalis mənfəət / kapital",
  );
  add(
    "roa",
    div(s.adjustedNetProfit, s.totalAssets),
    { good: 0.1, fair: 0.04 },
    "düzəliş edilmiş xalis mənfəət / aktivlər",
  );

  // Dövriyyə — pul dövranı
  const dso = days(s.receivablesValue ?? 0, s.revenue, s.months);
  const dio = days(s.inventoryValue ?? 0, s.cogs, s.months);
  const dpo = days(s.payablesValue ?? 0, s.cogs, s.months);
  r.dso = { key: "dso", value: dso, band: band(dso, { good: 30, fair: 60, higherIsBetter: false }), formula: "debitor borc / satış × gün" };
  r.dio = { key: "dio", value: dio, band: band(dio, { good: 45, fair: 90, higherIsBetter: false }), formula: "ehtiyat / maya dəyəri × gün" };
  r.dpo = { key: "dpo", value: dpo, band: band(dpo, { good: 45, fair: 20 }), formula: "kreditor borc / maya dəyəri × gün" };
  const ccc = dso !== null && dio !== null && dpo !== null ? dso + dio - dpo : null;
  r.ccc = { key: "ccc", value: ccc, band: band(ccc, { good: 45, fair: 90, higherIsBetter: false }), formula: "DSO + DIO − DPO" };

  // Artım — yalnız əvvəlki dövr varsa
  if (prev) {
    const growth = (now, before) => (before > 0 ? now / before - 1 : null);
    add(
      "revenueGrowth",
      growth(s.annualRevenue, prev.annualRevenue),
      { good: 0.1, fair: 0 },
      "satışın illik dəyişməsi",
    );
    add(
      "ebitdaGrowth",
      growth(s.annualEbitda, prev.annualEbitda),
      { good: 0.1, fair: -0.05 },
      "EBITDA-nın illik dəyişməsi",
    );
  }

  return r;
}

/**
 * `spreadPeriod` cəmləri qaytarır, amma dövriyyə əmsalları üçün ayrı-ayrı
 * maddələr lazımdır. Bu köməkçi onları dövrdən götürüb açılışa qoşur ki,
 * `computeRatios` yalnız bir obyektlə işləsin.
 */
export function withLineItems(spread, period) {
  const b = period?.balance ?? {};
  return {
    ...spread,
    receivablesValue: Number(b.receivables) || 0,
    inventoryValue: Number(b.inventory) || 0,
    payablesValue: Number(b.payables) || 0,
  };
}

/** Əmsalları ekranda qruplamaq üçün sıra. */
export const RATIO_GROUPS = [
  { key: "liquidity", ratios: ["currentRatio", "quickRatio", "ccc"] },
  { key: "leverage", ratios: ["equityRatio", "debtToEquity", "netDebtToEbitda", "interestCover"] },
  { key: "profitability", ratios: ["grossMargin", "ebitdaMargin", "netMargin", "roe", "roa"] },
  { key: "activity", ratios: ["dso", "dio", "dpo", "revenueGrowth", "ebitdaGrowth"] },
];

/** Faiz kimi göstərilən əmsallar — formatlama üçün. */
export const PERCENT_RATIOS = new Set([
  "equityRatio",
  "grossMargin",
  "ebitdaMargin",
  "netMargin",
  "roe",
  "roa",
  "revenueGrowth",
  "ebitdaGrowth",
]);

/** Gün kimi göstərilənlər. */
export const DAY_RATIOS = new Set(["dso", "dio", "dpo", "ccc"]);
