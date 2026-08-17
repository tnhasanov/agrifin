// api/tarixce.js — sahənin çoxillik peyk tarixçəsi: mövsüm zirvələri.
//
// Məhsuldarlıq indeksinin xammalı. Sentinel-2 arxivi 2017-dən tamdır, ona
// görə fermer sahəni BU GÜN çəksə də 8-9 mövsümlük tarixçə dərhal mövcuddur.
//
// İki paralel Statistical sorğusu:
//   1. Sahənin özü — aylıq zirvə NDVI
//   2. Ətraf (5 km) — eyni aylarda bitki örtüyü olan piksellərin medianı
//
// Ətraf sorğusunun məqsədi (bax: services/mehsuldarliq.js): mütləq NDVI
// əsasən havadır; qonşularla müqayisə havanı bölür və idarəetməni ayırır.
//
// XƏRC: sorğu başına ~2 emal vahidi, sahə başına BİR DƏFƏ — tarixçə
// dəyişmir, müştəri onu daimi keşləyir (yalnız cari mövsüm yenilənir).
import { MIN_NOQTE, cerceve, polygonaCevir, qonsuCercevesi } from "../lib/geoJson.js";
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

// Arxiv 2017-dən tamdır (2015-16 qismən — bir peyk işləyirdi)
export const ILK_IL = 2017;
const MAX_DERECE = 0.5;

// Aylıq zirvə üçün P1M kifayətdir: mövsümün zirvəsi onsuz da ayların
// maksimumundan götürülür, daha sıx dövr yalnız emal vahidi xərcləyir
const DOVR = "P1M";

// Ətraf üçün qaba ölçü: medianı 60 m piksellər də verir, xərc isə 36 dəfə az
const ETRAF_OLCU = 60;
export const MIN_ETRAF_PIKSEL = 300;

export const maxDuration = 60;

// Ağır endpoint: sahə başına bir dəfə çağırılmalıdır — hədd aşağıdır
const suretHeddiKecilib = suretHeddiYarat({ pencereMs: 10 * 60 * 1000, hedd: 10 });

