// api/qonsu.js — sahənin ətrafdakı əkinlərlə müqayisəsi.
//
// Fermer üçün "NDVI 0,68" mücərrəddir. "Qonşulardan yaxşıdır" isə dərhal
// başa düşülən və danışılan şeydir. Ona görə ətrafdakı 5 km-lik kvadratın
// NDVI paylanmasını alırıq və sahəni onun içində yerləşdiririk.
//
// ƏSAS DÜRÜSTLÜK MƏSƏLƏSİ: kvadratın içində yol, tikili, çılpaq torpaq və
// su var. Onları saysaq ortalama süni şəkildə aşağı düşər və HƏR fermer
// "ortadan yuxarı" görünər — yəni müqayisə yaltaqlıq olar, məlumat yox.
// Buna görə SCL === 4 (bitki örtüyü) filtri qoyulur: yalnız əkin sahələri
// müqayisəyə girir.
import { MIN_NOQTE, QONSU_RADIUS_KM, polygonaCevir, qonsuCercevesi } from "../lib/geoJson.js";
import {
  BAZA_URL,
  acarQurulub,
  acarlariGizle,
  diaqnostikaCavabi,
  faizAl,
  ipTap,
  suretHeddiYarat,
  tokenAl,
} from "../lib/copernicus.js";

// Faizlik oxuma indi lib/copernicus.js-dədir — api/tarixce.js də eyni
// funksiyanı işlədir. Köhnə idxal yolu testlər üçün saxlanılır.
export { faizAl };

const STAT_URL = `${BAZA_URL}/statistics`;

const DOVR = "P5D";
const STANDART_GUN = 30;

// Sahənin öz ölçməsi 10 m-dədir; ərazi ortalaması üçün 60 m kifayətdir və
// emal kvotasını ~36 dəfə ucuzlaşdırır
const OLCU_METR = 60;

// Bundan az bitki pikseli qalıbsa ərazi əkin bölgəsi deyil (səhra, şəhər,
// dağ) — müqayisə mənasızdır və göstərilmir
export const MIN_PIKSEL = 500;

export const maxDuration = 30;

const suretHeddiKecilib = suretHeddiYarat({ pencereMs: 10 * 60 * 1000, hedd: 20 });

/**
 * SCL === 4 yalnız bitki örtüyü deməkdir. Bulud (8/9/10), kölgə (3), qar (11),
 * su (6), çılpaq torpaq (5) — hamısı avtomatik kənarda qalır.
 */
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
  var bitki = s.SCL === 4;
  var ndvi = (s.B08 + s.B04) === 0 ? 0 : (s.B08 - s.B04) / (s.B08 + s.B04);
  return { ndvi: [ndvi], dataMask: [bitki ? s.dataMask : 0] };
}`;

const gunISO = (ms) => new Date(ms).toISOString().slice(0, 10);
const yuvarla = (deyer) => Math.round(deyer * 1000) / 1000;

/**
 * Cavabdan bir dövr seçir: mümkünsə sahənin öz ölçməsi ilə EYNİ dövrü,
 * yoxsa ən sonuncunu. Fərqli tarixləri müqayisə etmək yanlış nəticə verir —
 * iki həftə əvvəlki qonşu ilə bugünkü sahə müqayisə oluna bilməz.
 */
export function dovrSec(cavab, son) {
  const dovrler = Array.isArray(cavab?.data) ? cavab.data : [];
  const uygunlar = [];

  for (const dovr of dovrler) {
    const stats = dovr?.outputs?.ndvi?.bands?.B0?.stats;
    if (!stats || !Number.isFinite(stats.mean)) continue;
    const piksel = stats.sampleCount ?? 0;
    if (piksel < MIN_PIKSEL) continue;

    uygunlar.push({
      baslangic: String(dovr.interval?.from ?? "").slice(0, 10),
      son: String(dovr.interval?.to ?? "").slice(0, 10),
      orta: yuvarla(stats.mean),
      p25: faizAl(stats.percentiles, 0.25),
      medyan: faizAl(stats.percentiles, 0.5),
      p75: faizAl(stats.percentiles, 0.75),
      piksel,
    });
  }

  if (uygunlar.length === 0) return null;
  uygunlar.sort((a, b) => a.son.localeCompare(b.son));
  return uygunlar.find((d) => d.son === son) ?? uygunlar[uygunlar.length - 1];
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
    const { noqteler, son } = req.body || {};

    // Konturu ayrıca yoxlayırıq: çərçivə mərkəzdən qurulsa da giriş eyni
    // qaydalardan keçməlidir
    if (!polygonaCevir(noqteler)) {
      return res.status(400).json({ error: `Sahə konturu yararsızdır (ən azı ${MIN_NOQTE} künc).` });
    }
    const bbox = qonsuCercevesi(noqteler);
    if (!bbox) {
      return res.status(400).json({ error: "Ətraf ərazi hesablana bilmədi." });
    }

    const indi = Date.now();
    const basdan = indi - STANDART_GUN * 24 * 60 * 60 * 1000;
    const token = await tokenAl();

    const cavab = await fetch(STAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        input: {
          bounds: { bbox, properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } },
          data: [{ type: "sentinel-2-l2a", dataFilter: { mosaickingOrder: "leastCC" } }],
        },
        aggregation: {
          timeRange: { from: `${gunISO(basdan)}T00:00:00Z`, to: `${gunISO(indi)}T23:59:59Z` },
          aggregationInterval: { of: DOVR },
          evalscript: EVALSCRIPT,
          resx: OLCU_METR,
          resy: OLCU_METR,
        },
        calculations: {
          // Orta tək başına aldadıcıdır: bir neçə çox zəif sahə onu aşağı
          // çəkir. Median və çeyreklər paylanmanı olduğu kimi göstərir.
          ndvi: { statistics: { default: { percentiles: { k: [25, 50, 75] } } } },
        },
      }),
    });

    if (!cavab.ok) {
      const detal = acarlariGizle((await cavab.text().catch(() => "")).slice(0, 300));
      console.error("Copernicus qonsu error:", cavab.status, detal);
      return res.status(502).json({ error: "Ətraf məlumatı alınmadı.", menbeStatus: cavab.status });
    }

    const dovr = dovrSec(await cavab.json(), typeof son === "string" ? son : null);
    if (!dovr) {
      // Bu xəta deyil: ya buludlu olub, ya da ətrafda əkin yoxdur
      return res.status(200).json({ qonsu: null, radiusKm: QONSU_RADIUS_KM });
    }

    console.log(`[qonsu] dövr=${dovr.son} piksel=${dovr.piksel} median=${dovr.medyan}`);
    return res.status(200).json({
      qonsu: dovr,
      radiusKm: QONSU_RADIUS_KM,
      menbe: "Sentinel-2 · Copernicus",
    });
  } catch (error) {
    console.error("qonsu error:", error?.status ?? "", acarlariGizle(error?.message).slice(0, 300));
    if (error?.status === 400 || error?.status === 401) {
      return res.status(502).json({ error: "Peyk xidmətinə giriş alınmadı." });
    }
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
