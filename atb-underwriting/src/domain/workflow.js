// İş axını: müraciət hansı mərhələdədir, kim nəyi edə bilər.
//
// Mərhələni dəyişən hər hərəkət jurnala düşür. Kredit qərarının sonradan
// yoxlanıla bilməsi üçün lazım olan minimum budur: kim, nə vaxt, hansı
// mərhələdən hansına, hansı qeydlə.

export const STAGES = [
  "draft",
  "analysis",
  "riskReview",
  "committee",
  "approved",
  "conditional",
  "declined",
  "withdrawn",
];

export const OPEN_STAGES = ["draft", "analysis", "riskReview", "committee"];
export const CLOSED_STAGES = ["approved", "conditional", "declined", "withdrawn"];

export const ROLES = ["officer", "analyst", "committee"];

/**
 * İcazə verilən keçidlər. `requires` — keçiddən əvvəl ödənməli şərtlər.
 */
export const TRANSITIONS = [
  { from: "draft", to: "analysis", roles: ["officer"], requires: ["borrower", "request"] },
  { from: "analysis", to: "riskReview", roles: ["officer"], requires: ["financials", "collateral", "qualitative"] },
  { from: "riskReview", to: "committee", roles: ["analyst"], requires: ["rating", "memo"] },
  { from: "riskReview", to: "analysis", roles: ["analyst"], action: "return" },
  { from: "committee", to: "approved", roles: ["committee"], decision: true },
  { from: "committee", to: "conditional", roles: ["committee"], decision: true },
  { from: "committee", to: "declined", roles: ["committee"], decision: true },
  { from: "committee", to: "riskReview", roles: ["committee"], action: "return" },
  { from: "draft", to: "withdrawn", roles: ["officer"] },
  { from: "analysis", to: "withdrawn", roles: ["officer"] },
  { from: "riskReview", to: "withdrawn", roles: ["officer"] },
];

/** Bu rolun bu mərhələdən edə biləcəyi keçidlər. */
export function availableTransitions(stage, role) {
  return TRANSITIONS.filter((t) => t.from === stage && t.roles.includes(role));
}

/**
 * Keçid şərtlərinin yoxlanışı. Ödənməyən şərtlərin siyahısını qaytarır —
 * düymə bağlı qalır, amma səbəbi göstərilir.
 */
export function unmetRequirements(transition, caseFile) {
  if (!transition?.requires) return [];
  const missing = [];
  for (const req of transition.requires) {
    if (req === "borrower" && !caseFile.borrower?.name?.trim()) missing.push("borrower");
    if (req === "request" && !(Number(caseFile.request?.amount) > 0)) missing.push("request");
    if (req === "financials" && !(caseFile.periods?.length >= 2)) missing.push("financials");
    if (req === "collateral" && !(caseFile.collateral?.length > 0)) missing.push("collateral");
    if (req === "qualitative") {
      const answered = Object.values(caseFile.qualitative ?? {}).filter(Boolean).length;
      if (answered < 5) missing.push("qualitative");
    }
    if (req === "memo" && !caseFile.memo?.recommendation?.trim()) missing.push("memo");
    if (req === "rating" && caseFile.stage === "riskReview" && !caseFile.ratingConfirmed) {
      missing.push("rating");
    }
  }
  return missing;
}

export function canTransition(caseFile, to, role) {
  const t = TRANSITIONS.find((x) => x.from === caseFile.stage && x.to === to && x.roles.includes(role));
  if (!t) return { allowed: false, reason: "notPermitted", missing: [] };
  const missing = unmetRequirements(t, caseFile);
  if (missing.length) return { allowed: false, reason: "incomplete", missing, transition: t };
  return { allowed: true, transition: t, missing: [] };
}

let logSeq = 0;

export function logEntry({ actor, role, from, to, note = "", kind = "stage" }, at = new Date()) {
  logSeq += 1;
  return {
    id: `l${at.getTime()}${logSeq}`,
    at: at.toISOString(),
    actor,
    role,
    from,
    to,
    note,
    kind,
  };
}

/** Mərhələnin rəngi — ekranda status nişanı üçün. */
export const STAGE_TONE = {
  draft: "slate",
  analysis: "blue",
  riskReview: "amber",
  committee: "violet",
  approved: "green",
  conditional: "teal",
  declined: "red",
  withdrawn: "slate",
};

/** Boru xəttində sıra. */
export function stageIndex(stage) {
  const i = OPEN_STAGES.indexOf(stage);
  return i === -1 ? OPEN_STAGES.length : i;
}

/** Standart şərtlər — şərti təsdiqdə komitə bunlardan seçir. */
export const STANDARD_CONDITIONS = [
  "insurance",
  "personalGuarantee",
  "turnoverThroughBank",
  "financialCovenant",
  "noNewDebt",
  "valuationUpdate",
  "ownerEquityInjection",
  "targetedDisbursement",
];
