import { formatNumber } from "./format.js";

/**
 * MƏBLƏĞİN HİSSƏLƏRİ — Amount komponenti üçün.
 *
 * Bir məbləğ dörd hissədən ibarətdir və hər birinin ekranda ÖZ çəkisi var:
 *   isare  — mənfi üçün həqiqi minus (U+2212), defis deyil; müsbətdə boş
 *   tam    — qruplaşdırılmış tam hissə ("1.234")
 *   kesr   — qəpik ("50"), yalnız lazım olanda
 *   vahid  — "₼"
 *
 * Qəpik siyasəti:
 *   "auto"   — sıfırdan fərqli qəpik varsa göstər (bazar qiyməti: 39,90 / 798)
 *   "hemise" — həmişə iki rəqəm (hesab-faktura, ödəniş qəbzi)
 *   "hec"    — tam ədədə yuvarlaqla (kredit limiti, təklif)
 *
 * Ayırıcı dilə görədir (az "1.234,50", en "1,234.50", ru "1 234,50"):
 * kəsr ayırıcısı da buradan çıxır ki, komponent onu uydurmasın.
 */
export function meblegParcala(value, lang = "az", { qepik = "auto" } = {}) {
  // null/undefined/"" MƏBLƏĞ DEYİL: Number(null) 0 verir, amma "borc 0 ₼"
  // ilə "borc bilinmir" fərqli şeylərdir — bilinməyən tire ilə göstərilir
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  const menfi = n < 0;
  const mutleq = Math.abs(n);
  const qepikli = Math.round(mutleq * 100) % 100 !== 0;
  const kesrVar = qepik === "hemise" || (qepik === "auto" && qepikli);

  const tamDeyer = kesrVar ? Math.floor(Math.round(mutleq * 100) / 100) : Math.round(mutleq);
  const kesrDeyer = kesrVar ? Math.round(mutleq * 100) % 100 : null;

  // Ayırıcını dilin öz formatından oxuyuruq — "1,5" → ","
  const ayirici = formatNumber(1.5, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[0-9]/g, "");

  return {
    menfi,
    isare: menfi ? "−" : "",
    tam: formatNumber(tamDeyer, lang, { maximumFractionDigits: 0 }),
    kesr: kesrVar ? String(kesrDeyer).padStart(2, "0") : null,
    ayirici,
    vahid: "₼",
  };
}

/** Düz mətn forması — aria-label və testlər üçün ("−1.234,50 ₼") */
export function meblegMetni(value, lang = "az", secim) {
  const p = meblegParcala(value, lang, secim);
  if (!p) return "—";
  return `${p.isare}${p.tam}${p.kesr != null ? `${p.ayirici}${p.kesr}` : ""} ${p.vahid}`;
}
