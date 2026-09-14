import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { musterTeyin, sorgu } from "../lib/db.js";
import { miqrasiyalariTetbiqEt } from "../lib/miqrasiya.js";
import { otpTesdiqle, otpYarat } from "../lib/hesab.js";
import { SIFARIS_HEDDI } from "../lib/bazar/sifaris.js";
import { KREDIT_SERTLERI } from "../lib/kreditSertler.js";
import handler from "./bazar.js";
import kreditHandler from "./kredit.js";

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
  vi.spyOn(console, "log").mockImplementation(() => {});
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

async function isle({ method = "GET", body, cookie, query } = {}, h = handler) {
  const res = resYarat();
  await h({ method, body, query, headers: cookie ? { cookie } : {} }, res);
  return res;
}

const NOQTELER = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

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

/** Peyk tarixçəsi — anderraytinq üçün (kredit testləri ilə eyni) */
async function tarixceYaz(istifadeciId, il = new Date().getFullYear()) {
  const [sahe] = await sorgu("SELECT id FROM saheler WHERE istifadeci_id=$1", [istifadeciId]);
  const movsumler = Array.from({ length: 6 }, (_, i) => ({
    il: il - 5 + i,
    zirve: 0.72,
    zirveAyi: `${il - 5 + i}-05`,
    etrafMedyan: 0.6,
    olcmeSayi: 6,
  }));
  await sorgu("INSERT INTO peyk_snapshotlar (sahe_id, nov, mezmun) VALUES ($1,'tarixce',$2)", [
    sahe.id,
    JSON.stringify({ movsumler }),
  ]);
}

const CATDIRILMA = { rayonKod: "semkir", ad: "Tural Həsənov", telefon: "0501234567", unvan: "Dəllər", qeyd: "" };
const SEBET = [
  { kod: "karbamid-46-50kq", say: 20 },
  { kod: "pomidor-toxumu-f1", say: 2 },
];

const sifarisYarat = (cookie, elave = {}) =>
  isle({
    method: "POST",
    cookie,
    body: { emel: "sifaris-yarat", setirler: SEBET, catdirilma: CATDIRILMA, odenisUsulu: "on_delivery", ...elave },
  });

// ═══ TƏHLÜKƏSİZLİK ═══════════════════════════════════════════════════

