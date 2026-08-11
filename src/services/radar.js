import * as storage from "../lib/storage.js";
import { KES_MS, saheAcari } from "./ndvi.js";

const RADAR_ACAR = "radar";

/** Sahənin bu qədər hissəsi su altındadırsa bu, artıq "sahədə su durub"dur */
export const SU_PAYI_HEDDI = 0.15;

/**
 * Səpilmə bu qədər dəyişibsə səbəb axtarmağa dəyər (dB).
 *
 * KALİBRLƏMƏ LAZIMDIR: 1,5 dB ədəbiyyatdakı tipik "mənalı dəyişmə" həddidir,
 * Azərbaycan torpaqlarında yoxlanılmayıb. Bundan aşağısı ölçmə səs-küyü ilə
 * qarışır — peykin öz təkrarlanma xətası ~0,5 dB-dir.
 */
export const DEYISME_HEDDI_DB = 1.5;

/**
 * Radar ölçməsinin xülasəsi.
 *
 * NƏ DEYİLİR: sahənin öz keçmişi ilə müqayisə ("nəmlik artıb") və durmuş su.
 * NƏ DEYİLMİR: torpaqdakı suyun faizi. Radar səpilməsinə su ilə yanaşı səthin
 * kələ-kötürlüyü və bitki örtüyü də təsir edir — mütləq rəqəm iddia etmək
 * uydurma olardı (bax: api/radar.js).
 *
 * Müqayisə bazası SON ölçmə deyil, ondan əvvəlki ölçmələrin MEDİANIdır: bir
 * keçidin öz səs-küyü nəticəni çevirməsin.
 *
 * @returns {null | {vv, tarix, suPayi, suVar, deyisme, istiqamet, olcmeSayi}}
 */
export function radarXulasesi(seriya) {
  if (!Array.isArray(seriya) || seriya.length === 0) return null;

  const son = seriya[seriya.length - 1];
  if (!Number.isFinite(son?.vv)) return null;

  const kecmis = seriya.slice(0, -1).map((n) => n.vv).filter(Number.isFinite);
  const baza = kecmis.length ? medyan(kecmis) : null;
  const deyisme = baza == null ? null : Math.round((son.vv - baza) * 10) / 10;

  return {
    vv: son.vv,
    tarix: son.son,
    suPayi: son.suPayi,
    // Durmuş su radarla ən etibarlı tapılan haldır: hamar su səthi dalğanı
    // geri qaytarmır, ona görə bu, təxmin yox, ölçmədir
    suVar: Number.isFinite(son.suPayi) && son.suPayi >= SU_PAYI_HEDDI,
    deyisme,
    // Səpilmə artıbsa torpaqda su artıb (su dielektrik keçiriciliyi qaldırır)
    istiqamet:
      deyisme == null || Math.abs(deyisme) < DEYISME_HEDDI_DB
        ? "sabit"
        : deyisme > 0
          ? "nemlenib"
          : "quruyub",
    olcmeSayi: seriya.length,
  };
}

function medyan(deyerler) {
  const sira = [...deyerler].sort((a, b) => a - b);
  const orta = Math.floor(sira.length / 2);
  return sira.length % 2 ? sira[orta] : (sira[orta - 1] + sira[orta]) / 2;
}

/**
 * Radar ölçməsi gətirilir.
 *
 * Keş NDVI ilə eyni müddətdədir; Sentinel-1 6–12 gündən bir keçir, ona görə
 * tez-tez soruşmaq emal kvotasını boş yerə xərcləyir.
 */
export async function fetchRadar({ noqteler, signal, mecburi = false } = {}) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) return null;

  const acar = saheAcari(noqteler);
  const kes = storage.read(RADAR_ACAR);
  if (!mecburi && kes && kes.acar === acar && Date.now() - kes.vaxt < KES_MS) {
    return kes.seriya;
  }

  const cavab = await fetch("/api/radar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ noqteler }),
  });

  if (!cavab.ok) {
    const xeta = new Error(`radar ${cavab.status}`);
    xeta.status = cavab.status;
    throw xeta;
  }

  const { seriya = [] } = await cavab.json();
  storage.write(RADAR_ACAR, { acar, vaxt: Date.now(), seriya });
  return seriya;
}
