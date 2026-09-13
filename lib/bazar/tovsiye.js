/**
 * SAHƏ ƏSASLI TÖVSİYƏ — "Əkin planınız": bitki + hektar → nə lazımdır,
 * nə qədəri artıq alınıb, nə qalır.
 *
 * ═══ NƏ REALDIR, NƏ NÜMUNƏDİR ══════════════════════════════════════════
 *   • NORMALAR NÜMUNƏDİR: hektara neçə kisə/paket/rulon — aqronomik
 *     dəqiqlik iddiası yoxdur, `TESDIQ.aqronom = false`. Faza 2-də bura
 *     torpaq analizi və sort normaları qoşulacaq; imza dəyişmir.
 *   • ƏHATƏ REALDIR: "Gübrə 60%" fermerin FAKTİKİ sifarişlərindən (ləğv
 *     olunmamış, son 12 ay) hesablanır. Uydurma ✓ yoxdur — sifarişi olmayan
 *     fermer hər sətirdə 0% görür, bu da düzgündür.
 *
 * Saf funksiyadır: sifarişlər və vaxt kənardan verilir.
 */

import { mehsulTap } from "./kataloq.js";
import { qepik } from "./sifaris.js";

export const TESDIQ = { aqronom: false, qeyd: "Normalar nümunədir; torpaq analizi və sort normaları ilə əvəzlənməlidir." };

/** Əhatə üçün baxılan sifariş pəncərəsi (ay) */
export const EHATE_PENCERESI_AY = 12;

/**
 * Bitki → plan sətirləri. `sayHa` hektara say (yuxarı yuvarlaqlanır).
 * Kateqoriya sırası ekrandakı sıradır.
 */
const PLAN = {
  pomidor: [
    { mehsul: "pomidor-toxumu-f1", sayHa: 2.5 },
    { mehsul: "npk-15-15-15-50kq", sayHa: 6 },
    { mehsul: "karbamid-46-50kq", sayHa: 3 },
    { mehsul: "fungisid-mis-1kq", sayHa: 3 },
    { mehsul: "damci-lenti-16mm-500m", sayHa: 7 },
  ],
  kartof: [
    { mehsul: "kartof-toxumu-aqra", sayHa: 80 },
    { mehsul: "npk-15-15-15-50kq", sayHa: 8 },
    { mehsul: "fungisid-mis-1kq", sayHa: 2 },
    { mehsul: "insektisid-1l", sayHa: 2 },
    { mehsul: "damci-lenti-16mm-500m", sayHa: 6 },
  ],
  qargidali: [
    { mehsul: "qargidali-hibrid-25kq", sayHa: 1 },
    { mehsul: "karbamid-46-50kq", sayHa: 5 },
    { mehsul: "npk-15-15-15-50kq", sayHa: 4 },
    { mehsul: "damci-lenti-16mm-500m", sayHa: 5 },
  ],
  bugda: [
    { mehsul: "bugda-toxumu-qobustan", sayHa: 5 },
    { mehsul: "ammonium-nitrat-50kq", sayHa: 4 },
    { mehsul: "superfosfat-50kq", sayHa: 2 },
    { mehsul: "herbisid-taxil-5l", sayHa: 0.4 },
    { mehsul: "kombayn-xidmeti-ha", sayHa: 1 },
  ],
  arpa: [
    { mehsul: "arpa-toxumu-50kq", sayHa: 4 },
    { mehsul: "ammonium-nitrat-50kq", sayHa: 3 },
    { mehsul: "superfosfat-50kq", sayHa: 2 },
    { mehsul: "herbisid-taxil-5l", sayHa: 0.4 },
    { mehsul: "kombayn-xidmeti-ha", sayHa: 1 },
  ],
  pambiq: [
    { mehsul: "pambiq-toxumu-25kq", sayHa: 2 },
    { mehsul: "karbamid-46-50kq", sayHa: 4 },
    { mehsul: "npk-15-15-15-50kq", sayHa: 3 },
    { mehsul: "insektisid-1l", sayHa: 3 },
    { mehsul: "damci-lenti-16mm-500m", sayHa: 6 },
  ],
  sogan: [
    { mehsul: "sogan-toxumu-500q", sayHa: 8 },
    { mehsul: "npk-15-15-15-50kq", sayHa: 5 },
    { mehsul: "fungisid-mis-1kq", sayHa: 2 },
    { mehsul: "damci-lenti-16mm-500m", sayHa: 6 },
  ],
  uzum: [
    { mehsul: "kalium-sulfat-25kq", sayHa: 4 },
    { mehsul: "npk-15-15-15-50kq", sayHa: 3 },
    { mehsul: "fungisid-mis-1kq", sayHa: 5 },
    { mehsul: "feromon-tele-10", sayHa: 1 },
    { mehsul: "damci-lenti-16mm-500m", sayHa: 4 },
  ],
  alma: [
    { mehsul: "kalium-sulfat-25kq", sayHa: 4 },
    { mehsul: "npk-15-15-15-50kq", sayHa: 4 },
    { mehsul: "fungisid-mis-1kq", sayHa: 6 },
    { mehsul: "feromon-tele-10", sayHa: 2 },
    { mehsul: "damci-lenti-16mm-500m", sayHa: 4 },
  ],
  findiq: [
    { mehsul: "npk-15-15-15-50kq", sayHa: 4 },
    { mehsul: "insektisid-1l", sayHa: 2 },
    { mehsul: "aqronom-baxisi", sayHa: 0 },
  ],
};

