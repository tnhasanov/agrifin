/**
 * BAZAR TONLARI — kateqoriya kartları və məhsul yer tutucuları üçün rəng cütləri.
 *
 * Tətbiqin qalanı yaşıl/bənövşəyi ikilisi üzərindədir (aqro/maliyyə). Bazar
 * səkkiz kateqoriya daşıyır və hamısını yaşıl vermək "çoxlu yaşıl qutu"
 * effektinə gətirirdi. Burada TƏBİİ AQRAR TONLAR var — mamır, buğda, gil,
 * səma, qum, polad, ərik — hər biri yumşaq fon + mürəkkəb mətn kimi, doymuş
 * deyil. Yaşıl yalnız toxum kateqoriyasında qalır.
 */
export const BAZAR_TON = {
  moss: { bg: "#E7F1E6", fg: "#2F5D3A" },
  wheat: { bg: "#F7EFDB", fg: "#8A6A1F" },
  clay: { bg: "#F6E8E1", fg: "#8B4B34" },
  sky: { bg: "#E4EEF7", fg: "#2F5F8F" },
  sand: { bg: "#F4ECE1", fg: "#7A5A3A" },
  steel: { bg: "#E9EDF0", fg: "#3F4C57" },
  plum: { bg: "#EFE9F4", fg: "#5A3F7A" },
  mist: { bg: "#EEF2EE", fg: "#556055" },
};

export function ton(ad) {
  return BAZAR_TON[ad] ?? BAZAR_TON.mist;
}
