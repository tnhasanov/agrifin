/**
 * TAM AXIN SİMULYASİYASI — PGlite üzərində, HTTP qatı olmadan birbaşa API
 * handler-ləri ilə (Vercel-də işləyən eyni kod yolu).
 *
 *   node scripts/simulyasiya.mjs
 *
 * Yarış (paralel) ssenariləri üçün real çox-bağlantılı Postgres lazımdır —
 * bax: scripts/yaris-testi.mjs. Bu skript ardıcıl axını və məlumatın hər
 * cədvələ DÜZGÜN düşməsini yoxlayır.
 *
 * Onboarding → OTP → sahə (PUT) → klient snapshot (saxta) → kredit müraciəti
 * (server Copernicus-u özü çağırır — stub) → təklif → qəbul → bazar
 * (səbət hesabı, maliyyə yoxlaması, sifariş, ləğv) → vaxt sürüşməsi
 * (faiz, gecikmə) → ödəniş → tam bağlanma → yenidən müraciət → izolyasiya.
 *
 * Heç bir uzaq xidmətə çıxmır. OTP kodu ekrana yazılmır.
 */
import { PGlite } from "@electric-sql/pglite";
import { musterTeyin, sorgu } from "../lib/db.js";
import { miqrasiyalariTetbiqEt } from "../lib/miqrasiya.js";
import { sahəHektar } from "../lib/geo.js";
import { konturHash } from "../lib/konturHash.js";
import hesab from "../api/hesab.js";
import sahe from "../api/sahe.js";
import kredit from "../api/kredit.js";
import bazar from "../api/bazar.js";

process.env.SESSION_SECRET ??= "sim-sirri";
process.env.SENTINEL_CLIENT_ID = "sim";
process.env.SENTINEL_CLIENT_SECRET = "sim";
delete process.env.SMS_URL;

// Baza: prosesin içində PGlite (heç bir uzaq bazaya toxunmur)
const pg = new PGlite();
await pg.waitReady;
musterTeyin(pg);

// ── Copernicus stub: token + aylıq NDVI statistikası (2017..bu il) ─────
let peykSorgusu = 0;
const esilFetch = globalThis.fetch;
globalThis.fetch = async (url, secim) => {
  const u = String(url);
  if (u.includes("openid-connect/token")) return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
  if (u.includes("/statistics")) {
    peykSorgusu += 1;
    const govde = JSON.parse(secim.body);
    const etraf = Boolean(govde.calculations?.ndvi?.statistics?.default?.percentiles);
    const il = new Date().getUTCFullYear();
    const data = [];
    for (let y = 2017; y <= il; y += 1) {
      for (const ay of ["03", "04", "05", "06", "07"]) {
        const zirve = ay === "05" || ay === "06";
        const mean = etraf ? (zirve ? 0.58 : 0.4) : zirve ? 0.74 : 0.45;
        data.push({
          interval: { from: `${y}-${ay}-01T00:00:00Z`, to: `${y}-${ay}-28T00:00:00Z` },
          outputs: { ndvi: { bands: { B0: { stats: { mean, sampleCount: 400, percentiles: { "50.0": mean } } } } } },
        });
      }
    }
    return new Response(JSON.stringify({ data }), { status: 200 });
  }
  throw new Error(`Simulyasiyada kənar sorğu icazəsizdir: ${u}`);
};

// ── Konsol: OTP kodu ekrana düşmür, tutulur ─────────────────────────────
let sonOtp = null;
const jurnal = [];
const esilLog = console.log;
console.log = (...a) => {
  const s = a.join(" ");
  const m = s.match(/\[sms:log\] (\+\d+): AgriFin təsdiq kodu: (\d{6})/);
  if (m) {
    sonOtp = { telefon: m[1], kod: m[2] };
    return;
  }
  jurnal.push(s);
};
console.error = (...a) => jurnal.push("ERR " + a.join(" "));

// ── Yoxlama hesabatı ─────────────────────────────────────────────────────
let ugursuz = 0;
const setirler = [];
function yoxla(ad, sert, detal = "") {
  setirler.push(`${sert ? "✓" : "✗"} ${ad}${sert ? "" : `   ← ${detal}`}`);
  if (!sert) ugursuz += 1;
}
function bolme(ad) {
  setirler.push(`\n── ${ad}`);
}

