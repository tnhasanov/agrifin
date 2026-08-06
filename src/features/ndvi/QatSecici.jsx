import { Icon } from "../../components/Icon.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { QATLAR, LEYENDLER } from "./xeriteQatlari.js";

/**
 * Qat düymələri və leyend — kartda və tam ekranda eyni görünsün deyə
 * bir yerdə. İki fərqli yerdə iki fərqli rəng cədvəli olsa fermer hansına
 * inanacağını bilməz.
 */
export function QatSecici({ aktiv, onSec, aciq = false }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-1.5">
      {QATLAR.map((qat) => {
        const secili = qat.id === aktiv;
        return (
          <button
            key={qat.id}
            type="button"
            onClick={() => onSec(qat.id)}
            aria-pressed={secili}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
            style={
              secili
                ? { backgroundColor: aciq ? C.gold : C.pine, color: C.pine, border: "1px solid transparent" }
                : {
                    backgroundColor: aciq ? "rgba(255,255,255,0.12)" : C.card,
                    color: aciq ? "#fff" : C.ink,
                    border: `1px solid ${aciq ? "rgba(255,255,255,0.2)" : C.line}`,
                  }
            }
          >
            <Icon
              name={qat.ikon}
              size={13}
              color={secili ? (aciq ? C.pine : C.gold) : aciq ? "rgba(255,255,255,0.7)" : C.muted}
            />
            {t(qat.etiket)}
          </button>
        );
      })}
    </div>
  );
}

export function Leyend({ qat, aciq = false }) {
  const { t } = useI18n();
  const leyend = LEYENDLER[qat] ?? [];
  if (leyend.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {leyend.map((p) => (
        <span key={p.acar} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.reng }} />
          <span style={{ color: aciq ? "rgba(255,255,255,0.75)" : C.muted, fontSize: 10 }}>
            {t(p.acar)}
          </span>
        </span>
      ))}
    </div>
  );
}
