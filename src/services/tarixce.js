import * as storage from "../lib/storage.js";
import { saheAcari } from "./ndvi.js";

const KES_ACAR = "tarixce";

// Tarixçə dəyişmir — keçmiş mövsümlər həmişəlik keşlənə bilər. 30 günlük
// müddət yalnız CARİ mövsümün zirvəsi böyüyə bildiyi üçündür.
export const KES_MS = 30 * 24 * 60 * 60 * 1000;

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
  if (!mecburi && kes && kes.acar === acar && Date.now() - kes.vaxt < KES_MS) {
    return kes.movsumler;
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
  storage.write(KES_ACAR, { acar, vaxt: Date.now(), movsumler });
  return movsumler;
}
