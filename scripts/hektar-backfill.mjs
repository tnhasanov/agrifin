#!/usr/bin/env node
/**
 * HEKTAR BACKFILL — köhnə sahələr üçün geodezik ölçü və kontur heşi.
 *
 * 005-dən sonra `saheler.hektar_server` və `kontur_hash` mövcuddur, amma
 * köhnə sətirlərdə boşdur: onlar klientin dediyi hektarla yazılmışdı.
 * Bu skript hər sətrin ÖZ KONTURUNDAN ölçünü yenidən hesablayır.
 *
 * Niyə SQL yox, JS: geodezik düstur JS-dədir (lib/geo.js) və klientlə
 * SERVER EYNİ düsturu işlətməlidir — SQL-də ikinci nüsxə yazmaq iki
 * həqiqət yaradardı.
 *
 * Xarici sorğu YOXDUR, deterministikdir, təkrar işlədilə bilər.
 *
 *   node scripts/hektar-backfill.mjs --quru   # yalnız göstərir, yazmır
 *   node scripts/hektar-backfill.mjs          # yazır
 *
 * Bağlantı sətri çap olunmur — yalnız env açarının adı.
 */
import { neon } from "@neondatabase/serverless";
import { BAGLANTI_ACARLARI } from "../lib/db.js";
import { sahəHektar } from "../lib/geo.js";
import { konturHash } from "../lib/konturHash.js";

const quru = process.argv.includes("--quru");

const acar = BAGLANTI_ACARLARI.find((ad) => process.env[ad]);
if (!acar) {
  console.error(`Bağlantı sətri yoxdur. Gözlənilən açarlardan biri: ${BAGLANTI_ACARLARI.join(", ")}`);
  process.exit(1);
}
console.log(`Baza açarı: ${acar}${quru ? " · QURU İCRA (yazılmır)" : ""}`);

const muster = neon(process.env[acar], { fullResults: true });
const sorgu = async (metn, params = []) => {
  const netice = await muster.query(metn, params);
  return netice.rows ?? netice;
};

const saheler = await sorgu(
  "SELECT id, noqteler, hektar, hektar_server, kontur_hash FROM saheler ORDER BY id",
);
console.log(`Sahə: ${saheler.length}`);

let yenilenen = 0;
let atlanan = 0;
let yararsiz = 0;

for (const sahe of saheler) {
  const noqteler = typeof sahe.noqteler === "string" ? JSON.parse(sahe.noqteler) : sahe.noqteler;
  const hektar = sahəHektar(noqteler);
  const hash = konturHash(noqteler);

  if (!(hektar > 0) || !hash) {
    yararsiz += 1;
    console.log(`  sahe_id=${sahe.id}: kontur yararsızdır — ƏL İLƏ BAXILMALIDIR`);
    continue;
  }
  // Artıq düzgün yazılıbsa toxunmuruq (təkrar icra zərərsiz olsun)
  if (sahe.hektar_server != null && sahe.kontur_hash === hash) {
    atlanan += 1;
    continue;
  }

  const iddia = Number(sahe.hektar);
  const ferq = Number.isFinite(iddia) && hektar > 0 ? ((iddia - hektar) / hektar) * 100 : null;
  console.log(
    `  sahe_id=${sahe.id}: klient=${Number.isFinite(iddia) ? iddia : "—"} ha → geodezik=${hektar} ha` +
      (ferq != null && Math.abs(ferq) > 1 ? ` (fərq ${ferq.toFixed(1)}%)` : ""),
  );

  if (!quru) {
    await sorgu("UPDATE saheler SET hektar_server=$2, kontur_hash=$3 WHERE id=$1", [
      sahe.id,
      hektar,
      hash,
    ]);
  }
  yenilenen += 1;
}

console.log(
  `\nYenilənən: ${yenilenen} · Artıq düzgün: ${atlanan} · Yararsız kontur: ${yararsiz}` +
    (quru ? "\n(QURU İCRA — heç nə yazılmadı)" : ""),
);

// Köhnə snapshot-lar klient mənbəlidir: kredit qərarına girmirlər, ona görə
// onlara kontur heşi YAZILMIR. Server snapshot-u ilk müraciətdə yaranacaq.
const [klientSnap] = await sorgu(
  "SELECT count(*)::int AS say FROM peyk_snapshotlar WHERE menbe='klient'",
);
console.log(
  `Klient mənbəli snapshot: ${klientSnap.say} — anderraytinqdə İŞLƏDİLMİR ` +
    "(server snapshot-u ilk müraciətdə yaranır).",
);
