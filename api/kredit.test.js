import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { musterTeyin, sorgu } from "../lib/db.js";
import { miqrasiyalariTetbiqEt } from "../lib/miqrasiya.js";
import { otpTesdiqle, otpYarat } from "../lib/hesab.js";
import { ayliqFaiz } from "../lib/kreditOdenis.js";
import { KREDIT_SERTLERI } from "../lib/kreditSertler.js";
import { dovrSonu } from "../lib/kreditMuhasibat.js";
import handler from "./kredit.js";

let pg;
let kohneSecret;

beforeAll(async () => {
  kohneSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "test-sirri";
  pg = new PGlite();
  await pg.waitReady;
  musterTeyin(pg);
  await miqrasiyalariTetbiqEt(sorgu);
}, 60_000);

afterAll(async () => {
  if (kohneSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = kohneSecret;
  musterTeyin(null);
  await pg.close();
});

beforeEach(async () => {
  musterTeyin(pg);
  await sorgu("TRUNCATE istifadeciler RESTART IDENTITY CASCADE");
  await sorgu("TRUNCATE otp_kodlar RESTART IDENTITY");
});

function resYarat() {
  const res = {
    statusCode: null,
    govde: null,
    status(kod) {
      res.statusCode = kod;
      return res;
    },
    json(g) {
      res.govde = g;
      return res;
    },
    setHeader() {},
  };
  return res;
}

async function isle({ method = "GET", body, cookie, query } = {}) {
  const res = resYarat();
  await handler({ method, body, query, headers: cookie ? { cookie } : {} }, res);
  return res;
}

const NOQTELER = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

/** Giriş edir və (istəyə görə) sahə yazır — kredit üçün sahə şərtdir */
async function fermer({ telefon = "+994501234567", hektar = 10, bitki = "pomidor" } = {}) {
  const { kod } = await otpYarat({ telefon, ip: null });
  const { token } = await otpTesdiqle({ telefon, kod });
  const [istifadeci] = await sorgu("SELECT id FROM istifadeciler WHERE telefon=$1", [telefon]);
  if (hektar) {
    await sorgu(
      "INSERT INTO saheler (istifadeci_id, noqteler, hektar, bitki) VALUES ($1,$2,$3,$4)",
      [istifadeci.id, JSON.stringify(NOQTELER), hektar, bitki],
    );
  }
  return { cookie: `agrifin_sessiya=${token}`, id: istifadeci.id };
}

/** Peyk tarixçəsi snapshot-u — anderraytinq serverdəki bu sətri oxuyur */
async function tarixceYaz(istifadeciId, il = new Date().getFullYear()) {
  const [sahe] = await sorgu("SELECT id FROM saheler WHERE istifadeci_id=$1", [istifadeciId]);
  const movsumler = Array.from({ length: 6 }, (_, i) => ({
    il: il - 5 + i,
    zirve: 0.72,
    zirveAyi: `${il - 5 + i}-05`,
    etrafMedyan: 0.6,
    olcmeSayi: 6,
  }));
  await sorgu(
    "INSERT INTO peyk_snapshotlar (sahe_id, nov, mezmun) VALUES ($1,'tarixce',$2)",
    [sahe.id, JSON.stringify({ movsumler })],
  );
}

const muracietEt = (cookie, mebleg, elave = {}) =>
  isle({ method: "POST", cookie, body: { emel: "muraciet", mebleg, ...elave } });

// ═══ TƏHLÜKƏSİZLİK ═══════════════════════════════════════════════════

describe("kredit API — təhlükəsizlik", () => {
  it("sessiyasız istifadəçi heç nə görmür", async () => {
    const oxu = await isle({});
    expect(oxu.statusCode).toBe(401);
    const yaz = await isle({ method: "POST", body: { emel: "muraciet", mebleg: 2000 } });
    expect(yaz.statusCode).toBe(401);
  });

  it("saxta cookie sessiya vermir", async () => {
    const cavab = await isle({ cookie: "agrifin_sessiya=uydurma-token" });
    expect(cavab.statusCode).toBe(401);
  });

  /**
   * MİQRASİYA İŞLƏDİLMƏYİB — Vercel preview deployment-lərində Neon hər
   * branch üçün ayrı baza yaradır; kredit cədvəlləri gələnə qədər açılmış
   * branch-ın bazasında `credit_applications` yoxdur. Bu, "gözlənilməz
   * xəta" deyil, quraşdırma vəziyyətidir və cavabda belə də adlanmalıdır —
   * yoxsa ekran "server sındı" deyir və axtarış səhv yerdə başlayır.
   */
  // "Miqrasiyanı işlətdim, amma xəta qalır" — səbəb adətən miqrasiyanın
  // BAŞQA bazaya düşməsidir. Bu uc tətbiqin öz bazasını göstərir.
  it("diaqnostika sxemin vəziyyətini deyir, sirr sızdırmır", async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = "abc1234567890";
    const cavab = await isle({ query: { diaqnostika: "1" } });
    delete process.env.VERCEL_GIT_COMMIT_SHA;

    expect(cavab.statusCode).toBe(200);
    // Hansı buraxılışın cavab verdiyi görünməlidir — köhnə deployment-i
    // yeni ilə səhv salmaq bu axtarışda ən çox vaxt aparan şey oldu
    expect(cavab.govde.buraxilis).toBe("abc1234");
    expect(cavab.govde.kreditHazir).toBe(true);
    expect(cavab.govde.cedveller.credit_applications).toBe(true);
    expect(cavab.govde.miqrasiyalar).toContain("004_kredit_muhasibat.sql");
    // Sessiya tələb olunmur (quraşdırma ucudur), amma məlumat da verilmir
    const metn = JSON.stringify(cavab.govde);
    expect(metn).not.toMatch(/postgres:|password|@|telefon/);
  });

  it("cədvəl yoxdursa 503 sxemYoxdur qaytarır, 500 yox", async () => {
    const xeta = Object.assign(new Error('relation "credit_applications" does not exist'), {
      code: "42P01",
    });
    musterTeyin({
      query: () => Promise.reject(xeta),
    });

    const cavab = await isle({ cookie: "agrifin_sessiya=hansisa-token" });

    expect(cavab.statusCode).toBe(503);
    expect(cavab.govde).toEqual({ error: "sxemYoxdur" });
    // Daxili SQL mətni klientə sızmır
    expect(JSON.stringify(cavab.govde)).not.toMatch(/relation|does not exist/);
  });

  it("A fermeri B-nin təklifini qəbul edə bilmir (IDOR)", async () => {
    const a = await fermer({ telefon: "+994501111111" });
    await tarixceYaz(a.id);
    await muracietEt(a.cookie, 2000);
    const [teklif] = await sorgu("SELECT id FROM credit_offers LIMIT 1");

    const b = await fermer({ telefon: "+994502222222" });
    const cavab = await isle({
      method: "POST",
      cookie: b.cookie,
      body: { emel: "teklif-qebul", teklifId: teklif.id },
    });

    expect(cavab.statusCode).toBe(404);
    const kreditler = await sorgu("SELECT id FROM loans");
    expect(kreditler).toHaveLength(0);
  });

  it("B fermeri A-nın müraciətini görmür", async () => {
    const a = await fermer({ telefon: "+994501111111" });
    await tarixceYaz(a.id);
    await muracietEt(a.cookie, 2000);

    const b = await fermer({ telefon: "+994502222222" });
    const cavab = await isle({ cookie: b.cookie });
    expect(cavab.statusCode).toBe(200);
    expect(cavab.govde.muraciet).toBeNull();
  });

  it("gövdədəki istifadeci_id NƏZƏRƏ ALINMIR — sahiblik sessiyadandır", async () => {
    const a = await fermer({ telefon: "+994501111111" });
    await tarixceYaz(a.id);
    const b = await fermer({ telefon: "+994502222222", hektar: 0 });

    // B özünü A kimi göstərməyə çalışır
    await muracietEt(b.cookie, 2000, { istifadeci_id: a.id, user_id: a.id, userId: a.id });

    // B-nin sahəsi yoxdur → 409; A-nın adına heç nə yazılmayıb
    const aMuracietleri = await sorgu(
      "SELECT id FROM credit_applications WHERE istifadeci_id=$1",
      [a.id],
    );
    expect(aMuracietleri).toHaveLength(0);
  });

  it("klient qərarı və məbləği özü təyin edə bilmir", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    // Klient "təsdiqlənmiş 999.999 ₼" göndərməyə çalışır
    await muracietEt(f.cookie, 2000, {
      status: "approved",
      qerar: "approved",
      approved_amount: 999999,
      tavan: 999999,
      decision: "approved",
    });

    const [muraciet] = await sorgu("SELECT status, requested_amount FROM credit_applications");
    const [qerar] = await sorgu("SELECT approved_amount FROM credit_decisions");
    // Vəziyyəti server yazıb, məbləği server hesablayıb
    expect(muraciet.status).toBe("offer_issued");
    expect(Number(muraciet.requested_amount)).toBe(2000);
    expect(Number(qerar.approved_amount)).toBeLessThanOrEqual(2000);
  });

  it("yanlış məbləğ və müddət rədd olunur", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    for (const mebleg of [0, -100, "abc", null, 10_000_000]) {
      const cavab = await muracietEt(f.cookie, mebleg);
      expect(cavab.statusCode, String(mebleg)).toBe(400);
    }
    // Minimumdan aşağı
    const az = await muracietEt(f.cookie, KREDIT_SERTLERI.minKredit - 100);
    expect(az.statusCode).toBe(400);
    expect(az.govde.error).toBe("meblegAzdir");
    expect(await sorgu("SELECT id FROM credit_applications")).toHaveLength(0);
  });

  it("dərəcə və müddət klientdən alınmır", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    await muracietEt(f.cookie, 2000, { illikFaiz: 0, annual_rate: 0, muddetAy: 240 });
    const [teklif] = await sorgu("SELECT annual_rate, term_months FROM credit_offers");
    expect(Number(teklif.annual_rate)).toBe(KREDIT_SERTLERI.illikFaiz);
    expect(teklif.term_months).toBeLessThanOrEqual(KREDIT_SERTLERI.maxMuddetAy);
  });
});

