// Rənglər SVG və inline style üçün JS-dən lazımdır; Tailwind sinifləri isə
// src/index.css içindəki @theme blokundan gəlir. İki yeri birlikdə dəyişin.
/**
 * YAŞIL ŞKALA — tək ailə, doqquz pillə.
 *
 * Əvvəl üç ayrı yaşıl vardı (pine, field, scoreCard): bir-birinə yaxın,
 * amma şkala deyil — hansının nə vaxt işlədiləcəyi yazılmamışdı, ona görə
 * ekranlar arasında sürüşürdü. İndi rəng buradan seçilir; C.pine/C.field
 * kimi adlar şkalanın pillələrinə bağlanıb ki, mövcud kod sınmasın.
 *
 * v2.1-də şkala marka rənglərinə yenidən köklənib: 500 = Primary Emerald
 * (#1F7A4D), 900 = Brand Forest (#123F2D). Pillələr arasında ton ailəsi
 * eynidir — beləliklə "hansı yaşıl?" sualı bir daha qalxmır.
 */
export const YASIL = {
  50: "#F4F9F6",
  100: "#EAF4EC", // Soft Mint — seçilmiş hal
  200: "#D3E9DC",
  300: "#A9D6BB",
  400: "#62B36F", // Fresh Green — kiçik vurğu, qrafik
  500: "#1F7A4D", // Primary Emerald — aktiv/fokus
  600: "#1A6B43",
  700: "#155C3A", // Pressed
  800: "#134A31",
  900: "#123F2D", // Brand Forest — əsas CTA
};

/**
 * KÖLGƏ SƏVİYYƏLƏRİ — iki pillə, çox yumşaq.
 *
 * Bütün kartlar 1 piksellik haşiyə ilə ayrılırdı; nəticədə ekran
 * vayrfreym kimi görünürdü. Kölgə səthləri ayırır, haşiyə isə yalnız
 * vurğulu kartlarda (xəbərdarlıq, gecikmə) qalır. Yığılmış kölgə yoxdur —
 * premium təəssüratı dərinlikdən yox, boşluqdan gəlir.
 */
export const KOLGE = {
  kart: "0 1px 2px rgba(18,63,45,0.05), 0 6px 16px rgba(18,63,45,0.05)",
  qalxan: "0 2px 4px rgba(18,63,45,0.06), 0 12px 28px rgba(18,63,45,0.10)",
};

export const C = {
  // ── Marka yaşılları ───────────────────────────────────────────────
  pine: YASIL[900], // Brand Forest — dolu əsas CTA
  pineDeep: "#0D2E21",
  pinePressed: YASIL[700], // Pressed — basılmış hal
  field: YASIL[500], // Primary Emerald — aktiv/fokus/seçim
  fieldSoft: YASIL[100], // Soft Mint — seçilmiş fon
  fresh: YASIL[400], // Fresh Green — kiçik vurğu

  // ── Səthlər ───────────────────────────────────────────────────────
  // Warm Ivory yalnız EDİTORİAL səthlərdir (welcome, hero) — tətbiqin
  // qalanı Mist üzərində qalır ki, iki fon bir-birini yeməsin
  ivory: "#FBFAF6",
  mist: "#F4F7F2",
  card: "#FFFFFF",

  // ── Mətn və ayırıcı ───────────────────────────────────────────────
  ink: "#17231B",
  muted: "#637066",
  line: "#DCE6DD",

  // ── Qızıl: KİÇİK vurğu, xəbərdarlıq mətni DEYİL ───────────────────
  gold: "#D7A63C",
  goldDeep: "#B8862A",
  goldSoft: "#FDF6E7",
  // Açıq qızılı fonda mətn üçün goldDeep kifayət etmir — nişan və
  // xəbərdarlıq mətnləri bunu işlədir (goldSoft üzərində WCAG AA)
  goldInk: "#7A5410",

  // ── Status cütləri: hər biri mürəkkəb + yumşaq fon ────────────────
  info: "#3D6FB6",
  infoSoft: "#EAF1FB",
  warn: "#A96516",
  warnSoft: "#FFF4DE",
  // Qırmızı YALNIZ gecikmə/kritikdir
  danger: "#B33A3A",
  dangerSoft: "#FCEBEC",
  success: "#247A45",
  successSoft: "#E7F5EB",

  // ── Maliyyə vurğusu (pul = bənövşəyi, aqro = yaşıl) ───────────────
  mal: "#4B2CA3",
  malSoft: "#F2EEF5",
  malTrack: "#E4DFEE",

  // ── Köhnə adlar (silinmir: kod sınmasın) ──────────────────────────
  blue: "#3D6FB6",
  blueSoft: "#EAF1FB",
  scoreCard: YASIL[700],
  warnInk: "#7A5410",
};

export const font = {
  display: "var(--font-display)",
  body: "var(--font-body)",
};

/**
 * TİPOQRAFİYA ŞKALASI — ölçü/sətir hündürlüyü cütləri.
 *
 * Ekranlarda 9-dan 22-yə qədər on müxtəlif ölçü vardı; hər biri ayrı
 * yerdə yazılmışdı. İndi beş pillə var və hər birinin işi adındadır.
 * Girişlər 16px-dən kiçilmir — iOS kiçik girişdə səhifəni özü böyüdür.
 */
export const TIPO = {
  ekranBasliq: { fontSize: 22, lineHeight: "28px", fontWeight: 800 },
  kartBasliq: { fontSize: 17, lineHeight: "24px", fontWeight: 700 },
  metn: { fontSize: 15, lineHeight: "22px" },
  duyme: { fontSize: 15, lineHeight: "20px", fontWeight: 700 },
  qeyd: { fontSize: 13, lineHeight: "18px" },
  giris: { fontSize: 16, lineHeight: "22px" },
};

/** 4/8 şəbəkəsi — komponentlərdə "px-3.5" kimi təsadüfi ölçülər qalmasın */
export const ARA = {
  kenar: 20, // mobil xarici kənar
  kart: 16, // kart daxili
  yaxin: 12, // əlaqəli elementlər arası
  bolme: 24, // bölmələr arası
};

export const RADIUS = {
  kart: 18,
  idare: 14, // düymə, giriş, çip
  tam: 999,
};

/** Toxunma hədəfinin minimumu — WCAG 2.5.8 / iOS HIG */
export const TOXUNMA = 44;

/**
 * HƏRƏKƏT — 150-220ms ease-out. Uzun animasiya premium deyil, ləng olur.
 * Paralaks və dövrü maskot animasiyası yoxdur (bax: index.css → reduced motion).
 */
export const HEREKET = {
  tez: "150ms cubic-bezier(0.22, 1, 0.36, 1)",
  orta: "180ms cubic-bezier(0.22, 1, 0.36, 1)",
  vereq: "220ms cubic-bezier(0.22, 1, 0.36, 1)",
};

// Tövsiyə/bildiriş kartlarının rəng cütləri — məzmun növünə görə seçilir
export const tone = {
  // Peyk sübutu AQRO dünyasına aiddir — mavi yalnız suya qalır
  satellite: { color: C.field, bg: C.fieldSoft },
  weather: { color: C.info, bg: C.infoSoft },
  market: { color: C.field, bg: C.fieldSoft },
  agronomy: { color: C.goldInk, bg: C.goldSoft },
};
