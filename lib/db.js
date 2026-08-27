// Verilənlər bazası qatı — Faza 1.
//
// İstehsalda: Vercel Postgres (Neon) HTTP sürücüsü ilə. Serverless üçün
// düzgün seçimdir: hər sorğu bir HTTPS çağırışıdır, bağlantı hovuzu, soket
// saxlama dərdi yoxdur.
//
// Testlərdə: PGlite (WASM Postgres) — həqiqi Postgres dialekti, amma prosesin
// içində. Hər iki sürücü `query(text, params) → {rows}` formasını verir
// (neon() `fullResults: true` ilə), ona görə adapter nazikdir.
//
// SXEM BURADA TƏTBİQ OLUNMUR. Əvvəl bu modul hər instansın ilk sorğusunda
// db/schema.sql-i icra edirdi — yəni adi istifadəçi sorğusu prodakşn sxemini
// dəyişə bilirdi. Maliyyə qeydləri gələndən sonra bu yolverilməzdir.
// İndi sxem yalnız `npm run db:migrate` ilə dəyişir (bax: lib/miqrasiya.js).

let _muster = null; // {query}

/** Testlər PGlite instansını buradan yeridir */
export function musterTeyin(muster) {
  _muster = muster;
}

// Vercel bazanı hansı inteqrasiya ilə yaratdığından asılı olaraq bağlantı
// sətrini FƏRQLİ ADLA yeridir: Neon inteqrasiyası DATABASE_URL, köhnə
// "Vercel Postgres" isə POSTGRES_URL qoyur. Birini gözləyib o birini almaq
// "baza qurulmayıb" kimi görünür, halbuki baza yerindədir — ona görə hamısına
// baxırıq. Sıra vacibdir: hovuzlu (pooled) ünvan serverless üçün doğrudur.
export const BAGLANTI_ACARLARI = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
];

/** Mühitdə tapılan ilk bağlantı açarının ADI (dəyəri yox) */
export function baglantiAcari() {
  return BAGLANTI_ACARLARI.find((ad) => process.env[ad]) ?? null;
}

function baglantiUnvani() {
  const acar = baglantiAcari();
  return acar ? process.env[acar] : null;
}

export function dbQurulub() {
  return Boolean(_muster || baglantiUnvani());
}

async function musterAl() {
  if (_muster) return _muster;
  const unvan = baglantiUnvani();
  if (!unvan) {
    const xeta = new Error(`Bağlantı sətri yoxdur (${BAGLANTI_ACARLARI.join(", ")})`);
    xeta.status = 501;
    throw xeta;
  }
  // Dinamik import: paket yalnız həqiqətən lazım olanda yüklənsin
  const { neon } = await import("@neondatabase/serverless");
  _muster = neon(unvan, { fullResults: true });
  return _muster;
}

/**
 * Yeganə giriş nöqtəsi: sorgu(mətn, parametrlər) → sətirlər.
 *
 * Sxem TƏTBİQ ETMİR (yuxarıdakı qeydə bax). Cədvəl yoxdursa sorğu atır və
 * xəta görünür — "səssizcə düzəlt" davranışı qəsdən yoxdur.
 */
export async function sorgu(metn, params = []) {
  const muster = await musterAl();
  const netice = await muster.query(metn, params);
  return netice.rows ?? netice;
}
