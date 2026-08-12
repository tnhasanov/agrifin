// Girov və təminat.
//
// Bazar dəyəri kreditin ölçüsünü müəyyən etmir — likvid dəyər edir. Hər girov
// növünün öz endirimi (haircut) var: depozit demək olar tam sayılır, dövriyyədəki
// mal isə problem anında çox vaxt yarı qiymətə də satılmır.

/**
 * Girov növləri və kredit dəyəri əmsalı (LTV).
 * `support: true` — məbləğ əlavə etmir, yalnız strukturu gücləndirir.
 */
export const COLLATERAL_TYPES = {
  deposit: { ltv: 0.95, liquidity: "high" },
  realEstateCommercial: { ltv: 0.6, liquidity: "medium" },
  realEstateResidential: { ltv: 0.65, liquidity: "medium" },
  agriLand: { ltv: 0.45, liquidity: "low" },
  equipment: { ltv: 0.4, liquidity: "low" },
  vehicle: { ltv: 0.5, liquidity: "medium" },
  inventory: { ltv: 0.3, liquidity: "low" },
  receivables: { ltv: 0.3, liquidity: "low" },
  livestock: { ltv: 0.35, liquidity: "low" },
  corporateGuarantee: { ltv: 0.3, liquidity: "low" },
  personalGuarantee: { ltv: 0, liquidity: "none", support: true },
};

export const COLLATERAL_TYPE_KEYS = Object.keys(COLLATERAL_TYPES);

export function newCollateral(type = "realEstateCommercial") {
  return {
    id: `c${Math.random().toString(36).slice(2, 8)}`,
    type,
    description: "",
    marketValue: 0,
    // Qiymətləndirmə köhnədirsə, təhlil bunu bilməlidir.
    valuationDate: "",
    valuer: "",
    // Boş buraxılsa növün standart əmsalı işləyir.
    ltvOverride: null,
    insured: false,
    firstRank: true,
  };
}

/** Bir girovun kredit dəyəri. */
export function lendingValue(item) {
  const spec = COLLATERAL_TYPES[item.type];
  if (!spec) return 0;
  const ltv = item.ltvOverride === null || item.ltvOverride === undefined
    ? spec.ltv
    : Number(item.ltvOverride);
  const market = Number(item.marketValue) || 0;
  // İkinci növbəli ipoteka birinci kreditordan sonra qalanı deməkdir —
  // burada sadələşdirilmiş cəza tətbiq olunur.
  const rankFactor = item.firstRank ? 1 : 0.5;
  return market * ltv * rankFactor;
}

/** Portfel: bazar dəyəri, kredit dəyəri, örtük əmsalı. */
export function assessCollateral(items = [], exposure = 0) {
  const rows = items.map((item) => ({
    ...item,
    spec: COLLATERAL_TYPES[item.type],
    lendingValue: lendingValue(item),
  }));

  const marketTotal = rows.reduce((s, r) => s + (Number(r.marketValue) || 0), 0);
  const lendingTotal = rows.reduce((s, r) => s + r.lendingValue, 0);
  const hardTotal = rows
    .filter((r) => r.spec && r.spec.liquidity !== "low" && !r.spec.support)
    .reduce((s, r) => s + r.lendingValue, 0);

  const coverage = exposure > 0 ? lendingTotal / exposure : null;
  const marketCoverage = exposure > 0 ? marketTotal / exposure : null;
  const uninsured = rows.filter((r) => !r.insured && r.spec && !r.spec.support);
  const staleValuation = rows.filter((r) => isStale(r.valuationDate));

  return {
    rows,
    marketTotal,
    lendingTotal,
    hardTotal,
    coverage,
    marketCoverage,
    uninsuredCount: uninsured.length,
    staleCount: staleValuation.length,
    // Şəxsi zaminlik məbləğ vermir, amma olması strukturda sayılır.
    hasPersonalGuarantee: rows.some((r) => r.type === "personalGuarantee"),
  };
}

const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;

/** Qiymətləndirmə 2 ildən köhnədirsə etibarlı sayılmır. */
export function isStale(valuationDate, now = Date.now()) {
  if (!valuationDate) return false;
  const t = Date.parse(valuationDate);
  if (Number.isNaN(t)) return false;
  return now - t > TWO_YEARS_MS;
}
