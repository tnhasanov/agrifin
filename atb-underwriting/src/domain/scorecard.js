// Reytinq modeli.
//
// Kəmiyyət (60%) və keyfiyyət (40%) hissələrindən ibarət açıq skorkart. Model
// "qara qutu" deyil: hər amilin çəkisi, alınan bal və bunun ümumi bala nə
// qədər töhfə verdiyi ekranda sətir-sətir görünür. Reytinqi dəyişmək olar,
// amma yalnız yazılı əsaslandırma ilə — `applyOverride`.
//
// Ballar 0–100 aralığındadır və pilləli bantlarla verilir. Xətti interpolyasiya
// qəsdən yoxdur: iki qonşu müştəri arasında 3 ballıq süni fərq yaratmaqdansa,
// eyni bantda olduqlarını demək daha dürüstdür.

/** Pilləli qiymətləndirmə: hədd → bal. Sıra vacibdir. */
function scoreSteps(value, steps, higherIsBetter = true) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  for (const [threshold, score] of steps) {
    if (higherIsBetter ? value >= threshold : value <= threshold) return score;
  }
  return 0;
}

export const QUANT_FACTORS = [
  {
    key: "dscr",
    weight: 15,
    pick: (ctx) => ctx.capacity?.dscr ?? null,
    score: (v) => scoreSteps(v, [[2.0, 100], [1.6, 85], [1.3, 70], [1.15, 50], [1.0, 30]]),
    format: "x",
  },
  {
    key: "netDebtToEbitda",
    weight: 12,
    pick: (ctx) => ctx.ratios?.netDebtToEbitda?.value ?? null,
    score: (v) => scoreSteps(v, [[1.5, 100], [2.5, 85], [3.5, 65], [4.5, 40], [6, 20]], false),
    format: "x",
  },
  {
    key: "equityRatio",
    weight: 10,
    pick: (ctx) => ctx.ratios?.equityRatio?.value ?? null,
    score: (v) => scoreSteps(v, [[0.5, 100], [0.35, 85], [0.25, 65], [0.15, 40], [0.05, 20]]),
    format: "%",
  },
  {
    key: "ebitdaMargin",
    weight: 8,
    pick: (ctx) => ctx.ratios?.ebitdaMargin?.value ?? null,
    score: (v) => scoreSteps(v, [[0.2, 100], [0.14, 85], [0.09, 65], [0.05, 45], [0.02, 25]]),
    format: "%",
  },
  {
    key: "currentRatio",
    weight: 8,
    pick: (ctx) => ctx.ratios?.currentRatio?.value ?? null,
    score: (v) => scoreSteps(v, [[1.8, 100], [1.4, 85], [1.1, 65], [0.9, 40], [0.7, 20]]),
    format: "x",
  },
  {
    key: "revenueGrowth",
    weight: 7,
    pick: (ctx) => ctx.ratios?.revenueGrowth?.value ?? null,
    score: (v) => scoreSteps(v, [[0.2, 100], [0.08, 85], [0, 65], [-0.1, 40], [-0.25, 20]]),
    format: "%",
  },
];

/**
 * Keyfiyyət amilləri. Hər birinin cavab variantı və balı var — analitik
 * sərbəst rəqəm yazmır, siyahıdan seçir. Bu, iki analitikin eyni müştəriyə
 * verdiyi reytinqin fərqini azaldır.
 */
export const QUAL_FACTORS = [
  {
    key: "creditHistory",
    weight: 10,
    options: [
      { key: "clean3y", score: 100 },
      { key: "cleanShort", score: 80 },
      { key: "minorPast", score: 55 },
      { key: "restructured", score: 30 },
      { key: "overdueNow", score: 0 },
      { key: "noHistory", score: 50 },
    ],
  },
  {
    key: "management",
    weight: 6,
    options: [
      { key: "strong", score: 100 },
      { key: "adequate", score: 70 },
      { key: "keyPersonRisk", score: 45 },
      { key: "weak", score: 20 },
    ],
  },
  {
    key: "yearsInBusiness",
    weight: 6,
    options: [
      { key: "over10", score: 100 },
      { key: "y5to10", score: 80 },
      { key: "y3to5", score: 60 },
      { key: "y1to3", score: 35 },
      { key: "under1", score: 10 },
    ],
  },
  {
    key: "bankRelationship",
    weight: 5,
    options: [
      { key: "mainBank", score: 100 },
      { key: "partial", score: 70 },
      { key: "newClient", score: 45 },
    ],
  },
  {
    key: "marketPosition",
    weight: 5,
    options: [
      { key: "diversified", score: 100 },
      { key: "stable", score: 75 },
      { key: "concentrated", score: 45 },
      { key: "singleBuyer", score: 20 },
    ],
  },
  {
    key: "accountingQuality",
    weight: 4,
    options: [
      { key: "audited", score: 100 },
      { key: "reliable", score: 75 },
      { key: "management", score: 50 },
      { key: "informal", score: 25 },
    ],
  },
  {
    key: "sectorOutlook",
    weight: 4,
    options: [
      { key: "growing", score: 100 },
      { key: "stable", score: 75 },
      { key: "cyclical", score: 50 },
      { key: "declining", score: 25 },
    ],
  },
];

