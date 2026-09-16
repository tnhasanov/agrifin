/**
 * FARMSCORE V3 — KONSERVATİV VƏ AUDİT EDİLƏ BİLƏN VERSİYA.
 *
 * ═══ V2 İLƏ MÜNASİBƏT ═══════════════════════════════════════════════════
 * v2 (lib/mehsuldarliq.js → mehsuldarliqIndeksi) TOXUNULMAZ qalır:
 *   • verilmiş kredit qərarları v2 ilə verilib və v2 ilə oxunur;
 *   • qərar snapshot-ında `scoreVersion` yoxdursa o, v2-dir (bax:
 *     lib/kredit.js → snapshotVersiyasi);
 *   • v3 istehsal qərarına BİRBAŞA qoşulmur — kölgə rejimi (shadow):
 *     hər iki versiya paralel hesablanır, qərarı DEFOLT olaraq v2 verir,
 *     fərq audit üçün `girisler.farmScore` blokunda saxlanılır.
 *
 * v3 xam amilləri v2-nin hesablayıcılarından götürür (amillerCixar) —
 * yəni davamlılıq, vegetasiya, sabitlik və meyl EYNİ ölçülərdir. Fərq
 * bal verən qatdadır:
 *
 * ═══ V2-DƏN FƏRQLƏR ════════════════════════════════════════════════════
 * 1. ETİBAR BANDA TAVAN QOYUR. 3–4 ölçülə bilən mövsüm → ən çoxu "Orta";
 *    5–7 → ən çoxu "Yaxşı"; "Yüksək" yalnız 8+ mövsümdə mümkündür.
 *    Kritik müqayisə (ətraf medianı) yoxdursa bant verilmir (v2 kimi).
 * 2. BANT SƏRHƏDLƏRİ YUXARI ÇƏKİLİB: Yüksək 85–100, Yaxşı 70–84,
 *    Orta 50–69, Zəif 0–49 (v2: 80/60/40).
 * 3. NİSBİ PERFORMANS = QALİB PAYI × FƏRQİN BÖYÜKLÜYÜ. v2 yalnız neçə
 *    mövsümdə ətrafdan yuxarı olduğunu sayırdı: ətrafı 0.005 ilə ötmək də
 *    30/30 verirdi. v3-də iki dəlil AYRI-AYRI paya çevrilir və ZƏİF OLANI
 *    həddi qoyur (min). Tam 30 üçün mövsümlərin ≥85%-ində üstünlük VƏ
 *    median fərq ≥ +0.08 NDVI lazımdır. Hədlər SCORE_CONFIG_V3-dədir.
 * 4. PROXY QEYRİ-MÜƏYYƏNLİYİ BALDA CƏZALANMIR. "Yerli ətraf ≠ həmyaş
 *    qrupu", "zirvə NDVI ≠ AUC" — bunlar `methodology`/`missingInputs`
 *    sahələrində açıq qeyd olunur, amma eyni qeyri-müəyyənliyə görə iki
 *    dəfə xal çıxılmır (etibar tavanı onsuz da mövsüm sayı ilə işləyir).
 * 5. CARİ MÖVSÜM: aşağı NDVI yalnız əkin təqvimi (bitki mövsümdən
 *    kənardadır) və ya açıq fenoloji sübut ("bicilib"/"sepilmeyib") varsa
 *    "ölçülməyib" olur. Fenologiya bilinmirsə nəticə "qeyri-müəyyən"dir:
 *    nə xal, nə risk bayrağı — amma müsbət kredit artımı da yoxdur.
 * 6. ANDERRAYTİNQ MULTİPLİKATORU BALDAN AYRILIB: Yüksək 1.05, Yaxşı 1.00,
 *    Orta 0.90, Zəif 0.75, bal/bant yoxdur 0.85 + əl ilə baxış siqnalı.
 *    Cari risk (və ya qeyri-müəyyən cari mövsüm) varsa multiplikator
 *    1.00-dan yuxarı qalxmır.
 *
 * Bütün hədlər ekspert təklifidir — v2 kimi statistik kalibrlənməyib.
 */