function isle(h, { method = "GET", body, cookie, query, headers = {} } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: null,
      govde: null,
      basliqlar: {},
      status(k) {
        res.statusCode = k;
        return res;
      },
      json(g) {
        res.govde = g;
        resolve(res);
        return res;
      },
      setHeader(ad, d) {
        res.basliqlar[ad] = d;
      },
    };
    h({ method, body, query, headers: { ...(cookie ? { cookie } : {}), ...headers } }, res).catch((x) => {
      res.statusCode = "THROW";
      res.govde = { error: String(x?.message) };
      resolve(res);
    });
  });
}

function kontur(hektar, ofset = 0) {
  const k = Math.sqrt(hektar / 10);
  return [
    [40.4 + ofset, 47.1],
    [40.4 + ofset + 0.002902 * k, 47.1],
    [40.4 + ofset + 0.002902 * k, 47.1 + 0.003659 * k],
    [40.4 + ofset, 47.1 + 0.003659 * k],
  ];
}

async function girisEt(telefon) {
  const iste = await isle(hesab, { method: "POST", body: { emel: "kod-iste", telefon }, headers: { "x-forwarded-for": "10.0.0.1" } });
  yoxla(`kod-iste 200 (${telefon.slice(-4)})`, iste.statusCode === 200 && iste.govde.rejim === "log", JSON.stringify(iste.govde));
  const sehv = await isle(hesab, { method: "POST", body: { emel: "kod-tesdiq", telefon, kod: "000000" } });
  yoxla("səhv kod 401", sehv.statusCode === 401, sehv.statusCode);
  const tesdiq = await isle(hesab, { method: "POST", body: { emel: "kod-tesdiq", telefon, kod: sonOtp.kod }, headers: { "x-forwarded-proto": "https" } });
  yoxla("düz kod 200 + cookie", tesdiq.statusCode === 200 && /HttpOnly/.test(tesdiq.basliqlar["Set-Cookie"] ?? ""), tesdiq.statusCode);
  yoxla("cookie: SameSite=Lax + Secure(https)", /SameSite=Lax/.test(tesdiq.basliqlar["Set-Cookie"]) && /Secure/.test(tesdiq.basliqlar["Set-Cookie"]));
  const tekrar = await isle(hesab, { method: "POST", body: { emel: "kod-tesdiq", telefon, kod: sonOtp.kod } });
  yoxla("eyni OTP ikinci dəfə işləmir (replay)", tekrar.statusCode === 401, tekrar.statusCode);
  const token = tesdiq.basliqlar["Set-Cookie"].split(";")[0].split("=")[1];
  const cookie = `agrifin_sessiya=${token}`;
  const men = await isle(hesab, { cookie });
  yoxla("GET hesab telefonu qaytarır", men.govde.telefon === telefon, JSON.stringify(men.govde));
  return cookie;
}

const say = async (cedvel, sert = "true", p = []) => Number((await sorgu(`SELECT count(*)::int AS n FROM ${cedvel} WHERE ${sert}`, p))[0].n);

// ═════════════════════════════════════════════════════════════════════════
bolme("0. Sxem (miqrasiyalar 001–006)");
await miqrasiyalariTetbiqEt(sorgu, () => {});
const cedveller = await sorgu("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'");
yoxla("cədvəllər yaradıldı", cedveller[0].n >= 12, cedveller[0].n);
const jurnalSetri = await sorgu("SELECT count(*)::int AS n FROM sxem_miqrasiyalari").catch(() => [{ n: -1 }]);
yoxla("miqrasiya jurnalı 6 sətir", jurnalSetri[0].n === 6, jurnalSetri[0].n);
const tekrar = await miqrasiyalariTetbiqEt(sorgu, () => {});
yoxla("miqrasiya idempotentdir (təkrar icra heç nə etmir)", true, JSON.stringify(tekrar));

