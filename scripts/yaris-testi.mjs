#!/usr/bin/env node
/**
 * YARIŞ ŞƏRAİTİ İNTEQRASİYA TESTİ — REAL PostgreSQL/Neon üzərində.
 *
 * ═══ NİYƏ AYRICA SKRİPT ═══════════════════════════════════════════════
 * Vitest yığımındakı yarış testləri PGlite üzərindədir — PGlite tək
 * bağlantılıdır, sorğular faktiki ardıcıllaşır. SQL naxışları (FOR UPDATE,
 * tək-ifadəli CTE, unikal indekslər) real çox-bağlantılı Postgres üçün
 * yazılıb, amma ƏSL paralel icra yalnız real serverdə sınana bilər.
 * Neon HTTP sürücüsündə hər sorğu ayrı HTTPS çağırışıdır — Promise.all
 * ilə göndərilən sorğular serverdə həqiqətən eyni anda yarışır.
 *
 * ═══ SSENARİLƏR ═══════════════════════════════════════════════════════
 *   A. Qalıq 100, eyni anda 60+60  → tətbiq 60 və 40, qalıq 0, mənfi yox
 *   B. Eyni idempotentlik açarı (paralel + təkrar) → DÜZ BİR maliyyə hadisəsi
 *   C. Eyni təklifə eyni anda iki qəbul → DÜZ BİR kredit
 *
 * ═══ İCRA (BİRDƏFƏLİK NEON BRANCH ÜZƏRİNDƏ) ═══════════════════════════
 * Maliyyə cədvəlləri RESTRICT-dir — test qalıqları silinə bilməz. Ona görə
 * skript ANA BAZAYA YOX, birdəfəlik Neon branch-ına qarşı işlədilir:
 *
 *   1. Neon konsolu → Branches → "yaris-test" branch-ı yarat (ana bazadan)
 *   2. Branch-ın connection string-i ilə:
 *        DATABASE_URL="postgres://...yaris-test..." \
 *        SESSION_SECRET="test-sirri" \
 *        node scripts/yaris-testi.mjs
 *   3. Nəticə: "HAMISI KEÇDİ" və çıxış kodu 0 (uğursuzluqda 1)
 *   4. Branch-ı sil — heç bir test qalığı ana bazaya toxunmur
 *
 * Skript miqrasiyaları özü tətbiq edir (branch təzədirsə də işləyir) və
 * real API handler-ini çağırır — HTTP qatı ilə eyni kod yolu.
 */
import { sorgu } from "../lib/db.js";
import { miqrasiyalariTetbiqEt } from "../lib/miqrasiya.js";
import { sahəHektar } from "../lib/geo.js";
import { konturHash } from "../lib/konturHash.js";
import { otpTesdiqle, otpYarat } from "../lib/hesab.js";
import handler from "../api/kredit.js";

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error("DATABASE_URL (birdəfəlik Neon branch!) və SESSION_SECRET tələb olunur.");
  process.exit(1);
}

let ugursuz = 0;
function yoxla(ad, sert, detal = "") {
  console.log(`${sert ? "✓" : "✗"} ${ad}${sert ? "" : `  ← ${detal}`}`);
  if (!sert) ugursuz += 1;
}

function isle({ method = "GET", body, cookie, query } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: null,
      govde: null,
      status(kod) {
        res.statusCode = kod;
        return res;
      },
      json(g) {
        res.govde = g;
        resolve(res);
        return res;
      },
      setHeader() {},
    };
    handler({ method, body, query, headers: cookie ? { cookie } : {} }, res);
  });
}

const NOQTELER = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

/** Unikal telefonlu fermer + sahə + peyk tarixçəsi + sessiya */
async function fermerYarat(sonluq) {
  // +994 + 9 rəqəm: 50 + vaxtın son 5 rəqəmi + 2 rəqəmli sonluq — hər icrada unikal
  const telefon = `+99450${String(Date.now()).slice(-5)}${sonluq}`;
  const { kod } = await otpYarat({ telefon, ip: null });
  const { token } = await otpTesdiqle({ telefon, kod });
  const [istifadeci] = await sorgu("SELECT id FROM istifadeciler WHERE telefon=$1", [telefon]);
  await sorgu(
    `INSERT INTO saheler (istifadeci_id, noqteler, hektar, hektar_server, kontur_hash, bitki)
     VALUES ($1,$2,10,$3,$4,'pomidor')`,
    [istifadeci.id, JSON.stringify(NOQTELER), sahəHektar(NOQTELER), konturHash(NOQTELER)],
  );
  const [sahe] = await sorgu("SELECT id FROM saheler WHERE istifadeci_id=$1", [istifadeci.id]);
  const il = new Date().getFullYear();
  const movsumler = Array.from({ length: 6 }, (_, i) => ({
    il: il - 5 + i,
    zirve: 0.72,
    zirveAyi: `${il - 5 + i}-05`,
    etrafMedyan: 0.6,
    olcmeSayi: 6,
  }));
  // Anderraytinq YALNIZ menbe='server' + kontura uyğun sətri oxuyur
  await sorgu(
    `INSERT INTO peyk_snapshotlar (sahe_id, nov, mezmun, menbe, kontur_hash)
     VALUES ($1,'tarixce',$2,'server',$3)`,
    [sahe.id, JSON.stringify({ movsumler }), konturHash(NOQTELER)],
  );
  return { cookie: `agrifin_sessiya=${token}`, id: istifadeci.id };
}