import {
  EKIN_HEDDI,
  MIN_MOVSUM,
  SCORE_CONFIG,
  CARI_RISK,
  amillerCixar,
  melumatKeyfiyyeti,
  movsumleriHazirla,
} from "../mehsuldarliq.js";
import { movsumGedisi } from "../movsum.js";

export const SCORE_VERSION_V3 = "v3-conservative";

/**
 * BÜTÜN V3 HƏDLƏRİ BURADADIR — test edilir, kodun içinə səpələnmir.
 * Amil çəkiləri v2 ilə eynidir (15/30/20/15/10/10 = 100).
 */
export const SCORE_CONFIG_V3 = {
  versiya: SCORE_VERSION_V3,

  /** Bant sərhədləri (bal ≥ hedd) */
  bantlar: [
    { hedd: 85, ad: "yuksek" },
    { hedd: 70, ad: "yaxsi" },
    { hedd: 50, ad: "orta" },
    { hedd: 0, ad: "zeif" },
  ],

  /**
   * Etibar pillələri VƏ hər pillənin icazə verdiyi ən yüksək bant.
   * Ölçülə bilən mövsüm sayından çıxır (v2-nin ETIBAR_PILLELERI ilə eyni
   * pillələr, amma indi banda TƏSİR EDİR).
   */
  etibar: [
    { hedd: 8, ad: "yuksek", maxBant: "yuksek" },
    { hedd: 5, ad: "orta", maxBant: "yaxsi" },
    { hedd: MIN_MOVSUM, ad: "ilkin", maxBant: "orta" },
  ],

  /**
   * F2 · Nisbi performans — 30. İki dəlil, hər biri 0–1 paya çevrilir,
   * xal = maxXal × min(qalibPayi, ferqPayi).
   *   qalibPayi: ətraf medianından yuxarı olan mövsümlərin payı
   *   ferqPayi:  (zirvə − ətraf medianı) fərqlərinin medianı, NDVI vahidi
   */
  nisbiPerformans: {
    maxXal: 30,
    kritik: true,
    minMovsum: SCORE_CONFIG.nisbiPerformans.minMovsum,
    metodologiya: "proxy-yerli-etraf",
    birlesdirme: "min",
    qalibPayi: [
      { hedd: 0.85, pay: 1 },
      { hedd: 0.7, pay: 0.8 },
      { hedd: 0.5, pay: 0.55 },
      { hedd: 0.35, pay: 0.35 },
      { hedd: 0.2, pay: 0.15 },
      { hedd: -Infinity, pay: 0 },
    ],
    ferqPayi: [
      { hedd: 0.08, pay: 1 },
      { hedd: 0.05, pay: 0.75 },
      { hedd: 0.03, pay: 0.5 },
      { hedd: 0.01, pay: 0.3 },
      { hedd: 0, pay: 0.15 },
      { hedd: -Infinity, pay: 0 },
    ],
    /** Birləşmiş paydan səbəb kodu (v2-nin i18n açarları ilə eyni) */
    sebebler: [
      { hedd: 1, sebeb: "nisbi.ust" },
      { hedd: 0.75, sebeb: "nisbi.yuksek" },
      { hedd: 0.5, sebeb: "nisbi.orta" },
      { hedd: 0.3, sebeb: "nisbi.asagi" },
      { hedd: 0.0001, sebeb: "nisbi.zeif" },
      { hedd: -Infinity, sebeb: "nisbi.coxZeif" },
    ],
  },

  /** F6 · Cari mövsüm — bantlar v2 ilə eynidir, qapı fərqlidir (bax: 5) */
  cariVeziyyet: {
    maxXal: SCORE_CONFIG.cariVeziyyet.maxXal,
    metodologiya: "proxy-yerli-etraf",
    bantlar: SCORE_CONFIG.cariVeziyyet.bantlar,
    risk: CARI_RISK,
  },

  /** Anderraytinq multiplikatoru — banda görə, baldan ayrı */
  multiplikator: {
    yuksek: 1.05,
    yaxsi: 1.0,
    orta: 0.9,
    zeif: 0.75,
    yoxdur: 0.85,
    /** Cari risk / qeyri-müəyyən cari mövsüm: bundan yuxarı qalxmır */
    cariRiskTavani: 1.0,
  },
};