// ═══ MÜRACİƏT VƏ QƏRAR ═══════════════════════════════════════════════

describe("müraciət → qərar → təklif", () => {
  it("müraciət yaradılır və server qərar verib təklif çıxarır", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    const cavab = await muracietEt(f.cookie, 2000);

    expect(cavab.statusCode).toBe(200);
    expect(cavab.govde.muraciet.hal).toBe("offer_issued");
    expect(cavab.govde.qerar.qerar).toBe("approved");
    expect(cavab.govde.teklif.mebleg).toBeGreaterThan(0);
    expect(cavab.govde.teklif.qurulus).toBe(KREDIT_SERTLERI.odenisQurulusu);
  });

  it("sahəsiz fermer müraciət edə bilmir", async () => {
    const f = await fermer({ hektar: 0 });
    const cavab = await muracietEt(f.cookie, 2000);
    expect(cavab.statusCode).toBe(409);
    expect(cavab.govde.error).toBe("saheYoxdur");
  });

  it("qərarın girişləri tam saxlanılır — sonradan təkrarlana bilər", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    await muracietEt(f.cookie, 2000);

    const [muraciet] = await sorgu("SELECT decision_inputs, calc_version FROM credit_applications");
    const g = muraciet.decision_inputs;

    expect(muraciet.calc_version).toMatch(/^v2-[0-9a-f]{12}$/);
    expect(g.sahe).toMatchObject({ hektar: 10, bitki: "pomidor" });
    // Ümumi və xalis gəlir AYRI saxlanılır
    const pessimist = g.gelir.ssenariler.find((s) => s.ad === "pessimist");
    expect(pessimist.ummumiGelir).toBeGreaterThan(0);
    expect(pessimist.xalisGelir).toBe(pessimist.ummumiGelir - pessimist.xerc);
    // Təhlükəsizlik ehtiyatı və DSTI tavanı dəyər kimi yazılıb (istinad yox)
    expect(g.odenis.ehtiyatPayi).toBe(0.25);
    expect(g.odenis.dstiTavani).toBe(0.4);
    expect(g.limit).toMatchObject({ istenilen: 2000, illikFaiz: KREDIT_SERTLERI.illikFaiz });
    // Bal surəti
    expect(g.indeks.bal).toBeGreaterThan(0);
    expect(g.peyk.movsumSayi).toBe(6);
    // Peyk girişlərinin ÖZÜ dondurulub: snapshot sonradan yenilənsə də
    // qərarın nəyə baxdığı dəyişmir
    expect(g.peyk.movsumler).toHaveLength(6);
    expect(g.peyk.movsumler[0]).toMatchObject({ zirve: 0.72, etrafMedyan: 0.6 });
    expect(g.peyk.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("peyk tarixçəsi olmayan müraciət səbəbdə qeyd olunur", async () => {
    const f = await fermer();
    const cavab = await muracietEt(f.cookie, 2000);
    expect(cavab.govde.qerar.sebebler).toContain("peykTarixcesiYoxdur");
  });

  it("qabiliyyət azdırsa rədd olunur və səbəb yazılır", async () => {
    // Kiçik sahədə aşağı marjalı bitki nağd borc daşımır
    const f = await fermer({ hektar: 0.5, bitki: "bugda" });
    const cavab = await muracietEt(f.cookie, 2000);

    expect(cavab.govde.muraciet.hal).toBe("rejected");
    expect(cavab.govde.qerar.qerar).toBe("rejected");
    expect(cavab.govde.qerar.sebebler).toContain("qabiliyyetAzdir");
    expect(cavab.govde.teklif).toBeNull();
  });

  it("tavandan çox istənəndə aşağı təklif verilir, rədd edilmir", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    const cavab = await muracietEt(f.cookie, 900_000);

    expect(cavab.govde.qerar.qerar).toBe("approved");
    expect(cavab.govde.qerar.sebebler).toContain("limitAsagiSalinib");
    expect(cavab.govde.teklif.mebleg).toBeLessThan(900_000);
  });

  it("ikinci açıq müraciət yaradıla bilmir", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    await muracietEt(f.cookie, 2000);
    const ikinci = await muracietEt(f.cookie, 3000);

    expect(ikinci.statusCode).toBe(409);
    expect(ikinci.govde.error).toBe("artiqMuracietVar");
    expect(await sorgu("SELECT id FROM credit_applications")).toHaveLength(1);
  });

  it("vəziyyət tarixçəsi saxlanılır", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    await muracietEt(f.cookie, 2000);

    const hadiseler = await sorgu(
      "SELECT event_type, from_status, to_status FROM credit_application_events ORDER BY id",
    );
    expect(hadiseler.map((h) => h.event_type)).toEqual([
      "application_created",
      "underwriting_started",
      "decision_approved",
      "offer_issued",
    ]);
    expect(hadiseler.at(-1).to_status).toBe("offer_issued");
  });

  // ═══ ATOMİKLİK: yaradılış boru xətti bütöv ya yazılır, ya yox ═══════
  // Əvvəl 8 ayrı sorğu idi — arada qırılma "reviewing-də qalmış, təklifsiz
  // müraciət" qoyub açıq-müraciət indeksi ilə fermeri kilidləyirdi.
  it("təsdiq yolunda yazılış qırılanda HEÇ BİR yarımçıq sətir qalmır", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);

    const esl = pg;
    musterTeyin({
      query(metn, params) {
        if (metn.includes("INSERT INTO credit_applications")) {
          return Promise.reject(new Error("şəbəkə qırıldı"));
        }
        return esl.query(metn, params);
      },
    });
    const cavab = await muracietEt(f.cookie, 2000);
    musterTeyin(pg);

    expect(cavab.statusCode).toBe(500);
    // Dörd cədvəlin dördü də boşdur — yarımçıq müraciət yoxdur
    expect(await sorgu("SELECT id FROM credit_applications")).toHaveLength(0);
    expect(await sorgu("SELECT id FROM credit_application_events")).toHaveLength(0);
    expect(await sorgu("SELECT id FROM credit_decisions")).toHaveLength(0);
    expect(await sorgu("SELECT id FROM credit_offers")).toHaveLength(0);

    // Kilid qalmayıb: təkrar cəhd təmiz vəziyyətdən tam nəticə ilə keçir
    const tekrar = await muracietEt(f.cookie, 2000);
    expect(tekrar.statusCode).toBe(200);
    expect(tekrar.govde.muraciet.hal).toBe("offer_issued");
    expect(await sorgu("SELECT id FROM credit_application_events")).toHaveLength(4);
  });

  it("rədd yolunda da yazılış bütövdür — qırılma heç nə qoymur", async () => {
    // Kiçik sahə + aşağı marja → anderraytinq rədd edəcək
    const f = await fermer({ hektar: 0.5, bitki: "bugda" });

    const esl = pg;
    musterTeyin({
      query(metn, params) {
        if (metn.includes("INSERT INTO credit_applications")) {
          return Promise.reject(new Error("şəbəkə qırıldı"));
        }
        return esl.query(metn, params);
      },
    });
    const cavab = await muracietEt(f.cookie, 2000);
    musterTeyin(pg);

    expect(cavab.statusCode).toBe(500);
    expect(await sorgu("SELECT id FROM credit_applications")).toHaveLength(0);
    expect(await sorgu("SELECT id FROM credit_decisions")).toHaveLength(0);

    const tekrar = await muracietEt(f.cookie, 2000);
    expect(tekrar.statusCode).toBe(200);
    expect(tekrar.govde.muraciet.hal).toBe("rejected");
    // Rədd izi də tamdır: yaradılış + anderraytinq + rədd
    const hadiseler = await sorgu("SELECT event_type FROM credit_application_events ORDER BY id");
    expect(hadiseler.map((h) => h.event_type)).toEqual([
      "application_created",
      "underwriting_started",
      "decision_rejected",
    ]);
  });

  it("ləğv olunmuş müraciət tarixçədə qalır və yenisinə yol açır", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    await muracietEt(f.cookie, 2000);
    await isle({ method: "POST", cookie: f.cookie, body: { emel: "legv" } });

    const tarixce = await isle({ cookie: f.cookie, query: { tarixce: "1" } });
    expect(tarixce.govde.tarixce).toHaveLength(1);
    // Fermerin imtinası "cancelled"dir — anderraytinqin "rejected"i ilə
    // qarışdırılmır (hesabatda tamam fərqli hadisələrdir)
    expect(tarixce.govde.tarixce[0].hal).toBe("cancelled");
    const [teklif] = await sorgu("SELECT status FROM credit_offers");
    expect(teklif.status).toBe("rejected");

    // İndi yeni müraciət mümkündür
    const yeni = await muracietEt(f.cookie, 1500);
    expect(yeni.statusCode).toBe(200);
    expect(await sorgu("SELECT id FROM credit_applications")).toHaveLength(2);
  });
});

