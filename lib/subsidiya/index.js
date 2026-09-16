import { KAMPANIYALAR, QAYDALAR_2026, SUVARMA_NOVLERI, tarifYoxlanib } from "./qaydalar2026.js";
import { sonIsGunu as teqvimSonIsGunu, teqvimTamdir, TEQVIM_2026 } from "./teqvim.js";

export { sonIsGunu, isGunudur, TEQVIM_2026 } from "./teqvim.js";
export { KAMPANIYALAR, QAYDALAR_2026, QAYDALAR_2026_27, TARIFLER, MEHSUL_SUBSIDIYASI, SERTIFIKATLI_TOXUM, BITKI_QRUPU } from "./qaydalar2026.js";
export { MENBELER } from "./menbeler.js";

/**
 * SUBSİDİYA MÜHƏRRİKİ — saf funksiyalar, vaxt kənardan gəlir.
 *
 * Çıxış üç ayrı vəziyyət daşıyır:
 *   estimateStatus:    "hesablanib" | "araliq" | "mehsulModeli" |
 *                      "menbeLazim" | "saheYoxdur" | "bitkiYoxdur"
 *   eligibilityStatus: "yoxlanmayib" | "tesdiq" | "redd" — mühərrik HEÇ
 *                      VAXT özü "tesdiq" vermir; yalnız giriş kimi qəbul edir
 *   sourceVerified:    istifadə olunan HƏR tarif rəsmi mənbə ilə
 *                      tutuşdurulubsa true (URL + qərar tarixi + yoxlama tarixi)
 *
 * KREDİT: yalnız sourceVerified && eligibilityStatus === "tesdiq" && tək
 * üsul hesablanıbsa məbləğ > 0. Əks halda 0.
 *
 * KAMPANİYA VERSİYASI: `kampaniya` parametri hansı qayda dəstini seçir.
 * Nəticə `kampaniya` və `qaydalarVersiyasi` daşıyır; yeni kampaniya əlavə
 * olunanda köhnə hesablamalar dəyişmir (test bunu qoruyur).
 */

/** Store-un yoxladığı üsul siyahısı — köhnə adla saxlanılır */
export const SUVARMA_USULLARI = SUVARMA_NOVLERI;

const yuvarla = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const tarixe = (d) => (d instanceof Date ? d : new Date(d));

function qaydalariSec(kampaniya, qaydalar) {
  if (qaydalar) return qaydalar;
  return KAMPANIYALAR[kampaniya] ?? QAYDALAR_2026;
}

/** Bitkinin tarif qrupu; siyahıda yoxdursa null */
export function bitkiQrupu(bitki, qaydalar = QAYDALAR_2026) {
  return qaydalar.bitkiQrupu?.[bitki] ?? null;
}

/** Bitki üçün həqiqi tarifi olan suvarma üsulları — YALNIZ bunlar göstərilir */
export function bitkiUsullari(bitki, qaydalar = QAYDALAR_2026) {
  const qrup = bitkiQrupu(bitki, qaydalar);
  const cedvel = qrup ? qaydalar.tarifler?.[qrup] : null;
  if (!cedvel) return [];
  return SUVARMA_NOVLERI.filter((u) => cedvel[u] != null);
}

/** Bitki + üsul üçün tarif (metadata ilə); yoxdursa null */
export function tarifTap(bitki, suvarma, qaydalar = QAYDALAR_2026) {
  const qrup = bitkiQrupu(bitki, qaydalar);
  return qrup ? (qaydalar.tarifler?.[qrup]?.[suvarma] ?? null) : null;
}

/**
 * Müraciət dövrü: bitkiyə (payızlıq/yazlıq) və ya təkrar əkinə görə.
 * @returns {{nov, baslangic: Date, son: Date, hal, sonIsGunu: boolean, teqvimTam: boolean}|null}
 */