/** v2 amilləri v3-də dəyişmədən (eyni bantlar) istifadə olunur */
const V2_AMILLERI = ["davamliliq", "vegetasiya", "sabitlik", "sonMeyl"];

function bantTap(bantlar, deyer, tersdir = false) {
  for (const bant of bantlar) {
    if (tersdir ? deyer <= bant.hedd : deyer >= bant.hedd) return bant;
  }
  return bantlar[bantlar.length - 1];
}

function bantlariSec(amil, metodologiya) {
  if (Array.isArray(amil.bantlar)) return amil.bantlar;
  return amil.bantlar[metodologiya] ?? Object.values(amil.bantlar)[0];
}

const payTap = (cedvel, deyer) => bantTap(cedvel, deyer).pay;

/** Bant adını sıra nömrəsinə çevirir (0 = ən yüksək) */
const bantSirasi = (ad) => SCORE_CONFIG_V3.bantlar.findIndex((b) => b.ad === ad);

/** Bantın icazə verdiyi ən yüksək bal: növbəti bantın həddindən 1 az */
function bantinMaxBali(ad) {
  const sira = bantSirasi(ad);
  if (sira <= 0) return 100;
  return SCORE_CONFIG_V3.bantlar[sira - 1].hedd - 1;
}

function balaGoreBant(bal) {
  return (SCORE_CONFIG_V3.bantlar.find((b) => bal >= b.hedd) ?? SCORE_CONFIG_V3.bantlar.at(-1)).ad;
}

/**
 * F2 v3 — qalib payı × fərqin böyüklüyü.
 * @returns {{xal, sebeb, rawValue, detal}|null}
 */
export function nisbiPerformansV3({ ustde, hamisi, medyanFerq }) {
  const k = SCORE_CONFIG_V3.nisbiPerformans;
  if (!hamisi || hamisi < k.minMovsum) return null;
  const qalibPayi = ustde / hamisi;
  const ferq = Number.isFinite(medyanFerq) ? medyanFerq : -Infinity;
  const qalib = payTap(k.qalibPayi, qalibPayi);
  const boyukluk = payTap(k.ferqPayi, ferq);
  const birlesmis = Math.min(qalib, boyukluk);
  return {
    xal: Math.round(k.maxXal * birlesmis),
    sebeb: bantTap(k.sebebler, birlesmis).sebeb,
    rawValue: qalibPayi,
    detal: { ustde, hamisi, medyanFerq: Number.isFinite(medyanFerq) ? medyanFerq : null, qalibPayi: qalib, ferqPayi: boyukluk, birlesmis },
  };
}

/**
 * Cari mövsüm üçün fenoloji sübut varmı?
 *   "movsumXarici"  → əkin təqvimi bu ayı biçindən sonra / səpindən əvvəl sayır
 *   "sübut"         → cari.fenologiya açıq verilib ("bicilib" | "sepilmeyib")
 *   "bilinmir"      → nə bitki təqvimi, nə açıq sübut
 */
export function fenologiyaSubutu({ cari, bitki, indi }) {
  if (cari?.fenologiya === "bicilib" || cari?.fenologiya === "sepilmeyib") return "subut";
  if (bitki && movsumGedisi(bitki, indi) === null) return "movsumXarici";
  return "bilinmir";
}

/**
 * F6 v3 — cari mövsüm.
 * @returns {{olculub, hal, xal, maxXal, rawValue, sebeb, risk, qeyriMueyyen, catismayan}}
 */
