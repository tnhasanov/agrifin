// api/zona.js — sahənin hansı küncü zəifdir.
//
// Xəritə problemi GÖSTƏRİR, amma fermer onu şərh etməlidir. Bu endpoint
// sahəni dörd kvadranta bölür, hər birini ayrıca ölçür və nəticəni cümləyə
// çevrilə bilən formaya salır: "şimal-şərq küncü 18% zəifdir".
//
// KALİBRLƏMƏ QEYDİ: kvadrant sərhədi əhatə çərçivəsindən çıxır, torpaq və ya
// suvarma xəritəsindən yox. Yəni "şimal-şərq" coğrafi kvadrantdır, aqronomik
// zona deyil. Sahə uzunsovdursa iki kvadrant boş qala bilər — onlar atılır.
import { MIN_NOQTE, kvadrantlar, merkeziEn, olcuDereceye } from "../lib/geoJson.js";
import {
  BAZA_URL,
  BULUD_SERTI,
  acarQurulub,
  acarlariGizle,
  diaqnostikaCavabi,
  ipTap,
  suretHeddiYarat,
  tokenAl,
} from "../lib/copernicus.js";

const STAT_URL = `${BAZA_URL}/statistics`;
const STANDART_GUN = 20;

// Sentinel-2-nin doğma ayırdetməsi — zonalar sahədaxili fərqi göstərməlidir,
// ona görə burada kobud ölçü işə yaramır
const OLCU_METR = 10;

// Bundan kiçik fərq ölçmə səs-küyüdür — fermeri sahənin o başına
// göndərməyə dəyməz
export const MIN_FERQ_FAIZ = 8;

// Kvadrantda bu qədər təmiz piksel yoxdursa ölçmə etibarsızdır
export const MIN_PIKSEL = 30;

export const maxDuration = 30;

const suretHeddiKecilib = suretHeddiYarat({ pencereMs: 10 * 60 * 1000, hedd: 20 });

const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  var pis = ${BULUD_SERTI};
  var ndvi = (s.B08 + s.B04) === 0 ? 0 : (s.B08 - s.B04) / (s.B08 + s.B04);
  return { ndvi: [ndvi], dataMask: [pis ? 0 : s.dataMask] };
}`;

const gunISO = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Bir kvadrantın cavabından son dövrün ortasını çıxarır */
export function kvadrantOxu(cavab) {
  const dovrler = Array.isArray(cavab?.data) ? cavab.data : [];
  let sonuncu = null;
  for (const dovr of dovrler) {
    const stats = dovr?.outputs?.ndvi?.bands?.B0?.stats;
    if (!stats || !Number.isFinite(stats.mean)) continue;
    if ((stats.sampleCount ?? 0) < MIN_PIKSEL) continue;
    const tarix = String(dovr.interval?.to ?? "").slice(0, 10);
    if (!sonuncu || tarix > sonuncu.tarix) {
      sonuncu = { ndvi: Math.round(stats.mean * 1000) / 1000, tarix, piksel: stats.sampleCount };
    }
  }
  return sonuncu;
}

/**
 * Ən zəif kvadrantı seçir — yalnız fərq mənalıdırsa.
 * @param {Array<{ad, ndvi}>} zonalar
 */
export function zeifTap(zonalar) {
  if (!Array.isArray(zonalar) || zonalar.length < 2) return null;

  const orta = zonalar.reduce((cem, z) => cem + z.ndvi, 0) / zonalar.length;
  if (!(orta > 0.05)) return null;

  const zeif = zonalar.reduce((a, b) => (a.ndvi <= b.ndvi ? a : b));
  const ferq = Math.round(((zeif.ndvi - orta) / orta) * 100);
  if (Math.abs(ferq) < MIN_FERQ_FAIZ) return null;

  return { ad: zeif.ad, ndvi: zeif.ndvi, ferq, orta: Math.round(orta * 1000) / 1000 };
}

async function kvadrantSorgusu({ polygon, olcu, token, from, to }) {
  const cavab = await fetch(STAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      input: {
        bounds: {
          geometry: polygon,
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
        },
        data: [{ type: "sentinel-2-l2a", dataFilter: { mosaickingOrder: "leastCC" } }],
      },
      aggregation: {
        timeRange: { from, to },
        aggregationInterval: { of: "P10D" },
        evalscript: EVALSCRIPT,
        resx: olcu.resx,
        resy: olcu.resy,
      },
      calculations: { ndvi: { statistics: { default: {} } } },
    }),
  });

  if (!cavab.ok) {
    const xeta = new Error(`zona ${cavab.status}`);
    xeta.status = cavab.status;
    throw xeta;
  }
  return kvadrantOxu(await cavab.json());
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(await diaqnostikaCavabi());
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnız POST" });
  }
  if (!acarQurulub()) {
    return res.status(501).json({ error: "Peyk inteqrasiyası hələ qurulmayıb." });
  }
  if (suretHeddiKecilib(ipTap(req))) {
    return res.status(429).json({ error: "Çox sorğu göndərildi. Bir az sonra yoxlayın." });
  }

  try {
    const { noqteler } = req.body || {};
    const hisseler = kvadrantlar(noqteler);
    if (!hisseler) {
      return res.status(400).json({ error: `Sahə konturu yararsızdır (ən azı ${MIN_NOQTE} künc).` });
    }

    // resx/resy EPSG:4326-da DƏRƏCƏdir (bax: lib/geoJson.js, olcuDereceye)
    const olcu = olcuDereceye(OLCU_METR, merkeziEn(noqteler));
    if (!olcu) {
      return res.status(400).json({ error: "Sahənin yeri hesablana bilmədi." });
    }

    const indi = Date.now();
    const from = `${gunISO(indi - STANDART_GUN * 86_400_000)}T00:00:00Z`;
    const to = `${gunISO(indi)}T23:59:59Z`;
    const token = await tokenAl();

    // Kvadrantlar paralel soruşulur — ardıcıl getsə 30 saniyəyə sığmaya bilər
    const neticeler = await Promise.all(
      hisseler.map(async ({ ad, polygon }) => {
        const olcme = await kvadrantSorgusu({ polygon, olcu, token, from, to });
        return olcme ? { ad, ...olcme } : null;
      }),
    );

    const zonalar = neticeler.filter(Boolean);
    const zeif = zeifTap(zonalar);
    const tarix = zonalar.length ? zonalar.map((z) => z.tarix).sort().at(-1) : null;

    console.log(`[zona] kvadrant=${zonalar.length} zəif=${zeif?.ad ?? "yox"}`);
    return res.status(200).json({ zonalar, zeif, tarix });
  } catch (error) {
    console.error("zona error:", error?.status ?? "", acarlariGizle(error?.message).slice(0, 300));
    if (error?.status === 400 || error?.status === 401) {
      return res.status(502).json({ error: "Peyk xidmətinə giriş alınmadı." });
    }
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