async function kreditAl(fermer) {
  const muraciet = await isle({
    method: "POST",
    cookie: fermer.cookie,
    body: { emel: "muraciet", mebleg: 2000 },
  });
  const qebul = await isle({
    method: "POST",
    cookie: fermer.cookie,
    body: {
      emel: "teklif-qebul",
      teklifId: muraciet.govde.teklif.id,
      acar: `q-${muraciet.govde.teklif.id}`,
    },
  });
  return qebul.govde.kredit;
}

console.log("Miqrasiyalar tətbiq olunur…");
await miqrasiyalariTetbiqEt(sorgu, (mesaj) => console.log(mesaj));

// ── A. Qalıq 100-ə eyni anda 60 + 60 ────────────────────────────────────
{
  console.log("\nA. Qalıq 100, paralel 60+60");
  const f = await fermerYarat("01");
  const kredit = await kreditAl(f);
  await isle({ method: "POST", cookie: f.cookie, body: { emel: "odenis", mebleg: 1900 } });

  await Promise.all([
    isle({ method: "POST", cookie: f.cookie, body: { emel: "odenis", mebleg: 60, acar: "a-1" } }),
    isle({ method: "POST", cookie: f.cookie, body: { emel: "odenis", mebleg: 60, acar: "a-2" } }),
  ]);

  const [setir] = await sorgu("SELECT principal_outstanding, status FROM loans WHERE id=$1", [kredit.id]);
  // Açar hissə başına suffikslənir: '<açar>:faiz' və '<açar>:esas'
  // (ödəniş əvvəl faizi, sonra əsas borcu bağlayır — bax: api/kredit.js)
  const hadiseler = await sorgu(
    `SELECT amount FROM loan_events
     WHERE loan_id=$1 AND event_type='principal_repayment' AND idempotency_key LIKE 'a-%'
     ORDER BY id`,
    [kredit.id],
  );
  const megbleger = hadiseler.map((h) => Number(h.amount)).sort((a, b) => b - a);
  yoxla("qalıq 0-dır və kredit bağlanıb", Number(setir.principal_outstanding) === 0 && setir.status === "repaid", JSON.stringify(setir));
  yoxla("tətbiq 60 və 40-dır (ikinci sorğu yenilənmiş qalığı görüb)", JSON.stringify(megbleger) === "[60,40]", JSON.stringify(megbleger));
}

// ── B. Eyni idempotentlik açarı ────────────────────────────────────────
{
  console.log("\nB. Eyni açar: paralel cüt + sonra təkrar");
  const f = await fermerYarat("02");
  const kredit = await kreditAl(f);

  await Promise.all([
    isle({ method: "POST", cookie: f.cookie, body: { emel: "odenis", mebleg: 300, acar: "tekrar" } }),
    isle({ method: "POST", cookie: f.cookie, body: { emel: "odenis", mebleg: 300, acar: "tekrar" } }),
  ]);
  const tekrar = await isle({
    method: "POST",
    cookie: f.cookie,
    body: { emel: "odenis", mebleg: 300, acar: "tekrar" },
  });

  const hadiseler = await sorgu(
    "SELECT id FROM loan_events WHERE loan_id=$1 AND idempotency_key LIKE 'tekrar:%'",
    [kredit.id],
  );
  const [setir] = await sorgu("SELECT principal_outstanding FROM loans WHERE id=$1", [kredit.id]);
  yoxla("düz BİR maliyyə hadisəsi yazılıb", hadiseler.length === 1, `${hadiseler.length} hadisə`);
  yoxla("qalıq yalnız bir dəfə azalıb (1700)", Number(setir.principal_outstanding) === 1700, setir.principal_outstanding);
  yoxla("təkrar sorğu idarəli cavab alıb (200)", tekrar.statusCode === 200, String(tekrar.statusCode));
}