// ═══ TƏKLİF → KREDİT ═════════════════════════════════════════════════

describe("təklifin qəbulu və kredit", () => {
  async function teklifeQeder() {
    const f = await fermer();
    await tarixceYaz(f.id);
    const cavab = await muracietEt(f.cookie, 2000);
    return { ...f, teklifId: cavab.govde.teklif.id, teklif: cavab.govde.teklif };
  }

  it("təklifin qəbulu DƏQİQ bir kredit yaradır", async () => {
    const { cookie, teklifId, teklif } = await teklifeQeder();
    const cavab = await isle({
      method: "POST",
      cookie,
      body: { emel: "teklif-qebul", teklifId },
    });

    expect(cavab.statusCode).toBe(200);
    expect(cavab.govde.kredit.hal).toBe("active");
    expect(cavab.govde.kredit.qaliqBorc).toBe(teklif.mebleg);

    const kreditler = await sorgu("SELECT id FROM loans");
    expect(kreditler).toHaveLength(1);
    // Müraciət və təklif də bağlanıb
    const [m] = await sorgu("SELECT status FROM credit_applications");
    const [t] = await sorgu("SELECT status, accepted_at FROM credit_offers");
    expect(m.status).toBe("accepted");
    expect(t.status).toBe("accepted");
    expect(t.accepted_at).toBeTruthy();
    // Qəbul = dərhal (simulyasiya olunmuş) ödəmə: hadisə 'disbursement',
    // disbursed_at dolu — balans semantikası jurnalda tam görünür
    const hadiseler = await sorgu("SELECT event_type, amount, principal_after FROM loan_events");
    expect(hadiseler).toHaveLength(1);
    expect(hadiseler[0].event_type).toBe("disbursement");
    expect(Number(hadiseler[0].principal_after)).toBe(Number(hadiseler[0].amount));
    const [kreditSetri] = await sorgu("SELECT disbursed_at FROM loans");
    expect(kreditSetri.disbursed_at).toBeTruthy();
  });

  it("təkrar sorğu İKİNCİ krediti yaratmır", async () => {
    const { cookie, teklifId } = await teklifeQeder();
    const birinci = await isle({ method: "POST", cookie, body: { emel: "teklif-qebul", teklifId } });
    const ikinci = await isle({ method: "POST", cookie, body: { emel: "teklif-qebul", teklifId } });

    expect(birinci.statusCode).toBe(200);
    expect(ikinci.statusCode).toBe(409);
    expect(await sorgu("SELECT id FROM loans")).toHaveLength(1);
  });

  it("eyni anda gələn iki sorğudan yalnız biri kredit yaradır", async () => {
    const { cookie, teklifId } = await teklifeQeder();
    const cavablar = await Promise.all([
      isle({ method: "POST", cookie, body: { emel: "teklif-qebul", teklifId } }),
      isle({ method: "POST", cookie, body: { emel: "teklif-qebul", teklifId } }),
    ]);
    const ugurlu = cavablar.filter((c) => c.statusCode === 200);
    expect(ugurlu).toHaveLength(1);
    expect(await sorgu("SELECT id FROM loans")).toHaveLength(1);
  });

  it("rədd edilmiş təklif qəbul edilə bilmir", async () => {
    const { cookie, teklifId } = await teklifeQeder();
    await isle({ method: "POST", cookie, body: { emel: "teklif-imtina" } });

    const cavab = await isle({ method: "POST", cookie, body: { emel: "teklif-qebul", teklifId } });
    expect(cavab.statusCode).toBe(409);
    expect(await sorgu("SELECT id FROM loans")).toHaveLength(0);
  });

  it("vaxtı keçmiş təklif qəbul edilə bilmir", async () => {
    const { cookie, teklifId } = await teklifeQeder();
    await sorgu("UPDATE credit_offers SET expires_at = now() - interval '1 day' WHERE id=$1", [
      teklifId,
    ]);

    const cavab = await isle({ method: "POST", cookie, body: { emel: "teklif-qebul", teklifId } });
    expect(cavab.statusCode).toBe(409);
    expect(cavab.govde.error).toBe("teklifVaxti");
    expect(await sorgu("SELECT id FROM loans")).toHaveLength(0);
    const [teklif] = await sorgu("SELECT status FROM credit_offers WHERE id=$1", [teklifId]);
    expect(teklif.status).toBe("expired");
  });

  // ═══ ATOMİKLİK: beş yazının beşi də bir ifadədədir ═══════════════
  // Əvvəl müraciətin keçidi ifadədən sonra ayrıca gedirdi — o addım
  // uğursuz olanda "təklif qəbul edilib + kredit var + müraciət hələ
  // offer_issued" qalırdı. İndi ifadə bütöv uğursuz olur: heç bir cədvəl
  // dəyişmir və təkrar cəhd təmiz vəziyyətdən işləyir.
  it("qəbul yarıda qırılanda HEÇ BİR yarımçıq vəziyyət qalmır", async () => {
    const { cookie, teklifId } = await teklifeQeder();

    // Şəbəkə qırılmasını təqlid edirik: qəbul ifadəsi atılır
    const esl = pg;
    musterTeyin({
      query(metn, params) {
        if (metn.includes("yeni_kredit")) return Promise.reject(new Error("şəbəkə qırıldı"));
        return esl.query(metn, params);
      },
    });
    const cavab = await isle({ method: "POST", cookie, body: { emel: "teklif-qebul", teklifId } });
    musterTeyin(pg);

    expect(cavab.statusCode).toBe(500);
    // Heç nə dəyişməyib: təklif açıq, müraciət offer_issued, kredit yoxdur
    const [teklif] = await sorgu("SELECT status FROM credit_offers WHERE id=$1", [teklifId]);
    const [muraciet] = await sorgu("SELECT status FROM credit_applications");
    expect(teklif.status).toBe("issued");
    expect(muraciet.status).toBe("offer_issued");
    expect(await sorgu("SELECT id FROM loans")).toHaveLength(0);
    expect(
      await sorgu("SELECT id FROM credit_application_events WHERE event_type='offer_accepted'"),
    ).toHaveLength(0);

    // Təkrar cəhd təmiz vəziyyətdən uğurla keçir
    const tekrar = await isle({ method: "POST", cookie, body: { emel: "teklif-qebul", teklifId } });
    expect(tekrar.statusCode).toBe(200);
    expect(tekrar.govde.kredit.hal).toBe("active");
    const [son] = await sorgu("SELECT status FROM credit_applications");
    expect(son.status).toBe("accepted");
  });

  it("qəbul müraciəti və hadisə jurnalını da EYNİ ifadədə bağlayır", async () => {
    const { cookie, teklifId } = await teklifeQeder();
    await isle({ method: "POST", cookie, body: { emel: "teklif-qebul", teklifId } });

    const [muraciet] = await sorgu("SELECT status FROM credit_applications");
    expect(muraciet.status).toBe("accepted");
    const [hadise] = await sorgu(
      "SELECT from_status, to_status, detay FROM credit_application_events WHERE event_type='offer_accepted'",
    );
    expect(hadise.from_status).toBe("offer_issued");
    expect(hadise.to_status).toBe("accepted");
    expect(hadise.detay.loan_id).toBeTruthy();
  });

  it("olmayan təklif 404 verir", async () => {
    const { cookie } = await teklifeQeder();
    const cavab = await isle({
      method: "POST",
      cookie,
      body: { emel: "teklif-qebul", teklifId: 999999 },
    });
    expect(cavab.statusCode).toBe(404);
  });
});