/** Planı olan bitkilər — UI "sizin üçün" bölməsini buna görə göstərir */
export const PLANLI_BITKILER = Object.keys(PLAN);

/**
 * @typedef {object} PlanSetri
 * @property {string} kateqoriya
 * @property {Array<{kod, ad, say, cemi}>} mehsullar  tövsiyə olunan məhsullar və saylar
 * @property {number} lazimMebleg
 * @property {number} alinanMebleg
 * @property {number} ehate          0..1
 */

/**
 * Sifarişlərdən kateqoriya başına xərclənən məbləğ (ləğv olunmamış, pəncərə içində).
 * Sifariş forması API cavabıdır: {hal, tarix, setirler:[{kateqoriya, cemi}]}.
 */
export function kateqoriyaXercleri(sifarisler = [], indi = new Date()) {
  const hedd = new Date(indi);
  hedd.setMonth(hedd.getMonth() - EHATE_PENCERESI_AY);
  const cem = new Map();
  for (const sifaris of sifarisler) {
    if (!sifaris || sifaris.hal === "cancelled") continue;
    const tarix = new Date(sifaris.tarix);
    if (Number.isNaN(tarix.getTime()) || tarix < hedd) continue;
    for (const setir of sifaris.setirler ?? []) {
      cem.set(setir.kateqoriya, (cem.get(setir.kateqoriya) ?? 0) + (Number(setir.cemi) || 0));
    }
  }
  return cem;
}

/**
 * Əkin planı.
 *
 * @param {object} p
 * @param {string|null} p.bitki
 * @param {number|null} p.hektar
 * @param {Array} [p.sifarisler]   API-dən gələn sifarişlər
 * @param {Date}  [p.indi]
 * @returns {{hal: "hazir", setirler: PlanSetri[], cemiMebleg, alinanMebleg, qalanMebleg} | {hal: "bitkiYoxdur"|"saheYoxdur"|"planYoxdur"}}
 */
export function ekinPlani({ bitki, hektar, sifarisler = [], indi = new Date() }) {
  if (!bitki) return { hal: "bitkiYoxdur" };
  if (!Number.isFinite(hektar) || hektar <= 0) return { hal: "saheYoxdur" };
  const plan = PLAN[bitki];
  if (!plan) return { hal: "planYoxdur" };

  const xercler = kateqoriyaXercleri(sifarisler, indi);

  // Kateqoriya başına qruplaşdırma — plan sırası qorunur
  const qruplar = new Map();
  for (const setir of plan) {
    const mehsul = mehsulTap(setir.mehsul);
    if (!mehsul) continue;
    // sayHa 0 = "bir dəfə, hektardan asılı olmadan" (aqronom baxışı)
    const say = setir.sayHa === 0 ? 1 : Math.max(mehsul.minSay, Math.ceil(setir.sayHa * hektar));
    const cemi = qepik(mehsul.qiymet * say);
    if (!qruplar.has(mehsul.kateqoriya)) qruplar.set(mehsul.kateqoriya, []);
    qruplar.get(mehsul.kateqoriya).push({ kod: mehsul.kod, ad: mehsul.ad, say, cemi });
  }

  const setirler = [...qruplar.entries()].map(([kateqoriya, mehsullar]) => {
    const lazimMebleg = qepik(mehsullar.reduce((c, m) => c + m.cemi, 0));
    const alinanMebleg = qepik(xercler.get(kateqoriya) ?? 0);
    const ehate = lazimMebleg > 0 ? Math.min(1, alinanMebleg / lazimMebleg) : 1;
    return { kateqoriya, mehsullar, lazimMebleg, alinanMebleg, ehate };
  });

  const cemiMebleg = qepik(setirler.reduce((c, s) => c + s.lazimMebleg, 0));
  const alinanMebleg = qepik(setirler.reduce((c, s) => c + Math.min(s.alinanMebleg, s.lazimMebleg), 0));

  return {
    hal: "hazir",
    setirler,
    cemiMebleg,
    alinanMebleg,
    qalanMebleg: qepik(Math.max(0, cemiMebleg - alinanMebleg)),
  };
}
