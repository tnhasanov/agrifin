// api/radar.js — Sentinel-1 radar ölçməsi: BULUD ARXASINDAN.
//
// Niyə lazımdır: Sentinel-2 optik peykdir, buluda baxa bilmir. Azərbaycanda
// payız və yaz aylarında sahə həftələrlə buludun altında qalır və tətbiq
// "bu dövrdə təmiz ölçmə yoxdur" deyir — yəni fermerin ən çox ehtiyacı olan
// vaxtda susur. Sentinel-1 radar dalğası buludu deşib keçir: hava necə
// olursa-olsun ölçmə gəlir.
//
// NƏ ÖLÇÜLÜR VƏ NƏ ÖLÇÜLMÜR — açıq yazılır:
//   • Radar geriyə səpilmə (backscatter) qaytarır, birbaşa "torpaq nəmliyi"
//     yox. Səpilməyə üç şey təsir edir: torpaqdakı su, səthin kələ-kötürlüyü
//     və bitki örtüyü. Ona görə MÜTLƏQ rəqəm ("torpaqda 23% su var")
//     verilmir — yalnız sahənin ÖZ keçmişi ilə müqayisə edilir.
//   • Suyun səthi hamardır və dalğanı əks tərəfə qaytarır, ona görə radara
//     demək olar heç nə qayıtmır. Durmuş su bu üsulla ən etibarlı tapılan
//     şeydir — bu, təxmin deyil, fizikadır.
//
// Orbit istiqaməti SABİT saxlanılır: eyni sahəyə fərqli bucaqdan baxanda
// səpilmə özü dəyişir. Qarışdırsaq "nəmlik artdı" siqnalı əslində peykin
// başqa yoldan keçməsi olardı.
import { MIN_NOQTE, cerceve, merkeziEn, olcuDereceye, polygonaCevir } from "../lib/geoJson.js";
import {
  BAZA_URL,
  acarQurulub,
  acarlariGizle,
  diaqnostikaCavabi,
  ipTap,
  suretHeddiYarat,
  tokenAl,
} from "../lib/copernicus.js";

const STAT_URL = `${BAZA_URL}/statistics`;

// Sentinel-1 Azərbaycandan hər 6–12 gündən bir keçir (peyk cütünə görə).
// 6 günlük dövr bir keçidi bir xanaya salır.
const DOVR = "P6D";
const STANDART_GUN = 36;
const MAX_GUN = 120;
const MAX_DERECE = 0.5;

// Radar pikseli 10 m verilir, amma faktiki ayırdetmə ~20 m-dir (IW rejimi).
// Daha incə istəmək emal vahidi xərcləyir, məlumat artırmır.
const OLCU_METR = 20;

// Hamar su səthi radarı əks tərəfə atır: VV bu həddən aşağı düşürsə piksel
// böyük ehtimalla su altındadır. -18 dB ədəbiyyatda geniş işlənən sərhəddir,
// amma torpağa və mövsümə görə dəqiqləşdirilməlidir (KALİBRLƏMƏ LAZIMDIR).
const SU_HEDDI_DB = -18;

export const maxDuration = 30;

const suretHeddiKecilib = suretHeddiYarat({ pencereMs: 10 * 60 * 1000, hedd: 20 });

/**
 * VV və VH desibelə çevrilir, üstəlik "su" bayrağı ayrıca zolaq kimi qaytarılır.
 *
 * Su payını maska ilə yox, 0/1 zolağın ORTASI ilə hesablayırıq: Statistical
 * API-nin ortalaması elə piksellərin payını verir. Ayrıca sorğu lazım olmur.
 */