describe("bazar API — təhlükəsizlik", () => {
  it("sessiyasız istifadəçi sifariş görmür və yarada bilmir", async () => {
    expect((await isle({})).statusCode).toBe(401);
    expect((await sifarisYarat(undefined)).statusCode).toBe(401);
    expect((await isle({ cookie: "agrifin_sessiya=uydurma" })).statusCode).toBe(401);
  });

  it("səbət hesabı sessiyasız işləyir və yekunlar KATALOQDAN gəlir", async () => {
    const cavab = await isle({
      method: "POST",
      body: {
        emel: "sebet-hesabla",
        // Klient qiymət, cəmi və təchizatçı göndərir — hamısı atılır
        setirler: [{ kod: "karbamid-46-50kq", say: 20, qiymet: 1, cemi: 20, tedarukcu: "saxta" }],
      },
    });
    expect(cavab.statusCode).toBe(200);
    expect(cavab.govde.hesab.araCem).toBe(450);
    expect(cavab.govde.hesab.cemi).toBe(465);
    expect(cavab.govde.hesab.setirler[0].tedarukcu).toBe("agrosupply");
    expect(cavab.govde.numune).toBe(true);
  });

  it("klientin göndərdiyi qiymət/yekun/status sifarişə DÜŞMÜR", async () => {
    const a = await fermer();
    const cavab = await sifarisYarat(a.cookie, {
      setirler: [{ kod: "karbamid-46-50kq", say: 20, qiymet: 0.01, cemi: 0.2 }],
      cemi: 1,
      total: 1,
      status: "completed",
      istifadeci_id: 999,
    });
    expect(cavab.statusCode).toBe(200);
    const { sifaris } = cavab.govde;
    expect(sifaris.hal).toBe("new");
    expect(sifaris.araCem).toBe(450);
    expect(sifaris.cemi).toBe(465);
    expect(sifaris.setirler[0].vahidQiymet).toBe(22.5);
    const [setir] = await sorgu("SELECT istifadeci_id, total FROM marketplace_orders");
    expect(setir.istifadeci_id).toBe(a.id);
    expect(Number(setir.total)).toBe(465);
  });

  it("B fermeri A-nın sifarişini görmür və ləğv edə bilmir (IDOR)", async () => {
    const a = await fermer({ telefon: "+994501111111" });
    const yaradildi = await sifarisYarat(a.cookie);
    const id = yaradildi.govde.sifaris.id;

    const b = await fermer({ telefon: "+994502222222" });
    expect((await isle({ cookie: b.cookie, query: { sifaris: String(id) } })).statusCode).toBe(404);
    expect((await isle({ cookie: b.cookie })).govde.sifarisler).toEqual([]);
    const legv = await isle({ method: "POST", cookie: b.cookie, body: { emel: "sifaris-legv", sifarisId: id } });
    expect(legv.statusCode).toBe(404);
    const [setir] = await sorgu("SELECT status FROM marketplace_orders WHERE id=$1", [id]);
    expect(setir.status).toBe("new");
  });

  it("say yoxlanılır: 0, kəsr, minimumdan az, maksimumdan çox keçmir", async () => {
    const a = await fermer();
    for (const [say, sebeb] of [
      [0, "sayYanlis"],
      [1.5, "sayYanlis"],
      [2, "minSay"],
      [999, "maxSay"],
    ]) {
      const cavab = await sifarisYarat(a.cookie, { setirler: [{ kod: "kartof-toxumu-aqra", say }] });
      expect(cavab.statusCode, String(say)).toBe(400);
      expect(cavab.govde.error).toBe(sebeb);
    }
    expect((await sorgu("SELECT id FROM marketplace_orders")).length).toBe(0);
  });

  it("naməlum məhsul və yanlış çatdırılma forması rədd edilir", async () => {
    const a = await fermer();
    expect((await sifarisYarat(a.cookie, { setirler: [{ kod: "uydurma", say: 1 }] })).govde.error).toBe("mehsulYoxdur");
    expect((await sifarisYarat(a.cookie, { catdirilma: { ...CATDIRILMA, rayonKod: "paris" } })).govde.error).toBe(
      "rayonYanlis",
    );
    expect((await sifarisYarat(a.cookie, { catdirilma: { ...CATDIRILMA, telefon: "12" } })).govde.error).toBe(
      "telefonYanlis",
    );
    expect((await sifarisYarat(a.cookie, { odenisUsulu: "bitcoin" })).govde.error).toBe("odenisUsuluYanlis");
  });

  it("rayona çatdırılmayan məhsul sifarişə düşmür", async () => {
    const a = await fermer();
    const cavab = await sifarisYarat(a.cookie, {
      setirler: [{ kod: "pambiq-toxumu-25kq", say: 2 }],
      catdirilma: { ...CATDIRILMA, rayonKod: "quba" },
    });
    expect(cavab.statusCode).toBe(409);
    expect(cavab.govde).toEqual({ error: "catdirilmaYoxdur", kodlar: ["pambiq-toxumu-25kq"] });
  });

  it("sürət həddi: pəncərədə N sifarişdən sonra 429", async () => {
    const a = await fermer();
    for (let i = 0; i < SIFARIS_HEDDI.maxSay; i += 1) {
      expect((await sifarisYarat(a.cookie)).statusCode).toBe(200);
    }
    const artiq = await sifarisYarat(a.cookie);
    expect(artiq.statusCode).toBe(429);
    expect(artiq.govde.error).toBe("hedd");
  });

  it("idempotentlik açarı: təkrar sorğu ikinci sifariş yaratmır", async () => {
    const a = await fermer();
    const bir = await sifarisYarat(a.cookie, { acar: "s-1" });
    const iki = await sifarisYarat(a.cookie, { acar: "s-1" });
    expect(iki.statusCode).toBe(200);
    expect(iki.govde.tekrar).toBe(true);
    expect(iki.govde.sifaris.id).toBe(bir.govde.sifaris.id);
    expect((await sorgu("SELECT id FROM marketplace_orders")).length).toBe(1);
  });

  it("cədvəl yoxdursa 503 sxemYoxdur qaytarır, 500 yox", async () => {
    const xeta = Object.assign(new Error('relation "marketplace_orders" does not exist'), { code: "42P01" });
    musterTeyin({ query: () => Promise.reject(xeta) });
    const cavab = await isle({ cookie: "agrifin_sessiya=hansisa-token" });
    expect(cavab.statusCode).toBe(503);
    expect(cavab.govde).toEqual({ error: "sxemYoxdur" });
  });
});

// ═══ SİFARİŞ AXINI ═══════════════════════════════════════════════════

