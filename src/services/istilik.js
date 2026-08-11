import * as storage from "../lib/storage.js";

/**
 * Mövsümün toplanmış istiliyi (dərəcə-gün) və keçən illə müqayisəsi.
 *
 * NİYƏ: bitkinin mərhələləri təqvimlə yox, TOPLANMIŞ İSTİLİKLƏ gəlir. İsti
 * ildə sünbülləmə iki həftə tez, sərin ildə gec olur. Tətbiq indiyə qədər
 * mərhələni mövsümün üçdə birinə görə təxmin edirdi (bax: lib/teqvim.js —
 * kalibrləmə qeydi); istilik toplanması bunu ölçməyə yaxınlaşdırır.
 *
 * NƏ İDDİA EDİLMİR: "sünbülləmə 12 mayda olacaq". Mərhələ hədləri sorta
 * görə dəyişir və bizdə yerli sortların hədləri yoxdur. Ona görə yalnız
 * MÜQAYİSƏ verilir: eyni sahə, eyni tarix, keçən il. Bu müqayisə sortdan
 * asılı deyil.
 *
 * BAŞLANĞIC TARİXİ TƏXMİNİDİR (səpin ayının 1-i), amma bu, müqayisəni
 * pozmur: hər iki il EYNİ təqvim tarixindən sayılır, ona görə başlanğıcın
 * özündəki xəta hər iki tərəfdə eyni cür oturur.
 */

export const ARXIV_URL = "https://archive-api.open-meteo.com/v1/archive";
const KES_ACAR = "istilik";
const KES_MS = 12 * 60 * 60 * 1000;

// ERA5 arxivi bir neçə gün gecikmə ilə yenilənir. Hər iki il üçün eyni
// kəsim götürülür ki, müqayisə ədalətli olsun.
export const ARXIV_GECIKME_GUN = 7;

// Fərq bundan azdırsa "eyni" sayılır: gündəlik toplama özü oynayır
const MIN_GUN_FERQI = 2;

/** Bir günün dərəcə-günü. Baza temperaturundan aşağı gün sıfır sayılır. */
export function gunlukGdd(tmax, tmin, baza) {
  if (!Number.isFinite(tmax) || !Number.isFinite(tmin) || !Number.isFinite(baza)) return 0;
  return Math.max(0, (tmax + tmin) / 2 - baza);
}

/** Seriyanın cəmi */
export function toplamGdd(daily, baza) {
  const maxlar = daily?.temperature_2m_max ?? [];
  const minler = daily?.temperature_2m_min ?? [];
  let cem = 0;
  for (let i = 0; i < maxlar.length; i += 1) cem += gunlukGdd(maxlar[i], minler[i], baza);
  return Math.round(cem);
}

/** Son günlərin orta sürəti (dərəcə-gün/gün) — fərqi GÜNƏ çevirmək üçün */
export function gunlukSuret(daily, baza, gun = 10) {
  const maxlar = daily?.temperature_2m_max ?? [];
  const minler = daily?.temperature_2m_min ?? [];
  const bas = Math.max(0, maxlar.length - gun);
  let cem = 0;
  let say = 0;
  for (let i = bas; i < maxlar.length; i += 1) {
    if (!Number.isFinite(maxlar[i]) || !Number.isFinite(minler[i])) continue;
    cem += gunlukGdd(maxlar[i], minler[i], baza);
    say += 1;
  }
  return say === 0 ? null : cem / say;
}

/**
 * İki ilin müqayisəsi.
 *
 * Fərq faizlə DEYİL, GÜNLƏ verilir: "8% qabaqda" fermerə heç nə demir,
 * "təxminən 4 gün qabaqda" isə biçin və çiləmə planına düşür.
 *
 * @returns {null | {cem, kecenCem, gun, istiqamet}}
 */
export function istilikMuqayisesi({ bu, kecen, baza } = {}) {
  if (!bu || !kecen || !Number.isFinite(baza)) return null;

  const cem = toplamGdd(bu, baza);
  const kecenCem = toplamGdd(kecen, baza);
  if (cem === 0 || kecenCem === 0) return null;

  const suret = gunlukSuret(bu, baza);
  if (!suret || suret <= 0) return null;

  const gun = Math.round((cem - kecenCem) / suret);
  return {
    cem,
    kecenCem,
    gun: Math.abs(gun),
    istiqamet: Math.abs(gun) < MIN_GUN_FERQI ? "eyni" : gun > 0 ? "qabaq" : "geri",
  };
}

const gunISO = (tarix) => tarix.toISOString().slice(0, 10);

/**
 * Mövsümün başlanğıc tarixi. Səpin ayı hələ gəlməyibsə mövsüm KEÇƏN İL
 * başlayıb — payızlıq buğda üçün bu qayda vacibdir.
 */
export function movsumBaslangici(sepinAyi, indi = new Date()) {
  if (!Number.isInteger(sepinAyi) || sepinAyi < 1 || sepinAyi > 12) return null;
  const il = indi.getUTCMonth() + 1 >= sepinAyi ? indi.getUTCFullYear() : indi.getUTCFullYear() - 1;
  return new Date(Date.UTC(il, sepinAyi - 1, 1));
}

function arxivUrl({ lat, lon, bas, son }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: gunISO(bas),
    end_date: gunISO(son),
    daily: "temperature_2m_max,temperature_2m_min",
    timezone: "Asia/Baku",
  });
  return `${ARXIV_URL}?${params}`;
}

/** Tarixi bir il geri çəkir */
const birIlEvvel = (tarix) =>
  new Date(Date.UTC(tarix.getUTCFullYear() - 1, tarix.getUTCMonth(), tarix.getUTCDate()));

/**
 * İki arxiv sorğusu: bu mövsüm və keçən ilin eyni pəncərəsi.
 * Keş 12 saatlıqdır — toplam gündə bir dəfə dəyişir.
 */
export async function fetchIstilik({ lat, lon, sepinAyi, baza, signal, indi = new Date() } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(baza)) return null;

  const bas = movsumBaslangici(sepinAyi, indi);
  if (!bas) return null;

  const son = new Date(indi.getTime() - ARXIV_GECIKME_GUN * 86_400_000);
  if (son <= bas) return null;

  const acar = `${lat.toFixed(3)},${lon.toFixed(3)}|${gunISO(bas)}|${gunISO(son)}|${baza}`;
  const kes = storage.read(KES_ACAR);
  if (kes && kes.acar === acar && Date.now() - kes.vaxt < KES_MS) return kes.netice;

  const [buCavab, kecenCavab] = await Promise.all([
    fetch(arxivUrl({ lat, lon, bas, son }), { signal }),
    fetch(arxivUrl({ lat, lon, bas: birIlEvvel(bas), son: birIlEvvel(son) }), { signal }),
  ]);
  if (!buCavab.ok || !kecenCavab.ok) {
    const xeta = new Error(`arxiv ${buCavab.status}/${kecenCavab.status}`);
    xeta.status = buCavab.ok ? kecenCavab.status : buCavab.status;
    throw xeta;
  }

  const [bu, kecen] = await Promise.all([buCavab.json(), kecenCavab.json()]);
  const netice = istilikMuqayisesi({ bu: bu?.daily, kecen: kecen?.daily, baza });
  storage.write(KES_ACAR, { acar, vaxt: Date.now(), netice });
  return netice;
}