/** Reytinq şkalası: bal → sinif, ehtimal olunan defolt, siyasət mövqeyi. */
export const RATING_SCALE = [
  { min: 85, grade: 1, pd: 0.003, stance: "preferred" },
  { min: 78, grade: 2, pd: 0.006, stance: "preferred" },
  { min: 71, grade: 3, pd: 0.012, stance: "acceptable" },
  { min: 64, grade: 4, pd: 0.022, stance: "acceptable" },
  { min: 57, grade: 5, pd: 0.038, stance: "acceptable" },
  { min: 50, grade: 6, pd: 0.06, stance: "watch" },
  { min: 43, grade: 7, pd: 0.1, stance: "watch" },
  { min: 35, grade: 8, pd: 0.16, stance: "restricted" },
  { min: 25, grade: 9, pd: 0.28, stance: "restricted" },
  { min: 0, grade: 10, pd: 0.45, stance: "decline" },
];

export function gradeFor(score) {
  return RATING_SCALE.find((r) => score >= r.min) ?? RATING_SCALE[RATING_SCALE.length - 1];
}

/**
 * Skorkartı hesablayır.
 *
 * Məlumatı olmayan amil sıfır bal almır — çəkisi ümumi cəmdən çıxarılır.
 * Əks halda "məlumat yoxdur" ilə "göstərici pisdir" eyni nəticəni verərdi.
 */
export function computeScore({ ratios, capacity, qualitative = {} }) {
  const ctx = { ratios, capacity };
  const lines = [];

  for (const f of QUANT_FACTORS) {
    const value = f.pick(ctx);
    const score = f.score(value);
    lines.push({
      key: f.key,
      kind: "quant",
      weight: f.weight,
      value,
      score,
      format: f.format,
      available: score !== null,
    });
  }

  for (const f of QUAL_FACTORS) {
    const answer = qualitative[f.key];
    const option = f.options.find((o) => o.key === answer);
    lines.push({
      key: f.key,
      kind: "qual",
      weight: f.weight,
      value: answer ?? null,
      score: option ? option.score : null,
      available: !!option,
    });
  }

  const scored = lines.filter((l) => l.available);
  const usedWeight = scored.reduce((s, l) => s + l.weight, 0);
  const totalWeight = lines.reduce((s, l) => s + l.weight, 0);
  const total = usedWeight > 0
    ? scored.reduce((s, l) => s + l.score * l.weight, 0) / usedWeight
    : 0;

  for (const l of lines) {
    l.contribution = l.available && usedWeight > 0 ? (l.score * l.weight) / usedWeight : 0;
  }

  const quantWeight = scored.filter((l) => l.kind === "quant").reduce((s, l) => s + l.weight, 0);
  const qualWeight = usedWeight - quantWeight;
  const partScore = (kind, weight) =>
    weight > 0
      ? scored.filter((l) => l.kind === kind).reduce((s, l) => s + l.score * l.weight, 0) / weight
      : null;

  const rounded = Math.round(total * 10) / 10;
  const rating = gradeFor(rounded);

  return {
    lines,
    total: rounded,
    quantScore: partScore("quant", quantWeight),
    qualScore: partScore("qual", qualWeight),
    // Məlumatın nə qədəri doldurulub — reytinqə etibarın ölçüsü.
    completeness: totalWeight > 0 ? usedWeight / totalWeight : 0,
    grade: rating.grade,
    pd: rating.pd,
    stance: rating.stance,
    overridden: false,
  };
}

/**
 * Reytinq düzəlişi. Modeldən kənara çıxmaq olar, amma iz qalır: kim, nə vaxt,
 * nə üçün. Əsaslandırma boşdursa düzəliş tətbiq edilmir.
 */
export function applyOverride(score, override) {
  if (!override || !override.grade || !override.reason?.trim()) return score;
  const target = RATING_SCALE.find((r) => r.grade === Number(override.grade));
  if (!target) return score;
  return {
    ...score,
    grade: target.grade,
    pd: target.pd,
    stance: target.stance,
    overridden: true,
    modelGrade: score.grade,
    override: { ...override },
  };
}

/**
 * Riskə uyğun qiymət təklifi: fondlaşma + əməliyyat xərci + gözlənilən itki
 * + kapital marjası. Girov itkini azaldır (LGD).
 */
export function suggestedRate({ pd, coverage, base = 9 }) {
  const opex = 2.5;
  const lgd = coverage === null || coverage === undefined
    ? 0.6
    : Math.max(0.15, Math.min(0.75, 0.75 - 0.4 * Math.min(1.5, coverage)));
  const expectedLoss = pd * lgd * 100;
  const capitalMargin = 1.5;
  return Math.round((base + opex + expectedLoss + capitalMargin) * 10) / 10;
}
