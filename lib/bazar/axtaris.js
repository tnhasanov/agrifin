/**
 * BAZAR AXTARIŞI, SÜZGƏC VƏ SIRALAMA — saf funksiyalar, kataloq üzərində.
 *
 * Axtarış aksentsiz və hərf ölçüsündən asılı deyil (bax: lib/metn.js):
 * "gubre" yazan "Gübrə" kateqoriyasını, "karbamid" yazan məhsulu,
 * "agrosupply" yazan tədarükçünü tapır. Sahələr: ad, brend, tədarükçü adı,
 * kateqoriya sözləri, bitki kodları.
 */

import { KATEQORIYALAR, MEHSULLAR, kateqoriyaTap, rayonaCatdirilir, tedarukcuTap } from "./kataloq.js";
import { normalizeAz } from "../metn.js";

/** Axtarışın işə düşməsi üçün minimum hərf sayı */
export const AXTARIS_HEDDI = 2;

/** Qiymət aralıqları — süzgəc çipləri (₼) */
export const QIYMET_ARALIQLARI = [
  { kod: "0-50", min: 0, max: 50 },
  { kod: "50-200", min: 50, max: 200 },
  { kod: "200-1000", min: 200, max: 1000 },
  { kod: "1000+", min: 1000, max: Infinity },
];

export const SIRALAMALAR = ["tovsiye", "qiymetArtan", "qiymetAzalan", "yeni"];

/** Boş süzgəc — "heç nə seçilməyib" */
export const BOS_SUZGEC = Object.freeze({
  kateqoriya: null,
  qiymet: null,
  rayonKod: null,
  tedarukcu: null,
  maliyye: false,
  tesdiqli: false,
});

/** Aktiv süzgəc sayı — düymədəki nişan üçün */
export function suzgecSayi(suzgec) {
  if (!suzgec) return 0;
  let say = 0;
  if (suzgec.kateqoriya) say += 1;
  if (suzgec.qiymet) say += 1;
  if (suzgec.rayonKod) say += 1;
  if (suzgec.tedarukcu) say += 1;
  if (suzgec.maliyye) say += 1;
  if (suzgec.tesdiqli) say += 1;
  return say;
}

/** Məhsulun axtarış mətni — bir dəfə qurulur, hər sorğuda yenidən yox */
const AXTARIS_METNI = new Map(
  MEHSULLAR.map((m) => {
    const kateqoriya = kateqoriyaTap(m.kateqoriya);
    const tedarukcu = tedarukcuTap(m.tedarukcu);
    const metn = [m.ad, m.brend, tedarukcu?.ad ?? "", ...(kateqoriya?.sozler ?? []), ...m.bitkiler]
      .map(normalizeAz)
      .join(" ");
    return [m.kod, metn];
  }),
);

/**
 * Sorğunun hər sözü mətndə olmalıdır (VƏ məntiqi): "npk 50" → NPK 50 kq.
 * @param {object[]} [mehsullar]
 */
export function mehsullariAxtar(sorgu, mehsullar = MEHSULLAR) {
  const needle = normalizeAz(sorgu);
  if (needle.length < AXTARIS_HEDDI) return mehsullar;
  const sozler = needle.split(/\s+/).filter(Boolean);
  return mehsullar.filter((m) => {
    const metn = AXTARIS_METNI.get(m.kod) ?? normalizeAz(m.ad);
    return sozler.every((soz) => metn.includes(soz));
  });
}

/** Sorğuya uyğun kateqoriyalar — axtarış nəticəsinin üstündəki çiplər */
export function kateqoriyalariAxtar(sorgu) {
  const needle = normalizeAz(sorgu);
  if (needle.length < AXTARIS_HEDDI) return [];
  return KATEQORIYALAR.filter((k) => k.sozler.some((s) => normalizeAz(s).includes(needle)));
}

export function suzgecTetbiq(mehsullar, suzgec = BOS_SUZGEC) {
  const aralik = suzgec.qiymet ? QIYMET_ARALIQLARI.find((a) => a.kod === suzgec.qiymet) : null;
  return mehsullar.filter((m) => {
    if (suzgec.kateqoriya && m.kateqoriya !== suzgec.kateqoriya) return false;
    if (aralik && (m.qiymet < aralik.min || m.qiymet >= aralik.max)) return false;
    if (suzgec.rayonKod && !rayonaCatdirilir(m, suzgec.rayonKod)) return false;
    if (suzgec.tedarukcu && m.tedarukcu !== suzgec.tedarukcu) return false;
    if (suzgec.maliyye && !m.maliyye) return false;
    if (suzgec.tesdiqli && !tedarukcuTap(m.tedarukcu)?.tesdiqli) return false;
    return true;
  });
}

/**
 * "Tövsiyə olunan" balı: fermerin bitkisinə uyğunluq > təsdiqli satıcı >
 * stok > populyarlıq. Uydurma "sponsorlu" sıra yoxdur.
 */
export function tovsiyeBali(mehsul, { bitki = null } = {}) {
  let bal = mehsul.populyarliq ?? 0;
  if (bitki && mehsul.bitkiler.includes(bitki)) bal += 100;
  if (tedarukcuTap(mehsul.tedarukcu)?.tesdiqli) bal += 20;
  if (mehsul.stok === "yoxdur") bal -= 200;
  else if (mehsul.stok === "az") bal -= 10;
  return bal;
}

export function sirala(mehsullar, sira = "tovsiye", { bitki = null } = {}) {
  const siyahi = [...mehsullar];
  switch (sira) {
    case "qiymetArtan":
      return siyahi.sort((a, b) => a.qiymet - b.qiymet);
    case "qiymetAzalan":
      return siyahi.sort((a, b) => b.qiymet - a.qiymet);
    case "yeni":
      return siyahi.sort((a, b) => (a.elaveTarixi < b.elaveTarixi ? 1 : a.elaveTarixi > b.elaveTarixi ? -1 : 0));
    default:
      return siyahi.sort((a, b) => tovsiyeBali(b, { bitki }) - tovsiyeBali(a, { bitki }));
  }
}

/** Kataloqdakı ən yeni N məhsul */
export function yeniMehsullar(say = 4) {
  return sirala(MEHSULLAR, "yeni").slice(0, say);
}
