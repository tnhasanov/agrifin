#!/usr/bin/env node
/**
 * Miqrasiya aləti — `npm run db:migrate`.
 *
 * İstifadə:
 *   DATABASE_URL="postgres://..." npm run db:migrate          # tətbiq et
 *   DATABASE_URL="postgres://..." npm run db:migrate -- --list # yalnız göstər
 *
 * Prodakşnda deploy-dan SONRA (və ya öncə — miqrasiyalar geriyə uyğundur)
 * bir dəfə işlədilir. Runtime heç nə tətbiq etmir (bax: lib/db.js).
 *
 * Uğursuzluqda çıxış kodu 1-dir: CI/əl ilə icra səssizcə keçmir.
 */
import { neon } from "@neondatabase/serverless";
import { BAGLANTI_ACARLARI } from "../lib/db.js";
import { miqrasiyaFayllari, miqrasiyalariTetbiqEt, tetbiqOlunanlar } from "../lib/miqrasiya.js";

const acar = BAGLANTI_ACARLARI.find((ad) => process.env[ad]);
if (!acar) {
  console.error(`Bağlantı sətri yoxdur. Gözlənilən açarlardan biri: ${BAGLANTI_ACARLARI.join(", ")}`);
  process.exit(1);
}

// Ünvanın ÖZÜ heç yerdə çap olunmur — yalnız açarın adı
console.log(`Baza açarı: ${acar}`);

const muster = neon(process.env[acar], { fullResults: true });
const sorgu = async (metn, params = []) => {
  const netice = await muster.query(metn, params);
  return netice.rows ?? netice;
};

try {
  const olanlar = (await tetbiqOlunanlar(sorgu)).map((s) => s.ad);
  const hamisi = miqrasiyaFayllari();

  if (process.argv.includes("--list")) {
    for (const ad of hamisi) {
      console.log(`${olanlar.includes(ad) ? "✓" : "·"} ${ad}`);
    }
    process.exit(0);
  }

  const yeniler = await miqrasiyalariTetbiqEt(sorgu, (m) => console.log(m));
  console.log(
    yeniler.length
      ? `Tətbiq olundu: ${yeniler.join(", ")}`
      : `Yenilik yoxdur — ${olanlar.length} miqrasiya artıq tətbiq olunub.`,
  );
} catch (xeta) {
  console.error(xeta.message);
  process.exit(1);
}
