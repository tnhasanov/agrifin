// Peyk tarixçəsinin NÜVƏSİ — HTTP-dən asılı deyil.
//
// Niyə ayrıdır: mövsüm tarixçəsi FarmScore-un bütün söykəndiyi sübutdur və
// kredit qərarı ONU KLİENTDƏN ALA BİLMƏZ. Nüvə burada olduğu üçün server
// anderraytinq anında öz sorğusunu edə bilir (bax: lib/saheSubutu.js) —
// HTTP dövrəsi və brauzer arası olmadan.
//
// api/tarixce.js indi bu nüvənin nazik HTTP örtüyüdür: sürət həddi,
// giriş yoxlaması, status kodları orada qalır.
import {
  MIN_NOQTE,
  cerceve,
  merkeziEn,
  olcuDereceye,
  polygonaCevir,
  qonsuCercevesi,
} from "./geoJson.js";
import {
  BAZA_URL,
  MUQAYISE_SERTI,
  acarlariGizle,
  faizAl,
  tokenAl,
} from "./copernicus.js";

const STAT_URL = `${BAZA_URL}/statistics`;

// Arxiv 2017-dən tamdır (2015-16 qismən — bir peyk işləyirdi)
export const ILK_IL = 2017;
const MAX_DERECE = 0.5;

// Aylıq zirvə üçün P1M kifayətdir: mövsümün zirvəsi onsuz da ayların
// maksimumundan götürülür, daha sıx dövr yalnız emal vahidi xərcləyir
const DOVR = "P1M";

// Sahənin öz ölçməsi Sentinel-2-nin doğma ayırdetməsindədir
const SAHE_OLCU = 10;
// Ətraf üçün qaba ölçü: medianı 60 m piksellər də verir, xərc isə 36 dəfə az
const ETRAF_OLCU = 60;
export const MIN_ETRAF_PIKSEL = 300;

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
  var pis = ${MUQAYISE_SERTI};
  var ndvi = (s.B08 + s.B04) === 0 ? 0 : (s.B08 - s.B04) / (s.B08 + s.B04);
  return { ndvi: [ndvi], dataMask: [pis ? 0 : s.dataMask] };
}`;

// Ətraf: sahə ilə EYNİ maska (bax: lib/copernicus.js, MUQAYISE_SERTI).
// Əvvəl burada yalnız SCL 4 sayılırdı və müqayisə asimmetrik idi.
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
  var pis = ${MUQAYISE_SERTI};
  var ndvi = (s.B08 + s.B04) === 0 ? 0 : (s.B08 - s.B04) / (s.B08 + s.B04);
  return { ndvi: [ndvi], dataMask: [pis ? 0 : s.dataMask] };
}`;

/**
 * @param {{resx, resy}} olcu DƏRƏCƏ ilə — bax: lib/geoJson.js, olcuDereceye.
 *   Bura metr yazmaq sorğunu sındırır (bir piksel = bütün ərazi).
 */
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
        resx: olcu.resx,
        resy: olcu.resy,
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
      // Faizlik açarı "50.0", "50" və ya 0.5 ola bilər — oxuma ortaq
      // funksiyadadır (bax: lib/copernicus.js, faizAl). Burada yalnız
      // "50.0" gözlənilirdi və bu, ətraf medianını tamamilə sıfırlayırdı.
      medyan: faizAl(stats.percentiles, 0.5),
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


/**
 * Sahənin çoxillik mövsüm tarixçəsi. Copernicus-a İKİ paralel sorğu gedir.
 *
 * @param {object} p
 * @param {Array<[number,number]>} p.noqteler  sahə konturu
 * @returns {Promise<{ok: true, movsumler, ilkIl, etrafAlinib, etrafAyi, muqayiseli, menbe}
 *                  | {ok: false, sebeb: string, status: number}>}
 *
 * Atmır: uğursuzluq da nəticədir (`ok:false`) — çağıran tərəf HTTP statusunu
 * özü seçir, çünki eyni nüvəni həm endpoint, həm anderraytinq işlədir.
 */
export async function tarixceGetir({ noqteler }) {
  const polygon = polygonaCevir(noqteler);
  if (!polygon) {
    return { ok: false, sebeb: `Sahə konturu yararsızdır (ən azı ${MIN_NOQTE} künc).`, status: 400 };
  }
  const { enFerq, uzFerq } = cerceve(noqteler);
  if (enFerq > MAX_DERECE || uzFerq > MAX_DERECE) {
    return { ok: false, sebeb: "Sahə çox böyükdür.", status: 400 };
  }
  const etrafBbox = qonsuCercevesi(noqteler);

  // Ölçü DƏRƏCƏyə çevrilir: sorğu EPSG:4326-dadır (bax: olcuDereceye)
  const en = merkeziEn(noqteler);
  const saheOlcusu = olcuDereceye(SAHE_OLCU, en);
  const etrafOlcusu = olcuDereceye(ETRAF_OLCU, en);
  if (!saheOlcusu || !etrafOlcusu) {
    return { ok: false, sebeb: "Sahənin yeri hesablana bilmədi.", status: 400 };
  }

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
      olcu: saheOlcusu,
      token,
    }),
    statSorgusu({
      bounds: { bbox: etrafBbox, properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } },
      evalscript: ETRAF_EVALSCRIPT,
      from,
      to,
      olcu: etrafOlcusu,
      token,
      percentiles: true,
    }),
  ]);

  if (!saheCavab.ok) {
    const detal = acarlariGizle((await saheCavab.text().catch(() => "")).slice(0, 300));
    console.error("Copernicus tarixce error:", saheCavab.status, detal);
    return { ok: false, sebeb: "Tarixçə alınmadı.", status: 502, menbeStatus: saheCavab.status };
  }

  const saheAylari = aylariCixar(await saheCavab.json());
  // Ətraf alınmasa tarixçə yenə qaytarılır — müqayisə sətirləri boş qalır.
  if (!etrafCavab.ok) {
    const detal = acarlariGizle((await etrafCavab.text().catch(() => "")).slice(0, 300));
    console.error("Copernicus tarixce ətraf error:", etrafCavab.status, detal);
  }
  const etrafAylari = etrafCavab.ok ? aylariCixar(await etrafCavab.json()) : new Map();

  const movsumler = movsumlereBol(saheAylari, etrafAylari, sonIl);

  const etrafAyi = [...etrafAylari.values()].filter((a) => Number.isFinite(a.medyan)).length;
  const muqayiseli = movsumler.filter((m) => m.etrafMedyan != null).length;
  console.log(
    `[tarixce] nöqtə=${noqteler.length} mövsüm=${movsumler.filter((m) => m.zirve != null).length}/${movsumler.length} ətraf=${etrafCavab.ok} ətrafAy=${etrafAyi} müqayisə=${muqayiseli}`,
  );

  return {
    ok: true,
    movsumler,
    ilkIl: ILK_IL,
    etrafAlinib: etrafCavab.ok,
    etrafAyi,
    muqayiseli,
    menbe: "Sentinel-2 · Copernicus",
  };
}
