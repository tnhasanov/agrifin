// Tövsiyələr məzmundur, "tamamlandı" vəziyyəti isə store-da saxlanılır.
// Mətnlər tərcümə açarları ilə gəlir ki, hər dildə düzgün göstərilsin.
const build = ({ id, icon, tone, hasImpact = true }) => ({
  id,
  icon,
  tone,
  titleKey: `rec.${id}.title`,
  bodyKey: `rec.${id}.body`,
  sourceKey: `rec.${id}.source`,
  ctaKey: `rec.${id}.cta`,
  impactKey: hasImpact ? `rec.${id}.impact` : null,
});

export const RECOMMENDATIONS = [
  build({ id: "irrigate", icon: "Satellite", tone: "satellite" }),
  build({ id: "fertilizer", icon: "CloudRain", tone: "weather" }),
  build({ id: "sellWindow", icon: "TrendingUp", tone: "market" }),
  build({ id: "aphid", icon: "Sprout", tone: "agronomy", hasImpact: false }),
];

/** Tövsiyə siyahısını store-daki tamamlanma vəziyyəti ilə birləşdirir */
export function withCompletion(completedIds = []) {
  const done = new Set(completedIds);
  return RECOMMENDATIONS.map((rec) => ({ ...rec, done: done.has(rec.id) }));
}
