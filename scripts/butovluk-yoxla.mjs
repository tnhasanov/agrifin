#!/usr/bin/env node
/**
 * BÜTÖVLÜK YOXLAMASI — TAM READ-ONLY. Heç nə yazmır, heç nə dəyişmir.
 *
 * Məqsəd: 005 miqrasiyasından ƏVVƏL bazanın yeni invariantlara hazır
 * olduğunu bilmək. `loans (istifadeci_id) WHERE status='active'` partial
 * unique index-i, bazada artıq iki aktiv krediti olan istifadəçi varsa,
 * YARADILA BİLMƏZ və miqrasiya yarıda qalar. Bunu miqrasiyadan sonra yox,
 * əvvəl bilmək lazımdır.
 *
 * Nə yoxlanılır:
 *   1. Bir istifadəçidə birdən çox AKTİV kredit (005 üçün blokerdir);
 *   2. Mənfi balans və ya bağlanmış kreditdə qalıq (mühasibat pozuntusu);
 *   3. Əsas və faiz balansı sıfır olduğu halda hələ də 'active' qalan kredit;
 *   4. Klient mənbəli peyk snapshot-larının sayı (005-də 'klient' kimi
 *      işarələnəcək və anderraytinqdən çıxarılacaq — miqyası bilmək üçün);
 *   5. Saxlanmış hektar ilə konturdan hesablanan GEODEZİK hektar arasındakı
 *      fərq (kim təsir görür və nə qədər — hektar avtoritetini serverə
 *      keçirməzdən əvvəlki ölçü).
 *
 * GİZLİLİK: bağlantı sətri, telefon nömrəsi və ad-soyad ÇAP OLUNMUR —
 * yalnız daxili id-lər və toplu saylar. Çıxış kodu: blokerlər varsa 1.
 */
import { neon } from "@neondatabase/serverless";
import { BAGLANTI_ACARLARI } from "../lib/db.js";
import { sahəHektar } from "../lib/geo.js";

const acar = BAGLANTI_ACARLARI.find((ad) => process.env[ad]);
if (!acar) {
  console.error(`Bağlantı sətri yoxdur. Gözlənilən açarlardan biri: ${BAGLANTI_ACARLARI.join(", ")}`);
  process.exit(1);
}
console.log(`Baza açarı: ${acar}`);

const muster = neon(process.env[acar], { fullResults: true });
const sorgu = async (metn, params = []) => {
  const netice = await muster.query(metn, params);
  return netice.rows ?? netice;
};

/** Cədvəl yoxdursa yoxlama atlanır — baza köhnə ola bilər */
async function cedvelVar(ad) {
  const [setir] = await sorgu("SELECT to_regclass($1) IS NOT NULL AS var", [`public.${ad}`]);
  return Boolean(setir?.var);
}

let bloker = 0;
let xeberdarliq = 0;
const basliq = (metn) => console.log(`\n── ${metn} ${"─".repeat(Math.max(0, 60 - metn.length))}`);

// ── 1. Bir istifadəçidə birdən çox aktiv kredit ────────────────────────
basliq("1. Aktiv kredit sayı (005 partial unique index üçün)");
if (await cedvelVar("loans")) {
  const coxlu = await sorgu(
    `SELECT istifadeci_id, count(*)::int AS say
       FROM loans WHERE status='active'
      GROUP BY istifadeci_id HAVING count(*) > 1
      ORDER BY count(*) DESC`,
  );
  const [cem] = await sorgu("SELECT count(*)::int AS say FROM loans WHERE status='active'");
  console.log(`Aktiv kredit (cəmi): ${cem.say}`);
  if (coxlu.length === 0) {
    console.log("✓ Heç bir istifadəçidə birdən çox aktiv kredit yoxdur — index yaradıla bilər.");
  } else {
    bloker += 1;
    console.log(`✗ BLOKER: ${coxlu.length} istifadəçidə birdən çox aktiv kredit var.`);
    for (const setir of coxlu) console.log(`   istifadeci_id=${setir.istifadeci_id} → ${setir.say} aktiv kredit`);
    console.log("   005 miqrasiyası bu sətirlər təmizlənmədən tətbiq OLUNMAMALIDIR.");
  }
} else {
  console.log("loans cədvəli yoxdur — atlanır.");
}