const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["VV", "VH", "dataMask"] }],
    output: [
      { id: "default", bands: 3, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function db(x) {
  // log(0) sonsuzluq verir — sıfır və mənfi dəyərlər döşəməyə oturdulur
  return x > 0 ? 10 * Math.log(x) / Math.LN10 : -40;
}
function evaluatePixel(s) {
  var vv = db(s.VV);
  var vh = db(s.VH);
  var su = vv < ${SU_HEDDI_DB} ? 1 : 0;
  return { default: [vv, vh, su], dataMask: [s.dataMask] };
}`;

const gunISO = (ms) => new Date(ms).toISOString().slice(0, 10);
const yuvarla = (deyer, onluq = 1) => {
  const carpan = 10 ** onluq;
  return Math.round(deyer * carpan) / carpan;
};

/**
 * Statistical API cavabını seriyaya çevirir.
 *
 * @returns {Array<{baslangic, son, vv, vh, suPayi, piksel}>}
 */
export function radarSeriyasi(cavab) {
  const dovrler = Array.isArray(cavab?.data) ? cavab.data : [];
  const seriya = [];

  for (const dovr of dovrler) {
    const zolaqlar = dovr?.outputs?.default?.bands;
    const vv = zolaqlar?.B0?.stats;
    if (!vv || !Number.isFinite(vv.mean)) continue;
    if (vv.sampleCount === 0) continue;

    seriya.push({
      baslangic: String(dovr.interval?.from ?? "").slice(0, 10),
      son: String(dovr.interval?.to ?? "").slice(0, 10),
      vv: yuvarla(vv.mean),
      vh: Number.isFinite(zolaqlar?.B1?.stats?.mean) ? yuvarla(zolaqlar.B1.stats.mean) : null,
      // Sahənin neçə faizi su altındadır (0–1)
      suPayi: Number.isFinite(zolaqlar?.B2?.stats?.mean)
        ? yuvarla(zolaqlar.B2.stats.mean, 3)
        : null,
      piksel: vv.sampleCount ?? null,
    });
  }

  return seriya.sort((a, b) => a.son.localeCompare(b.son));
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
    const { noqteler, gun } = req.body || {};

    const polygon = polygonaCevir(noqteler);
    if (!polygon) {
      return res.status(400).json({ error: `Sahə konturu yararsızdır (ən azı ${MIN_NOQTE} künc).` });
    }
    const { enFerq, uzFerq } = cerceve(noqteler);
    if (enFerq > MAX_DERECE || uzFerq > MAX_DERECE) {
      return res.status(400).json({ error: "Sahə çox böyükdür." });
    }

    // resx/resy EPSG:4326-da DƏRƏCƏdir (bax: lib/geoJson.js, olcuDereceye)
    const olcu = olcuDereceye(OLCU_METR, merkeziEn(noqteler));
    if (!olcu) {
      return res.status(400).json({ error: "Sahənin yeri hesablana bilmədi." });
    }

    const gunSayi =
      Number.isFinite(gun) && gun >= 12 && gun <= MAX_GUN ? Math.round(gun) : STANDART_GUN;
    const indi = Date.now();
    const basdan = indi - gunSayi * 24 * 60 * 60 * 1000;

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
          bounds: {
            geometry: polygon,
            properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
          },
          data: [
            {
              type: "sentinel-1-grd",
              dataFilter: {
                // IW — quru üzərində standart rejim; DV — VV+VH cütü
                acquisitionMode: "IW",
                polarization: "DV",
                // Bir istiqamət: fərqli orbit = fərqli baxış bucağı = başqa
                // səpilmə. Qarışsa müqayisə mənasını itirir (bax: fayl başlığı)
                orbitDirection: "ASCENDING",
              },
              processing: {
                // Gamma0 + relyef düzəlişi: yamacda səpilmə süni artır/azalır.
                // Azərbaycanın dağətəyi rayonlarında bu düzəliş vacibdir.
                backCoeff: "GAMMA0_TERRAIN",
                orthorectify: true,
                demInstance: "COPERNICUS_30",
              },
            },
          ],
        },
        aggregation: {
          timeRange: { from: `${gunISO(basdan)}T00:00:00Z`, to: `${gunISO(indi)}T23:59:59Z` },
          aggregationInterval: { of: DOVR },
          evalscript: EVALSCRIPT,
          resx: olcu.resx,
          resy: olcu.resy,
        },
        calculations: { default: { statistics: { default: {} } } },
      }),
    });

    if (!cavab.ok) {
      const detal = acarlariGizle((await cavab.text().catch(() => "")).slice(0, 300));
      console.error("Copernicus S1 statistics error:", cavab.status, detal);
      return res.status(502).json({ error: "Radar ölçməsi alınmadı.", menbeStatus: cavab.status });
    }

    const seriya = radarSeriyasi(await cavab.json());
    console.log(`[radar] dövr=${gunSayi}g nöqtə=${noqteler.length} ölçmə=${seriya.length}`);

    return res.status(200).json({
      seriya,
      suHeddiDb: SU_HEDDI_DB,
      menbe: "Sentinel-1 · Copernicus",
    });
  } catch (error) {
    console.error("radar error:", error?.status ?? "", acarlariGizle(error?.message).slice(0, 300));
    if (error?.status === 400 || error?.status === 401) {
      return res.status(502).json({ error: "Peyk xidmətinə giriş alınmadı." });
    }
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
