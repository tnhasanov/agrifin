/**
 * KREDİT DOMENİ — vəziyyət maşını və anderraytinq. SAF FUNKSİYALAR.
 *
 * ═══ ZƏNCİRDƏ YERİ ════════════════════════════════════════════════════
 *   lib/mehsuldarliq.js → aqro indeks (sahə necə becərilir)
 *   lib/gelir.js        → gəlir aralığı (ümumi → xərc → XALİS)
 *   lib/odenis.js       → ödəniş qabiliyyəti (ehtiyat → DSTI tavanı)
 *   lib/kreditSertler.js→ limit düsturu (konservativ tavan)
 *   BU MODUL           → qərar: təsdiq/rədd, məbləğ, səbəblər, girişlər
 *   api/kredit.js      → HTTP + SQL (bu modulun nəticəsini yazır)
 *
 * ═══ NİYƏ SERVERDƏ ════════════════════════════════════════════════════
 * Prototipdə limit brauzerdə hesablanırdı. Klientin hesabladığı qabiliyyətə
 * inanmaq = istifadəçiyə öz limitini yazmağa icazə vermək. Bu modul eyni
 * saf funksiyaları SERVERDƏ işlədir; klient yalnız İSTƏNİLƏN məbləği
 * göndərir, bağlayıcı rəqəmi server hesablayır.
 *
 * ═══ QƏRARI TƏKRARLAMAQ ═══════════════════════════════════════════════
 * `girisler` qərar anındakı hər şeyin surətidir. Konfiqurasiya sabahı
 * dəyişsə də köhnə qərar izah oluna bilər — istinad deyil, SURƏT saxlanır.
 */

import { createHash } from "node:crypto";
import {
  mehsuldarliqIndeksi,
  cariVeziyyetHali,
  SCORE_CONFIG,
  BANTLAR,
  CARI_RISK,
} from "./mehsuldarliq.js";
import { gelirModeli, GELIR_CONFIG } from "./gelir.js";
import { odenisQabiliyyeti, ODENIS_CONFIG } from "./odenis.js";
import { KREDIT_SERTLERI, kreditTavani } from "./kreditSertler.js";
import { bicineQalanAy } from "./movsum.js";
import { farmScoreV3, SCORE_CONFIG_V3, SCORE_VERSION_V3 } from "./farmscore/v3.js";

/**
 * ═══ FARMSCORE V3 — KÖLGƏ REJİMİ (SHADOW) ═════════════════════════════
 * v3 (lib/farmscore/v3.js) istehsal qərarına BİRBAŞA QOŞULMUR. Rejimlər:
 *   "shadow" (DEFOLT) — v2 və v3 paralel hesablanır, qərarı v2 verir,
 *                        fərq `girisler.farmScore`-da saxlanılır (audit);
 *   "v2"              — yalnız v2 qərar verir (v3 yenə qeyd olunur);
 *   "v3"              — v3 multiplikatoru gəlir modelinə gedir, versiya
 *                        `v3-<hash>` olur. YALNIZ FARMSCORE_V3=on ilə.
 * Mövcud qərar snapshot-ları dəyişmir: `scoreVersion` olmayan snapshot v2-dir.
 */
export const FARMSCORE_REJIMLERI = ["shadow", "v2", "v3"];

export function farmScoreRejimi(env = typeof process !== "undefined" ? process.env : {}) {
  const deyer = String(env?.FARMSCORE_V3 ?? "").toLowerCase();
  if (deyer === "on" || deyer === "v3") return "v3";
  if (deyer === "off" || deyer === "v2") return "v2";
  return "shadow";
}

/** Qərar snapshot-ının bal versiyası: köhnə snapshot-larda sahə yoxdur → v2 */
export function snapshotVersiyasi(snapshot) {
  return snapshot?.scoreVersion ?? "v2";
}

/**
 * Deyərləri sabit sıra ilə mətnə çevirir: açarlar rekursiv sıralanır ki,
 * eyni konfiqurasiya HƏMİŞƏ eyni sətri (deməli eyni hash-ı) versin.
 */
export function kanonik(deyer) {
  if (Array.isArray(deyer)) return `[${deyer.map(kanonik).join(",")}]`;
  if (deyer && typeof deyer === "object") {
    const acarlar = Object.keys(deyer).sort();
    return `{${acarlar.map((a) => `${JSON.stringify(a)}:${kanonik(deyer[a])}`).join(",")}}`;
  }
  return JSON.stringify(deyer) ?? "null";
}

/** Konfiqurasiya paketindən deterministik versiya: <prefiks>-<sha256-nin ilk 12-si> */
export function versiyaHesabla(konfiq, prefiks = "v2") {
  return `${prefiks}-${createHash("sha256").update(kanonik(konfiq)).digest("hex").slice(0, 12)}`;
}

