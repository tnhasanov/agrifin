import * as storage from "../lib/storage.js";

// Peyk 2–3 gündən bir keçir, hesablama isə 5 günlük dövrlərlədir — gündə
// bir neçə dəfə soruşmağın mənası yoxdur. Keş həm gecikməni, həm də
// Copernicus-un emal kvotasını qoruyur.
export const KES_MS = 12 * 60 * 60 * 1000;
const KES_ACAR = "ndvi";
const SEKIL_ACAR = "ndviSekil";
const QONSU_ACAR = "ndviQonsu";

/** Sahə dəyişdikdə keş etibarsızdır — açar konturdan çıxarılır */
export function saheAcari(noqteler) {
  return (noqteler ?? [])
    .map(([en, uz]) => `${en.toFixed(5)},${uz.toFixed(5)}`)
    .join(";");
}

/** Seriyanın son ölçüsü və istiqaməti — ekran və çat üçün xülasə */
export function xulase(seriya) {
  if (!Array.isArray(seriya) || seriya.length === 0) return null;

  const son = seriya[seriya.length - 1];
  // Müqayisə üçün ~2 həftə əvvəlki nöqtə (3 dövr = 15 gün)
  const evvel = seriya[Math.max(0, seriya.length - 4)];
  const ferq = evvel && evvel !== son ? Math.round((son.ndvi - evvel.ndvi) * 1000) / 1000 : null;

  // NDMI < 0 quraqlıq, 0–0.2 orta, > 0.2 kifayət qədər su deməkdir.
  // NDVI "zəifdir" deyir; bu, səbəbin su olub-olmadığını ayırd edir.
  const nemlik = Number.isFinite(son.nemlik) ? son.nemlik : null;

  return {
    ndvi: son.ndvi,
    nemlik,
    // Fermer üçün rəqəm yox, qərar lazımdır: suvarmalıyam, yoxsa yox
    suSeviyyesi: nemlik == null ? null : nemlik < 0 ? "az" : nemlik < 0.2 ? "orta" : "kafi",
    tarix: son.son,
    ferq,
    // Trend yalnız mənalı fərqdə göstərilir: ±0.02 ölçmə səs-küyüdür
    istiqamet: ferq == null || Math.abs(ferq) < 0.02 ? "sabit" : ferq > 0 ? "artir" : "azalir",
    olcmeSayi: seriya.length,
  };
}