describe("bazar API — sifariş", () => {
  it("sifariş atomik yaranır: sətirlər, hadisə izi (actor ilə), nömrə, gözlənilən tarix", async () => {
    const a = await fermer({ hektar: 3.8, bitki: "pomidor" });
    const cavab = await sifarisYarat(a.cookie);
    expect(cavab.statusCode).toBe(200);
    const { sifaris } = cavab.govde;

    expect(sifaris.nomre).toBe("AF-000001");
    expect(sifaris.hal).toBe("new");
    expect(sifaris.legvOlar).toBe(true);
    expect(sifaris.setirler).toHaveLength(2);
    expect(sifaris.araCem).toBe(670);
    expect(sifaris.catdirilmaHaqqi).toBe(15);
    expect(sifaris.cemi).toBe(685);
    expect(sifaris.tedarukculer.map((t) => t.kod).sort()).toEqual(["agrosupply", "azertoxum"]);
    // Sahə konteksti anderraytinq üçün snapshot-dur
    expect(sifaris.bitki).toBe("pomidor");
    expect(sifaris.hektar).toBeCloseTo(3.8);
    expect(sifaris.unvan.rayonKod).toBe("semkir");
    expect(sifaris.unvan.telefon).toBe("+994501234567");
    expect(sifaris.gozlenilenTarix).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sifaris.maliyye).toBeNull();
    // Hadisə izi "kim etdi" deyir
    expect(sifaris.hadiseler).toEqual([expect.objectContaining({ nov: "order_created", haraya: "new", aktor: "farmer" })]);
  });

  it("siyahı ən yeni sifarişi əvvəldə verir və sətirləri daşıyır", async () => {
    const a = await fermer();
    await sifarisYarat(a.cookie);
    await sifarisYarat(a.cookie, { setirler: [{ kod: "nasos-1-5kvt", say: 1 }] });
    const cavab = await isle({ cookie: a.cookie });
    expect(cavab.statusCode).toBe(200);
    expect(cavab.govde.sifarisler).toHaveLength(2);
    expect(cavab.govde.sifarisler[0].setirler[0].kod).toBe("nasos-1-5kvt");
    expect(cavab.govde.sifarisler[1].setirler).toHaveLength(2);
  });

  it("fermer yeni sifarişi ləğv edir; hazırlanan sifariş ləğv olunmur", async () => {
    const a = await fermer();
    const { id } = (await sifarisYarat(a.cookie)).govde.sifaris;
    const legv = await isle({ method: "POST", cookie: a.cookie, body: { emel: "sifaris-legv", sifarisId: id } });
    expect(legv.statusCode).toBe(200);
    expect(legv.govde.sifaris.hal).toBe("cancelled");
    expect(legv.govde.sifaris.legvOlar).toBe(false);
    expect(legv.govde.sifaris.hadiseler.at(-1)).toMatchObject({
      nov: "cancelled_by_farmer",
      haradan: "new",
      haraya: "cancelled",
      aktor: "farmer",
    });

    // Təchizatçı hazırlamağa başlayıb (Faza 2 statusu) — fermer ləğv edə bilmir
    const { id: id2 } = (await sifarisYarat(a.cookie)).govde.sifaris;
    await sorgu("UPDATE marketplace_orders SET status='preparing' WHERE id=$1", [id2]);
    const legv2 = await isle({ method: "POST", cookie: a.cookie, body: { emel: "sifaris-legv", sifarisId: id2 } });
    expect(legv2.statusCode).toBe(409);
    expect(legv2.govde).toEqual({ error: "legvOlmur", hal: "preparing" });
  });
});

// ═══ MALİYYƏLƏŞDİRMƏ ══════════════════════════════════════════════════

