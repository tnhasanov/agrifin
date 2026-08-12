// Siyasət tapıntılarının mətnə çevrilməsi.
//
// Tapıntı özü rəqəm saxlayır, mətn deyil — beləliklə eyni tapıntı üç dildə
// düzgün oxunur və memorandumda da, ekranda da eyni cümlə ilə görünür.

import { Badge } from "./ui.jsx";
import { amount, percent, times } from "../lib/format.js";

const SEVERITY_TONE = { stop: "red", warn: "amber", info: "slate" };

/** Parametrləri adına görə formatlayır — hər tapıntı üçün ayrıca kod yazmadan. */
export function formatParams(t, locale, params = {}) {
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (["amount", "equity", "limit", "from", "to", "max"].includes(key) && Number.isFinite(value)) {
      out[key] = `${amount(value, locale)} AZN`;
    } else if (["dscr", "coverage", "min"].includes(key) && Number.isFinite(value)) {
      out[key] = times(value, locale);
    } else if (key === "pct" && Number.isFinite(value)) {
      out[key] = percent(value, locale, 0);
    } else if (key === "level") {
      out[key] = t(`policy.authorityLevel.${value}`);
    } else if (key === "sector") {
      out[key] = t(`sector.${value}`);
    } else if (key === "binding") {
      out[key] = value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function findingText(t, locale, finding) {
  return t(`policy.${finding.code}`, formatParams(t, locale, finding.params));
}

export function PolicyList({ findings, t, locale, compactView = false }) {
  if (!findings.length) {
    return <p className="px-4 py-3 text-sm text-[var(--color-good)]">{t("policy.clean")}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {findings.map((f, i) => (
        <li key={`${f.code}-${i}`} className="flex items-start gap-3 px-4 py-2.5">
          <Badge tone={SEVERITY_TONE[f.severity]}>{t(`policy.${f.severity}`)}</Badge>
          <span className={`text-sm ${f.severity === "stop" ? "font-medium" : ""}`}>
            {findingText(t, locale, f)}
          </span>
          {compactView ? null : <span className="ml-auto text-xs text-slate-400">{f.code}</span>}
        </li>
      ))}
    </ul>
  );
}
