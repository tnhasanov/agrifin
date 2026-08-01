// api/ndvi.js — Copernicus Sentinel-2-dən sahənin NDVI seriyası.
//
// Açarlar yalnız burada yaşayır:
//   SENTINEL_CLIENT_ID / SENTINEL_CLIENT_SECRET
//   (Vercel → Settings → Environment Variables, Production + Preview)
//
// Axın: client_credentials ilə token → Statistical API-yə çoxbucaqlı göndər →
// hər dövr üçün orta NDVI qaytar. Şəkil endirilmir, hesablama Copernicus-da
// olur; biz yalnız rəqəmləri alırıq.
import { MIN_NOQTE, cerceve, polygonaCevir } from "./geoJson.js";

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const STAT_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics";

// Sentinel-2 Azərbaycan enində ~2–3 gündən bir keçir, amma buludlu günlər
// boş qalır. 5 günlük dövr + "ən az buludlu" seçimi fermerə oxunaqlı,
// boşluqsuz əyri verir. Dəqiq çəkiliş tarixi dövrün içindədir.
const DOVR = "P5D";
const STANDART_GUN = 60;
const MAX_GUN = 180;

// Sahə çox böyükdürsə sorğu həm bahalı, həm mənasız olur (fermer sahəsi deyil)
const MAX_DERECE = 0.5;

// Vercel-in standart 10 saniyəsi Statistical API üçün bəzən azdır
export const maxDuration = 30;

// İnstans-daxili sürət həddi — aqronom endpointi ilə eyni məhdudiyyət:
// instanslar arasında paylaşılmır, ona görə tam qorunma deyil.
const PENCERE_MS = 10 * 60 * 1000;
const HEDD = 30;
const sorgular = new Map();

function suretHeddiKecilib(ip) {
  const indi = Date.now();
  const siyahi = (sorgular.get(ip) ?? []).filter((t) => indi - t < PENCERE_MS);
  siyahi.push(indi);
  sorgular.set(ip, siyahi);
  if (sorgular.size > 2000) {
    for (const [key, list] of sorgular) {
      if (list.every((t) => indi - t >= PENCERE_MS)) sorgular.delete(key);
    }
  }
  return siyahi.length > HEDD;
}

/**
 * NDVI + bulud maskası. SCL zolağı buludu, kölgəni və qarı göstərir —
 * onları dataMask-dan çıxarırıq ki, buludun NDVI-si ortalamaya girməsin.
 * Bu olmadan buludlu gün "bitki ölüb" kimi görünür.
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
  // SCL: 3 kölgə, 8/9 bulud, 10 nazik sirrus, 11 qar
  var pis = s.SCL === 3 || s.SCL === 8 || s.SCL === 9 || s.SCL === 10 || s.SCL === 11;
  var ndvi = (s.B08 + s.B04) === 0 ? 0 : (s.B08 - s.B04) / (s.B08 + s.B04);
  return { ndvi: [ndvi], dataMask: [pis ? 0 : s.dataMask] };
}`;

/**
 * Yuxarı axından gələn mətndən açarları silir.
 *
 * Niyə: xidmət xəta mətnində sorğunun bir hissəsini əks etdirə bilər.
 * O mətni olduğu kimi loga və ya diaqnostikaya versək, gizli söz oradan
 * sızar. Bunu test yoxlayır (və bir dəfə tutdu da).
 */
export function acarlariGizle(metn) {
  let temiz = String(metn ?? "");
  for (const gizli of [process.env.SENTINEL_CLIENT_SECRET, process.env.SENTINEL_CLIENT_ID]) {
    if (gizli && gizli.length >= 4) temiz = temiz.split(gizli).join("***");
  }
  return temiz;
}

/** Token xətasının səbəbini istifadəçiyə anlaşılan, təhlükəsiz mətnə çevirir */
function tokenXetaQeydi(status) {
  if (status === 401 || status === 400) return "Client ID və ya secret yanlışdır.";
  if (status === 403) return "Bu hesabın Sentinel Hub-a icazəsi yoxdur.";
  return "Copernicus-a qoşulmaq alınmadı.";
}

/** Açar dəyərləri heç vaxt qaytarılmır — yalnız qurulub-qurulmadığı */
function diaqnostika() {
  return {
    acarQurulub: Boolean(process.env.SENTINEL_CLIENT_ID && process.env.SENTINEL_CLIENT_SECRET),
  };
}

