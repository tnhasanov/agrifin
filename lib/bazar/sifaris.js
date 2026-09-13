/**
 * SİFARİŞ DOMENİ — səbətin hesablanması, giriş yoxlaması, vəziyyət maşını.
 * SAF FUNKSİYALAR: nə baza, nə vaxt (kənardan verilir), nə DOM.
 *
 * ═══ TƏHLÜKƏSİZLİK PRİNSİPİ ═══════════════════════════════════════════
 * Klientdən yalnız `{kod, say}` cütləri qəbul edilir. Qiymət, təchizatçı,
 * endirim, çatdırılma haqqı, yekun — HAMISI kataloqdan hesablanır
 * (bax: lib/bazar/kataloq.js). Klientin göndərdiyi "cemi" sahəsi olsa belə
 * oxunmur: `setirleriYoxla` yalnız kod və sayı götürür, qalanını atır.
 *
 * Server (api/bazar.js) və klient (features/bazar) EYNİ `sebetiHesabla`-nı
 * işlədir — ekrandakı rəqəm serverin yazacağı rəqəmlə eyni funksiyadan
 * çıxır; bağlayıcı olan isə sifariş anında serverin hesabladığıdır.
 */

import { KATALOQ_VERSIYA, mehsulTap, rayonaCatdirilir, tedarukcuTap } from "./kataloq.js";
import { rayonKoduDuzgun } from "../rayonlar.js";
import { telefonNormallasdir } from "../metn.js";

/** Qəpiyə yuvarlaqlaşdırma — NUMERIC(12,2) ilə eyni dəqiqlik */
export function qepik(deyer) {
  const say = Number(deyer);
  if (!Number.isFinite(say)) return 0;
  return Math.round((say + Number.EPSILON) * 100) / 100;
}

// ── Vəziyyət maşını ─────────────────────────────────────────────────────
// Keçidlər AÇIQ siyahıdır: klient `status` göndərə bilmir; fermer yalnız
// LƏĞV keçidini, o da yalnız erkən hallarda edə bilir. Qalan keçidlər
// tədarükçü/əməliyyat tərəfinindir (Faza 2 — hazırda yalnız sxemdə).

export const SIFARIS_HALLARI = ["new", "confirmed", "preparing", "delivering", "completed", "cancelled"];

export const SIFARIS_KECIDLERI = {
  new: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["delivering", "cancelled"],
  delivering: ["completed"],
  completed: [],
  cancelled: [],
};

/** Fermerin özünün ləğv edə bildiyi hallar — hazırlanmağa başlayandan sonra yox */
export const FERMER_LEGV_OLAR = ["new", "confirmed"];

/** Zaman xəttinin "uğurlu" yolu — ekranda pillə kimi göstərilir */
export const SIFARIS_YOLU = ["new", "confirmed", "preparing", "delivering", "completed"];

export function kecidMumkun(haradan, haraya) {
  return Boolean(SIFARIS_KECIDLERI[haradan]?.includes(haraya));
}

export const ODENIS_USULLARI = ["on_delivery", "agrofin_financing"];

/** Bir sifarişdə maksimum fərqli məhsul */
export const MAX_SETIR = 30;

/** Sürət həddi: pəncərədə istifadəçi başına sifariş sayı */
export const SIFARIS_HEDDI = { pencereDeq: 10, maxSay: 5 };

// ── Giriş yoxlaması ─────────────────────────────────────────────────────

/**
 * Klientdən gələn sətirlər → kataloqdan doldurulmuş sətirlər.
 *
 * Eyni kod iki dəfə gələrsə saylar TOPLANIR (dublikat sətir yaranmır).
 * Say tam ədəd, minSay..maxSay aralığında; stoku olmayan məhsul rədd edilir.
 *
 * @param {unknown} giris
 * @returns {{ok: true, setirler: Array<{mehsul: object, say: number}>} | {ok: false, sebeb: string, kod?: string}}
 */