// ═══ ÖDƏNİŞ VƏ FAİZ ══════════════════════════════════════════════════

describe("ödəniş qalığı azaldır, faiz qalığa hesablanır", () => {
  async function kreditAl(mebleg = 2000) {
    const f = await fermer();
    await tarixceYaz(f.id);
    const cavab = await muracietEt(f.cookie, mebleg);
    await isle({
      method: "POST",
      cookie: f.cookie,
      body: { emel: "teklif-qebul", teklifId: cavab.govde.teklif.id },
    });
    return f;
  }

  it("əsas borcdan ödəniş qalığı azaldır", async () => {
    const { cookie } = await kreditAl(2000);
    const evvel = (await isle({ cookie })).govde.kredit.qaliqBorc;

    const cavab = await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 500 } });
    expect(cavab.statusCode).toBe(200);
    expect(cavab.govde.kredit.qaliqBorc).toBe(evvel - 500);
  });

  it("növbəti faiz QALIĞA hesablanır, ilkin məbləğə yox", async () => {
    const { cookie } = await kreditAl(2000);
    const evvelki = (await isle({ cookie })).govde.kredit;
    const evvelkiFaiz = ayliqFaiz(evvelki.qaliqBorc, evvelki.illikFaiz);

    await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 500 } });
    const sonraki = (await isle({ cookie })).govde.kredit;
    const sonrakiFaiz = ayliqFaiz(sonraki.qaliqBorc, sonraki.illikFaiz);

    expect(sonraki.qaliqBorc).toBe(evvelki.qaliqBorc - 500);
    // Erkən ödəniş gələcək faizi AZALDIR — məhsulun əsas üstünlüyü
    expect(sonrakiFaiz).toBeLessThan(evvelkiFaiz);
    // İlkin əsas borc dəyişmir: tarixçə yenidən yazılmır
    expect(sonraki.esasBorc).toBe(evvelki.esasBorc);
  });

  it("tam ödəniş krediti bağlayır və sonrakı faiz sıfır olur", async () => {
    const { cookie } = await kreditAl(2000);
    const kredit = (await isle({ cookie })).govde.kredit;

    const cavab = await isle({
      method: "POST",
      cookie,
      body: { emel: "odenis", mebleg: kredit.qaliqBorc },
    });
    expect(cavab.govde.kredit.qaliqBorc).toBe(0);
    expect(cavab.govde.kredit.hal).toBe("repaid");
    expect(ayliqFaiz(0, kredit.illikFaiz)).toBe(0);

    // Bağlı kreditə ikinci ödəniş getmir
    const ikinci = await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 100 } });
    expect(ikinci.statusCode).toBe(404);
  });

  it("qalıqdan çox ödəniş mənfi borc yaratmır", async () => {
    const { cookie } = await kreditAl(2000);
    const cavab = await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 999999 } });
    expect(cavab.govde.kredit.qaliqBorc).toBe(0);
  });

  it("ödəniş jurnalı yalnız artır — hər hadisə qalığı ilə yazılır", async () => {
    const { cookie } = await kreditAl(2000);
    await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 300 } });
    await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 200 } });

    const hadiseler = await sorgu(
      "SELECT event_type, amount, principal_after FROM loan_events ORDER BY id",
    );
    expect(hadiseler.map((h) => h.event_type)).toEqual([
      "disbursement",
      "principal_repayment",
      "principal_repayment",
    ]);
    // Qalıq hadisələrdən çıxır
    const sonuncu = hadiseler.at(-1);
    expect(Number(sonuncu.principal_after)).toBe(
      Number(hadiseler[0].principal_after) - 300 - 200,
    );
  });

  it("yanlış ödəniş məbləği rədd olunur", async () => {
    const { cookie } = await kreditAl(2000);
    for (const mebleg of [0, -50, "abc"]) {
      const cavab = await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg } });
      expect(cavab.statusCode, String(mebleg)).toBe(400);
    }
  });

  // ═══ YARIŞ ŞƏRAİTİ: tətbiq olunan məbləğ kilidli cari qalıqdandır ═══
  it("100 qalığa eyni anda 60+60: cəmi 100 tətbiq olunur, mənfi borc yoxdur", async () => {
    const { cookie } = await kreditAl(2000);
    // Qalığı 100-ə salırıq
    await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 1900 } });

    const [birinci, ikinci] = await Promise.all([
      isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 60, acar: "yaris-a" } }),
      isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 60, acar: "yaris-b" } }),
    ]);

    // İkisi də idarə olunan cavab alır — çılpaq 500 yoxdur
    expect([birinci.statusCode, ikinci.statusCode].every((k) => [200, 404, 409].includes(k))).toBe(
      true,
    );

    const [kredit] = await sorgu("SELECT principal_outstanding, status FROM loans");
    // Mənfi borc QEYRİ-MÜMKÜNDÜR və cəmi 100-dən çox tətbiq olunmur
    expect(Number(kredit.principal_outstanding)).toBeGreaterThanOrEqual(0);

    const hadiseler = await sorgu(
      "SELECT amount, principal_after FROM loan_events WHERE event_type='principal_repayment' ORDER BY id",
    );
    const cem = hadiseler.reduce((c, h) => c + Number(h.amount), 0);
    expect(cem).toBeLessThanOrEqual(2000);
    expect(cem + Number(kredit.principal_outstanding)).toBe(2000);
    // Hər hadisənin amount-u HƏQİQƏTƏN tətbiq olunan məbləğdir, principal_after
    // isə həmin andakı qalıqdır — ardıcıllıq öz-özünü təsdiqləyir
    let qaliq = 2000;
    for (const h of hadiseler) {
      qaliq -= Number(h.amount);
      expect(Number(h.principal_after)).toBe(qaliq);
      expect(Number(h.amount)).toBeGreaterThan(0);
      expect(Number(h.amount)).toBeLessThanOrEqual(1900);
    }
    // 60+60 → 60 və 40: ikinci sorğu yenilənmiş qalığı görür
    if (hadiseler.length === 3) {
      expect(Number(kredit.principal_outstanding)).toBe(0);
      expect(kredit.status).toBe("repaid");
      expect(hadiseler.slice(1).map((h) => Number(h.amount)).sort((a, b) => b - a)).toEqual([60, 40]);
    }
  });

  it("eyni idempotentlik açarı İKİNCİ DƏFƏ tətbiq olunmur", async () => {
    const { cookie } = await kreditAl(2000);

    const birinci = await isle({
      method: "POST",
      cookie,
      body: { emel: "odenis", mebleg: 300, acar: "tekrar-1" },
    });
    const ikinci = await isle({
      method: "POST",
      cookie,
      body: { emel: "odenis", mebleg: 300, acar: "tekrar-1" },
    });

    // Təkrar sorğu uğurla cavablanır (idempotent), amma tətbiq OLUNMUR
    expect(birinci.statusCode).toBe(200);
    expect(ikinci.statusCode).toBe(200);
    expect(ikinci.govde.kredit.qaliqBorc).toBe(1700);

    // Açar hissə başına suffikslənir (faiz/əsas ayrı hadisələrdir), amma
    // hər hissə YALNIZ BİR DƏFƏ yazılır
    const hadiseler = await sorgu(
      "SELECT id FROM loan_events WHERE idempotency_key LIKE 'tekrar-1:%'",
    );
    expect(hadiseler).toHaveLength(1);
    const [kredit] = await sorgu("SELECT principal_outstanding FROM loans");
    expect(Number(kredit.principal_outstanding)).toBe(1700);
  });

  it("krediti olmayan fermer ödəniş yaza bilmir", async () => {
    const f = await fermer();
    const cavab = await isle({ method: "POST", cookie: f.cookie, body: { emel: "odenis", mebleg: 100 } });
    expect(cavab.statusCode).toBe(404);
  });
});