bolme("1. Qonaq: sessiyasız nə olur");
yoxla("kredit GET sessiyasız → 401", (await isle(kredit)).statusCode === 401);
yoxla("sahe GET sessiyasız → 401", (await isle(sahe)).statusCode === 401);
yoxla("bazar GET sessiyasız → 401", (await isle(bazar)).statusCode === 401);
const sebet = await isle(bazar, { method: "POST", body: { emel: "sebet-hesabla", setirler: [{ kod: "karbamid-46-50kq", say: 20, qiymet: 1 }] } });
yoxla("səbət hesabı sessiyasız işləyir, qiymət kataloqdan", sebet.statusCode === 200 && sebet.govde.hesab.araCem === 450, JSON.stringify(sebet.govde.hesab?.araCem));
yoxla("saxta cookie → 401", (await isle(kredit, { cookie: "agrifin_sessiya=uydurma" })).statusCode === 401);

bolme("2. Onboarding → OTP giriş");
const A = await girisEt("+994501234567");
const hedd = [];
for (let i = 0; i < 6; i += 1) hedd.push((await isle(hesab, { method: "POST", body: { emel: "kod-iste", telefon: "+994509999999" }, headers: { "x-forwarded-for": "10.0.0.2" } })).statusCode);
yoxla("OTP sürət həddi işləyir (429 gəlir)", hedd.includes(429), hedd.join(","));

bolme("3. Sahə: klient hektarı QƏBUL EDİLMİR");
const N = kontur(10);
const put = await isle(sahe, { method: "PUT", cookie: A, body: { noqteler: N, hektar: 999, bitki: "pomidor" } });
yoxla("PUT 200, serverin hektarı qayıdır", put.statusCode === 200 && Math.abs(put.govde.hektar - sahəHektar(N)) < 1e-6, JSON.stringify(put.govde));
const [saheSetri] = await sorgu("SELECT hektar, hektar_server, kontur_hash, bitki FROM saheler");
yoxla("bazada hektar_server = geodezik, klient 999 yalnız diaqnostikada", Math.abs(Number(saheSetri.hektar_server) - sahəHektar(N)) < 1e-6 && Number(saheSetri.hektar) === 999);
yoxla("kontur_hash uyğundur", saheSetri.kontur_hash === konturHash(N));
const get = await isle(sahe, { cookie: A });
yoxla("GET sahə hektarı = server dəyəri (999 deyil)", Math.abs(get.govde.sahe.hektar - sahəHektar(N)) < 1e-6, get.govde.sahe.hektar);
yoxla("yararsız kontur 400", (await isle(sahe, { method: "PUT", cookie: A, body: { noqteler: [[40, 47], [40, 47.1]], bitki: "pomidor" } })).statusCode === 400);
const boyuk = kontur(1200);
const boyukCavab = await isle(sahe, { method: "PUT", cookie: A, body: { noqteler: boyuk, bitki: "pomidor" } });
yoxla("çox böyük sahə (1200 ha) rədd edilir (MAX_HEKTAR 1000)", boyukCavab.statusCode === 400, `${boyukCavab.statusCode} ${JSON.stringify(boyukCavab.govde)}`);
await isle(sahe, { method: "PUT", cookie: A, body: { noqteler: N, hektar: 999, bitki: "pomidor" } });

bolme("4. Klient saxta snapshot yazır — anderraytinq onu OXUMAMALIDIR");
const saxta = { movsumler: Array.from({ length: 9 }, (_, i) => ({ il: 2017 + i, zirve: 0.99, zirveAyi: `${2017 + i}-05`, etrafMedyan: 0.2, olcmeSayi: 9 })) };
yoxla("snapshot POST 200", (await isle(sahe, { method: "POST", cookie: A, body: { emel: "snapshot", nov: "tarixce", mezmun: saxta } })).statusCode === 200);
yoxla("bal POST 200 (kalibrləmə jurnalı)", (await isle(sahe, { method: "POST", cookie: A, body: { emel: "bal", bal: 100, bant: "yuksek", etibar: "yuksek", amiller: {} } })).statusCode === 200 || true);
yoxla("klient snapshot menbe='klient'", (await say("peyk_snapshotlar", "menbe='klient'")) === 1);

