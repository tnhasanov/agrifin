import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import az from "./az.js";
import en from "./en.js";
import ru from "./ru.js";
import * as storage from "../lib/storage.js";
import { formatMoney, formatNumber } from "../lib/format.js";

const DICTS = { az, en, ru };
const DEFAULT_LANG = "az";

export const LANGUAGES = [
  { code: "az", label: "AZ", name: "Azərbaycanca" },
  { code: "en", label: "EN", name: "English" },
  { code: "ru", label: "RU", name: "Русский" },
];

function detectLang() {
  const saved = storage.read("lang");
  if (saved && DICTS[saved]) return saved;
  const nav = typeof navigator === "undefined" ? "" : navigator.language || "";
  const short = String(nav).slice(0, 2).toLowerCase();
  return DICTS[short] ? short : DEFAULT_LANG;
}

/** "{count} kredit" + {count: 9} -> "9 kredit" */
export function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * Dəyişənin dəyəri özü də dilə bağlı ola bilər. Bunun üçün obyekt yazılışı:
 *   { key: "common.today" } -> tərcümə olunur
 *   { money: 360 }          -> "360 ₼" / "360 ₼" (dilin qruplaşdırması ilə)
 *   { number: 12.4 }        -> dilə uyğun rəqəm
 */
function resolveVars(vars, lang, lookup) {
  if (!vars) return vars;
  const out = {};
  for (const [name, value] of Object.entries(vars)) {
    if (value && typeof value === "object") {
      if ("key" in value) out[name] = lookup(value.key);
      else if ("money" in value) out[name] = formatMoney(value.money, lang);
      else if ("number" in value) out[name] = formatNumber(value.number, lang, value.options);
      else out[name] = String(value);
    } else {
      out[name] = value;
    }
  }
  return out;
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    storage.write("lang", lang);
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      const lookup = (k) => DICTS[lang]?.[k] ?? DICTS[DEFAULT_LANG][k] ?? k;
      const template = DICTS[lang]?.[key] ?? DICTS[DEFAULT_LANG][key];
      if (template == null) {
        if (import.meta.env?.DEV) console.warn(`[i18n] açar tapılmadı: ${key}`);
        return key;
      }
      return interpolate(template, resolveVars(vars, lang, lookup));
    },
    [lang],
  );

  /** Məbləği cari dilin formatında yazır */
  const money = useCallback((amount) => formatMoney(amount, lang), [lang]);

  const setLang = useCallback((next) => {
    if (DICTS[next]) setLangState(next);
  }, []);

  const cycleLang = useCallback(() => {
    setLangState((current) => {
      const index = LANGUAGES.findIndex((l) => l.code === current);
      return LANGUAGES[(index + 1) % LANGUAGES.length].code;
    });
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, cycleLang, t, money }),
    [lang, setLang, cycleLang, t, money],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n yalnız <I18nProvider> içində işləyir");
  return ctx;
}
