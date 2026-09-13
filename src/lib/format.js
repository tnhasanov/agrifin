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

/**
 * QİYMƏT — qəpiklə: "39,90 ₼", tam olanda "798 ₼".
 *
 * `formatMoney` kredit məbləğləri üçündür və tam ədədə yuvarlaqlayır
 * (kredit qəpiklə verilmir). Bazar qiyməti isə qəpiklidir: 39,90-ı "40 ₼"
 * göstərmək ekrandakı rəqəmlə çekdəki rəqəmi ayırardı. Tam qiymətdə
 * ",00" quyruğu yoxdur — "798 ₼" daha təmiz oxunur.
 */
export function formatQiymet(value, lang = "az") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const qepikli = Math.round(n * 100) % 100 !== 0;
  return `${formatNumber(n, lang, {
    minimumFractionDigits: qepikli ? 2 : 0,
    maximumFractionDigits: qepikli ? 2 : 0,
  })} ₼`;
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
