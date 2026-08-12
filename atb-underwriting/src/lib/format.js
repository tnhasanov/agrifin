// Rəqəmlərin göstərilməsi.
//
// Kredit sənədində rəqəmin formatı da mənadır: 1.2 ilə 1.20 fərqli dəqiqlik
// vəd edir, boş xana ilə sıfır isə tamam fərqli şeylərdir. Ona görə "məlumat
// yoxdur" hər yerdə eyni işarə ilə göstərilir.
//
// Format `Intl`-ə tapşırılmır. Səbəb praktikdir: brauzerlərin bir hissəsi
// `az-AZ` üçün tam ICU məlumatı daşımır və 1.245.000 əvəzinə 1,245,000 yazır.
// Eyni memorandumun iki kompüterdə fərqli görünməsi maliyyə sənədində qəbul
// edilməzdir, ona görə ayırıcılar burada açıq təyin olunub.

export const EMPTY = "—";

const SEPARATORS = {
  az: { group: " ", decimal: "," },
  en: { group: ",", decimal: "." },
};

function sepFor(locale = "az") {
  return locale.startsWith("az") ? SEPARATORS.az : SEPARATORS.en;
}

const isNum = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));

/**
 * Yarımı yuxarı yuvarlaqlaşdırır.
 *
 * `toFixed` ikilik sürüşmə səbəbindən 1.345-i 1.34 kimi yazır, çünki rəqəm
 * yaddaşda 1.34499…-dur. Onluq sürüşmə ilə yuvarlaqlaşdırma bunu aradan
 * qaldırır: faiz və əmsal cədvəlində bir qəpiklik fərq də izah tələb edir.
 */
function roundHalfUp(value, digits) {
  const shifted = Number(`${Math.abs(Number(value))}e${digits}`);
  if (!Number.isFinite(shifted)) return Math.abs(Number(value));
  return Number(`${Math.round(shifted)}e-${digits}`);
}

/** Minlikləri ayırır və onluq işarəsini dilə uyğun qoyur. */
export function group(value, locale = "az", digits = 0) {
  const { group: g, decimal: d } = sepFor(locale);
  const fixed = roundHalfUp(value, digits).toFixed(digits);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, g);
  const sign = Number(value) < 0 ? "−" : "";
  return fraction ? `${sign}${grouped}${d}${fraction}` : `${sign}${grouped}`;
}

/** Məbləğ valyuta ilə. AZN adətən rəqəmdən sonra yazılır. */
export function money(value, locale = "az", currency = "AZN", digits = 0) {
  if (!isNum(value)) return EMPTY;
  return `${group(value, locale, digits)} ${currency}`;
}

/** Cədvəldə valyuta təkrarlanmasın deyə yalnız rəqəm. */
export function amount(value, locale = "az", digits = 0) {
  if (!isNum(value)) return EMPTY;
  return group(value, locale, digits);
}

/** Böyük məbləğlər üçün qısa forma. */
export function compact(value, locale = "az") {
  if (!isNum(value)) return EMPTY;
  const v = Number(value);
  const abs = Math.abs(v);
  const unit = locale.startsWith("az") ? { m: "mln", k: "min" } : { m: "m", k: "k" };
  if (abs >= 1_000_000) return `${group(v / 1_000_000, locale, 1)} ${unit.m}`;
  if (abs >= 1_000) return `${group(v / 1000, locale, 0)} ${unit.k}`;
  return group(v, locale, 0);
}

/** Faiz. 0.153 → 15,3% */
export function percent(value, locale = "az", digits = 1) {
  if (!isNum(value)) return EMPTY;
  return `${group(Number(value) * 100, locale, digits)}%`;
}

/** Artıq faiz kimi verilmiş dərəcə: 14 → 14,0% */
export function rate(value, locale = "az", digits = 1) {
  if (!isNum(value)) return EMPTY;
  return `${group(value, locale, digits)}%`;
}

/** Dəfə ilə ölçülən əmsallar: 1,35× */
export function times(value, locale = "az", digits = 2) {
  if (!isNum(value)) return EMPTY;
  return `${group(value, locale, digits)}×`;
}

export function days(value, locale = "az") {
  if (!isNum(value)) return EMPTY;
  return group(value, locale, 0);
}

/** Tarix: az üçün 12.08.2026, en üçün 12/08/2026. */
export function date(iso, locale = "az") {
  if (!iso) return EMPTY;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return EMPTY;
  const pad = (n) => String(n).padStart(2, "0");
  const sep = locale.startsWith("az") ? "." : "/";
  return [pad(t.getDate()), pad(t.getMonth() + 1), t.getFullYear()].join(sep);
}

export function dateTime(iso, locale = "az") {
  if (!iso) return EMPTY;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return EMPTY;
  const pad = (n) => String(n).padStart(2, "0");
  return `${date(iso, locale)} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

/** Əmsalın növünə görə düzgün format seçir. */
export function ratioValue(key, value, locale, percentKeys, dayKeys) {
  if (!isNum(value)) return EMPTY;
  if (percentKeys.has(key)) return percent(value, locale);
  if (dayKeys.has(key)) return `${days(value, locale)} ${locale.startsWith("az") ? "gün" : "days"}`;
  return times(value, locale);
}