/**
 * Qərara təsir edən BÜTÜN konfiqurasiya — versiyanın girişi.
 *
 * Əvvəlki v1 yalnız maxXal-ları və iki payı görürdü: bant hədləri, ssenari
 * əmsalları, qiymət/xərc normaları dəyişəndə versiya EYNİ qalırdı — köhnə
 * qərar "eyni qaydalarla verilib" deyə yalan danışırdı. İndi bu obyektin
 * İSTƏNİLƏN sahəsi dəyişəndə versiya dəyişir (test bunu qoruyur).
 * SCORE_CONFIG/GELIR_CONFIG/ODENIS_CONFIG saf datadır — funksiya yoxdur.
 */
export const VERSIYA_GIRISLERI = {
  bal: SCORE_CONFIG,
  bantlar: BANTLAR,
  cariRisk: CARI_RISK,
  gelir: GELIR_CONFIG,
  odenis: ODENIS_CONFIG,
  sertler: KREDIT_SERTLERI,
};

export const HESAB_VERSIYASI = versiyaHesabla(VERSIYA_GIRISLERI);

/** v3 rejimində qərarın versiyası: v2 paketinə v3 bal konfiqurasiyası əlavə olunur */
export const VERSIYA_GIRISLERI_V3 = { ...VERSIYA_GIRISLERI, balV3: SCORE_CONFIG_V3 };
export const HESAB_VERSIYASI_V3 = versiyaHesabla(VERSIYA_GIRISLERI_V3, "v3");

// ── Vəziyyət maşınları ──────────────────────────────────────────────────
// Keçidlər AÇIQ siyahıdır: "status = approved" göndərmək mümkün deyil,
// server yalnız icazəli keçidi yazır.

export const MURACIET_KECIDLERI = {
  submitted: ["reviewing", "rejected", "cancelled"],
  reviewing: ["approved", "rejected", "cancelled"],
  approved: ["offer_issued", "cancelled"],
  offer_issued: ["accepted", "rejected", "expired", "cancelled"],
  accepted: [],
  rejected: [],
  cancelled: [],
  expired: [],
};

export const TEKLIF_KECIDLERI = {
  issued: ["accepted", "rejected", "expired", "superseded"],
  accepted: [],
  rejected: [],
  expired: [],
  superseded: [],
};

export const KREDIT_KECIDLERI = {
  active: ["repaid", "closed", "written_off"],
  repaid: ["closed"],
  closed: [],
  written_off: [],
};

/** Müraciətin hələ "açıq" sayıldığı hallar — bazadakı unikal indekslə eyni */
export const ACIQ_HALLAR = ["submitted", "reviewing", "approved", "offer_issued"];

export function kecidMumkun(xerite, haradan, haraya) {
  return Boolean(xerite[haradan]?.includes(haraya));
}

// ── Giriş yoxlaması ─────────────────────────────────────────────────────

/**
 * Klientdən gələn məbləğ/müddət. Yalnız BUNLAR qəbul edilir — bal, gəlir,
 * limit və qərar klientdən ALINMIR.
 * @returns {{ok: true, mebleg, muddetAy} | {ok: false, sebeb}}
 */
export function murecietGirisi({ mebleg, muddetAy }) {
  const m = Number(mebleg);
  const ay = Number(muddetAy);
  if (!Number.isFinite(m) || m <= 0) return { ok: false, sebeb: "meblegYanlis" };
  if (m > KREDIT_SERTLERI.mumkunMaxMebleg) return { ok: false, sebeb: "meblegYanlis" };
  if (m < KREDIT_SERTLERI.minKredit) return { ok: false, sebeb: "meblegAzdir" };
  if (!Number.isInteger(ay) || ay < KREDIT_SERTLERI.minMuddetAy || ay > KREDIT_SERTLERI.maxMuddetAy) {
    return { ok: false, sebeb: "muddetYanlis" };
  }
  // Qəpik qəbul edilmir: kredit məbləği tam ədəddir
  return { ok: true, mebleg: Math.round(m), muddetAy: ay };
}

// ── Anderraytinq ────────────────────────────────────────────────────────

