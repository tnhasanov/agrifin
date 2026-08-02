import * as storage from "../lib/storage.js";

// Peyk 2–3 gündən bir keçir, hesablama isə 5 günlük dövrlərlədir — gündə
// bir neçə dəfə soruşmağın mənası yoxdur. Keş həm gecikməni, həm də
// Copernicus-un emal kvotasını qoruyur.
export const KES_MS = 12 * 60 * 60 * 1000;
const KES_ACAR = "ndvi";
const SEKIL_ACAR = "ndviSekil";

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
    quraq: nemlik != null ? nemlik < 0 : null,
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
    return { seriya: kes.seriya, kohne: false, menbe: kes.menbe };
  }

  try {
    const cavab = await fetch("/api/ndvi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ noqteler, gun }),
    });

    if (!cavab.ok) {
      const xeta = new Error(`ndvi ${cavab.status}`);
      xeta.status = cavab.status;
      throw xeta;
    }

    const { seriya = [], menbe } = await cavab.json();
    storage.write(KES_ACAR, { acar, vaxt: Date.now(), seriya, menbe });
    return { seriya, kohne: false, menbe };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    // Şəbəkə yoxdursa köhnə ölçmə heç nədən yaxşıdır
    if (uygun && kes.seriya?.length) return { seriya: kes.seriya, kohne: true, menbe: kes.menbe };
    throw error;
  }
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
