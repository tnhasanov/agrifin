import { ICONS } from "./icons.js";

/**
 * İkonlar məlumat obyektlərində ad kimi saxlanılır (bax: services/advisor.js),
 * ona görə adla axtarılır. Ad tapılmasa nöqtə göstərir — naməlum ikon
 * tətbiqi çökdürmür.
 */
export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 2 }) {
  const Glyph = ICONS[name];

  if (!Glyph) {
    if (import.meta.env?.DEV) console.warn(`[icon] siyahıda yoxdur: ${name}`);
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="5" fill={color} />
      </svg>
    );
  }

  return <Glyph size={size} color={color} strokeWidth={strokeWidth} aria-hidden="true" />;
}
