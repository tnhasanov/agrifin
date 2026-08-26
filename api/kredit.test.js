import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { musterTeyin, sorgu } from "../lib/db.js";
import { miqrasiyalariTetbiqEt } from "../lib/miqrasiya.js";
import { otpTesdiqle, otpYarat } from "../lib/hesab.js";
import { ayliqFaiz } from "../lib/kreditOdenis.js";
import { KREDIT_SERTLERI } from "../lib/kreditSertler.js";
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

    expect(muraciet.calc_version).toMatch(/^v1-/);
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
    // Yaranma hadisəsi jurnalda
    const hadiseler = await sorgu("SELECT event_type, principal_after FROM loan_events");
    expect(hadiseler).toHaveLength(1);
    expect(hadiseler[0].event_type).toBe("created");
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
      "created",
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

  it("krediti olmayan fermer ödəniş yaza bilmir", async () => {
    const f = await fermer();
    const cavab = await isle({ method: "POST", cookie: f.cookie, body: { emel: "odenis", mebleg: 100 } });
    expect(cavab.statusCode).toBe(404);
  });
});