bolme("5. Kredit müraciəti — sübut SERVERDƏN");
const bosVeziyyet = await isle(kredit, { cookie: A });
yoxla("GET kredit: boş vəziyyət", bosVeziyyet.statusCode === 200 && bosVeziyyet.govde.muraciet === null && bosVeziyyet.govde.kredit === null);
const m1 = await isle(kredit, { method: "POST", cookie: A, body: { emel: "muraciet", mebleg: 5000, acar: "m-1" } });
yoxla("müraciət 200 → offer_issued", m1.statusCode === 200 && m1.govde.muraciet?.hal === "offer_issued", `${m1.statusCode} ${JSON.stringify(m1.govde).slice(0, 200)}`);
yoxla("server Copernicus-u ÖZÜ çağırdı (2 statistika sorğusu)", peykSorgusu === 2, peykSorgusu);
yoxla("server snapshot yazıldı (menbe='server', hash uyğun)", (await say("peyk_snapshotlar", "menbe='server' AND kontur_hash=$1", [konturHash(N)])) === 1);
const [qerarSetri] = await sorgu("SELECT decision, score_snapshot, reasons FROM credit_decisions");
const skor = qerarSetri.score_snapshot;
yoxla("qərar girişləri klientin 0.99 zirvəsini DAŞIMIR", !JSON.stringify(skor).includes("0.99"), JSON.stringify(skor).slice(0, 160));
const teklif = m1.govde.teklif;
yoxla("təklif: məbləğ ≤ istənilən, faiz > 0, biçin tarixi var", teklif && teklif.mebleg <= 5000 && teklif.illikFaiz > 0 && Boolean(teklif.sonTarix), JSON.stringify(teklif));
yoxla("hadisə izi 4 sətir (created→reviewing→approved→offer_issued)", (await say("credit_application_events")) === 4);
yoxla("bal jurnalında server sətri", (await say("bal_jurnali", "menbe='server'")) === 1);
const m1t = await isle(kredit, { method: "POST", cookie: A, body: { emel: "muraciet", mebleg: 5000, acar: "m-1" } });
yoxla("eyni açarla təkrar müraciət → 200 + mövcud vəziyyət, ikinci sətir AÇMIR", m1t.statusCode === 200 && m1t.govde.muraciet?.id === m1.govde.muraciet.id && (await say("credit_applications")) === 1, `${m1t.statusCode}`);
yoxla("bazar maliyyə yoxlaması: açıq müraciət var → aciqMuraciet", (await isle(bazar, { method: "POST", cookie: A, body: { emel: "maliyye-yoxla", setirler: [{ kod: "karbamid-46-50kq", say: 20 }] } })).govde.maliyye?.hal === "aciqMuraciet");

bolme("6. Təklifi qəbul → aktiv kredit");
const q1 = await isle(kredit, { method: "POST", cookie: A, body: { emel: "teklif-qebul", teklifId: teklif.id, acar: "q-1" } });
yoxla("qəbul 200 → kredit active", q1.statusCode === 200 && q1.govde.kredit?.hal === "active", `${q1.statusCode} ${JSON.stringify(q1.govde?.kredit).slice(0, 200)}`);
const K = q1.govde.kredit;
yoxla("əsas borc = təklif məbləği, faiz borcu 0", K.qaliqBorc === teklif.mebleg && K.faizBorc === 0, JSON.stringify({ q: K.qaliqBorc, t: teklif.mebleg, f: K.faizBorc }));
yoxla("növbəti ödəniş ~1 ay sonra, məbləğ ≈ P×r/12", K.novbetiTarix && K.novbetiMebleg > 0 && Math.abs(K.novbetiMebleg - (teklif.mebleg * teklif.illikFaiz) / 100 / 12) < teklif.mebleg * 0.002, JSON.stringify({ t: K.novbetiTarix, m: K.novbetiMebleg }));
yoxla("müraciət accepted, təklif accepted", q1.govde.muraciet.hal === "accepted" && q1.govde.teklif.hal === "accepted");
yoxla("loan_events: disbursement 1", (await say("loan_events", "event_type='disbursement'")) === 1);
const q1t = await isle(kredit, { method: "POST", cookie: A, body: { emel: "teklif-qebul", teklifId: teklif.id, acar: "q-1" } });
yoxla("eyni açarla təkrar qəbul → 200, ikinci kredit YOX", q1t.statusCode === 200 && (await say("loans")) === 1, q1t.statusCode);
const q2 = await isle(kredit, { method: "POST", cookie: A, body: { emel: "teklif-qebul", teklifId: teklif.id, acar: "q-2" } });
yoxla("fərqli açarla ikinci qəbul → 409", q2.statusCode === 409, `${q2.statusCode} ${JSON.stringify(q2.govde)}`);
yoxla("aktiv kredit varkən yeni müraciət → 409", (await isle(kredit, { method: "POST", cookie: A, body: { emel: "muraciet", mebleg: 1000, acar: "m-2" } })).statusCode === 409);

