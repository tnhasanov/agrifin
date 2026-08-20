// Copernicus Data Space ilə ortaq iş: kimlik doğrulama və açarların qorunması.
//
// Həm NDVI seriyası (Statistical API), həm də sahə şəkli (Process API) eyni
// açarları və eyni token axınını işlədir — burada bir dəfə yazılır.
//
// Vercel → Settings → Environment Variables (Production + Preview):
//   SENTINEL_CLIENT_ID / SENTINEL_CLIENT_SECRET

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

export const BAZA_URL = "https://sh.dataspace.copernicus.eu/api/v1";

/** Bulud, kölgə və qar piksellərini ayırd edən SCL şərti — hər iki skript üçün */
export const BULUD_SERTI =
  "s.SCL === 3 || s.SCL === 8 || s.SCL === 9 || s.SCL === 10 || s.SCL === 11";

/**
 * MÜQAYİSƏ MASKASI — sahə və ətraf üçün EYNİ olmalıdır.
 *
 * ═══ NİYƏ EYNİ ════════════════════════════════════════════════════════
 * Əvvəl ətraf medianı YALNIZ bitki örtüyü olan piksellərdən (SCL 4)
 * çıxarılırdı, sahənin öz ölçməsi isə çılpaq torpağı da sayırdı. Yəni
 * "bütün sahə" ilə "ətrafın yalnız yaşıl hissəsi" müqayisə olunurdu.
 * Nəticə HƏR sahəni aşağı salırdı: Xaçmazda sahə 42% göstərirdi, ətraf
 * medianı isə 65% (bağların sıx örtüyü) — sahə "alt 25%-də" görünürdü.
 *
 * İndi hər iki tərəf eyni sayılır: buludsuz, kölgəsiz, qarsız və susuz
 * BÜTÜN torpaq. Çılpaq və biçilmiş sahələr hər iki tərəfdə iştirak edir,
 * ona görə sahənin ləkəli hissəsi müqayisədən itmir.
 *
 * ÖDƏNİŞ: yol və tikili də medianın içindədir. 5 km-lik kənd kvadratında
 * onların payı azdır və median (orta deyil) kənar dəyərlərə davamlıdır.
 */
export const MUQAYISE_SERTI = `${BULUD_SERTI} || s.SCL === 6`;

/**
 * Yuxarı axından gələn mətndən açarları silir.
 *
 * Niyə: xidmət xəta mətnində sorğunun bir hissəsini əks etdirə bilər. O mətni
 * olduğu kimi loga və ya diaqnostikaya versək, gizli söz oradan sızar.
 * Testlə qorunur — bir dəfə həqiqi sızma tutdu.
 */
export function acarlariGizle(metn) {
  let temiz = String(metn ?? "");
  for (const gizli of [process.env.SENTINEL_CLIENT_SECRET, process.env.SENTINEL_CLIENT_ID]) {
    if (gizli && gizli.length >= 4) temiz = temiz.split(gizli).join("***");
  }
  return temiz;
}

/**
 * Statistical API cavabından faizliyi çıxarır.
 *
 * ŞƏRT: xidmət faizlik açarını müxtəlif formada qaytarır — "50.0", "50",
 * hətta 0.5. Bir formanı gözləyib başqasını almaq SƏSSİZ nasazlıqdır:
 * median `null` qalır, çağıran tərəf isə "ölçmə yoxdur" sanır.
 *
 * Bu, həqiqətən baş verdi: api/qonsu.js tolerant oxuyurdu və işləyirdi,
 * api/tarixce.js isə yalnız "50.0" açarını qəbul edirdi — nəticədə BÜTÜN
 * mövsümlərin ətraf medianı boş qalır, indeksin ən ağır amili (nisbi
 * performans) ölçülməmiş sayılırdı. Ona görə oxuma bir yerdədir.
 *
 * @param {object} percentiles xam faizlik obyekti
 * @param {number} hedef 0–1 aralığında (0.5 = median)
 */
export function faizAl(percentiles, hedef) {
  if (!percentiles || typeof percentiles !== "object") return null;
  for (const [acar, deyer] of Object.entries(percentiles)) {
    const say = Number(acar);
    if (!Number.isFinite(say) || !Number.isFinite(deyer)) continue;
    const normal = say > 1 ? say / 100 : say;
    if (Math.abs(normal - hedef) < 0.005) return Math.round(deyer * 1000) / 1000;
  }
  return null;
}

/** Açar dəyərləri heç vaxt qaytarılmır — yalnız qurulub-qurulmadığı */
export function acarQurulub() {
  return Boolean(process.env.SENTINEL_CLIENT_ID && process.env.SENTINEL_CLIENT_SECRET);
}

/** Token xətasının səbəbini təhlükəsiz, anlaşılan mətnə çevirir */
export function tokenXetaQeydi(status) {
  if (status === 401 || status === 400) return "Client ID və ya secret yanlışdır.";
  if (status === 403) return "Bu hesabın Sentinel Hub-a icazəsi yoxdur.";
  return "Copernicus-a qoşulmaq alınmadı.";
}

export async function tokenAl(signal) {
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
    // Xam cavab mətni SAXLANILMIR — yalnız status. Mətn açarın əks-səsini
    // ehtiva edə bilər və diaqnostikaya düşərsə sızar.
    throw xeta;
  }

  const { access_token: token } = await cavab.json();
  if (!token) throw new Error("token cavabında access_token yoxdur");
  return token;
}

/**
 * Ünvan sətrindən GET ilə açılan quraşdırma yoxlaması.
 * Açar dəyəri heç bir formada qaytarılmır.
 */
export async function diaqnostikaCavabi() {
  if (!acarQurulub()) {
    return { acarQurulub: false, tokenAlindi: false, qeyd: "Açarlar qurulmayıb." };
  }
  try {
    await tokenAl();
    return { acarQurulub: true, tokenAlindi: true };
  } catch (error) {
    return {
      acarQurulub: true,
      tokenAlindi: false,
      tokenStatus: error.status ?? 0,
      qeyd: tokenXetaQeydi(error.status),
    };
  }
}

/**
 * IP başına sadə sürət həddi. İnstans-daxilidir: serverless instanslar
 * arasında paylaşılmır, ona görə tam qorunma deyil — Copernicus kvotasına
 * da göz yetirin.
 */
export function suretHeddiYarat({ pencereMs, hedd }) {
  const sorgular = new Map();

  return function kecilib(ip) {
    const indi = Date.now();
    const siyahi = (sorgular.get(ip) ?? []).filter((t) => indi - t < pencereMs);
    siyahi.push(indi);
    sorgular.set(ip, siyahi);

    if (sorgular.size > 2000) {
      for (const [key, list] of sorgular) {
        if (list.every((t) => indi - t >= pencereMs)) sorgular.delete(key);
      }
    }
    return siyahi.length > hedd;
  };
}

/** Sorğunun IP-si — Vercel proxy arxasında x-forwarded-for gəlir */
export function ipTap(req) {
  return (
    (req.headers?.["x-forwarded-for"] ?? "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "naməlum"
  );
}
