import * as storage from "../lib/storage.js";
import { saheAcari } from "./ndvi.js";

const KES_ACAR = "tarixce";

// Keş versiyası: server tərəfdə hesablama qaydası dəyişəndə artırılır.
// v2 — ətraf medianının oxunması düzəldildi (faizlik açarının formatı).
// Bu olmasa artıq keşlənmiş "medianı boş" nəticələr TTL bitənə qədər
// qalırdı və fermer düzəlişi saatlarla sonra görürdü.
const KES_VERSIYASI = 2;

// Tarixçə dəyişmir — keçmiş mövsümlər həmişəlik keşlənə bilər. 30 günlük
// müddət yalnız CARİ mövsümün zirvəsi böyüyə bildiyi üçündür.
export const KES_MS = 30 * 24 * 60 * 60 * 1000;

// Ətraf medianları alınmayıbsa nəticə YARIMÇIQDIR: indeksin iki amili
// ("ətrafla müqayisə" və dolayı yolla etibar) boş qalır. Belə nəticəni
// 30 gün saxlasaq müvəqqəti bir nasazlıq indeksi bir ay şikəst edir —
// qısa müddətdən sonra təkrar cəhd edilir.
export const YARIMCIQ_KES_MS = 6 * 60 * 60 * 1000;

/** Heç bir mövsümdə ətraf medianı yoxdursa nəticə yarımçıqdır */
export const yarimciqdir = (movsumler) =>
  !(movsumler ?? []).some((m) => Number.isFinite(m?.etrafMedyan));

/**
 * Sahənin çoxillik mövsüm tarixçəsi.
 *
 * Bu, tətbiqin ƏN BAHALI sorğusudur (9 illik arxiv + ətraf medianı), ona
 * görə keş uzundur və sorğu yalnız kontur dəyişəndə təkrarlanır.
 */
export async function fetchTarixce({ noqteler, signal, mecburi = false } = {}) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) return null;

  const acar = saheAcari(noqteler);
  const kes = storage.read(KES_ACAR);
  // Versiyası köhnə keş oxunmur: hesablama qaydası dəyişibsə saxlanan
  // nəticə artıq etibarlı deyil (versiyasız köhnə keşlər də bura düşür)
  if (kes && kes.acar === acar && kes.versiya === KES_VERSIYASI) {
    // Köhnə keşlərdə bayraq yoxdur — məzmundan çıxarılır. Bu, ətraf
    // nasazlığı vaxtı keşlənmiş "30 günlük şikəst" nəticələri də sağaldır.
    const muddet = yarimciqdir(kes.movsumler) ? YARIMCIQ_KES_MS : KES_MS;
    if (!mecburi && Date.now() - kes.vaxt < muddet) return kes.movsumler;
  }

  const cavab = await fetch("/api/tarixce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ noqteler }),
  });

  if (!cavab.ok) {
    const xeta = new Error(`tarixce ${cavab.status}`);
    xeta.status = cavab.status;
    throw xeta;
  }

  const { movsumler = [] } = await cavab.json();
  storage.write(KES_ACAR, { acar, versiya: KES_VERSIYASI, vaxt: Date.now(), movsumler });
  return movsumler;
}