export function muracietDovru({ bitki, tekrarEkin = false, indi = new Date(), kampaniya = "2026", qaydalar = null } = {}) {
  const q = qaydalariSec(kampaniya, qaydalar);
  if (!q.dovr) return null;
  const il = q.campaignYear;
  let nov = null;
  if (tekrarEkin) nov = "tekrar";
  else if (q.dovr.payizliq.bitkiler.includes(bitki)) nov = "payizliq";
  else if (q.dovr.yazliq.bitkiler.includes(bitki)) nov = "yazliq";
  if (!nov) return null;

  const d = q.dovr[nov];
  const teqvim = q.teqvim ?? TEQVIM_2026;
  const [bAy, bGun] = d.baslangic.split("-").map(Number);
  const [sAy, sGun] = d.son.split("-").map(Number);
  const baslangic = new Date(Date.UTC(il, bAy - 1, bGun));
  const son = d.sonIsGunu ? teqvimSonIsGunu(il, sAy, teqvim) : new Date(Date.UTC(il, sAy - 1, sGun));
  // Son gün DAXİLDİR: həmin günün sonuna qədər açıqdır
  const sonDaxil = new Date(son.getTime() + 86_400_000 - 1);
  const t = tarixe(indi);
  const hal = t < baslangic ? "gozlenilir" : t > sonDaxil ? "bagli" : "acig";
  return {
    nov,
    baslangic,
    son,
    hal,
    sonIsGunu: Boolean(d.sonIsGunu),
    // Dəyişən bayramlar (Ramazan/Qurban) və köçürülmüş günlər yüklənməyibsə
    // "son iş günü" dekabr üçün dəqiqdir, digər aylar üçün natamamdır
    teqvimTam: teqvimTamdir(teqvim),
    sourceUrl: q.dovr.sourceUrl ?? null,
  };
}

/** Bir suvarma üsulu üçün əkin subsidiyası sətri */
function ekinSetri({ bitki, hektar, suvarma, qaydalar }) {
  const t = tarifTap(bitki, suvarma, qaydalar);
  if (!t) return null;
  return {
    suvarma,
    derece: t.derece,
    vahid: t.vahid,
    mebleg: yuvarla(t.derece * hektar),
    sourceVerified: tarifYoxlanib(t),
    tarif: { ...t },
  };
}

/** Uyğunluq qeydləri — hesablamaya girmir, yoxlama siyahısında görünür */
function uygunluqQeydleri({ bitki, qaydalar, sertifikatliToxum, sigorta, kooperativ, minimumdanAz }) {
  const q = [];
  const toxum = qaydalar.sertifikatliToxum;
  // Blanket tələb YOXDUR: qayda bilinmirsə "unknown", bilinirsə bitki siyahısına görə
  const toxumTelebi =
    toxum?.qayda === "unknown" || !Array.isArray(toxum?.bitkiler)
      ? "unknown"
      : toxum.bitkiler.includes(bitki);
  q.push({ acar: "sertifikatliToxum", teleb: toxumTelebi, deyer: sertifikatliToxum, hektarHeddi: toxum?.hektarHeddi ?? null, kampaniya: toxum?.kampaniya ?? null });
  q.push({ acar: "sigorta", teleb: qaydalar.uygunluq.sigorta.telebdir, deyer: sigorta });
  if (kooperativ) q.push({ acar: "kooperativ", teleb: false, deyer: true });
  if (minimumdanAz) q.push({ acar: "minHektar", teleb: true, deyer: false });
  return q;
}

/**
 * Fermerin sahəsi üçün subsidiya təxmini.
 *
 * @param {object} p
 * @param {string|null} p.bitki
 * @param {number|null} p.hektar            ölçülmüş (serverin) hektar
 * @param {number|null} [p.senedHektar]     sənəd üzrə hektar — verilibsə kiçiyi götürülür
 * @param {string|null} [p.rayonKod]
 * @param {"muasir"|"enenevi"|"demye"|null} [p.suvarma]  bilinmirsə ARALIQ qaytarılır
 * @param {boolean} [p.tekrarEkin]
 * @param {boolean|null} [p.sertifikatliToxum]
 * @param {boolean|null} [p.sigorta]
 * @param {boolean|null} [p.kooperativ]
 * @param {{salinmaIli, intensivlik, tingSixligi}|null} [p.bag]
 * @param {number|null} [p.mehsulMiqdari]   məhsul subsidiyası üçün ton (pambıq)
 * @param {"yoxlanmayib"|"tesdiq"|"redd"} [p.eligibilityStatus]  yalnız kənardan gəlir
 * @param {string} [p.kampaniya]            "2026" | "2026-27"
 * @param {Date} [p.indi]
 */