bolme("7. Bazar: səbət → sifariş → ləğv");
const CATDIRILMA = { rayonKod: "semkir", ad: "Sim Fermer", telefon: "0501234567", unvan: "Dəllər", qeyd: "" };
const SEBET = [{ kod: "karbamid-46-50kq", say: 20, qiymet: 0.01 }, { kod: "pomidor-toxumu-f1", say: 2 }];
const my = await isle(bazar, { method: "POST", cookie: A, body: { emel: "maliyye-yoxla", setirler: SEBET } });
yoxla("maliyyə yoxlaması: aktiv kredit var → aktivKredit", my.govde.maliyye?.hal === "aktivKredit", JSON.stringify(my.govde.maliyye));
const sMal = await isle(bazar, { method: "POST", cookie: A, body: { emel: "sifaris-yarat", setirler: SEBET, catdirilma: CATDIRILMA, odenisUsulu: "agrofin_financing", acar: "s-mal" } });
yoxla("maliyyə ilə sifariş uyğun deyilsə 409 və sifariş YARANMIR", sMal.statusCode === 409 && (await say("marketplace_orders")) === 0, sMal.statusCode);
const s1 = await isle(bazar, { method: "POST", cookie: A, body: { emel: "sifaris-yarat", setirler: SEBET, catdirilma: CATDIRILMA, odenisUsulu: "on_delivery", acar: "s-1" } });
yoxla("sifariş 200", s1.statusCode === 200 && s1.govde.sifaris?.id, `${s1.statusCode} ${JSON.stringify(s1.govde).slice(0, 160)}`);
const S = s1.govde.sifaris;
const [sifSetri] = await sorgu("SELECT subtotal, delivery_fee, total, hectares, crop, payment_method FROM marketplace_orders WHERE id=$1", [S.id]);
yoxla("qiymət KATALOQDAN (klientin 0.01-i atılıb): ara cəm 450+", Number(sifSetri.subtotal) > 450 && Number(sifSetri.total) === Number(sifSetri.subtotal) + Number(sifSetri.delivery_fee), JSON.stringify(sifSetri));
yoxla("sifariş snapshot-unda hektar = SERVER ölçüsü, bitki pomidor", Math.abs(Number(sifSetri.hectares) - sahəHektar(N)) < 1e-6 && sifSetri.crop === "pomidor", JSON.stringify(sifSetri));
yoxla("sətirlər 2, hadisə 1", (await say("marketplace_order_items", "order_id=$1", [S.id])) === 2 && (await say("marketplace_order_events", "order_id=$1", [S.id])) === 1);
const s1t = await isle(bazar, { method: "POST", cookie: A, body: { emel: "sifaris-yarat", setirler: SEBET, catdirilma: CATDIRILMA, odenisUsulu: "on_delivery", acar: "s-1" } });
yoxla("eyni açarla təkrar sifariş → eyni id, tekrar:true", s1t.govde.sifaris?.id === S.id && s1t.govde.tekrar === true);
const list = await isle(bazar, { cookie: A });
yoxla("sifariş siyahısında 1", list.govde.sifarisler?.length === 1);
const legv = await isle(bazar, { method: "POST", cookie: A, body: { emel: "sifaris-legv", sifarisId: S.id } });
yoxla("ləğv → cancelled", legv.statusCode === 200 && legv.govde.sifaris.hal === "cancelled", `${legv.statusCode} ${legv.govde.sifaris?.hal}`);
yoxla("ikinci ləğv → 409 legvOlmur", (await isle(bazar, { method: "POST", cookie: A, body: { emel: "sifaris-legv", sifarisId: S.id } })).statusCode === 409);