// ═══ KREDİT MÜHƏRRİKİ (004): FAİZİN YIĞILMASI VƏ BÖLGÜ ══════════════
// Vaxt saxta saatla sürüşdürülür: baza `now()` real qalır (kredit bu gün
// verilir), server isə `new Date()` ilə "gələcəyə" baxır — yəni dövrlər
// həqiqətən bitmiş sayılır. Faizin YAZILMASI oxunuş anında baş verir.

describe("faiz mühərriki", () => {
  const GUN = 86_400_000;

  async function kreditAl(mebleg = 12_000, telefon = "+994501234567") {
    const f = await fermer({ telefon });
    await tarixceYaz(f.id);
    const cavab = await muracietEt(f.cookie, mebleg);
    await isle({
      method: "POST",
      cookie: f.cookie,
      body: { emel: "teklif-qebul", teklifId: cavab.govde.teklif.id },
    });
    return f;
  }

  /**
   * Serverin gördüyü "indi"-ni irəli sürüşdürür.
   * QEYD: PGlite də JS saatından qidalanır, yəni bazadakı `now()` eyni anda
   * sürüşür. Ona görə sıçrayış SESSİYA MÜDDƏTİNDƏN (90 gün) qısa olmalıdır —
   * yoxsa sorğu 401 alır və test faizi yox, sessiyanı yoxlamış olur.
   */
  function vaxtiSurusdur(gun) {
    // Əvvəlcə real saata qayıdırıq: sıçrayışlar HƏMİŞƏ real "indi"-dən
    // sayılsın, üst-üstə yığılmasın (yığılsaydı 35+66 → 101 gün olub
    // sessiya müddətini keçərdi)
    vi.useRealTimers();
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.now() + gun * GUN));
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dövr bitməyibsə faiz yazılmır", async () => {
    const { cookie } = await kreditAl();
    vaxtiSurusdur(20);
    const kredit = (await isle({ cookie })).govde.kredit;
    expect(kredit.faizBorc).toBe(0);
    expect(kredit.hesablanmisDovr).toBe(0);
  });

  it("ay bitəndə faiz jurnala yazılır və borca əlavə olunur", async () => {
    const { cookie } = await kreditAl(12_000);
    vaxtiSurusdur(35);
    const kredit = (await isle({ cookie })).govde.kredit;

    expect(kredit.hesablanmisDovr).toBe(1);
    // 12.000 × 11,5% × ~31/365 ≈ 117 ₼
    expect(kredit.faizBorc).toBeGreaterThan(100);
    expect(kredit.faizBorc).toBeLessThan(130);
    expect(kredit.faizCemi).toBe(kredit.faizBorc);
    // Əsas borc faizdən DƏYİŞMİR — kompaundinq yoxdur
    expect(kredit.qaliqBorc).toBe(12_000);

    const [hadise] = await sorgu(
      "SELECT event_type, amount, due_on, idempotency_key FROM loan_events WHERE event_type='interest_charge'",
    );
    expect(hadise.idempotency_key).toBe("faiz-1");
    expect(hadise.due_on).toBeTruthy();
  });

  it("təkrar oxunuş eyni dövrü İKİNCİ DƏFƏ yazmır", async () => {
    const { cookie } = await kreditAl();
    vaxtiSurusdur(35);
    const birinci = (await isle({ cookie })).govde.kredit;
    const ikinci = (await isle({ cookie })).govde.kredit;

    expect(ikinci.faizBorc).toBe(birinci.faizBorc);
    const hadiseler = await sorgu("SELECT id FROM loan_events WHERE event_type='interest_charge'");
    expect(hadiseler).toHaveLength(1);
  });

  it("bir neçə ay keçibsə hər dövr AYRI hadisə kimi yazılır", async () => {
    const { cookie } = await kreditAl();
    vaxtiSurusdur(65);
    const kredit = (await isle({ cookie })).govde.kredit;

    expect(kredit.hesablanmisDovr).toBe(2);
    const hadiseler = await sorgu(
      "SELECT idempotency_key FROM loan_events WHERE event_type='interest_charge' ORDER BY id",
    );
    expect(hadiseler.map((h) => h.idempotency_key)).toEqual(["faiz-1", "faiz-2"]);
  });

  it("erkən əsas ödəniş sonrakı ayın faizini azaldır", async () => {
    const tam = await kreditAl(12_000, "+994501111111");
    const yarim = await kreditAl(12_000, "+994502222222");
    // İkinci fermer dərhal yarısını ödəyir
    await isle({ method: "POST", cookie: yarim.cookie, body: { emel: "odenis", mebleg: 6_000 } });

    vaxtiSurusdur(35);
    const tamFaiz = (await isle({ cookie: tam.cookie })).govde.kredit.faizBorc;
    const yarimFaiz = (await isle({ cookie: yarim.cookie })).govde.kredit.faizBorc;

    expect(yarimFaiz).toBeLessThan(tamFaiz);
    // Yarı borc ≈ yarı faiz (ödəniş dövrün əvvəlindədir)
    expect(yarimFaiz).toBeCloseTo(tamFaiz / 2, 0);
  });

  it("ödəniş ƏVVƏL faizi, sonra əsas borcu bağlayır", async () => {
    const { cookie } = await kreditAl(12_000);
    vaxtiSurusdur(35);
    const evvel = (await isle({ cookie })).govde.kredit;
    expect(evvel.faizBorc).toBeGreaterThan(0);

    const cavab = await isle({
      method: "POST",
      cookie,
      body: { emel: "odenis", mebleg: evvel.faizBorc + 500 },
    });
    const sonra = cavab.govde.kredit;

    expect(sonra.faizBorc).toBe(0);
    expect(sonra.qaliqBorc).toBe(12_000 - 500);
    expect(sonra.faizOdenilen).toBe(evvel.faizBorc);

    const novler = (
      await sorgu("SELECT event_type FROM loan_events ORDER BY id")
    ).map((h) => h.event_type);
    expect(novler).toEqual([
      "disbursement",
      "interest_charge",
      "interest_payment",
      "principal_repayment",
    ]);
  });

  it("faizdən kiçik ödəniş əsas borca toxunmur", async () => {
    const { cookie } = await kreditAl(12_000);
    vaxtiSurusdur(35);
    const evvel = (await isle({ cookie })).govde.kredit;

    const sonra = (
      await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 20 } })
    ).govde.kredit;

    expect(sonra.qaliqBorc).toBe(12_000);
    expect(sonra.faizBorc).toBeCloseTo(evvel.faizBorc - 20, 2);
  });

  it("əsas borc bağlansa da ödənilməmiş faiz varsa kredit açıq qalır", async () => {
    const { cookie } = await kreditAl(12_000);
    vaxtiSurusdur(35);
    await isle({ cookie }); // faiz yığılsın
    const sonra = (
      await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 12_000 } })
    ).govde.kredit;

    // 12.000 əvvəl faizə, sonra əsasa gedir → əsasdan faiz qədəri qalır
    expect(sonra.faizBorc).toBe(0);
    expect(sonra.qaliqBorc).toBeGreaterThan(0);
    expect(sonra.hal).toBe("active");

    // Qalığı da ödəyəndə kredit bağlanır
    const bagli = (
      await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: sonra.qaliqBorc } })
    ).govde.kredit;
    expect(bagli.hal).toBe("repaid");
    expect(bagli.qaliqBorc).toBe(0);
    expect(bagli.faizBorc).toBe(0);
  });

  it("gecikmə günü ödənilməmiş faizin son tarixindən sayılır", async () => {
    const { cookie } = await kreditAl(12_000);
    vaxtiSurusdur(45);
    const kredit = (await isle({ cookie })).govde.kredit;

    // 1-ci dövr ~31-ci gündə bitib, indi 45-ci gündür
    expect(kredit.gecikmeGun).toBeGreaterThanOrEqual(13);
    expect(kredit.gecikmeGun).toBeLessThanOrEqual(16);

    // Faiz ödənəndə gecikmə itir
    const sonra = (
      await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: kredit.faizBorc } })
    ).govde.kredit;
    expect(sonra.gecikmeGun).toBe(0);
  });

  it("növbəti ödəniş tarixi və məbləği verilir", async () => {
    const { cookie } = await kreditAl(12_000);
    const kredit = (await isle({ cookie })).govde.kredit;

    expect(kredit.novbetiTarix).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Adi ayda yalnız faiz gözlənilir — əsas borc daxil deyil
    expect(kredit.novbetiMebleg).toBeGreaterThan(0);
    expect(kredit.novbetiMebleg).toBeLessThan(200);
    expect(kredit.novbetiEsasDaxil).toBe(false);
  });

  it("ödəniş tarixçəsi cavabda gəlir — yeni hadisə başda", async () => {
    const { cookie } = await kreditAl(12_000);
    await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 500 } });
    const cavab = await isle({ cookie });

    expect(cavab.govde.hadiseler[0].nov).toBe("principal_repayment");
    expect(cavab.govde.hadiseler[0].mebleg).toBe(500);
    expect(cavab.govde.hadiseler[0].esasSonra).toBe(11_500);
    expect(cavab.govde.hadiseler.at(-1).nov).toBe("disbursement");
  });

  it("krediti olmayan fermerin tarixçəsi boşdur", async () => {
    const f = await fermer();
    await tarixceYaz(f.id);
    await muracietEt(f.cookie, 2000);
    const cavab = await isle({ cookie: f.cookie });
    expect(cavab.govde.hadiseler).toEqual([]);
    expect(cavab.govde.odenisler).toEqual([]);
  });

  // ── Məhsul ssenarisi: 10.000 @ 12% ───────────────────────────────────
  // Faiz konvensiyası illik/12-dir (bax: lib/kreditOdenis.js → ayliqFaiz);
  // dərəcə test üçün birbaşa bazada 12%-ə qoyulur, çünki anderraytinq
  // dərəcəni KREDIT_SERTLERI-dən götürür və bu tapşırıqda dəyişmir.
  it("10.000 @ 12%: faiz gündəlik act/365, ödəniş faiz→əsas bölünür, sonra yeni qalığa", async () => {
    const { cookie } = await kreditAl(10_000);
    await sorgu("UPDATE loans SET annual_rate=12, principal_original=10000, principal_outstanding=10000");
    await sorgu("UPDATE loan_events SET amount=10000, principal_after=10000 WHERE event_type='disbursement'");

    // Vaxt DÖVR SƏRHƏDİNƏ qoyulur: nümunədəki kimi faiz yazılan gün ödənilir.
    // (Ödəniş dövrün ortasında olsaydı, həmin ayın faizi çəkili orta ilə
    // hesablanardı — bu, məhsulun vədidir: erkən ödəniş faizi elə həmin
    // gündən azaldır. O hal aşağıdakı ayrıca testdədir.)
    const [setir] = await sorgu("SELECT disbursed_at FROM loans");
    const sonaQoy = (dovr) =>
      vi.setSystemTime(new Date(dovrSonu(setir.disbursed_at, dovr).getTime() + 1000));

    // Gözlənilən faiz dövrün FAKTİKİ gün sayından çıxır (act/365):
    // 31 günlük dövr 101,92 ₼, 30 günlük dövr 98,63 ₼ — aylar bərabər deyil
    const GUN_MS = 86_400_000;
    const gunSayi = (dovr) =>
      (dovrSonu(setir.disbursed_at, dovr).getTime() -
        dovrSonu(setir.disbursed_at, dovr - 1).getTime()) /
      GUN_MS;
    const gozlenen = (qaliq, dovr) =>
      Math.round(qaliq * 0.12 * (gunSayi(dovr) / 365) * 100) / 100;

    // 1-ci dövr: faiz 10.000 üzərindən, günbəgün
    vaxtiSurusdur(0);
    sonaQoy(1);
    const birinciAy = (await isle({ cookie })).govde.kredit;
    expect(birinciAy.faizBorc).toBe(gozlenen(10_000, 1));
    expect(birinciAy.odenilecekIndi).toBe(birinciAy.faizBorc);

    // Ödəniş: əvvəl faiz, sonra 2.000 əsas borc → qalıq 8.000
    const odenisden = (
      await isle({
        method: "POST",
        cookie,
        body: { emel: "odenis", mebleg: birinciAy.faizBorc + 2_000 },
      })
    ).govde;
    expect(odenisden.kredit.faizBorc).toBe(0);
    expect(odenisden.kredit.qaliqBorc).toBe(8_000);
    expect(odenisden.odenisler[0]).toMatchObject({
      mebleg: birinciAy.faizBorc + 2_000,
      faizHissesi: birinciAy.faizBorc,
      esasHissesi: 2_000,
      esasQaliq: 8_000,
    });

    // 2-ci dövr: faiz artıq 10.000-ə yox, 8.000-ə görə
    sonaQoy(2);
    const ikinciAy = (await isle({ cookie })).govde.kredit;
    expect(ikinciAy.faizBorc).toBe(gozlenen(8_000, 2));
    expect(ikinciAy.faizBorc).toBeLessThan(birinciAy.faizBorc);
    expect(ikinciAy.hesablanmisDovr).toBe(2);
  });

  it("dövrün ortasında edilən ödəniş həmin ayın faizini də azaldır", async () => {
    const { cookie } = await kreditAl(10_000);
    await sorgu("UPDATE loans SET annual_rate=12, principal_original=10000, principal_outstanding=10000");
    await sorgu("UPDATE loan_events SET amount=10000, principal_after=10000 WHERE event_type='disbursement'");

    // Ödəniş 1-ci dövrün ORTASINDA (15-ci gün): yarım ay 10.000, yarım ay 8.000
    vaxtiSurusdur(15);
    await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 2_000 } });

    vaxtiSurusdur(35);
    const kredit = (await isle({ cookie })).govde.kredit;
    // Nə 100 (heç nə ödəməmiş kimi), nə də 80 (bütün ay 8.000 kimi)
    expect(kredit.faizBorc).toBeGreaterThan(80);
    expect(kredit.faizBorc).toBeLessThan(100);
  });

  it("gecikmə olanda vəziyyət 'overdue' və gecikmiş məbləğ qaytarılır", async () => {
    const { cookie } = await kreditAl(12_000);
    vaxtiSurusdur(45);
    const kredit = (await isle({ cookie })).govde.kredit;

    expect(kredit.veziyyet).toBe("overdue");
    expect(kredit.gecikmisMebleg).toBe(kredit.faizBorc);
    expect(kredit.odenilecekIndi).toBe(kredit.faizBorc);

    // Ödəniş gecikməni bağlayır → yenidən "active"
    const sonra = (
      await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: kredit.faizBorc } })
    ).govde.kredit;
    expect(sonra.veziyyet).toBe("active");
    expect(sonra.gecikmisMebleg).toBe(0);
  });

  it("tam bağlanan kreditin vəziyyəti 'closed' olur", async () => {
    const { cookie } = await kreditAl(12_000);
    const kredit = (await isle({ cookie })).govde.kredit;
    const sonra = (
      await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: kredit.qaliqBorc } })
    ).govde.kredit;

    expect(sonra.hal).toBe("repaid");
    expect(sonra.veziyyet).toBe("closed");
    expect(sonra.odenilecekIndi).toBe(0);
  });

  // Vəziyyət serverdədir: yeni sessiya (çıxış/yenidən giriş) eyni krediti görür
  it("çıxış/yenidən girişdən sonra kredit vəziyyəti eynidir", async () => {
    const telefon = "+994503334444";
    const { cookie } = await kreditAl(12_000, telefon);
    vaxtiSurusdur(35);
    await isle({ method: "POST", cookie, body: { emel: "odenis", mebleg: 500 } });
    const evvel = (await isle({ cookie })).govde.kredit;

    // Yeni sessiya = yeni token, eyni istifadəçi
    const { kod } = await otpYarat({ telefon, ip: null });
    const { token } = await otpTesdiqle({ telefon, kod });
    const sonra = (await isle({ cookie: `agrifin_sessiya=${token}` })).govde.kredit;

    expect(sonra.qaliqBorc).toBe(evvel.qaliqBorc);
    expect(sonra.faizBorc).toBe(evvel.faizBorc);
    expect(sonra.hesablanmisDovr).toBe(evvel.hesablanmisDovr);
    expect(sonra.id).toBe(evvel.id);
  });
});

