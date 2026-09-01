// Rənglər SVG və inline style üçün JS-dən lazımdır; Tailwind sinifləri isə
// src/index.css içindəki @theme blokundan gəlir. İki yeri birlikdə dəyişin.
/**
 * YAŞIL ŞKALA — tək ailə, doqquz pillə.
 *
 * Əvvəl üç ayrı yaşıl vardı (pine #14351F, field #2E7D4F, scoreCard
 * #245B3A): bir-birinə yaxın, amma şkala deyil — hansının nə vaxt
 * işlədiləcəyi yazılmamışdı, ona görə ekranlar arasında sürüşürdü.
 * İndi rəng buradan seçilir; C.pine/C.field kimi adlar şkalanın
 * pillələrinə bağlanıb ki, mövcud kod sınmasın.
 *
 * Pillələr: 50 ən açıq fon, 500 əsas marka rəngi, 900 ən tünd səth.
 */
export const YASIL = {
  50: "#F1F8F3",
  100: "#E9F5EE",
  200: "#CFE6D7",
  300: "#A8DDBC",
  400: "#5FAE7E",
  500: "#2E7D4F",
  600: "#256B41",
  700: "#245B3A",
  800: "#193F27",
  900: "#14351F",
};

/**
 * KÖLGƏ SƏVİYYƏLƏRİ — iki pillə, çox yumşaq.
 *
 * Bütün kartlar 1 piksellik haşiyə ilə ayrılırdı; nəticədə ekran
 * vayrfreym kimi görünürdü. Kölgə səthləri ayırır, haşiyə isə yalnız
 * vurğulu kartlarda (xəbərdarlıq, gecikmə) qalır.
 */
export const KOLGE = {
  kart: "0 1px 2px rgba(20,53,31,0.05), 0 6px 16px rgba(20,53,31,0.05)",
  qalxan: "0 2px 4px rgba(20,53,31,0.06), 0 12px 28px rgba(20,53,31,0.10)",
};

export const C = {
  pine: "#14351F",
  pineDeep: "#0E2818",
  field: "#2E7D4F",
  fieldSoft: "#E9F5EE",
  gold: "#E9B54A",
  goldDeep: "#C9932B",
  goldSoft: "#FBF1DA",
  // goldDeep açıq qızılı fonda MƏTN üçün kifayət etmir (2,43:1) — nişan və
  // xəbərdarlıq mətnləri bunu işlədir (goldSoft üzərində 5,3:1, WCAG AA)
  goldInk: "#8A5A00",
  blue: "#3E7BFA",
  blueSoft: "#EAF1FD",
  mist: "#EFF2EC",
  card: "#FFFFFF",
  ink: "#1A211C",
  muted: "#6B7568",
  line: "#E3E8E0",
  danger: "#C24A3F",
  dangerSoft: "#FBEAE7",
  // ── Maliyyə vurğusu (PDF mockup: bənövşəyi = pul, yaşıl = aqro) ─────
  // Dolu düymə/rəqəm; lavandada 8,4:1, ağda 9,6:1 — WCAG AA/AAA
  mal: "#4B2CA3",
  malSoft: "#F2EEF5",
  malTrack: "#E4DFEE",
  // FarmScore kartının yastı yaşılı (ağ mətnlə 8,0:1)
  scoreCard: "#245B3A",
  // Sahə xəbərdarlığının isti fonu və mürəkkəbi (6,1:1)
  warnSoft: "#FDF2EA",
  warnInk: "#9A3F1E",
};

export const font = {
  display: "var(--font-display)",
  body: "var(--font-body)",
};

// Tövsiyə/bildiriş kartlarının rəng cütləri — məzmun növünə görə seçilir
export const tone = {
  // Peyk sübutu AQRO dünyasına aiddir — mavi yalnız suya qalır
  satellite: { color: C.field, bg: C.fieldSoft },
  weather: { color: "#2C5BC7", bg: C.blueSoft },
  market: { color: C.field, bg: C.fieldSoft },
  agronomy: { color: C.goldDeep, bg: C.goldSoft },
};