// ── C. Eyni təklifə eyni anda iki qəbul ────────────────────────────────
{
  console.log("\nC. Paralel təklif qəbulu");
  const f = await fermerYarat("03");
  const muraciet = await isle({
    method: "POST",
    cookie: f.cookie,
    body: { emel: "muraciet", mebleg: 2000 },
  });
  const teklifId = muraciet.govde.teklif.id;

  const cavablar = await Promise.all([
    isle({ method: "POST", cookie: f.cookie, body: { emel: "teklif-qebul", teklifId } }),
    isle({ method: "POST", cookie: f.cookie, body: { emel: "teklif-qebul", teklifId } }),
  ]);

  const kreditler = await sorgu("SELECT id FROM loans WHERE offer_id=$1", [teklifId]);
  const ugurlu = cavablar.filter((c) => c.statusCode === 200).length;
  yoxla("düz BİR kredit yaranıb", kreditler.length === 1, `${kreditler.length} kredit`);
  yoxla("yalnız bir sorğu 200 alıb, o biri idarəli 409", ugurlu === 1 && cavablar.some((c) => c.statusCode === 409),
    JSON.stringify(cavablar.map((c) => c.statusCode)));
}

// ── D. Bir fermer, bir aktiv kredit — BAZA SƏVİYYƏSİNDƏ ─────────────────
// PGlite tək bağlantılıdır, ona görə partial unique index-in əsl paralel
// icrada işlədiyini yalnız burada, real Postgres-də görmək olar.
{
  console.log("\nD. Paralel iki aktiv kredit cəhdi (partial unique index)");
  const f = await fermerYarat("04");
  const kredit = await kreditAl(f);

  // Eyni istifadəçi üçün İKİNCİ aktiv kredit yazmağa paralel cəhd
  const ikinciYaz = () =>
    sorgu(
      `INSERT INTO loans
         (istifadeci_id, application_id, offer_id, principal_original, principal_outstanding,
          annual_rate, term_months, status, matures_on, disbursed_at)
       SELECT l.istifadeci_id, l.application_id, l.offer_id, 500, 500, 11.5, 6,
              'active', l.matures_on, now()
       FROM loans l WHERE l.id=$1`,
      [kredit.id],
    ).then(() => "yazildi").catch((xeta) => String(xeta?.message ?? xeta));

  const neticeler = await Promise.all([ikinciYaz(), ikinciYaz()]);
  const aktivler = await sorgu(
    "SELECT id FROM loans WHERE istifadeci_id=$1 AND status='active'",
    [f.id],
  );
  yoxla("aktiv kredit yenə BİRDİR", aktivler.length === 1, `${aktivler.length} aktiv kredit`);
  yoxla(
    "hər iki cəhd baza tərəfindən dayandırılıb",
    neticeler.every((n) => n !== "yazildi"),
    JSON.stringify(neticeler).slice(0, 200),
  );
}

// ── E. Ay ortasında tam bağlanma + paralel adi ödəniş ───────────────────
// Payoff faizi ilə adi ödənişin toqquşması: nə ikiqat faiz, nə mənfi qalıq.
{
  console.log("\nE. Paralel tam bağlanma və adi ödəniş");
  const f = await fermerYarat("05");
  const kredit = await kreditAl(f);
  // Verilməni 45 gün geri çəkirik: 1 tam dövr + yarımçıq aralıq qalsın
  const verilme = new Date(Date.now() - 45 * 86_400_000).toISOString();
  await sorgu("UPDATE loans SET disbursed_at=$2, created_at=$2 WHERE id=$1", [kredit.id, verilme]);
  await sorgu("UPDATE loan_events SET created_at=$2 WHERE loan_id=$1", [kredit.id, verilme]);

  await Promise.all([
    isle({ method: "POST", cookie: f.cookie, body: { emel: "odenis", tam: true, acar: "e-tam" } }),
    isle({ method: "POST", cookie: f.cookie, body: { emel: "odenis", mebleg: 100, acar: "e-adi" } }),
  ]);

  const [setir] = await sorgu(
    "SELECT principal_outstanding, interest_outstanding, status FROM loans WHERE id=$1",
    [kredit.id],
  );
  const payoffFaizler = await sorgu(
    "SELECT id FROM loan_events WHERE loan_id=$1 AND idempotency_key LIKE 'faiz-payoff-%'",
    [kredit.id],
  );
  yoxla("qalıq mənfi deyil", Number(setir.principal_outstanding) >= 0, setir.principal_outstanding);
  yoxla("faiz borcu mənfi deyil", Number(setir.interest_outstanding) >= 0, setir.interest_outstanding);
  yoxla("payoff faizi yalnız BİR dəfə yazılıb", payoffFaizler.length <= 1, `${payoffFaizler.length} sətir`);
}

console.log(ugursuz === 0 ? "\nHAMISI KEÇDİ" : `\n${ugursuz} YOXLAMA KEÇMƏDİ`);
process.exit(ugursuz === 0 ? 0 : 1);
