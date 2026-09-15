import { mehsulTap } from "./kataloq.js";

/**
 * SAHƏ SİQNALI → BAZAR TƏKLİFİ — "bu həftə sahənin nəyə ehtiyacı var".
 *
 * ═══ NİYƏ SAF CƏDVƏL ═══════════════════════════════════════════════════
 * Siqnal (peyk/hava, bax: src/services/siqnal.js) və kataloq
 * (lib/bazar/kataloq.js) artıq var; arada yalnız "hansı siqnal hansı
 * kateqoriyaya aparır" bilgisi çatmırdı. O bilgi burada BİR yerdədir ki,
 * həm siqnal kartı, həm bazar vitrini eyni cavabı versin və test olunsun.
 *
 * ═══ SATIŞ TƏZYİQİ DEYİL ═════════════════════════════════════════════════
 *   • Təklif yalnız AÇIQ siqnala bağlıdır — siqnal yoxdursa bölmə yoxdur.
 *   • Hər təklif "bu siqnal → bu məhsul" izahını daşıyır (`izahKey`).
 *   • Normalar və dozalar YAZILMIR (kataloq qaydası) — kateqoriya və
 *     nümunə məhsullar göstərilir, qərar fermerin və aqronomundur.
 *   • Yalnız iş görülə bilən siqnallar: "yağış gəlir", "suvarmanı dayandır",
 *     "ölçmə köhnədir" alış tələb etmir — xəritədə yoxdur.
 */
export const SIQNAL_XERITESI = {
  bitkiZeifleyir: {
    kateqoriya: "gubre",
    mehsullar: ["torpaq-analizi", "humat-maye-5l", "mikroelement-1kq"],
    izahKey: "bazar.siqnal.bitkiZeifleyir",
  },
  xesteliyRiski: {
    kateqoriya: "muhafize",
    mehsullar: ["fungisid-mis-1kq", "bel-cileyicisi-16l", "aqronom-baxisi"],
    izahKey: "bazar.siqnal.xesteliyRiski",
  },
  dermanlama: {
    kateqoriya: "muhafize",
    mehsullar: ["bel-cileyicisi-16l", "asma-cileyici-400l", "dron-cileme-ha"],
    izahKey: "bazar.siqnal.dermanlama",
  },
  suvar: {
    kateqoriya: "suvarma",
    mehsullar: ["damci-lenti-16mm-500m", "nasos-1-5kvt", "pe-boru-32mm-100m"],
    izahKey: "bazar.siqnal.suvar",
  },
  isti: {
    kateqoriya: "suvarma",
    mehsullar: ["damci-lenti-16mm-500m", "yagis-cileyici-impuls", "aqrotekstil-1-6x100"],
    izahKey: "bazar.siqnal.isti",
  },
  saxta: {
    kateqoriya: "diger",
    mehsullar: ["aqrotekstil-1-6x100"],
    izahKey: "bazar.siqnal.saxta",
  },
  qonsu: {
    kateqoriya: "xidmet",
    mehsullar: ["torpaq-analizi", "aqronom-baxisi", "npk-15-15-15-50kq"],
    izahKey: "bazar.siqnal.qonsu",
  },
};

const CIDDILIK_SIRASI = { tecili: 0, diqqet: 1, melumat: 2 };
/** Vitrində ən çox bu qədər siqnal qrupu — ekran siyahıya çevrilməsin */
export const MAX_QRUP = 3;
/** Qrup başına ən çox bu qədər məhsul */
export const MAX_MEHSUL = 3;

/** Bu siqnal növü üçün bazar təklifi varmı? (siqnal kartındakı düymə üçün) */
export function siqnalTeklifi(nov) {
  return SIQNAL_XERITESI[nov] ?? null;
}

/** Məhsul bu bitkiyə uyğundurmu? Boş siyahı = ümumi məhsul */
function bitkiyeUygun(mehsul, bitki) {
  if (!bitki || !Array.isArray(mehsul.bitkiler) || mehsul.bitkiler.length === 0) return true;
  return mehsul.bitkiler.includes(bitki);
}

/**
 * Açıq siqnallardan bazar təklif qrupları.
 *
 * Sıra ciddiliyə görədir (təcili → diqqət → məlumat); eyni növdən bir
 * qrup; eyni məhsul iki qrupda təkrarlanmır (ilk — ən ciddi — qrup qalib).
 *
 * @param {Array<{nov, ciddilik, basliqKey, icon}>} siqnallar
 * @param {{bitki?: string|null}} [secim]
 * @returns {Array<{siqnal, kateqoriya, izahKey, mehsullar: object[]}>}
 */
export function siqnalTeklifleri(siqnallar = [], { bitki = null } = {}) {
  const sirali = [...siqnallar]
    .filter((s) => s && SIQNAL_XERITESI[s.nov])
    .sort((a, b) => (CIDDILIK_SIRASI[a.ciddilik] ?? 9) - (CIDDILIK_SIRASI[b.ciddilik] ?? 9));

  const gorulen = new Set();
  const verilmis = new Set();
  const qruplar = [];
  for (const siqnal of sirali) {
    if (gorulen.has(siqnal.nov)) continue;
    gorulen.add(siqnal.nov);
    const xerite = SIQNAL_XERITESI[siqnal.nov];
    const mehsullar = [];
    for (const kod of xerite.mehsullar) {
      if (verilmis.has(kod)) continue;
      const mehsul = mehsulTap(kod);
      if (!mehsul || !bitkiyeUygun(mehsul, bitki)) continue;
      verilmis.add(kod);
      mehsullar.push(mehsul);
      if (mehsullar.length >= MAX_MEHSUL) break;
    }
    if (!mehsullar.length) continue;
    qruplar.push({ siqnal, kateqoriya: xerite.kateqoriya, izahKey: xerite.izahKey, mehsullar });
    if (qruplar.length >= MAX_QRUP) break;
  }
  return qruplar;
}
