// Bütün təhlili bir yerə yığan funksiya.
//
// Ekranlar hesablama etmir. Nə göstərilirsə, buradan gəlir — beləliklə
// memorandumdakı DSCR ilə struktur ekranındakı DSCR eyni funksiyadan çıxır,
// iki fərqli yerdə yazılmış oxşar düsturdan yox.

import { spreadAll, latest, previous } from "./financials.js";
import { computeRatios, withLineItems } from "./ratios.js";
import { assessCapacity, DEFAULT_POLICY } from "./capacity.js";
import { assessCollateral } from "./collateral.js";
import { computeScore, applyOverride, suggestedRate } from "./scorecard.js";
import { evaluatePolicy, summarise } from "./policy.js";
import { toAzn, rateFor } from "./fx.js";

export function analyse(caseFile, policy = DEFAULT_POLICY) {
  const periods = caseFile.periods ?? [];
  const bare = spreadAll(periods);
  const spreads = bare.map((s, i) => withLineItems(s, periods[i]));

  const last = latest(spreads);
  const prev = previous(spreads);
  const ratios = computeRatios(last, prev);

  // Təhlil manatla aparılır. Kredit başqa valyutadadırsa, məbləğ əvvəlcə
  // çevrilir — əks halda manatla gələn pul axını dollar borcu ilə müqayisə
  // olunardı və DSCR yanlış çıxardı.
  const requested = Number(caseFile.request?.amount) || 0;
  const currency = caseFile.request?.currency ?? "AZN";
  const exposure = toAzn(requested, currency);
  const request = { ...(caseFile.request ?? {}), amount: exposure };

  const collateral = assessCollateral(caseFile.collateral ?? [], exposure);

  const capacity = assessCapacity({
    spread: last,
    request,
    obligations: caseFile.obligations ?? [],
    collateralLendingValue: collateral.lendingTotal,
    cashflowInputs: caseFile.cashflowInputs ?? {},
    policy,
  });

  const baseScore = computeScore({
    ratios,
    capacity,
    qualitative: caseFile.qualitative ?? {},
  });
  const score = applyOverride(baseScore, caseFile.ratingOverride);

  const findings = evaluatePolicy({
    borrower: caseFile.borrower ?? {},
    request,
    spread: last,
    spreads,
    ratios,
    capacity,
    collateral,
    score,
    qualitative: caseFile.qualitative ?? {},
  });

  return {
    spreads,
    latest: last,
    previous: prev,
    ratios,
    capacity,
    collateral,
    score,
    findings,
    policy: summarise(findings),
    fx: {
      currency,
      rate: rateFor(currency),
      requested,
      exposureAzn: exposure,
      converted: currency !== "AZN",
    },
    pricing: {
      suggested: suggestedRate({ pd: score.pd, coverage: collateral.coverage }),
      requested: Number(caseFile.request?.rate) || 0,
    },
  };
}

/** Boru xətti ekranı üçün yüngül xülasə — hər iş üçün tam təhlil ağırdır. */
export function summary(caseFile) {
  const a = analyse(caseFile);
  return {
    id: caseFile.id,
    name: caseFile.borrower?.name ?? "",
    sector: caseFile.borrower?.sector ?? "",
    region: caseFile.borrower?.region ?? "",
    stage: caseFile.stage,
    amount: Number(caseFile.request?.amount) || 0,
    currency: caseFile.request?.currency ?? "AZN",
    months: Number(caseFile.request?.months) || 0,
    grade: a.score.grade,
    dscr: a.capacity.dscr,
    coverage: a.collateral.coverage,
    stops: a.policy.stopCount,
    warns: a.policy.warnCount,
    updatedAt: caseFile.updatedAt,
    officer: caseFile.officer,
  };
}
