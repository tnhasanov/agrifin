import { C, TIPO, font } from "../theme/tokens.js";

/**
 * BÖLMƏ BAŞLIĞI — kart başlığı ilə EYNİ pillədə (TIPO.kartBasliq).
 *
 * Əvvəl 14 px, tracking-wide idi: kiçik hərfli etiket kimi oxunurdu və
 * kartın içindəki 17 px başlıqdan ZƏİF görünürdü — yəni bölmə öz məzmunundan
 * kiçik idi. İndi başlıq bölməni aparır, kart onun altındadır. Üst boşluq
 * da artdı (24 px): bölmələr arası nəfəs premium hissin əsas mənbəyidir.
 */
export function SectionTitle({ children, action, onAction, level = 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="mt-6 mb-3 flex items-end justify-between gap-3 px-1">
      <Heading style={{ ...TIPO.kartBasliq, color: C.ink, fontFamily: font.display, letterSpacing: "-0.01em" }}>
        {children}
      </Heading>
      {action &&
        (onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="basilir flex shrink-0 items-center gap-1 rounded-full px-2.5"
            style={{ ...TIPO.qeyd, fontWeight: 700, color: C.field, minHeight: 32 }}
          >
            {action}
          </button>
        ) : (
          <span className="shrink-0" style={{ ...TIPO.qeyd, fontWeight: 700, color: C.field }}>
            {action}
          </span>
        ))}
    </div>
  );
}