export function cariVeziyyetV3({ cari, bitki, indi = new Date() }) {
  const k = SCORE_CONFIG_V3.cariVeziyyet;
  const bos = { olculub: false, xal: null, maxXal: k.maxXal, rawValue: null, risk: false, qeyriMueyyen: false, catismayan: null };
  if (!Number.isFinite(cari?.ndvi) || !Number.isFinite(cari?.etrafMedyan)) {
    return { ...bos, hal: "olculmeyib", sebeb: null, catismayan: "cari" };
  }
  if (cari.ndvi < EKIN_HEDDI) {
    const subut = fenologiyaSubutu({ cari, bitki, indi });
    if (subut !== "bilinmir") return { ...bos, hal: "olculmeyib", sebeb: "cari.ekinYox", subut };
    // Fenologiya bilinmir: aşağı örtük nə "biçilib", nə "pis becərilib" —
    // ölçü qeyri-müəyyəndir. Xal yoxdur, risk bayrağı yoxdur, amma
    // anderraytinqdə müsbət artım da yoxdur (bax: multiplikator).
    return { ...bos, hal: "qeyriMueyyen", sebeb: "cari.qeyriMueyyen", qeyriMueyyen: true, catismayan: "fenologiya", subut };
  }
  const ferq = Math.round((cari.ndvi - cari.etrafMedyan) * 1000) / 1000;
  const bant = bantTap(k.bantlar, ferq);
  return {
    olculub: true,
    hal: bant.sebeb.split(".")[1],
    xal: bant.xal,
    maxXal: k.maxXal,
    rawValue: ferq,
    sebeb: bant.sebeb,
    risk: bant.xal <= k.risk.xalHeddi && ferq <= k.risk.ferqHeddi,
    qeyriMueyyen: false,
    catismayan: null,
  };
}

/**
 * Anderraytinq multiplikatoru — banddan, cari riskdən və bant yoxluğundan.
 * @returns {{emsal, manualBaxis: boolean, sebebler: string[]}}
 */
export function multiplikatorHesabla({ bant, cariRisk = false, cariQeyriMueyyen = false }) {
  const m = SCORE_CONFIG_V3.multiplikator;
  const sebebler = [];
  let emsal;
  if (!bant) {
    emsal = m.yoxdur;
    sebebler.push("bantYoxdur");
  } else {
    emsal = m[bant];
  }
  if (cariRisk || cariQeyriMueyyen) {
    if (emsal > m.cariRiskTavani) emsal = m.cariRiskTavani;
    sebebler.push(cariRisk ? "cariRisk" : "cariQeyriMueyyen");
  }
  return { emsal, manualBaxis: sebebler.length > 0, sebebler };
}

const BOS_SETIR = (id, maxXal, sebeb = null) => ({
  id,
  key: id,
  rawValue: null,
  xal: null,
  maxXal,
  sebeb,
  olculub: false,
  metodologiya: null,
  detal: null,
});

/**
 * FarmScore v3.
 *
 * @param {object} p
 * @param {Array}  p.movsumler `{il, zirve, etrafMedyan, olcmeSayi?, aylar?}`
 * @param {object} [p.cari]    `{ndvi, etrafMedyan, fenologiya?}`
 * @param {string} [p.bitki]   əkin təqvimi üçün (cari mövsüm qapısı)
 * @param {Date}   [p.indi]
 * @param {number} [p.sonIl]
 *
 * @returns {null | object}  v2 ilə eyni skelet (hal, bal, bant, etibar,
 *   setirler, …) + v3 sahələri: scoreVersion, rawScore, adjustedScore,
 *   rawBand, adjustedBand, confidence, bandCapReason, methodology,
 *   underwritingMultiplier, currentRisk, missingInputs, manualReview.
 */
