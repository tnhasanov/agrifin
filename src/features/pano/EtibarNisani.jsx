import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/**
 * Məlumat etibarlılığı nişanı — NONE/İlkin/Orta/Yüksək.
 *
 * Etibar SKORUN ÖZÜ DEYİL (bax: lib/mehsuldarliq.js, qayda 5) — mövsüm
 * sayından çıxan ayrıca oxdur: 3-4 → İlkin, 5-7 → Orta, 8+ → Yüksək.
 * 3-dən az mövsümdə nişan render OLUNMUR: etibarsız qiymətə ad verilmir.
 */
export function EtibarNisani({ etibar, say = null, setir = false }) {
  const { t } = useI18n();
  if (!etibar) return null;

  const reng =
    etibar === "yuksek" ? C.field : etibar === "orta" ? C.goldDeep : C.muted;

  if (setir) {
    // "Məlumat etibarlılığı: Yüksək • 7 mövsüm" — kart altı sətri
    return (
      <p className="text-xs" style={{ color: C.muted }}>
        {t("pano.etibarSetri", { etibar: { key: `pano.etibar.${etibar}` }, say: say ?? 0 })}
      </p>
    );
  }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-bold"
      style={{ color: reng, backgroundColor: C.mist, border: `1px solid ${C.line}` }}
    >
      {t(`pano.etibar.${etibar}`)}
    </span>
  );
}
