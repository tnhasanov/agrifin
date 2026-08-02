import * as storage from "../lib/storage.js";

// Təqvim ayda bir dəfə dəyişir — keşi bir gün saxlamaq kifayətdir
const KES_MS = 24 * 60 * 60 * 1000;
const KES_ACAR = "teqvim";

/**
 * Bitkinin bu aykı mərhələsi və işləri.
 *
 * Bilik bazası serverdə qalır (bax: lib/knowledge.js); buradan yalnız bir
 * bitkinin bir aylıq hissəsi gəlir.
 */
export async function fetchTeqvim({ bitki, ay, signal } = {}) {
  if (!bitki || !Number.isInteger(ay)) return null;

  const acar = `${bitki}:${ay}`;
  const kes = storage.read(KES_ACAR);
  if (kes && kes.acar === acar && Date.now() - kes.vaxt < KES_MS) return kes.teqvim;

  const cavab = await fetch(`/api/teqvim?bitki=${encodeURIComponent(bitki)}&ay=${ay}`, { signal });
  if (!cavab.ok) {
    const xeta = new Error(`teqvim ${cavab.status}`);
    xeta.status = cavab.status;
    throw xeta;
  }

  const { teqvim = null } = await cavab.json();
  storage.write(KES_ACAR, { acar, vaxt: Date.now(), teqvim });
  return teqvim;
}