// ── 2. Mühasibat pozuntuları ──────────────────────────────────────────
basliq("2. Balans bütövlüyü");
if (await cedvelVar("loans")) {
  const [mənfi] = await sorgu(
    `SELECT count(*)::int AS say FROM loans
      WHERE principal_outstanding < 0 OR interest_outstanding < 0`,
  );
  const [bagliQaliq] = await sorgu(
    `SELECT count(*)::int AS say FROM loans
      WHERE status='repaid' AND (principal_outstanding > 0.004 OR interest_outstanding > 0.004)`,
  );
  const [sifirAktiv] = await sorgu(
    `SELECT count(*)::int AS say FROM loans
      WHERE status='active' AND principal_outstanding <= 0.004 AND interest_outstanding <= 0.004`,
  );
  const yaz = (etiket, say, blokerdir = true) => {
    if (say === 0) return console.log(`✓ ${etiket}: 0`);
    if (blokerdir) bloker += 1;
    else xeberdarliq += 1;
    return console.log(`${blokerdir ? "✗ BLOKER" : "⚠ XƏBƏRDARLIQ"} ${etiket}: ${say}`);
  };
  yaz("Mənfi balanslı kredit", mənfi.say);
  yaz("Bağlandığı halda qalığı olan kredit", bagliQaliq.say);
  yaz("Balansı sıfır, amma hələ 'active' olan kredit", sifirAktiv.say, false);
} else {
  console.log("loans cədvəli yoxdur — atlanır.");
}

// ── 3. Klient mənbəli peyk snapshot-ları ──────────────────────────────
basliq("3. Peyk snapshot-larının mənbəyi (005-də 'klient' işarələnəcək)");
if (await cedvelVar("peyk_snapshotlar")) {
  const [snap] = await sorgu("SELECT count(*)::int AS say FROM peyk_snapshotlar");
  const novler = await sorgu(
    "SELECT nov, count(*)::int AS say FROM peyk_snapshotlar GROUP BY nov ORDER BY 2 DESC",
  );
  console.log(`Snapshot (cəmi): ${snap.say} — hamısı klient tərəfindən yazılıb (provenance sütunu hələ yoxdur).`);
  for (const setir of novler) console.log(`   nov=${setir.nov} → ${setir.say}`);
  if (snap.say > 0) {
    xeberdarliq += 1;
    console.log("⚠ Bu sətirlər 005-dən sonra anderraytinqdə İSTİFADƏ OLUNMAYACAQ (yalnız diaqnostika).");
  }
} else {
  console.log("peyk_snapshotlar cədvəli yoxdur — atlanır.");
}

// ── 4. Hektar: saxlanmış dəyər vs geodezik hesablama ──────────────────
basliq("4. Hektar avtoriteti (klient dəyəri vs geodezik)");
if (await cedvelVar("saheler")) {
  const saheler = await sorgu("SELECT id, hektar, noqteler FROM saheler");
  console.log(`Sahə (cəmi): ${saheler.length}`);
  let fərqli = 0;
  let enBoyukFerq = 0;
  for (const sahe of saheler) {
    const noqteler = typeof sahe.noqteler === "string" ? JSON.parse(sahe.noqteler) : sahe.noqteler;
    const geodezik = sahəHektar(noqteler);
    const saxlanan = Number(sahe.hektar);
    if (!Number.isFinite(saxlanan) || !Number.isFinite(geodezik) || geodezik <= 0) continue;
    const ferqFaiz = Math.abs((saxlanan - geodezik) / geodezik) * 100;
    if (ferqFaiz > 1) {
      fərqli += 1;
      enBoyukFerq = Math.max(enBoyukFerq, ferqFaiz);
      console.log(
        `   sahe_id=${sahe.id}: saxlanan=${saxlanan} ha, geodezik=${geodezik} ha (fərq ${ferqFaiz.toFixed(1)}%)`,
      );
    }
  }
  if (fərqli === 0) {
    console.log("✓ Bütün saxlanmış hektarlar geodezik hesablama ilə uyğundur (≤1% fərq).");
  } else {
    xeberdarliq += 1;
    console.log(`⚠ ${fərqli} sahədə fərq var (ən böyüyü ${enBoyukFerq.toFixed(1)}%) — 005 backfill onları düzəldəcək.`);
  }
} else {
  console.log("saheler cədvəli yoxdur — atlanır.");
}

basliq("NƏTİCƏ");
console.log(`Bloker: ${bloker} · Xəbərdarlıq: ${xeberdarliq}`);
if (bloker > 0) {
  console.log("MİQRASİYA 005 TƏTBİQ EDİLMƏMƏLİDİR — əvvəlcə blokerlər həll olunmalıdır.");
  process.exit(1);
}
console.log("Baza 005 miqrasiyası üçün hazırdır.");