export function setirleriYoxla(giris) {
  if (!Array.isArray(giris) || giris.length === 0) return { ok: false, sebeb: "setirYoxdur" };
  if (giris.length > MAX_SETIR) return { ok: false, sebeb: "setirCoxdur" };

  const cem = new Map();
  for (const setir of giris) {
    const kod = typeof setir?.kod === "string" ? setir.kod : null;
    const say = Number(setir?.say);
    if (!kod || !mehsulTap(kod)) return { ok: false, sebeb: "mehsulYoxdur", kod: kod ?? undefined };
    if (!Number.isInteger(say) || say <= 0) return { ok: false, sebeb: "sayYanlis", kod };
    cem.set(kod, (cem.get(kod) ?? 0) + say);
  }

  const setirler = [];
  for (const [kod, say] of cem) {
    const mehsul = mehsulTap(kod);
    if (mehsul.stok === "yoxdur") return { ok: false, sebeb: "stokYoxdur", kod };
    if (say < mehsul.minSay) return { ok: false, sebeb: "minSay", kod };
    if (say > mehsul.maxSay) return { ok: false, sebeb: "maxSay", kod };
    setirler.push({ mehsul, say });
  }
  return { ok: true, setirler };
}

/**
 * Sayı məhsulun sərhədinə sıxır — səbət düymələri üçün. Sıfır və aşağı
 * "sil" deməkdir, ona görə burada 0 qaytarılır (çağıran sətri silir).
 */
export function sayiSix(mehsul, say) {
  const n = Math.round(Number(say));
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (!mehsul) return n;
  return Math.min(mehsul.maxSay, Math.max(mehsul.minSay, n));
}

// ── Hesablama ───────────────────────────────────────────────────────────

/**
 * @typedef {object} SebetHesabi
 * @property {Array<{kod, ad, kateqoriya, tedarukcu, tedarukcuAd, vahidKey, say, vahidQiymet, cemi, maliyye, catdirilir}>} setirler
 * @property {Array<{kod, ad, araCem, catdirilma, pulsuzHedd, catdirilmaGun}>} tedarukculer
 * @property {number} araCem
 * @property {number} catdirilma
 * @property {number} cemi
 * @property {number} sayCemi        ümumi ədəd
 * @property {number} maliyyeMeblegi maliyyələşdirilə bilən sətirlərin cəmi
 * @property {boolean} maliyyeHamisi bütün sətirlər maliyyələşdirilə bilər
 * @property {string[]} catdirilmayanlar bu rayona çatdırılmayan məhsul kodları
 * @property {string} kataloqVersiyasi
 */

/**
 * Səbətin tam hesabı — YALNIZ kataloqdan.
 *
 * Çatdırılma haqqı TƏDARÜKÇÜ BAŞINA hesablanır: hər tədarükçünün öz
 * haqqı və "bu məbləğdən yuxarı pulsuz" həddi var; sifarişin çatdırılma
 * xərci bunların cəmidir. Yəni iki tədarükçüdən alan fermer iki çatdırılma
 * ödəyə bilər — bu, gizlədilmir, xülasədə tədarükçü-tədarükçü göstərilir.
 *
 * @param {Array<{mehsul: object, say: number}>} setirler  setirleriYoxla-dan
 * @param {{rayonKod?: string|null}} [secim]
 * @returns {SebetHesabi}
 */
