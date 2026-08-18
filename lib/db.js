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
// SXEM BURADA DA YAŞAYIR: db/schema.sql insan üçün, bu sabit maşın üçün.
// İkisi eyni məzmundur — dəyişəndə ikisini birlikdə yeniləyin. Miqrasiya
// idempotentdir (IF NOT EXISTS) və instans başına bir dəfə işləyir; ayrıca
// miqrasiya aləti bu miqyasda artıq mürəkkəblikdir.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

let _muster = null; // {query}
let _hazirla = null; // Promise — miqrasiya bir dəfə

/** Testlər PGlite instansını buradan yeridir */
export function musterTeyin(muster) {
  _muster = muster;
  _hazirla = null;
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

function sxemOxu() {
  const qovluq = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(qovluq, "..", "db", "schema.sql"), "utf-8");
}

/** Sxemi tətbiq edir — instans başına bir dəfə, sonrakılar gözləyir */
async function hazirla(muster) {
  if (!_hazirla) {
    _hazirla = (async () => {
      // Neon HTTP sürücüsü bir çağırışda bir əmr istəyir — bölürük.
      // Əvvəl şərh sətirləri atılır (yoxsa ";"-lə bölünən parça şərhlə
      // başlayır və bütöv CREATE onunla birlikdə itə bilər), sonra bölmə.
      // Sadə bölmə kifayətdir: sxemdə funksiya/dollar-quote yoxdur.
      const temiz = sxemOxu()
        .split("\n")
        .filter((setir) => !setir.trim().startsWith("--"))
        .join("\n");
      const emrler = temiz
        .split(";")
        .map((e) => e.trim())
        .filter(Boolean);
      for (const emr of emrler) {
        await muster.query(emr, []);
      }
    })();
  }
  return _hazirla;
}

/**
 * Yeganə giriş nöqtəsi: sorgu(mətn, parametrlər) → sətirlər.
 * Miqrasiyanı özü təmin edir — çağıranlar sxem barədə düşünmür.
 */
export async function sorgu(metn, params = []) {
  const muster = await musterAl();
  await hazirla(muster);
  const netice = await muster.query(metn, params);
  return netice.rows ?? netice;
}