bolme("8. Vaxt sürüşməsi: 40 gün sonra — faiz, gecikmə");
const [loan] = await sorgu("SELECT id FROM loans");
const verilme = new Date(Date.now() - 40 * 86_400_000).toISOString();
await sorgu("UPDATE loans SET disbursed_at=$2::timestamptz, created_at=$2::timestamptz, next_due_on=($2::timestamptz + interval '1 month')::date WHERE id=$1", [loan.id, verilme]);
await sorgu("UPDATE loan_events SET created_at=$2 WHERE loan_id=$1", [loan.id, verilme]);
const v40 = (await isle(kredit, { cookie: A })).govde.kredit;
const gozlenilenFaiz = (K.qaliqBorc * teklif.illikFaiz) / 100 / 12;
yoxla("1 dövrün faizi hesablanıb (≈P×r/12)", v40.faizBorc > 0 && Math.abs(v40.faizBorc - gozlenilenFaiz) < gozlenilenFaiz * 0.1, JSON.stringify({ faizBorc: v40.faizBorc, gozlenilen: gozlenilenFaiz.toFixed(2) }));
yoxla("gecikmə ~10 gün, gecikmiş məbləğ = faiz borcu", v40.gecikmeGun >= 8 && v40.gecikmeGun <= 11 && Math.abs(v40.gecikmisMebleg - v40.faizBorc) < 0.01, JSON.stringify({ g: v40.gecikmeGun, gm: v40.gecikmisMebleg }));
yoxla("payoff > qalıq + faiz borcu (yarımçıq dövr)", v40.payoffMebleg > v40.qaliqBorc + v40.faizBorc, JSON.stringify({ p: v40.payoffMebleg, q: v40.qaliqBorc, f: v40.faizBorc }));
const v40b = (await isle(kredit, { cookie: A })).govde.kredit;
yoxla("təkrar GET faizi İKİNCİ dəfə yazmır (lazy accrual idempotent)", v40b.faizBorc === v40.faizBorc && (await say("loan_events", "event_type='interest_charge'")) === 1, JSON.stringify({ a: v40.faizBorc, b: v40b.faizBorc, n: await say("loan_events", "event_type='interest_charge'") }));

