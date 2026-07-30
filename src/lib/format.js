// Rəqəm formatı dilə görə dəyişir: az "7.280", en "7,280", ru "7 280".
const GROUPING_LOCALE = {
  az: "de-DE",
  en: "en-US",
  ru: "ru-RU",
};

const localeFor = (lang) => GROUPING_LOCALE[lang] ?? GROUPING_LOCALE.az;

export function formatNumber(value, lang = "az", options = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(localeFor(lang), options);
}

/** Məbləğ + manat simvolu, məsələn "7.280 ₼" */
export function formatMoney(value, lang = "az") {
  return `${formatNumber(Math.round(Number(value) || 0), lang)} ₼`;
}

/** İşarəli fərq, məsələn "+2.4%" / "−1.1%" (real minus işarəsi) */
export function formatDelta(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(digits)}%`;
}

/** Əməliyyat sətri üçün: "+3.150 ₼" / "−530 ₼" */
export function formatSignedMoney(value, lang = "az") {
  const n = Number(value) || 0;
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${formatMoney(Math.abs(n), lang)}`;
}
