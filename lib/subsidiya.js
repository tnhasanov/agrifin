/**
 * SUBSİDİYA — dövlət dəstəyinin hesablanması, TƏK MƏNBƏ.
 *
 * ═══ NİYƏ AYRICA MODUL ════════════════════════════════════════════════
 * Subsidiya iki yerdə lazımdır: gəlir modelində (lib/gelir.js — kredit
 * tavanına təsir edir) və fermerin ekranında ("gözlənilən subsidiya").
 * İki nüsxə olsa fermerin gördüyü rəqəm anderraytinqin işlətdiyi rəqəmdən
 * ayrılar. Ona görə dərəcələr YALNIZ buradadır; gəlir modeli buradan oxuyur.
 *
 * ═══ NÜMUNƏ CƏDVƏL — TƏSDİQLİ DEYİL ═══════════════════════════════════
 * Aşağıdakı rəqəmlər yer tutandır (`tesdiqli: false`). Rəsmi Aqrar
 * Subsidiya qaydaları gələndə BU FAYL dəyişir, başqa heç nə: versiya və
 * qəbul tarixi yenilənir, `tesdiqli: true` olur və ekrandakı "nümunə"
 * nişanı öz-özünə itir. UI heç vaxt "rəsmi məbləğ" demir — hesablama
 * təxminidir, məbləğ müraciət və qərarla müəyyənləşir.
 *
 * Model qəsdən sadədir: hektar başına baza ödənişi × hektar. Toxum/gübrə
 * güzəştləri, rayon əmsalları və üst hədlər rəsmi cədvəl gələndə eyni
 * struktura əlavə olunur (`setirler` massivində hər komponent ayrı sətirdir).
 */

export const SUBSIDIYA_QAYDALARI = {
  versiya: "ilkin-2026-01",
  qebulTarixi: "2026-01-01",
  tesdiqli: false,
  menbe: "Nümunə cədvəl — rəsmi Aqrar Subsidiya qaydaları ilə əvəzlənməlidir",

  /** Hektar başına baza ödənişi (₼/ha). 0 = bu bitki üçün hektar subsidiyası nəzərdə tutulmayıb */
  hektarBaza: {
    bugda: 250,
    arpa: 250,
    qargidali: 200,
    pambiq: 300,
    kartof: 0,
    pomidor: 0,
    sogan: 0,
    uzum: 0,
    alma: 0,
    findiq: 0,
  },

  /** Müraciət pəncərəsi — [başlanğıc ay, son ay], hər ikisi daxil; payızlıq üçün ilin sonu */
  pencere: {
    bugda: [10, 12],
    arpa: [10, 12],
    qargidali: [3, 5],
    pambiq: [3, 5],
  },

  /** Hektar üst həddi — nümunədə yoxdur */
  maxHektar: null,
};

/** Gəlir modelinin oxuduğu cədvəl — eyni obyekt, ayrı nüsxə deyil */
export function hektarBazaDereceleri() {
  return SUBSIDIYA_QAYDALARI.hektarBaza;
}

const yuvarla = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Pəncərənin bu ay üçün vəziyyəti.
 * @returns {{baslangicAy, sonAy, hal: "acig"|"gozlenilir"|"bagli"}|null}
 */
export function muracietPenceresi(bitki, indi = new Date()) {
  const p = SUBSIDIYA_QAYDALARI.pencere[bitki];
  if (!p) return null;
  const [bas, son] = p;
  const ay = indi.getMonth() + 1;
  const icinde = bas <= son ? ay >= bas && ay <= son : ay >= bas || ay <= son;
  let hal = "acig";
  if (!icinde) hal = ay < bas ? "gozlenilir" : "bagli";
  return { baslangicAy: bas, sonAy: son, hal };
}

/**
 * Fermerin sahəsi üçün gözlənilən subsidiya.
 *
 * @param {{bitki?: string|null, hektar?: number|null, indi?: Date}} p
 * @returns {
 *   | {hal: "saheYoxdur"} | {hal: "bitkiYoxdur"}
 *   | {hal: "dereceYoxdur", bitki, versiya, tesdiqli}
 *   | {hal: "hazir", bitki, hektar, derece, cemi, setirler, pencere, versiya, tesdiqli, menbe}
 * }
 */
export function subsidiyaHesabla({ bitki = null, hektar = null, indi = new Date() } = {}) {
  const ha = Number(hektar);
  if (!Number.isFinite(ha) || ha <= 0) return { hal: "saheYoxdur" };
  if (!bitki) return { hal: "bitkiYoxdur" };

  const { versiya, tesdiqli, menbe, maxHektar } = SUBSIDIYA_QAYDALARI;
  const derece = SUBSIDIYA_QAYDALARI.hektarBaza[bitki] ?? 0;
  if (!(derece > 0)) return { hal: "dereceYoxdur", bitki, versiya, tesdiqli };

  // Üst hədd varsa artıq hektar ödənilmir — hesablama şəffaf qalsın deyə
  // sətirdə həm faktiki, həm ödənilən hektar var
  const odenilenHa = maxHektar ? Math.min(ha, maxHektar) : ha;
  const mebleg = yuvarla(derece * odenilenHa);

  return {
    hal: "hazir",
    bitki,
    hektar: ha,
    derece,
    cemi: mebleg,
    setirler: [{ acar: "hektarBaza", hektar: odenilenHa, derece, mebleg }],
    pencere: muracietPenceresi(bitki, indi),
    versiya,
    tesdiqli,
    menbe,
  };
}