export function farmScoreV3({ movsumler = [], cari = null, bitki = null, indi = new Date(), sonIl } = {}) {
  const il = sonIl ?? indi.getFullYear();
  const keyfiyyet = melumatKeyfiyyeti({ movsumler, cari, sonIl: il });
  if (keyfiyyet.olculebilenMovsum === 0) return null;

  const confidence = SCORE_CONFIG_V3.etibar.find((p) => keyfiyyet.olculebilenMovsum >= p.hedd) ?? null;

  if (!keyfiyyet.kifayet || !confidence) {
    return {
      scoreVersion: SCORE_VERSION_V3,
      hal: "kifayetsiz",
      bal: null,
      bant: null,
      rawScore: null,
      adjustedScore: null,
      rawBand: null,
      adjustedBand: null,
      bantYoxdurSebebi: "tarixceAz",
      bandCapReason: "tarixceAz",
      confidence: null,
      etibar: null,
      movsumSayi: keyfiyyet.olculebilenMovsum,
      keyfiyyet,
      setirler: [],
      sebebler: { yaxsi: [], pis: [] },
      methodology: {},
      underwritingMultiplier: SCORE_CONFIG_V3.multiplikator.yoxdur,
      manualReview: { teleb: true, sebebler: ["tarixceAz"] },
      currentRisk: { hal: "olculmeyib", risk: false, qeyriMueyyen: false, ferq: null },
      missingInputs: ["movsum", ...keyfiyyet.catismayan.filter((c) => c !== "movsum")],
    };
  }

  const hazir = movsumleriHazirla(movsumler, il);
  const xam = amillerCixar(movsumler, cari, il);
  const setirler = [];
  const methodology = {};
  const missingInputs = new Set();
  let toplam = 0;
  let elcatanXal = 0;
  let kritikCatismir = false;

  // ── F1 · davamlılıq (v2 bantları) ──
  const push = (id, amil, xamDeyer) => {
    if (!Number.isFinite(xamDeyer?.deger)) {
      setirler.push(BOS_SETIR(id, amil.maxXal, xamDeyer?.sebeb ?? null));
      return;
    }
    const bant = bantTap(bantlariSec(amil, xamDeyer.metodologiya), xamDeyer.deger, amil.tersdir);
    setirler.push({
      id,
      key: id,
      rawValue: xamDeyer.deger,
      xal: bant.xal,
      maxXal: amil.maxXal,
      sebeb: bant.sebeb,
      olculub: true,
      metodologiya: xamDeyer.metodologiya,
      detal: xamDeyer.detal ?? null,
    });
    methodology[id] = xamDeyer.metodologiya;
    toplam += bant.xal;
    elcatanXal += amil.maxXal;
  };

  push("davamliliq", SCORE_CONFIG.davamliliq, xam.davamliliq);

  // ── F2 · nisbi performans (v3 düsturu) ──
  const nisbi = xam.nisbiPerformans?.detal ? nisbiPerformansV3(xam.nisbiPerformans.detal) : null;
  if (!nisbi) {
    kritikCatismir = true;
    missingInputs.add("muqayise");
    setirler.push(BOS_SETIR("nisbiPerformans", SCORE_CONFIG_V3.nisbiPerformans.maxXal));
  } else {
    setirler.push({
      id: "nisbiPerformans",
      key: "nisbiPerformans",
      rawValue: nisbi.rawValue,
      xal: nisbi.xal,
      maxXal: SCORE_CONFIG_V3.nisbiPerformans.maxXal,
      sebeb: nisbi.sebeb,
      olculub: true,
      metodologiya: SCORE_CONFIG_V3.nisbiPerformans.metodologiya,
      detal: nisbi.detal,
    });
    methodology.nisbiPerformans = SCORE_CONFIG_V3.nisbiPerformans.metodologiya;
    toplam += nisbi.xal;
    elcatanXal += SCORE_CONFIG_V3.nisbiPerformans.maxXal;
  }
  // Həmyaş qrupu HEÇ VAXT yoxdur (proxy) — qeyd, cəza deyil
  missingInputs.add("hemyasQrupu");

  // ── F3–F5 · v2 bantları ──
  push("vegetasiya", SCORE_CONFIG.vegetasiya, xam.vegetasiya);
  if (methodology.vegetasiya === "zirveProxy") missingInputs.add("ayliqSeriya");
  push("sabitlik", SCORE_CONFIG.sabitlik, xam.sabitlik);
  push("sonMeyl", SCORE_CONFIG.sonMeyl, xam.sonMeyl);
  if (!setirler.find((s) => s.id === "sonMeyl").olculub) missingInputs.add("meyl");

  // ── F6 · cari mövsüm (v3 qapısı) ──
  const cariV3 = cariVeziyyetV3({ cari, bitki, indi });
  setirler.push({
    id: "cariVeziyyet",
    key: "cariVeziyyet",
    rawValue: cariV3.rawValue,
    xal: cariV3.xal,
    maxXal: cariV3.maxXal,
    sebeb: cariV3.sebeb,
    olculub: cariV3.olculub,
    metodologiya: cariV3.olculub ? SCORE_CONFIG_V3.cariVeziyyet.metodologiya : null,
    detal: null,
  });
  if (cariV3.olculub) {
    methodology.cariVeziyyet = SCORE_CONFIG_V3.cariVeziyyet.metodologiya;
    toplam += cariV3.xal;
    elcatanXal += cariV3.maxXal;
  }
  if (cariV3.catismayan) missingInputs.add(cariV3.catismayan);

  // ── Bal və bantlar ──
  const rawScore = Math.max(0, Math.min(100, Math.round(toplam)));
  const rawBand = kritikCatismir ? null : balaGoreBant(rawScore);

  let bandCapReason = null;
  let adjustedScore = rawScore;
  let adjustedBand = rawBand;
  if (kritikCatismir) {
    bandCapReason = "muqayiseYoxdur";
  } else if (bantSirasi(rawBand) < bantSirasi(confidence.maxBant)) {
    // Etibar tavanı: bal tavanın icazə verdiyi ən yüksək bala ENDİRİLİR
    // ki, adjustedBand adjustedScore-dan birbaşa oxuna bilsin
    bandCapReason = `etibar.${confidence.ad}`;
    adjustedScore = Math.min(rawScore, bantinMaxBali(confidence.maxBant));
    adjustedBand = confidence.maxBant;
  }

  const { emsal, manualBaxis, sebebler: manualSebebler } = multiplikatorHesabla({
    bant: adjustedBand,
    cariRisk: cariV3.risk,
    cariQeyriMueyyen: cariV3.qeyriMueyyen,
  });

  const olculenler = setirler.filter((s) => s.olculub);
  const nisbet = (s) => s.xal / s.maxXal;
  const sirali = [...olculenler].sort((a, b) => nisbet(b) - nisbet(a));

  return {
    scoreVersion: SCORE_VERSION_V3,
    hal: "hazir",
    // v2 ilə eyni skelet (UI/hesabat eyni sahələri oxuyur)
    bal: adjustedScore,
    bant: adjustedBand,
    etibar: confidence.ad,
    bantYoxdurSebebi: kritikCatismir ? "muqayiseYoxdur" : null,
    elcatanXal,
    natamam: elcatanXal < 100,
    movsumSayi: keyfiyyet.olculebilenMovsum,
    keyfiyyet,
    setirler,
    sebebler: {
      yaxsi: sirali.filter((s) => nisbet(s) >= 0.75).slice(0, 2).map((s) => s.sebeb),
      pis: sirali.filter((s) => nisbet(s) < 0.5).slice(-2).map((s) => s.sebeb),
    },
    // v3 sahələri
    rawScore,
    adjustedScore,
    rawBand,
    adjustedBand,
    confidence: confidence.ad,
    bandCap: { maxBant: confidence.maxBant, movsumSayi: keyfiyyet.olculebilenMovsum },
    bandCapReason,
    methodology,
    underwritingMultiplier: emsal,
    manualReview: { teleb: manualBaxis, sebebler: manualSebebler },
    currentRisk: {
      hal: cariV3.hal,
      risk: cariV3.risk,
      qeyriMueyyen: cariV3.qeyriMueyyen,
      ferq: cariV3.rawValue,
      xal: cariV3.xal,
      maxXal: cariV3.maxXal,
      sebeb: cariV3.sebeb,
    },
    missingInputs: [...missingInputs],
    ekilmisMovsum: hazir.ekilmis.length,
  };
}