const SAHE_EVALSCRIPT = `//VERSION=3
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

// Ətraf: yalnız bitki örtüyü olan piksellər (SCL 4) — yol, tikili, çılpaq
// torpaq medianı süni salmasın. Sahənin qonsu.js-i ilə eyni prinsip.
const ETRAF_EVALSCRIPT = `//VERSION=3
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
  var ndvi = (s.B08 + s.B04) === 0 ? 0 : (s.B08 - s.B04) / (s.B08 + s.B04);
  return { ndvi: [ndvi], dataMask: [s.SCL === 4 ? s.dataMask : 0] };
}`;

function statSorgusu({ bounds, evalscript, from, to, olcu, token, percentiles }) {
  return fetch(STAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      input: {
        bounds,
        data: [{ type: "sentinel-2-l2a", dataFilter: { mosaickingOrder: "leastCC" } }],
      },
      aggregation: {
        timeRange: { from, to },
        aggregationInterval: { of: DOVR },
        evalscript,
        resx: olcu,
        resy: olcu,
      },
      calculations: {
        ndvi: { statistics: { default: percentiles ? { percentiles: { k: [50] } } : {} } },
      },
    }),
  });
}

/** Aylıq statistikadan {ay → {orta, medyan, piksel}} xəritəsi */
export function aylariCixar(cavab) {
  const aylar = new Map();
  for (const dovr of cavab?.data ?? []) {
    const stats = dovr?.outputs?.ndvi?.bands?.B0?.stats;
    if (!stats || !Number.isFinite(stats.mean) || stats.sampleCount === 0) continue;
    const ay = String(dovr.interval?.from ?? "").slice(0, 7);
    if (!ay) continue;
    aylar.set(ay, {
      orta: stats.mean,
      // Statistical API faizlik açarını müxtəlif formada qaytara bilir
      medyan: stats.percentiles?.["50.0"] ?? stats.percentiles?.[50] ?? null,
      piksel: stats.sampleCount ?? 0,
    });
  }
  return aylar;
}

/**
 * Aylıq xəritələrdən mövsüm sətirlərini qurur.
 *
 * Mövsüm = təqvim ili (sadələşdirmə: payızlıq bitkinin mövsümü iki ilə
 * yayılır, amma zirvə yaz aylarına düşür və təqvim ilinə yazılır — müqayisə
 * hər iki tərəfdə eyni qaydayla aparıldığı üçün nəticəni dəyişmir).
 *
 * @returns {Array<{il, zirve, zirveAyi, etrafMedyan, olcmeSayi}>}
 */
export function movsumlereBol(saheAylari, etrafAylari, sonIl) {
  const movsumler = [];
  for (let il = ILK_IL; il <= sonIl; il += 1) {
    let zirve = null;
    let zirveAyi = null;
    let olcmeSayi = 0;
    for (let ay = 1; ay <= 12; ay += 1) {
      const acar = `${il}-${String(ay).padStart(2, "0")}`;
      const setir = saheAylari.get(acar);
      if (!setir) continue;
      olcmeSayi += 1;
      if (zirve == null || setir.orta > zirve) {
        zirve = setir.orta;
        zirveAyi = acar;
      }
    }

    // Zirvə ayında ətrafın medianı — eyni ay, eyni hava
    const etraf = zirveAyi ? etrafAylari.get(zirveAyi) : null;
    movsumler.push({
      il,
      zirve: zirve == null ? null : Math.round(zirve * 1000) / 1000,
      zirveAyi,
      etrafMedyan:
        etraf && etraf.piksel >= MIN_ETRAF_PIKSEL && Number.isFinite(etraf.medyan)
          ? Math.round(etraf.medyan * 1000) / 1000
          : null,
      olcmeSayi,
    });
  }
  return movsumler;
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

    const polygon = polygonaCevir(noqteler);
    if (!polygon) {
      return res.status(400).json({ error: `Sahə konturu yararsızdır (ən azı ${MIN_NOQTE} künc).` });
    }
    const { enFerq, uzFerq } = cerceve(noqteler);
    if (enFerq > MAX_DERECE || uzFerq > MAX_DERECE) {
      return res.status(400).json({ error: "Sahə çox böyükdür." });
    }
    const etrafBbox = qonsuCercevesi(noqteler);

    const indi = new Date();
    const sonIl = indi.getUTCFullYear();
    const from = `${ILK_IL}-01-01T00:00:00Z`;
    const to = indi.toISOString().slice(0, 19) + "Z";

    const token = await tokenAl();

    const [saheCavab, etrafCavab] = await Promise.all([
      statSorgusu({
        bounds: { geometry: polygon, properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } },
        evalscript: SAHE_EVALSCRIPT,
        from,
        to,
        olcu: 10,
        token,
      }),
      statSorgusu({
        bounds: { bbox: etrafBbox, properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } },
        evalscript: ETRAF_EVALSCRIPT,
        from,
        to,
        olcu: ETRAF_OLCU,
        token,
        percentiles: true,
      }),
    ]);

    if (!saheCavab.ok) {
      const detal = acarlariGizle((await saheCavab.text().catch(() => "")).slice(0, 300));
      console.error("Copernicus tarixce error:", saheCavab.status, detal);
      return res.status(502).json({ error: "Tarixçə alınmadı.", menbeStatus: saheCavab.status });
    }

    const saheAylari = aylariCixar(await saheCavab.json());
    // Ətraf alınmasa tarixçə yenə qaytarılır — müqayisə sətirləri boş qalır
    const etrafAylari = etrafCavab.ok ? aylariCixar(await etrafCavab.json()) : new Map();

    const movsumler = movsumlereBol(saheAylari, etrafAylari, sonIl);
    console.log(
      `[tarixce] nöqtə=${noqteler.length} mövsüm=${movsumler.filter((m) => m.zirve != null).length}/${movsumler.length} ətraf=${etrafCavab.ok}`,
    );

    return res.status(200).json({ movsumler, ilkIl: ILK_IL, menbe: "Sentinel-2 · Copernicus" });
  } catch (error) {
    console.error("tarixce error:", error?.status ?? "", acarlariGizle(error?.message).slice(0, 300));
    if (error?.status === 400 || error?.status === 401) {
      return res.status(502).json({ error: "Peyk xidmətinə giriş alınmadı." });
    }
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
