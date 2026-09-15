import { QAYDALAR_2026 } from "./qaydalar2026.js";

/**
 * SUBSİDİYA MÜHƏRRİKİ — saf funksiyalar, vaxt kənardan gəlir.
 *
 * Girişlər fermerin sahəsindən gəlir (bitki, hektar, rayon) və fermerdən
 * soruşulur (suvarma üsulu, təkrar əkin, sertifikatlı toxum, sığorta,
 * kooperativ). Çıxış üç ayrı vəziyyət daşıyır:
 *   estimateStatus:    "hesablanib" | "araliq" | "menbeLazim" |
 *                      "saheYoxdur" | "bitkiYoxdur"
 *   eligibilityStatus: "yoxlanmayib" | "tesdiq" | "redd" — mühərrik HEÇ
 *                      VAXT özü "tesdiq" vermir; yalnız giriş kimi qəbul edir
 *   sourceVerified:    cədvəlin rəsmi mənbə ilə tutuşdurulma vəziyyəti
 *
 * KREDİT TAVANI: təsdiqsiz məbləğ ora girmir. `kreditUcunSubsidiya` yalnız
 * sourceVerified && eligibilityStatus === "tesdiq" olanda məbləğ qaytarır.
 */

export const SUVARMA_USULLARI = ["muasir", "enenevi", "demye"];
const yuvarla = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const tarixe = (d) => (d instanceof Date ? d : new Date(d));

/** Bu qaydalar cədvəlində açar yolu təsdiqlənibmi? */
export function yoxlanib(yol, qaydalar = QAYDALAR_2026) {
  return qaydalar.yoxlanmis.includes(yol);
}