// ═══ MALİYYƏ QEYDLƏRİNİN SAXLANMASI (003) ═══════════════════════════
// Adi DELETE maliyyə tarixçəsini silə bilməz: bütün FK-lar RESTRICT-dir.
// İstifadəçi silinməsi lazım olsa yol soft-delete/anonimləşdirmədir.

describe("maliyyə qeydləri adi silinmə ilə itmir", () => {
  async function kreditliFermer() {
    const f = await fermer();
    await tarixceYaz(f.id);
    const cavab = await muracietEt(f.cookie, 2000);
    await isle({
      method: "POST",
      cookie: f.cookie,
      body: { emel: "teklif-qebul", teklifId: cavab.govde.teklif.id },
    });
    return f;
  }

  it("krediti olan istifadəçi silinə bilmir", async () => {
    const f = await kreditliFermer();
    await expect(sorgu("DELETE FROM istifadeciler WHERE id=$1", [f.id])).rejects.toThrow();
    expect(await sorgu("SELECT id FROM loans")).toHaveLength(1);
  });

  it("qərarlı müraciət silinə bilmir", async () => {
    await kreditliFermer();
    await expect(sorgu("DELETE FROM credit_applications")).rejects.toThrow();
    expect(await sorgu("SELECT id FROM credit_decisions")).toHaveLength(1);
  });

  it("hadisəli kredit silinə bilmir — jurnal toxunulmazdır", async () => {
    await kreditliFermer();
    await expect(sorgu("DELETE FROM loans")).rejects.toThrow();
    expect(await sorgu("SELECT id FROM loan_events")).toHaveLength(1);
  });

  // Sahə maliyyə qeydi DEYİL: silinəndə müraciət qalır (girişlər snapshot-dadır)
  it("sahənin silinməsi müraciəti silmir", async () => {
    const f = await kreditliFermer();
    await sorgu("DELETE FROM saheler WHERE istifadeci_id=$1", [f.id]);
    const [muraciet] = await sorgu("SELECT sahe_id, decision_inputs FROM credit_applications");
    expect(muraciet.sahe_id).toBeNull();
    expect(muraciet.decision_inputs.sahe.hektar).toBe(10);
  });
});