/**
 * Kredit qərarı.
 *
 * @param {object} p
 * @param {number} p.mebleg      istənilən əsas borc (₼) — yoxlanılmış
 * @param {number} p.muddetAy    istənilən müddət (ay) — yoxlanılmış
 * @param {object} p.sahe        {hektar, bitki, zona?} — SERVERDƏKİ sahə
 * @param {Array}  [p.movsumler] peyk tarixçəsi (server snapshot-undan)
 * @param {object} [p.cari]      {ndvi, etrafMedyan} — varsa
 * @param {Date}   [p.indi]
 * @param {"shadow"|"v2"|"v3"} [p.rejim]  FarmScore rejimi (defolt: mühitdən, shadow)
 *
 * @returns {{qerar, mebleg, muddetAy, sebebler, girisler, versiya}}
 */
export function anderraytinq({ mebleg, muddetAy, sahe, movsumler = [], cari = null, indi = new Date(), rejim = farmScoreRejimi() }) {
  const sebebler = [];
  const hektar = Number(sahe?.hektar);
  const bitki = sahe?.bitki ?? null;
  const v3Qerar = rejim === "v3";
  const versiya = v3Qerar ? HESAB_VERSIYASI_V3 : HESAB_VERSIYASI;

  // Peyk tarixçəsi olmadan da qərar verilir (indeks əmsalı 1.0 olur) —
  // mövcud kommersiya fərziyyəsi belədir. Amma bu, qərarın SƏBƏBLƏRİNDƏ
  // açıq yazılır: anderrayter dəlilin nə qədər olduğunu görməlidir.
  const indeks = movsumler.length ? mehsuldarliqIndeksi({ movsumler, cari }) : null;
  if (!indeks) sebebler.push("peykTarixcesiYoxdur");

  // v3 HƏMİŞƏ paralel hesablanır (kölgə) — qərara yalnız rejim "v3" olanda gedir
  const indeksV3 = movsumler.length ? farmScoreV3({ movsumler, cari, bitki, indi }) : null;

  const cariHal = cariVeziyyetHali(indeks);
  if (cariHal.risk) sebebler.push("cariMovsumRiski");

  // v2 əmsalı (bant cədvəlindən) və v3 multiplikatoru — audit üçün yan-yana
  const v2Emsal = GELIR_CONFIG.indeksTesiri[indeks?.bant ?? "yoxdur"] ?? 1;
  const v3Emsal = indeksV3?.underwritingMultiplier ?? SCORE_CONFIG_V3.multiplikator.yoxdur;
  const v3ManualBaxis = indeksV3 ? indeksV3.manualReview.teleb : true;
  if (v3Qerar && v3ManualBaxis) sebebler.push("manualBaxis");

  const gelir = gelirModeli({
    bitki,
    hektar,
    bant: v3Qerar ? (indeksV3?.adjustedBand ?? null) : (indeks?.bant ?? null),
    cariRisk: v3Qerar ? Boolean(indeksV3?.currentRisk?.risk) : cariHal.risk,
    indeksEmsali: v3Qerar ? v3Emsal : null,
  });

  const odenis = odenisQabiliyyeti({ gelir });
  const tavan = odenis.hal === "hazir" ? kreditTavani(odenis.qabiliyyet, muddetAy) : 0;

  // Girişlərin SURƏTİ — qərarı sonradan təkrarlamaq üçün
  const girisler = {
    versiya,
    zaman: indi.toISOString(),
    sahe: { hektar: Number.isFinite(hektar) ? hektar : null, bitki, zona: sahe?.zona ?? "aran" },
    peyk: {
      movsumSayi: movsumler.length,
      cariVar: Boolean(cari),
      // Peyk girişləri hazırda klientin yazdığı snapshot-dan gəlir
      // (bax: api/sahe.js). Mənbə qeyd olunur ki, sonradan server özü
      // Copernicus-a getdikdə fərq görünsün.
      menbe: movsumler.length ? "server_snapshot" : "yoxdur",
      // GİRİŞLƏRİN ÖZÜ DONDURULUR: peyk_snapshotlar sətri sonradan yenilənə
      // bilər (ON CONFLICT DO UPDATE), amma qərarın NƏYƏ baxdığı burada
      // dəyişməz qalmalıdır. Sıra kiçikdir (≤10 mövsüm × 5 ədəd) — xam
      // peyk şəkli yox, anderraytinqin işlətdiyi normallaşdırılmış
      // dəyərlər saxlanılır; hash sürətli tamlıq yoxlaması üçündür.
      movsumler: movsumler.map((movsum) => ({
        il: movsum.il,
        zirve: movsum.zirve,
        zirveAyi: movsum.zirveAyi,
        etrafMedyan: movsum.etrafMedyan,
        olcmeSayi: movsum.olcmeSayi,
      })),
      cari: cari ? { ndvi: cari.ndvi, etrafMedyan: cari.etrafMedyan } : null,
      hash: createHash("sha256")
        .update(kanonik({ movsumler, cari }))
        .digest("hex"),
    },
    // Snapshot-da bal versiyası AÇIQ yazılır: köhnə snapshot-larda sahə
    // yoxdur və onlar v2 kimi oxunur (snapshotVersiyasi)
    indeks: indeks
      ? { scoreVersion: "v2", bal: indeks.bal, bant: indeks.bant, etibar: indeks.etibar, setirler: indeks.setirler }
      : null,
    // ── FarmScore v3 kölgəsi — audit üçün fərq ────────────────────────
    farmScore: {
      rejim,
      qerarVersiyasi: v3Qerar ? SCORE_VERSION_V3 : "v2",
      v2: { bal: indeks?.bal ?? null, bant: indeks?.bant ?? null, etibar: indeks?.etibar ?? null, emsal: v2Emsal, cariRisk: cariHal.risk },
      v3: indeksV3
        ? {
            scoreVersion: indeksV3.scoreVersion,
            rawScore: indeksV3.rawScore,
            adjustedScore: indeksV3.adjustedScore,
            rawBand: indeksV3.rawBand,
            adjustedBand: indeksV3.adjustedBand,
            confidence: indeksV3.confidence,
            bandCapReason: indeksV3.bandCapReason,
            underwritingMultiplier: indeksV3.underwritingMultiplier,
            currentRisk: indeksV3.currentRisk,
            missingInputs: indeksV3.missingInputs,
            manualReview: indeksV3.manualReview,
          }
        : { scoreVersion: SCORE_VERSION_V3, underwritingMultiplier: v3Emsal, manualReview: { teleb: true, sebebler: ["peykTarixcesiYoxdur"] } },
      ferq: {
        emsal: Math.round((v3Emsal - v2Emsal) * 1000) / 1000,
        bantDeyisir: (indeks?.bant ?? null) !== (indeksV3?.adjustedBand ?? null),
      },
    },
    cariVeziyyet: { hal: cariHal.hal, risk: cariHal.risk, ferq: cariHal.ferq },
    gelir:
      gelir.hal === "hazir"
        ? {
            hal: "hazir",
            // Ümumi və xalis AYRI saxlanılır: 25% ehtiyat xalisdən çıxılır,
            // ümumidən yox — sonradan qarışdırmaq mümkün olmasın
            ssenariler: gelir.ssenariler.map((s) => ({
              ad: s.ad,
              ummumiGelir: s.ummumiGelir,
              xerc: s.xerc,
              xalisGelir: s.xalisGelir,
              subsidiya: s.subsidiya,
            })),
            ferziyyeler: gelir.ferziyyeler,
          }
        : { hal: gelir.hal, sebeb: gelir.sebeb },
    odenis:
      odenis.hal === "hazir"
        ? {
            hal: "hazir",
            qabiliyyet: odenis.qabiliyyet,
            ssenariler: odenis.ssenariler,
            ehtiyatPayi: ODENIS_CONFIG.dovriyyePayi,
            dstiTavani: ODENIS_CONFIG.dstiTavani,
            xebardarliqlar: odenis.xebardarliqlar,
          }
        : { hal: odenis.hal, sebeb: odenis.sebeb },
    limit: {
      tavan,
      istenilen: mebleg,
      muddetAy,
      illikFaiz: KREDIT_SERTLERI.illikFaiz,
      minKredit: KREDIT_SERTLERI.minKredit,
    },
  };

  // ── Qərar ──
  if (gelir.hal !== "hazir") {
    sebebler.push(gelir.sebeb ?? "gelirOlculmur");
    return { qerar: "rejected", mebleg: 0, muddetAy, sebebler, girisler, versiya };
  }
  if (tavan < KREDIT_SERTLERI.minKredit) {
    sebebler.push("qabiliyyetAzdir");
    return { qerar: "rejected", mebleg: 0, muddetAy, sebebler, girisler, versiya };
  }

  // İstənilən məbləğ tavandan çoxdursa RƏDD DEYİL, aşağı təklif: fermerin
  // sahəsi krediti daşıyır, sadəcə istədiyi qədər yox
  const tesdiq = Math.min(mebleg, tavan);
  if (tesdiq < mebleg) sebebler.push("limitAsagiSalinib");

  return { qerar: "approved", mebleg: tesdiq, muddetAy, sebebler, girisler, versiya };
}

/**
 * Müddət: biçinə qalan ay. Klient də eyni funksiyanı işlədir, amma
 * bağlayıcı dəyər SERVERDƏ hesablanır (klient onu şişirdə bilməsin).
 */
export function muddetTeyin(bitki, indi = new Date()) {
  return bicineQalanAy(bitki, indi) ?? KREDIT_SERTLERI.maxMuddetAy;
}
