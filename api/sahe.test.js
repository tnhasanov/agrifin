import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { musterTeyin, sorgu } from "../lib/db.js";
import { miqrasiyalariTetbiqEt } from "../lib/miqrasiya.js";
import { otpTesdiqle, otpYarat } from "../lib/hesab.js";
import handler from "./sahe.js";

let pg;
let kohneSecret;

beforeAll(async () => {
  kohneSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "test-sirri";
  pg = new PGlite();
  await pg.waitReady;
  // Sxem artıq runtime-da avtomatik qurulmur (bax: lib/miqrasiya.js) —
  // test bazası da miqrasiyalarla qurulur, prodakşnla eyni yolla
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

async function isle({ method = "GET", body, cookie } = {}) {
  const res = resYarat();
  await handler({ method, body, headers: cookie ? { cookie } : {} }, res);
  return res;
}

/** Sessiya birbaşa lib qatından açılır — bu fayl yalnız sahə API-sini sınayır */
async function girisEt(telefon = "+994501234567") {
  const { kod } = await otpYarat({ telefon, ip: null });
  const { token } = await otpTesdiqle({ telefon, kod });
  return `agrifin_sessiya=${token}`;
}

// Bərdə yaxınlığında üçbucaq — [en, uzunluq]
const NOQTELER = [
  [40.37, 47.12],
  [40.38, 47.13],
  [40.37, 47.14],
];

async function saheYaz(cookie) {
  return isle({
    method: "PUT",
    cookie,
    body: { noqteler: NOQTELER, hektar: 4.2, bitki: "bugda" },
  });
}

describe("api/sahe giriş nəzarəti", () => {
  it("cookie yoxdursa 401", async () => {
    const res = await isle();
    expect(res.statusCode).toBe(401);
  });

  it("uydurma token da 401", async () => {
    const res = await isle({ cookie: "agrifin_sessiya=deadbeef" });
    expect(res.statusCode).toBe(401);
  });
});

describe("api/sahe GET/PUT", () => {
  it("sahə yoxdursa boş cavab", async () => {
    const cookie = await girisEt();
    const res = await isle({ cookie });
    expect(res.statusCode).toBe(200);
    expect(res.govde).toEqual({ sahe: null, snapshotlar: {} });
  });

  it("yararsız kontur 400 alır", async () => {
    const cookie = await girisEt();
    const res = await isle({ method: "PUT", cookie, body: { noqteler: [[40, 47]] } });
    expect(res.statusCode).toBe(400);
  });

  it("PUT yazır, GET qaytarır", async () => {
    const cookie = await girisEt();
    expect((await saheYaz(cookie)).statusCode).toBe(200);

    const res = await isle({ cookie });
    expect(res.govde.sahe).toEqual({ noqteler: NOQTELER, hektar: 4.2, bitki: "bugda" });
  });

  it("ikinci PUT əvəz edir, ikinci sətir yaratmır", async () => {
    const cookie = await girisEt();
    await saheYaz(cookie);
    await isle({
      method: "PUT",
      cookie,
      body: { noqteler: NOQTELER, hektar: 7, bitki: "pambiq" },
    });
    const [{ say }] = await sorgu("SELECT count(*)::int AS say FROM saheler");
    expect(say).toBe(1);
    const res = await isle({ cookie });
    expect(res.govde.sahe.bitki).toBe("pambiq");
  });

  it("hər istifadəçi yalnız öz sahəsini görür", async () => {
    const birinci = await girisEt("+994501111111");
    const ikinci = await girisEt("+994502222222");
    await saheYaz(birinci);
    const res = await isle({ cookie: ikinci });
    expect(res.govde.sahe).toBeNull();
  });
});

describe("api/sahe POST snapshot", () => {
  it("sahə yazılmayıbsa 409", async () => {
    const cookie = await girisEt();
    const res = await isle({
      method: "POST",
      cookie,
      body: { emel: "snapshot", nov: "tarixce", mezmun: { a: 1 } },
    });
    expect(res.statusCode).toBe(409);
  });

  it("yazır, təkrar yazanda əvəz edir, GET-də qayıdır", async () => {
    const cookie = await girisEt();
    await saheYaz(cookie);
    const yaz = (mezmun) =>
      isle({ method: "POST", cookie, body: { emel: "snapshot", nov: "tarixce", mezmun } });
    expect((await yaz({ movsumler: [1] })).statusCode).toBe(200);
    expect((await yaz({ movsumler: [1, 2] })).statusCode).toBe(200);

    const res = await isle({ cookie });
    expect(res.govde.snapshotlar.tarixce).toEqual({ movsumler: [1, 2] });
    const [{ say }] = await sorgu("SELECT count(*)::int AS say FROM peyk_snapshotlar");
    expect(say).toBe(1);
  });

  it("naməlum növ 400 alır", async () => {
    const cookie = await girisEt();
    await saheYaz(cookie);
    const res = await isle({
      method: "POST",
      cookie,
      body: { emel: "snapshot", nov: "yad", mezmun: {} },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("api/sahe POST bal (kalibrləmə jurnalı)", () => {
  const bal = { emel: "bal", bal: 72, bant: "yaxsi", etibar: "tam", amiller: { davamliliq: 20 } };

  it("yazır və cədvəl versiyasını serverdə damğalayır", async () => {
    const cookie = await girisEt();
    await saheYaz(cookie);
    const res = await isle({ method: "POST", cookie, body: bal });
    expect(res.statusCode).toBe(200);

    const [setir] = await sorgu(
      "SELECT bal, bant, etibar, amiller, cedvel_versiyasi FROM bal_jurnali",
    );
    expect(setir.bal).toBe(72);
    expect(setir.bant).toBe("yaxsi");
    expect(setir.amiller).toEqual({ davamliliq: 20 });
    // Versiya gövdədən gəlmir — müştəri onu saxtalaşdıra bilməz
    expect(setir.cedvel_versiyasi).toMatch(/^v1-/);
  });

  it("jurnal yalnız artır — hər hesablama yeni sətirdir", async () => {
    const cookie = await girisEt();
    await saheYaz(cookie);
    await isle({ method: "POST", cookie, body: bal });
    await isle({ method: "POST", cookie, body: { ...bal, bal: 75 } });
    const setirler = await sorgu("SELECT bal FROM bal_jurnali ORDER BY id");
    expect(setirler).toEqual([{ bal: 72 }, { bal: 75 }]);
  });

  it("yararsız bal/bant 400 alır", async () => {
    const cookie = await girisEt();
    await saheYaz(cookie);
    for (const pis of [
      { ...bal, bal: 101 },
      { ...bal, bal: 7.5 },
      { ...bal, bant: "super" },
      { ...bal, amiller: null },
    ]) {
      expect((await isle({ method: "POST", cookie, body: pis })).statusCode).toBe(400);
    }
  });
});

describe("api/sahe digər", () => {
  it("naməlum əmələ 400, yad metoda 405", async () => {
    const cookie = await girisEt();
    await saheYaz(cookie);
    expect((await isle({ method: "POST", cookie, body: { emel: "sil" } })).statusCode).toBe(400);
    expect((await isle({ method: "DELETE", cookie })).statusCode).toBe(405);
  });
});