describe("bazar API — maliyyələşdirmə", () => {
  const yoxla = (cookie, setirler = SEBET) =>
    isle({ method: "POST", cookie, body: { emel: "maliyye-yoxla", setirler } });

  it("yoxlama OXU-YALNIZDIR: uyğun cavab verir, amma müraciət YARATMIR", async () => {
    const a = await fermer({ hektar: 10, bitki: "pomidor" });
    await tarixceYaz(a.id);
    const cavab = await yoxla(a.cookie);
    expect(cavab.statusCode).toBe(200);
    expect(cavab.govde.maliyye.hal).toBe("uygun");
    expect(cavab.govde.maliyye.mebleg).toBe(670);
    expect(cavab.govde.maliyye.tesdiq).toBe(670);
    expect(cavab.govde.maliyye.illikFaiz).toBe(KREDIT_SERTLERI.illikFaiz);
    expect(cavab.govde.maliyye.ilkAyFaiz).toBeGreaterThan(0);
    expect(await sorgu("SELECT id FROM credit_applications")).toEqual([]);
    expect(await sorgu("SELECT id FROM credit_offers")).toEqual([]);
  });

  it("sahəsiz fermerə səbəb deyilir; uyğun məhsul yoxdursa da", async () => {
    const a = await fermer({ hektar: 0 });
    expect((await yoxla(a.cookie)).govde.maliyye.hal).toBe("saheYoxdur");
    // Fungisid maliyyələşdirilmir → maliyyələşdirilən məbləğ 0
    expect((await yoxla(a.cookie, [{ kod: "fungisid-mis-1kq", say: 1 }])).govde.maliyye.hal).toBe("uygunMehsulYoxdur");
  });

  it("minimum kredit məbləğindən az səbət 'meblegAzdir' verir", async () => {
    const a = await fermer();
    const cavab = await yoxla(a.cookie, [{ kod: "karbamid-46-50kq", say: 1 }]); // 22,50
    expect(cavab.govde.maliyye.hal).toBe("meblegAzdir");
    expect(cavab.govde.maliyye.minKredit).toBe(KREDIT_SERTLERI.minKredit);
  });

  it("aktiv krediti və ya açıq müraciəti olan fermerə ikinci kredit sırınmır", async () => {
    const a = await fermer({ hektar: 10, bitki: "pomidor" });
    await tarixceYaz(a.id);
    await isle({ method: "POST", cookie: a.cookie, body: { emel: "muraciet", mebleg: 2000 } }, kreditHandler);
    expect((await yoxla(a.cookie)).govde.maliyye.hal).toBe("aciqMuraciet");
  });

  it("maliyyə ilə sifariş: sorğu yaranır, sonra kredit müraciətinə BAĞLANIR", async () => {
    const a = await fermer({ hektar: 10, bitki: "pomidor" });
    await tarixceYaz(a.id);
    const cavab = await sifarisYarat(a.cookie, { odenisUsulu: "agrofin_financing" });
    expect(cavab.statusCode).toBe(200);
    const { sifaris } = cavab.govde;
    expect(sifaris.odenisUsulu).toBe("agrofin_financing");
    expect(sifaris.maliyyeIstenilib).toBe(true);
    expect(sifaris.maliyye).toEqual({ hal: "requested", mebleg: 670, muracietId: null });
    // Sifariş kredit mühərrikini ÇAĞIRMIR — müraciət hələ yoxdur
    expect(await sorgu("SELECT id FROM credit_applications")).toEqual([]);

    // Fermer LoanSheet-dən müraciət göndərir (mövcud kredit API-si)
    const muraciet = await isle(
      { method: "POST", cookie: a.cookie, body: { emel: "muraciet", mebleg: 670 } },
      kreditHandler,
    );
    expect(muraciet.statusCode).toBe(200);
    const muracietId = muraciet.govde.muraciet.id;

    const bagla = await isle({
      method: "POST",
      cookie: a.cookie,
      body: { emel: "maliyye-bagla", sifarisId: sifaris.id, muracietId },
    });
    expect(bagla.statusCode).toBe(200);
    expect(bagla.govde.sifaris.maliyye).toEqual({ hal: "linked", mebleg: 670, muracietId });
    expect(bagla.govde.sifaris.hadiseler.at(-1).nov).toBe("financing_linked");
  });

  it("başqasının müraciətinə bağlamaq mümkün deyil", async () => {
    const a = await fermer({ telefon: "+994501111111" });
    await tarixceYaz(a.id);
    const sifaris = (await sifarisYarat(a.cookie, { odenisUsulu: "agrofin_financing" })).govde.sifaris;

    const b = await fermer({ telefon: "+994502222222" });
    await tarixceYaz(b.id);
    const bMuraciet = await isle({ method: "POST", cookie: b.cookie, body: { emel: "muraciet", mebleg: 1000 } }, kreditHandler);

    const bagla = await isle({
      method: "POST",
      cookie: a.cookie,
      body: { emel: "maliyye-bagla", sifarisId: sifaris.id, muracietId: bMuraciet.govde.muraciet.id },
    });
    expect(bagla.statusCode).toBe(404);
    const [f] = await sorgu("SELECT status, credit_application_id FROM marketplace_financing_requests");
    expect(f.status).toBe("requested");
    expect(f.credit_application_id).toBeNull();
  });

  it("uyğun olmayan fermer maliyyə ilə sifariş verə bilmir — sifariş də yaranmır", async () => {
    const a = await fermer({ hektar: 0 });
    const cavab = await sifarisYarat(a.cookie, { odenisUsulu: "agrofin_financing" });
    expect(cavab.statusCode).toBe(409);
    expect(cavab.govde.error).toBe("maliyyeUygunDeyil");
    expect(cavab.govde.maliyye.hal).toBe("saheYoxdur");
    expect(await sorgu("SELECT id FROM marketplace_orders")).toEqual([]);
  });

  it("ləğv maliyyələşdirmə sorğusunu da geri götürür", async () => {
    const a = await fermer({ hektar: 10, bitki: "pomidor" });
    await tarixceYaz(a.id);
    const { id } = (await sifarisYarat(a.cookie, { odenisUsulu: "agrofin_financing" })).govde.sifaris;
    const legv = await isle({ method: "POST", cookie: a.cookie, body: { emel: "sifaris-legv", sifarisId: id } });
    expect(legv.govde.sifaris.maliyye.hal).toBe("withdrawn");
  });
});