export function sebetiHesabla(setirler, { rayonKod = null } = {}) {
  const tedarukcuCem = new Map();
  const catdirilmayanlar = [];

  const setirCavabi = setirler.map(({ mehsul, say }) => {
    const tedarukcu = tedarukcuTap(mehsul.tedarukcu);
    const cemi = qepik(mehsul.qiymet * say);
    const catdirilir = rayonaCatdirilir(mehsul, rayonKod);
    if (!catdirilir) catdirilmayanlar.push(mehsul.kod);
    tedarukcuCem.set(mehsul.tedarukcu, (tedarukcuCem.get(mehsul.tedarukcu) ?? 0) + cemi);
    return {
      kod: mehsul.kod,
      ad: mehsul.ad,
      kateqoriya: mehsul.kateqoriya,
      tedarukcu: mehsul.tedarukcu,
      tedarukcuAd: tedarukcu?.ad ?? mehsul.tedarukcu,
      vahidKey: mehsul.vahidKey,
      say,
      vahidQiymet: mehsul.qiymet,
      cemi,
      maliyye: mehsul.maliyye,
      catdirilir,
    };
  });

  const tedarukculer = [...tedarukcuCem.entries()].map(([kod, araCem]) => {
    const tedarukcu = tedarukcuTap(kod);
    const haqq = tedarukcu?.catdirilmaHaqqi ?? 0;
    const hedd = tedarukcu?.pulsuzHedd ?? 0;
    const catdirilma = haqq > 0 && (hedd === 0 || araCem < hedd) ? haqq : 0;
    return {
      kod,
      ad: tedarukcu?.ad ?? kod,
      araCem: qepik(araCem),
      catdirilma,
      pulsuzHedd: hedd,
      catdirilmaGun: tedarukcu?.catdirilmaGun ?? [3, 7],
    };
  });

  const araCem = qepik(setirCavabi.reduce((c, s) => c + s.cemi, 0));
  const catdirilma = qepik(tedarukculer.reduce((c, s) => c + s.catdirilma, 0));
  const maliyyeMeblegi = qepik(setirCavabi.filter((s) => s.maliyye).reduce((c, s) => c + s.cemi, 0));

  return {
    setirler: setirCavabi,
    tedarukculer,
    araCem,
    catdirilma,
    cemi: qepik(araCem + catdirilma),
    sayCemi: setirCavabi.reduce((c, s) => c + s.say, 0),
    maliyyeMeblegi,
    maliyyeHamisi: setirCavabi.length > 0 && setirCavabi.every((s) => s.maliyye),
    catdirilmayanlar,
    kataloqVersiyasi: KATALOQ_VERSIYA,
  };
}

/**
 * Gözlənilən çatdırılma: ən uzun tədarükçü müddəti (gün) — bir sifariş bir
 * tarixlə vəd edilir, ən gec gələn onu təyin edir.
 * @param {Array<{catdirilmaGun: [number, number]}>} tedarukculer
 * @param {Date} indi
 */
export function gozlenilenCatdirilma(tedarukculer, indi) {
  const gun = Math.max(0, ...tedarukculer.map((t) => t.catdirilmaGun?.[1] ?? 0));
  const tarix = new Date(indi);
  tarix.setUTCDate(tarix.getUTCDate() + gun);
  return tarix;
}

// ── Çatdırılma məlumatı ─────────────────────────────────────────────────

const MAX_AD = 80;
const MAX_UNVAN = 200;
const MAX_QEYD = 300;

/**
 * Çatdırılma formasını yoxlayır və normallaşdırır.
 * @returns {{ok: true, catdirilma: {rayonKod, unvan, ad, telefon, qeyd}} | {ok: false, sebeb: string}}
 */
export function catdirilmaYoxla(giris) {
  const rayonKod = giris?.rayonKod;
  if (!rayonKoduDuzgun(rayonKod)) return { ok: false, sebeb: "rayonYanlis" };

  const ad = String(giris?.ad ?? "").trim();
  if (ad.length < 2 || ad.length > MAX_AD) return { ok: false, sebeb: "adYanlis" };

  const telefon = telefonNormallasdir(giris?.telefon);
  if (!telefon) return { ok: false, sebeb: "telefonYanlis" };

  const unvan = String(giris?.unvan ?? "").trim().slice(0, MAX_UNVAN);
  const qeyd = String(giris?.qeyd ?? "").trim().slice(0, MAX_QEYD);

  return { ok: true, catdirilma: { rayonKod, unvan: unvan || null, ad, telefon, qeyd: qeyd || null } };
}
