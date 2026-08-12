// Kredit siyasəti yoxlanışları.
//
// İki səviyyə var: `stop` — siyasətə ziddir, komitəyə yalnız istisna qərarı ilə
// çıxa bilər; `warn` — mane olmur, amma memorandumda cavablandırılmalıdır.
// Yoxlanış heç vaxt öz-özünə imtina etmir. Qərarı adam verir, sistem yalnız
// nəyin danışılmadığını göstərir.

export const AUTHORITY_LIMITS = {
  branch: 150_000,
  regional: 500_000,
  headOffice: 2_000_000,
};

export const RESTRICTED_SECTORS = ["gambling", "crypto", "tobaccoWholesale"];

export const POLICY_LIMITS = {
  minDscr: 1.3,
  minCollateralCoverage: 1.0,
  minBusinessMonths: 12,
  maxTenorMonths: 84,
  maxSingleExposure: 2_000_000,
};

const finding = (code, severity, params = {}) => ({ code, severity, params });

/**
 * Bütün yoxlanışlar. Nəticə sıralanır: əvvəl `stop`, sonra `warn`, sonra `info`.
 */
export function evaluatePolicy(ctx, limits = POLICY_LIMITS) {
  const {
    borrower = {},
    request = {},
    spread,
    spreads = [],
    capacity,
    collateral,
    score,
    qualitative = {},
  } = ctx;

  const out = [];
  const amount = Number(request.amount) || 0;

  // — Kapital və nəticə
  if (spread && spread.equity <= 0) {
    out.push(finding("negativeEquity", "stop", { equity: spread.equity }));
  }
  if (spread && spread.adjustedNetProfit < 0) {
    out.push(finding("netLoss", "warn", { amount: spread.adjustedNetProfit }));
  }
  if (spread && !spread.balanced) {
    out.push(finding("balanceMismatch", "warn", { pct: spread.imbalancePct, amount: spread.imbalance }));
  }

  // — Ödəmə qabiliyyəti
  if (capacity?.dscr !== null && capacity?.dscr !== undefined) {
    if (capacity.dscr < 1) {
      out.push(finding("dscrBelowOne", "stop", { dscr: capacity.dscr }));
    } else if (capacity.dscr < limits.minDscr) {
      out.push(finding("dscrBelowMin", "warn", { dscr: capacity.dscr, min: limits.minDscr }));
    }
    if (capacity.dscrStressed !== null && capacity.dscrStressed < 1 && capacity.dscr >= 1) {
      out.push(finding("stressFail", "warn", { dscr: capacity.dscrStressed }));
    }
  }
  if (capacity && amount > capacity.recommendedLimit) {
    out.push(finding("aboveRecommended", "warn", {
      amount,
      limit: capacity.recommendedLimit,
      binding: capacity.binding,
    }));
  }

  // — Girov
  if (collateral) {
    const coverage = collateral.coverage;
    if (coverage !== null && coverage < 0.5) {
      out.push(finding("collateralCritical", "stop", { coverage }));
    } else if (coverage !== null && coverage < limits.minCollateralCoverage) {
      out.push(finding("collateralLow", "warn", { coverage, min: limits.minCollateralCoverage }));
    }
    if (collateral.staleCount > 0) {
      out.push(finding("staleValuation", "warn", { count: collateral.staleCount }));
    }
    if (collateral.uninsuredCount > 0) {
      out.push(finding("uninsured", "warn", { count: collateral.uninsuredCount }));
    }
    if (!collateral.hasPersonalGuarantee && borrower.legalForm !== "individual") {
      out.push(finding("noPersonalGuarantee", "info", {}));
    }
  }

  // — Müştəri profili
  const months = Number(borrower.businessMonths) || 0;
  if (months > 0 && months < limits.minBusinessMonths) {
    out.push(finding("youngBusiness", "stop", { months }));
  }
  if (RESTRICTED_SECTORS.includes(borrower.sector)) {
    out.push(finding("restrictedSector", "stop", { sector: borrower.sector }));
  }
  if (borrower.taxDebt) {
    out.push(finding("taxDebt", "warn", { amount: Number(borrower.taxDebtAmount) || 0 }));
  }
  if (borrower.litigation) {
    out.push(finding("litigation", "warn", {}));
  }
  if (qualitative.creditHistory === "overdueNow") {
    out.push(finding("currentArrears", "stop", {}));
  }
  if (qualitative.creditHistory === "restructured") {
    out.push(finding("restructuredHistory", "warn", {}));
  }
  if (qualitative.marketPosition === "singleBuyer") {
    out.push(finding("buyerConcentration", "warn", {}));
  }

  // — Struktur
  if (Number(request.months) > limits.maxTenorMonths) {
    out.push(finding("tenorTooLong", "warn", { months: Number(request.months), max: limits.maxTenorMonths }));
  }
  if (request.currency && request.currency !== "AZN" && borrower.revenueCurrency === "AZN") {
    out.push(finding("currencyMismatch", "warn", { currency: request.currency }));
  }
  if (amount > limits.maxSingleExposure) {
    out.push(finding("aboveSingleExposure", "stop", { amount, max: limits.maxSingleExposure }));
  }

  // — Satışın davamlı azalması
  if (spreads.length >= 3) {
    const [a, b, c] = spreads.slice(-3);
    if (c.annualRevenue < b.annualRevenue && b.annualRevenue < a.annualRevenue) {
      out.push(finding("revenueDeclining", "warn", {
        from: a.annualRevenue,
        to: c.annualRevenue,
      }));
    }
  }

  // — Reytinq mövqeyi
  if (score?.stance === "decline") {
    out.push(finding("ratingDecline", "stop", { grade: score.grade }));
  } else if (score?.stance === "restricted") {
    out.push(finding("ratingRestricted", "warn", { grade: score.grade }));
  }
  if (score && score.completeness < 0.8) {
    out.push(finding("incompleteScore", "warn", { pct: score.completeness }));
  }

  // — Səlahiyyət səviyyəsi
  out.push(finding("authority", "info", { level: authorityFor(amount), amount }));

  const order = { stop: 0, warn: 1, info: 2 };
  out.sort((a, b) => order[a.severity] - order[b.severity]);
  return out;
}

export function authorityFor(amount) {
  if (amount <= AUTHORITY_LIMITS.branch) return "branch";
  if (amount <= AUTHORITY_LIMITS.regional) return "regional";
  if (amount <= AUTHORITY_LIMITS.headOffice) return "headOffice";
  return "board";
}

export function summarise(findings = []) {
  const stops = findings.filter((f) => f.severity === "stop");
  const warns = findings.filter((f) => f.severity === "warn");
  return {
    stops,
    warns,
    stopCount: stops.length,
    warnCount: warns.length,
    // Siyasət pozuntusu varsa təsdiq yalnız istisna qərarı ilə mümkündür.
    clean: stops.length === 0 && warns.length === 0,
    needsException: stops.length > 0,
  };
}
