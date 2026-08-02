import * as storage from "../lib/storage.js";
import { KES_MS, saheAcari } from "./ndvi.js";

const KES_ACAR = "ndviZona";

/**
 * Sahənin kvadrantlara bölünmüş ölçməsi — hansı künc zəifdir.
 *
 * Ayrıca keşlənir: dörd Copernicus sorğusu deməkdir, ona görə eyni sahə
 * üçün gündə bir dəfədən çox soruşmuruq.
 */
export async function fetchZona({ noqteler, signal, mecburi = false } = {}) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) return null;

  const acar = saheAcari(noqteler);
  const kes = storage.read(KES_ACAR);
  if (!mecburi && kes && kes.acar === acar && Date.now() - kes.vaxt < KES_MS) {
    return kes.netice;
  }

  const cavab = await fetch("/api/zona", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ noqteler }),
  });

  if (!cavab.ok) {
    const xeta = new Error(`zona ${cavab.status}`);
    xeta.status = cavab.status;
    throw xeta;
  }

  const netice = await cavab.json();
  storage.write(KES_ACAR, { acar, vaxt: Date.now(), netice });
  return netice;
}