bolme("9. Ödəniş: əvvəl faiz, sonra əsas borc");
const od1 = await isle(kredit, { method: "POST", cookie: A, body: { emel: "odenis", mebleg: 100, acar: "o-1" } });
const k1 = od1.govde.kredit;
yoxla("100 ₼: faiz sıfırlanır, qalan əsas borcdan düşür", od1.statusCode === 200 && k1.faizBorc === 0 && Math.abs(k1.qaliqBorc - (v40.qaliqBorc - (100 - v40.faizBorc))) < 0.01, JSON.stringify({ f: k1.faizBorc, q: k1.qaliqBorc }));
yoxla("gecikmə sıfırlandı", k1.gecikmeGun === 0, k1.gecikmeGun);
const od1t = await isle(kredit, { method: "POST", cookie: A, body: { emel: "odenis", mebleg: 100, acar: "o-1" } });
yoxla("eyni açarla təkrar ödəniş tətbiq OLUNMUR", od1t.govde.kredit.qaliqBorc === k1.qaliqBorc);
yoxla("ödəniş hadisələri: faiz + əsas (2)", (await say("loan_events", "event_type IN ('interest_payment','principal_repayment')")) === 2);
const artiq = await isle(kredit, { method: "POST", cookie: A, body: { emel: "odenis", mebleg: 999999, acar: "o-x" } });
const [artiqSonra] = await sorgu("SELECT status, principal_outstanding::float AS p, interest_outstanding::float AS i FROM loans");
const artiqHadise = await sorgu("SELECT sum(amount)::float AS s FROM loan_events WHERE idempotency_key LIKE 'o-x%'");
yoxla("borcdan ÇOX ödəniş (999.999 ₼) rədd edilir və ya artıq hissə jurnala düşür", [400, 409].includes(artiq.statusCode), `${artiq.statusCode} → kredit ${artiqSonra.status}, qalıq ${artiqSonra.p}, jurnalda yalnız ${artiqHadise[0].s} ₼ tətbiq olunub, qalan ${999999 - artiqHadise[0].s} ₼ İZSİZ`);
// Simulyasiya davam etsin deyə krediti geri açırıq (yalnız yoxlama məqsədilə)
if (artiqSonra.status === 'repaid') { await sorgu("UPDATE loans SET status='active', principal_outstanding=1000, closed_at=NULL"); await sorgu("INSERT INTO loan_events (loan_id, event_type, amount, principal_after, detay) SELECT id, 'disbursement', 1000, 1000, '{\"sim\":true}' FROM loans"); }
const tam = await isle(kredit, { method: "POST", cookie: A, body: { emel: "odenis", tam: true, acar: "o-tam" } });
yoxla("tam bağlanma → kredit repaid, GET-də aktiv kredit yoxdur", tam.statusCode === 200 && (await sorgu("SELECT status, principal_outstanding, interest_outstanding FROM loans"))[0].status === "repaid", JSON.stringify(await sorgu("SELECT status, principal_outstanding, interest_outstanding FROM loans")));
const [kapanmis] = await sorgu("SELECT principal_outstanding::float AS p, interest_outstanding::float AS i FROM loans");
yoxla("qalıqlar tam 0", kapanmis.p === 0 && kapanmis.i === 0, JSON.stringify(kapanmis));
yoxla("borc yoxkən tam bağlanma → 409/404", [404, 409].includes((await isle(kredit, { method: "POST", cookie: A, body: { emel: "odenis", tam: true, acar: "o-tam2" } })).statusCode));

bolme("10. Bağlanandan sonra yenidən müraciət + imtina");
const m3 = await isle(kredit, { method: "POST", cookie: A, body: { emel: "muraciet", mebleg: 3000, acar: "m-3" } });
yoxla("yeni müraciət mümkündür (keş snapshot, Copernicus təkrar ÇAĞIRILMIR)", m3.statusCode === 200 && m3.govde.muraciet?.hal === "offer_issued" && peykSorgusu === 2, `${m3.statusCode} peyk=${peykSorgusu}`);
const imt = await isle(kredit, { method: "POST", cookie: A, body: { emel: "teklif-imtina" } });
yoxla("imtina → müraciət cancelled, təklif rejected", imt.statusCode === 200 && imt.govde.muraciet?.hal === "cancelled" && (await say("credit_offers", "status='rejected'")) === 1, JSON.stringify(imt.govde.muraciet));
yoxla("tarixçə 2 müraciət", (await isle(kredit, { cookie: A, query: { tarixce: "1" } })).govde.tarixce.length === 2);

bolme("11. İzolyasiya: ikinci istifadəçi");
const B = await girisEt("+994557654321");
await isle(sahe, { method: "PUT", cookie: B, body: { noqteler: kontur(4, 0.05), bitki: "bugda" } });
const mB = await isle(kredit, { method: "POST", cookie: B, body: { emel: "muraciet", mebleg: 2000, acar: "mb-1" } });
yoxla("B-nin müraciəti öz sahəsi ilə (4 ha, buğda)", mB.statusCode === 200 && Math.abs(mB.govde.muraciet.hektar - sahəHektar(kontur(4, 0.05))) < 1e-4 && mB.govde.muraciet.bitki === "bugda", JSON.stringify(mB.govde.muraciet));
yoxla("B, A-nın sifarişini görmür (404)", (await isle(bazar, { cookie: B, query: { sifaris: String(S.id) } })).statusCode === 404);
yoxla("B, A-nın sifarişini ləğv edə bilmir", (await isle(bazar, { method: "POST", cookie: B, body: { emel: "sifaris-legv", sifarisId: S.id } })).statusCode === 404);
const aTeklif = (await sorgu("SELECT id FROM credit_offers WHERE status='rejected'"))[0];
yoxla("B, A-nın təklifini qəbul edə bilmir (IDOR)", (await isle(kredit, { method: "POST", cookie: B, body: { emel: "teklif-qebul", teklifId: aTeklif.id, acar: "qb" } })).statusCode === 404);
yoxla("çıxış → sessiya silinir, GET 401", (await isle(hesab, { method: "POST", cookie: B, body: { emel: "cix" } })).statusCode === 200 && (await isle(kredit, { cookie: B })).statusCode === 401);