async function tokenAl(signal) {
  const cavab = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal,
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SENTINEL_CLIENT_ID,
      client_secret: process.env.SENTINEL_CLIENT_SECRET,
    }),
  });

  if (!cavab.ok) {
    const xeta = new Error(`token ${cavab.status}`);
    xeta.status = cavab.status;
    // Xam cavab mətni saxlanılmır — yalnız status. Mətn açarın əks-səsini
    // ehtiva edə bilər və diaqnostikaya düşərsə sızar.
    throw xeta;
  }
  const { access_token: token } = await cavab.json();
  if (!token) throw new Error("token cavabında access_token yoxdur");
  return token;
}

/** ISO tarix (yalnız gün) — sərhədlər UTC-də hesablanır */
const gunISO = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * Statistical API cavabını sadə seriyaya çevirir.
 * Boş və ya xətalı dövrlər atılır: buludlu həftədə ölçmə yoxdur, bu normaldır.
 */
export function seriyaCixar(cavab) {
  const dovrler = Array.isArray(cavab?.data) ? cavab.data : [];
  const seriya = [];

  for (const dovr of dovrler) {
    const stats = dovr?.outputs?.ndvi?.bands?.B0?.stats;
    if (!stats || !Number.isFinite(stats.mean)) continue;
    // Heç bir yararlı piksel qalmayıbsa (tam buludlu) atırıq
    if (stats.sampleCount != null && stats.sampleCount === 0) continue;

    const yararli = stats.sampleCount ?? 0;
    const yararsiz = stats.noDataCount ?? 0;
    const hamisi = yararli + yararsiz;

    seriya.push({
      // Dövr 5 günlükdür; dəqiq çəkiliş tarixi bu aralığın içindədir
      baslangic: String(dovr.interval?.from ?? "").slice(0, 10),
      son: String(dovr.interval?.to ?? "").slice(0, 10),
      ndvi: Math.round(stats.mean * 1000) / 1000,
      // Maskalanmış piksellərin payı — nə qədər buludlu olduğunu göstərir
      ortulu: hamisi > 0 ? Math.round((yararsiz / hamisi) * 100) / 100 : 0,
    });
  }

  return seriya.sort((a, b) => a.son.localeCompare(b.son));
}

export default async function handler(req, res) {
  // Ünvan sətrindən açılanda quraşdırmanı göstərir — açarı sızdırmadan.
  // Copernicus-a çıxışı da yoxlayır ki, səbəb bir dəfəyə aydın olsun.
  if (req.method === "GET") {
    const d = diaqnostika();
    if (!d.acarQurulub) {
      return res.status(200).json({ ...d, tokenAlindi: false, qeyd: "Açarlar qurulmayıb." });
    }
    try {
      await tokenAl();
      return res.status(200).json({ ...d, tokenAlindi: true });
    } catch (error) {
      return res.status(200).json({
        ...d,
        tokenAlindi: false,
        tokenStatus: error.status ?? 0,
        qeyd: tokenXetaQeydi(error.status),
      });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnız POST" });
  }
  if (!diaqnostika().acarQurulub) {
    return res.status(501).json({ error: "Peyk inteqrasiyası hələ qurulmayıb." });
  }

  const ip =
    (req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "naməlum";
  if (suretHeddiKecilib(ip)) {
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

    const gunSayi =
      Number.isFinite(gun) && gun >= 10 && gun <= MAX_GUN ? Math.round(gun) : STANDART_GUN;
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
          data: [{ type: "sentinel-2-l2a", dataFilter: { mosaickingOrder: "leastCC" } }],
        },
        aggregation: {
          timeRange: { from: `${gunISO(basdan)}T00:00:00Z`, to: `${gunISO(indi)}T23:59:59Z` },
          aggregationInterval: { of: DOVR },
          evalscript: EVALSCRIPT,
          // Sentinel-2-nin görünən zolaqları 10 m-dir; daha incə istəmək mənasızdır
          resx: 10,
          resy: 10,
        },
        calculations: { ndvi: { statistics: { default: {} } } },
      }),
    });

    if (!cavab.ok) {
      const detal = acarlariGizle((await cavab.text().catch(() => "")).slice(0, 300));
      console.error("Copernicus statistics error:", cavab.status, detal);
      return res
        .status(502)
        .json({ error: "Peyk məlumatı alınmadı.", menbeStatus: cavab.status });
    }

    const seriya = seriyaCixar(await cavab.json());
    console.log(`[ndvi] dövr=${gunSayi}g nöqtə=${noqteler.length} ölçmə=${seriya.length}`);

    return res.status(200).json({ seriya, menbe: "Sentinel-2 · Copernicus" });
  } catch (error) {
    console.error("ndvi error:", error?.status ?? "", acarlariGizle(error?.message).slice(0, 300));
    // Token alına bilmirsə səbəb konfiqurasiyadır, sahə deyil
    if (error?.status === 400 || error?.status === 401) {
      return res.status(502).json({ error: "Peyk xidmətinə giriş alınmadı." });
    }
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