export function subsidiyaHesabla({
  bitki = null,
  hektar = null,
  senedHektar = null,
  rayonKod = null,
  suvarma = null,
  tekrarEkin = false,
  sertifikatliToxum = null,
  sigorta = null,
  kooperativ = null,
  bag = null,
  mehsulMiqdari = null,
  eligibilityStatus = "yoxlanmayib",
  kampaniya = "2026",
  indi = new Date(),
  qaydalar = null,
} = {}) {
  const q = qaydalariSec(kampaniya, qaydalar);
  const umumi = {
    kampaniya: q.kampaniya,
    campaignYear: q.campaignYear,
    qaydalarVersiyasi: q.versiya,
    versiya: q.versiya,
    menbe: { ...q.menbe },
    // Uyğunluq mühərrikdə TƏSDİQLƏNMİR: "tesdiq" yalnız kənar yoxlamadan gələ bilər
    eligibilityStatus: ["tesdiq", "redd"].includes(eligibilityStatus) ? eligibilityStatus : "yoxlanmayib",
    rayonKod,
    kreditLimitindeNezereAlinan: 0,
  };

  const olculmus = Number(hektar);
  if (!Number.isFinite(olculmus) || olculmus <= 0) return { ...umumi, estimateStatus: "saheYoxdur", sourceVerified: false };
  if (!bitki) return { ...umumi, estimateStatus: "bitkiYoxdur", sourceVerified: false };

  // Hektar: sənəd üzrə və ölçülmüşün KİÇİYİ; minimum hədd bilinirsə tətbiq olunur
  const sened = Number(senedHektar);
  const esasHektar = Number.isFinite(sened) && sened > 0 ? Math.min(sened, olculmus) : olculmus;
  const { minHektar } = q.uygunluq;
  const minimumdanAz =
    (minHektar.olculmus != null && olculmus < minHektar.olculmus) ||
    (minHektar.sened != null && Number.isFinite(sened) && sened < minHektar.sened);

  const qeydler = uygunluqQeydleri({ bitki, qaydalar: q, sertifikatliToxum, sigorta, kooperativ, minimumdanAz });
  const dovr = muracietDovru({ bitki, tekrarEkin, indi, qaydalar: q });

  // Çatışmayan məlumatlar — UI ayrıca siyahı kimi göstərir
  const catismayanMelumatlar = [];
  if (umumi.eligibilityStatus !== "tesdiq") catismayanMelumatlar.push("uygunluq");
  if (qeydler.some((x) => x.acar === "sertifikatliToxum" && x.teleb === "unknown")) catismayanMelumatlar.push("toxumQaydasi");

  const esas = {
    ...umumi,
    bitki,
    hektar: esasHektar,
    olculmusHektar: olculmus,
    senedHektar: Number.isFinite(sened) && sened > 0 ? sened : null,
    tekrarEkin,
    dovr,
    uygunluqQeydleri: qeydler,
    catismayanMelumatlar,
  };

  // ── Bağlar: ölçülər var, dərəcə yoxdur → mənbə lazımdır ────────────
  if (q.bag.bitkiler.includes(bitki)) {
    return {
      ...esas,
      estimateStatus: "menbeLazim",
      sourceVerified: false,
      bag: bag ?? { salinmaIli: null, intensivlik: null, tingSixligi: null },
      catismayan: ["bag.derece"],
    };
  }

  // ── Məhsul subsidiyası (pambıq): hektar matrisində YOXDUR ────────────
  const mehsul = q.mehsul?.[bitki] ?? null;
  if (mehsul) {
    const miqdar = Number(mehsulMiqdari);
    const miqdarVar = Number.isFinite(miqdar) && miqdar > 0;
    const dereceler = mehsul.variantlar.map((v) => v.derece);
    const sourceVerified = tarifYoxlanib(mehsul) && mehsul.sertler !== "unknown";
    catismayanMelumatlar.push("mehsulMiqdari", "mehsulSertleri");
    if (!sourceVerified) catismayanMelumatlar.push("menbeYoxlanisi");
    return {
      ...esas,
      estimateStatus: "mehsulModeli",
      sourceVerified,
      ekin: null,
      mehsul: {
        vahid: mehsul.vahid,
        variantlar: mehsul.variantlar.map((v) => ({ ...v })),
        min: Math.min(...dereceler),
        max: Math.max(...dereceler),
        sertler: mehsul.sertler,
        miqdar: miqdarVar ? miqdar : null,
        // Miqdar bilinirsə aralıq məbləğ — yenə də təsdiqsizdir
        mebleg: miqdarVar ? { min: yuvarla(Math.min(...dereceler) * miqdar), max: yuvarla(Math.max(...dereceler) * miqdar) } : null,
        sourceUrl: mehsul.sourceUrl,
        sourceTitle: mehsul.sourceTitle,
        decisionDate: mehsul.decisionDate,
        verifiedAt: mehsul.verifiedAt,
      },
      catismayan: ["mehsul.sertler", ...(miqdarVar ? [] : ["mehsul.miqdar"])],
    };
  }

  // ── Əkin subsidiyası: bitkinin REAL tarifləri üzrə ────────────────
  const usullar = bitkiUsullari(bitki, q);
  if (!usullar.length) {
    return {
      ...esas,
      estimateStatus: "menbeLazim",
      sourceVerified: false,
      catismayan: [`tarif.${q.kampaniya}.${bitkiQrupu(bitki, q) ?? bitki}`],
    };
  }
  if (suvarma && !usullar.includes(suvarma)) {
    // Seçilən üsul üçün rəsmi tarif yoxdur — 0 uydurulmur
    return {
      ...esas,
      estimateStatus: "menbeLazim",
      sourceVerified: false,
      suvarma,
      catismayan: [`tarif.${q.kampaniya}.${bitkiQrupu(bitki, q)}.${suvarma}`],
      ekin: { usullar, setirler: [] },
    };
  }
  if (tekrarEkin) {
    // Təkrar əkin üçün ayrıca tarif/əmsal mənbədə yoxdur
    return {
      ...esas,
      estimateStatus: "menbeLazim",
      sourceVerified: false,
      suvarma,
      catismayan: [`tarif.${q.kampaniya}.tekrarEkin`],
      ekin: { usullar, setirler: [] },
    };
  }

  const secilen = suvarma ? [suvarma] : usullar;
  const setirler = secilen.map((u) => ekinSetri({ bitki, hektar: esasHektar, suvarma: u, qaydalar: q }));
  const mebleger = setirler.map((s) => s.mebleg);
  const sourceVerified = setirler.every((s) => s.sourceVerified);
  if (!suvarma) catismayanMelumatlar.unshift("suvarma");
  if (!sourceVerified) catismayanMelumatlar.push("menbeYoxlanisi");

  const netice = {
    ...esas,
    estimateStatus: suvarma ? "hesablanib" : "araliq",
    sourceVerified,
    suvarma: suvarma ?? null,
    ekin: {
      min: Math.min(...mebleger),
      max: Math.max(...mebleger),
      deyer: suvarma ? mebleger[0] : null,
      derece: suvarma ? setirler[0].derece : null,
      usullar,
      setirler,
    },
    mehsul: null,
    // Nəticənin mənbəsi istifadə olunan tarifdən (surət)
    menbe: {
      sourceUrl: setirler[0].tarif.sourceUrl,
      sourceTitle: setirler[0].tarif.sourceTitle,
      decisionDate: setirler[0].tarif.decisionDate,
      effectiveFrom: setirler[0].tarif.effectiveFrom,
      effectiveTo: setirler[0].tarif.effectiveTo,
      campaignYear: setirler[0].tarif.campaignYear,
      verifiedAt: setirler[0].tarif.verifiedAt,
    },
  };
  netice.kreditLimitindeNezereAlinan = kreditUcunSubsidiya(netice);
  return netice;
}