/** Neçə gün əvvəl ölçülüb — "köhnə məlumat" xəbərdarlığı üçün */
export function necheGunEvvel(tarix, indi = Date.now()) {
  const ms = Date.parse(`${tarix}T12:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((indi - ms) / 86_400_000));
}

/**
 * Sahənin NDVI seriyasını gətirir.
 *
 * Keş açarı konturun özündən çıxarılır: fermer sahəni dəyişəndə köhnə
 * ölçmələr avtomatik etibarsız olur. Şəbəkə alınmasa köhnə keş qaytarılır
 * (`kohne: true`) — çöldə internet zəif olur, boş ekrandan yaxşıdır.
 */
export async function fetchNdvi({ noqteler, gun, signal, mecburi = false } = {}) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) return { seriya: [], kohne: false };

  const acar = saheAcari(noqteler);
  const kes = storage.read(KES_ACAR);
  const uygun = kes && kes.acar === acar;

  if (!mecburi && uygun && Date.now() - kes.vaxt < KES_MS) {
    return { seriya: kes.seriya, kecenIl: kes.kecenIl ?? null, kohne: false, menbe: kes.menbe };
  }

  try {
    const cavab = await fetch("/api/ndvi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      // Keçən ilin eyni tarixi də istənilir: fermerin öz sahəsi ilə müqayisə
      // qonşu müqayisəsindən də güclüdür (eyni sort, eyni torpaq)
      body: JSON.stringify({ noqteler, gun, kecenIl: true }),
    });

    if (!cavab.ok) {
      const xeta = new Error(`ndvi ${cavab.status}`);
      xeta.status = cavab.status;
      throw xeta;
    }

    const { seriya = [], kecenIl = null, menbe } = await cavab.json();
    storage.write(KES_ACAR, { acar, vaxt: Date.now(), seriya, kecenIl, menbe });
    return { seriya, kecenIl, kohne: false, menbe };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    // Şəbəkə yoxdursa köhnə ölçmə heç nədən yaxşıdır
    if (uygun && kes.seriya?.length) {
      return { seriya: kes.seriya, kecenIl: kes.kecenIl ?? null, kohne: true, menbe: kes.menbe };
    }
    throw error;
  }
}

/**
 * Bu ilki ölçməni keçən ilin eyni dövrü ilə müqayisə edir.
 *
 * Faiz yalnız keçən il mənalı bitki örtüyü varsa hesablanır: 0,05-lik
 * bazadan 0,1-ə qalxmaq "+100%" verir, bu isə fermeri çaşdırır.
 *
 * @returns {null | {ndvi, kecen, ferq, faiz, tarix, istiqamet}}
 */
export function illikMuqayise(ndvi, kecenIl) {
  if (!Number.isFinite(ndvi) || !Number.isFinite(kecenIl?.ndvi)) return null;
  const kecen = kecenIl.ndvi;
  const ferq = Math.round((ndvi - kecen) * 1000) / 1000;
  const faiz = kecen >= 0.1 ? Math.round((ferq / kecen) * 100) : null;
  return {
    ndvi,
    kecen,
    ferq,
    faiz,
    tarix: kecenIl.tarix,
    // ±0.03 mövsüm sürüşməsi və ölçmə səs-küyü həddindədir
    istiqamet: Math.abs(ferq) < 0.03 ? "eyni" : ferq > 0 ? "yaxsi" : "pis",
  };
}

/**
 * Sahəni ətrafdakı əkinlərin paylanmasında yerləşdirir.
 *
 * Median ilə müqayisə edilir, orta ilə yox: bir neçə çox zəif (və ya çox
 * güclü) sahə ortanı çəkir, median isə "tipik qonşu"nu göstərir.
 *
 * @returns {null | {pille, ferq, medyan, p25, p75, tarix, piksel}}
 *   pille: "ust" (üst çeyrək) | "yuxari" | "asagi" | "alt"
 */
export function qonsuMuqayisesi(ndvi, qonsu) {
  if (!qonsu || !Number.isFinite(ndvi)) return null;
  const { p25, medyan, p75 } = qonsu;
  if (![p25, medyan, p75].every(Number.isFinite)) return null;

  const pille = ndvi >= p75 ? "ust" : ndvi >= medyan ? "yuxari" : ndvi >= p25 ? "asagi" : "alt";
  // Faiz fərqi yalnız median mənalı olduqda: 0-a yaxın medianda faiz partlayır
  const ferq = medyan >= 0.05 ? Math.round(((ndvi - medyan) / medyan) * 100) : null;

  return { pille, ferq, medyan, p25, p75, tarix: qonsu.son, piksel: qonsu.piksel };
}

/**
 * Ətraf ərazinin NDVI paylanması. Ayrıca keşlənir və sahənin öz ölçmə
 * tarixi ötürülür ki, server EYNİ dövrü seçsin.
 */
export async function fetchQonsu({ noqteler, son, signal, mecburi = false } = {}) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) return null;

  const acar = `${saheAcari(noqteler)}|${son ?? ""}`;
  const kes = storage.read(QONSU_ACAR);
  if (!mecburi && kes && kes.acar === acar && Date.now() - kes.vaxt < KES_MS) {
    return kes.qonsu;
  }

  const cavab = await fetch("/api/qonsu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ noqteler, son }),
  });

  if (!cavab.ok) {
    const xeta = new Error(`qonsu ${cavab.status}`);
    xeta.status = cavab.status;
    throw xeta;
  }

  const { qonsu = null } = await cavab.json();
  storage.write(QONSU_ACAR, { acar, vaxt: Date.now(), qonsu });
  return qonsu;
}

/**
 * Sahənin NDVI xəritəsi (şəkil).
 *
 * Ayrıca keşlənir, çünki şəkil seriyadan xeyli ağırdır (~50–150 kB) və
 * eyni müddətdə dəyişmir. Keş dolubsa (localStorage kvotası) sükutla
 * keçirik — şəkil olmadan da tətbiq işləyir.
 */
export async function fetchSaheSekli({ noqteler, signal, mecburi = false } = {}) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) return null;

  const acar = saheAcari(noqteler);
  const kes = storage.read(SEKIL_ACAR);
  if (!mecburi && kes && kes.acar === acar && Date.now() - kes.vaxt < KES_MS) {
    return kes.netice;
  }

  const cavab = await fetch("/api/saheSekli", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ noqteler }),
  });

  if (!cavab.ok) {
    const xeta = new Error(`saheSekli ${cavab.status}`);
    xeta.status = cavab.status;
    throw xeta;
  }

  const netice = await cavab.json();
  // Kvota dolarsa write false qaytarır — şəkil yenə göstərilir, sadəcə keşlənmir
  storage.write(SEKIL_ACAR, { acar, vaxt: Date.now(), netice });
  return netice;
}