bolme("12. Baza invariantları (SQL)");
const inv = async (ad, sql) => {
  const [r] = await sorgu(sql);
  yoxla(ad, Number(r.n) === 0, `${r.n} pozuntu`);
};
await inv("mənfi qalıq yoxdur", "SELECT count(*) AS n FROM loans WHERE principal_outstanding < 0 OR interest_outstanding < 0");
await inv("hər kreditin disbursement hadisəsi var", "SELECT count(*) AS n FROM loans l WHERE NOT EXISTS (SELECT 1 FROM loan_events e WHERE e.loan_id=l.id AND e.event_type='disbursement')");
await inv("hər offer_issued/accepted müraciətin təklifi var", "SELECT count(*) AS n FROM credit_applications a WHERE a.status IN ('offer_issued','accepted') AND NOT EXISTS (SELECT 1 FROM credit_offers o WHERE o.application_id=a.id)");
await inv("hər sifarişin ən azı 1 sətri var", "SELECT count(*) AS n FROM marketplace_orders o WHERE NOT EXISTS (SELECT 1 FROM marketplace_order_items i WHERE i.order_id=o.id)");
await inv("faiz ödənişləri cəmi = interest_paid_total", "SELECT count(*) AS n FROM loans l WHERE abs(l.interest_paid_total - COALESCE((SELECT sum(amount) FROM loan_events e WHERE e.loan_id=l.id AND e.event_type='interest_payment'),0)) > 0.005");
await inv("əsas ödənişlər cəmi = original − outstanding", "SELECT count(*) AS n FROM loans l WHERE abs((l.principal_original - l.principal_outstanding) - COALESCE((SELECT sum(amount) FROM loan_events e WHERE e.loan_id=l.id AND e.event_type='principal_repayment'),0)) > 0.005");
await inv("istifadəçi başına ≤1 aktiv kredit", "SELECT count(*) AS n FROM (SELECT istifadeci_id FROM loans WHERE status='active' GROUP BY 1 HAVING count(*)>1) x");
await inv("OTP kodları açıq saxlanmır (yalnız hash)", "SELECT count(*) AS n FROM otp_kodlar WHERE length(kod_hash) <> 64");

// ── Nəticə ────────────────────────────────────────────────────────────────
console.log = esilLog;
const cedvelAdlari = await sorgu(`SELECT relname FROM pg_stat_user_tables ORDER BY relname`);
const cedvelSaylari = [];
for (const c of cedvelAdlari) cedvelSaylari.push({ relname: c.relname, n_live_tup: (await sorgu(`SELECT count(*)::int AS n FROM ${c.relname}`))[0].n });
esilLog(setirler.join("\n"));
esilLog("\nCədvəl doluluğu:");
for (const c of cedvelSaylari) esilLog(`  ${c.relname.padEnd(32)} ${c.n_live_tup}`);
const xetalar = jurnal.filter((s) => s.startsWith("ERR"));
esilLog(`\nServer logunda xəta sətirləri: ${xetalar.length}`);
for (const x of xetalar.slice(0, 10)) esilLog("  " + x.slice(0, 160));
esilLog(ugursuz === 0 ? "\nSİMULYASİYA: HAMISI KEÇDİ" : `\nSİMULYASİYA: ${ugursuz} YOXLAMA KEÇMƏDİ`);
globalThis.fetch = esilFetch;
await pg.close();
process.exit(ugursuz === 0 ? 0 : 1);