/**
 * KREDİT TAVANINA GEDƏN MƏBLƏĞ. Yalnız tarif rəsmi mənbə ilə tutuşdurulub
 * VƏ fermerin uyğunluğu kənardan təsdiqlənib VƏ üsul bilinirsə. Əks halda 0.
 */
export function kreditUcunSubsidiya(netice) {
  if (!netice || netice.estimateStatus !== "hesablanib") return 0;
  if (!netice.sourceVerified || netice.eligibilityStatus !== "tesdiq") return 0;
  return netice.ekin.deyer;
}

/**
 * Gəlir modelinin oxuduğu hektar dərəcələri (₼/ha, bitki üzrə).
 *
 * Fermerin uyğunluğu ümumi modeldə bilinmədiyi üçün HAMISI 0-dır — tarif
 * yoxlanmış olsa belə. Fərdi kredit hesablamasında `kreditUcunSubsidiya`
 * işlədilir. Açar dəsti tətbiqin bütün bitkilərini əhatə edir.
 */
export function kreditUcunHektarDereceleri(qaydalar = QAYDALAR_2026) {
  const bitkiler = [...Object.keys(qaydalar.bitkiQrupu), ...Object.keys(qaydalar.mehsul ?? {}), ...qaydalar.bag.bitkiler];
  return Object.fromEntries(bitkiler.map((b) => [b, 0]));
}