/** Ayın son iş günü (şənbə/bazar atlanır) — UTC */
export function sonIsGunu(il, ay) {
  const d = new Date(Date.UTC(il, ay, 0)); // ayın son günü
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/**
 * Müraciət dövrü: bitkiyə (payızlıq/yazlıq) və ya təkrar əkinə görə.
 * @returns {{nov, baslangic: Date, son: Date, hal: "acig"|"gozlenilir"|"bagli", sonIsGunu: boolean}|null}
 */
export function muracietDovru({ bitki, tekrarEkin = false, indi = new Date(), qaydalar = QAYDALAR_2026 } = {}) {
  const il = qaydalar.campaignYear;
  let nov = null;
  if (tekrarEkin) nov = "tekrar";
  else if (qaydalar.dovr.payizliq.bitkiler.includes(bitki)) nov = "payizliq";
  else if (qaydalar.dovr.yazliq.bitkiler.includes(bitki)) nov = "yazliq";
  if (!nov) return null;

  const d = qaydalar.dovr[nov];
  const [bAy, bGun] = d.baslangic.split("-").map(Number);
  const [sAy, sGun] = d.son.split("-").map(Number);
  const baslangic = new Date(Date.UTC(il, bAy - 1, bGun));
  const son = d.sonIsGunu ? sonIsGunu(il, sAy) : new Date(Date.UTC(il, sAy - 1, sGun));
  // Son gün DAXİLDİR: həmin günün sonuna qədər açıqdır
  const sonDaxil = new Date(son.getTime() + 86_400_000 - 1);
  const t = tarixe(indi);
  const hal = t < baslangic ? "gozlenilir" : t > sonDaxil ? "bagli" : "acig";
  return { nov, baslangic, son, hal, sonIsGunu: Boolean(d.sonIsGunu) };
}

/** Bir suvarma üsulu üçün əkin subsidiyası sətri */
function ekinSetri({ bitki, hektar, suvarma, tekrarEkin, qaydalar }) {
  const { baza, bitkiEmsali, suvarma: suvarmaEmsali, tekrarEkinEmsali } = qaydalar.ekin;
  const bEmsal = bitkiEmsali[bitki];
  const sEmsal = suvarmaEmsali[suvarma];
  const tEmsal = tekrarEkin ? tekrarEkinEmsali : 1;
  if (bEmsal == null || sEmsal == null || tEmsal == null) return null;
  const derece = yuvarla(baza * bEmsal * sEmsal * tEmsal);
  return { suvarma, baza, bitkiEmsali: bEmsal, suvarmaEmsali: sEmsal, tekrarEmsali: tEmsal, derece, mebleg: yuvarla(derece * hektar) };
}

/** Sətrin bütün rəqəmləri rəsmi mənbə ilə tutuşdurulubmu? */
function setirYoxlanib(setir, bitki, tekrarEkin, qaydalar) {
  const yollar = ["ekin.baza", `bitkiEmsali.${bitki}`, `suvarma.${setir.suvarma}`];
  if (tekrarEkin) yollar.push("ekin.tekrarEkinEmsali");
  return yollar.every((y) => yoxlanib(y, qaydalar));
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
 * @param {"yoxlanmayib"|"tesdiq"|"redd"} [p.eligibilityStatus]  yalnız kənardan gəlir
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
  eligibilityStatus = "yoxlanmayib",
  indi = new Date(),
  qaydalar = QAYDALAR_2026,
} = {}) {
  const umumi = {
    campaignYear: qaydalar.campaignYear,
    versiya: qaydalar.versiya,
    menbe: qaydalar.menbe,
    // Uyğunluq mühərrikdə TƏSDİQLƏNMİR: "tesdiq" yalnız kənar yoxlamadan gələ bilər
    eligibilityStatus: ["tesdiq", "redd"].includes(eligibilityStatus) ? eligibilityStatus : "yoxlanmayib",
    rayonKod,
  };

  const olculmus = Number(hektar);
  if (!Number.isFinite(olculmus) || olculmus <= 0) return { ...umumi, estimateStatus: "saheYoxdur", sourceVerified: false };
  if (!bitki) return { ...umumi, estimateStatus: "bitkiYoxdur", sourceVerified: false };

  // Hektar: sənəd üzrə və ölçülmüşün KİÇİYİ; minimum hədd bilinirsə tətbiq olunur
  const sened = Number(senedHektar);
  const esasHektar = Number.isFinite(sened) && sened > 0 ? Math.min(sened, olculmus) : olculmus;
  const { minHektar } = qaydalar.ekin;
  const minimumdanAz =
    (minHektar.olculmus != null && olculmus < minHektar.olculmus) ||
    (minHektar.sened != null && Number.isFinite(sened) && sened < minHektar.sened);

  const uygunluqQeydleri = [];
  if (qaydalar.ekin.sertifikatliToxumTelebi.includes(bitki)) {
    uygunluqQeydleri.push({ acar: "sertifikatliToxum", teleb: true, deyer: sertifikatliToxum });
  }
  if (qaydalar.uygunluq.sigorta.telebdir) uygunluqQeydleri.push({ acar: "sigorta", teleb: true, deyer: sigorta });
  if (kooperativ) uygunluqQeydleri.push({ acar: "kooperativ", teleb: false, deyer: true });
  if (minimumdanAz) uygunluqQeydleri.push({ acar: "minHektar", teleb: true, deyer: false });

  const dovr = muracietDovru({ bitki, tekrarEkin, indi, qaydalar });

  // ── Bağlar: ölçülər var, dərəcə yoxdur → mənbə lazımdır ────────────
  if (qaydalar.bag.bitkiler.includes(bitki)) {
    return {
      ...umumi,
      estimateStatus: "menbeLazim",
      sourceVerified: false,
      hektar: esasHektar,
      bitki,
      bag: bag ?? { salinmaIli: null, intensivlik: null, tingSixligi: null },
      catismayan: ["bag.derece"],
      dovr,
      uygunluqQeydleri,
      kreditLimitindeNezereAlinan: 0,
    };
  }

  // ── Əkin subsidiyası: bir üsul və ya bütün üsullar üzrə aralıq ─────
  const usullar = suvarma ? [suvarma] : SUVARMA_USULLARI;
  const setirler = usullar.map((u) => ekinSetri({ bitki, hektar: esasHektar, suvarma: u, tekrarEkin, qaydalar })).filter(Boolean);
  if (!setirler.length) {
    const catismayan = [];
    if (qaydalar.ekin.bitkiEmsali[bitki] == null) catismayan.push(`bitkiEmsali.${bitki}`);
    if (tekrarEkin && qaydalar.ekin.tekrarEkinEmsali == null) catismayan.push("ekin.tekrarEkinEmsali");
    if (suvarma && qaydalar.ekin.suvarma[suvarma] == null) catismayan.push(`suvarma.${suvarma}`);
    return { ...umumi, estimateStatus: "menbeLazim", sourceVerified: false, hektar: esasHektar, bitki, catismayan, dovr, uygunluqQeydleri, kreditLimitindeNezereAlinan: 0 };
  }

  const mehsulDerecesi = qaydalar.mehsul[bitki] ?? null;
  const mebleger = setirler.map((s) => s.mebleg);
  const min = Math.min(...mebleger);
  const max = Math.max(...mebleger);
  const sourceVerified =
    setirler.every((s) => setirYoxlanib(s, bitki, tekrarEkin, qaydalar)) &&
    (mehsulDerecesi == null || yoxlanib(`mehsul.${bitki}`, qaydalar));

  const netice = {
    ...umumi,
    estimateStatus: suvarma ? "hesablanib" : "araliq",
    sourceVerified,
    bitki,
    hektar: esasHektar,
    olculmusHektar: olculmus,
    senedHektar: Number.isFinite(sened) && sened > 0 ? sened : null,
    suvarma: suvarma ?? null,
    tekrarEkin,
    ekin: { min, max, deyer: suvarma ? min : null, setirler },
    mehsul: mehsulDerecesi != null ? { derece: mehsulDerecesi, vahid: "ton", yoxlanib: yoxlanib(`mehsul.${bitki}`, qaydalar) } : null,
    dovr,
    uygunluqQeydleri,
    kreditLimitindeNezereAlinan: 0,
  };
  netice.kreditLimitindeNezereAlinan = kreditUcunSubsidiya(netice);
  return netice;
}

/**
 * KREDİT TAVANINA GEDƏN MƏBLƏĞ. Yalnız cədvəl rəsmi mənbə ilə tutuşdurulub
 * VƏ fermerin uyğunluğu kənardan təsdiqlənib VƏ üsul bilinirsə. Əks halda 0:
 * təsdiqsiz subsidiya borc qabiliyyətini şişirtməməlidir.
 */
export function kreditUcunSubsidiya(netice) {
  if (!netice || netice.estimateStatus !== "hesablanib") return 0;
  if (!netice.sourceVerified || netice.eligibilityStatus !== "tesdiq") return 0;
  return netice.ekin.deyer;
}

/**
 * Gəlir modelinin oxuduğu hektar dərəcələri (₼/ha, bitki üzrə).
 *
 * Cədvəl bütövlükdə rəsmi mənbə ilə tutuşdurulmayıbsa HAMISI 0-dır — və
 * tutuşdurulsa belə, fermerin uyğunluğu bilinmədiyi üçün ümumi modeldə
 * 0 qalır: uyğunluq fermer-fermer yoxlanır, bitki-bitki yox. Fərdi kredit
 * hesablamasında `kreditUcunSubsidiya` işlədilir.
 */
export function kreditUcunHektarDereceleri(qaydalar = QAYDALAR_2026) {
  return Object.fromEntries(Object.keys(qaydalar.ekin.bitkiEmsali).map((b) => [b, 0]));
}
