import { createContext, useContext, useMemo, useState, useEffect } from "react";
import az from "./az.js";
import en from "./en.js";

export const DICTS = { az, en };
export const LANGUAGES = [
  { code: "az", label: "AZ" },
  { code: "en", label: "EN" },
];

const STORAGE_KEY = "atb.lang";
const I18nContext = createContext(null);

/** Nöqtəli açarı lüğətdə tapır: "policy.dscrBelowMin". */
export function lookup(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/** {placeholder} əvəzləmələri. Verilməyən yer tutucu olduğu kimi qalır. */
export function fill(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

export function translate(lang, key, params) {
  const value = lookup(DICTS[lang] ?? az, key) ?? lookup(az, key);
  if (typeof value !== "string") return key;
  return fill(value, params);
}

function initialLang() {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  }
  // İş dili azərbaycancadır. Brauzerin dilinə baxılmır: bankın kompüterində
  // sistem dili tez-tez ingiliscə olur, bu isə istifadəçinin seçimi deyil.
  return "az";
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Saxlama əlçatan deyilsə dil yalnız bu sessiyada qalır — problem deyil.
    }
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key, params) => translate(lang, key, params),
      // Rəqəm formatı da dilə bağlıdır: 1 250 000,50 / 1,250,000.50
      locale: lang === "az" ? "az-AZ" : "en-GB",
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n yalnız I18nProvider daxilində işləyir");
  return ctx;
}
