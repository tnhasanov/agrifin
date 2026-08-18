import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { musterTeyin, sorgu } from "../lib/db.js";
import handler from "./hesab.js";

// Handler HTTP-siz sınanır: mock req/res real handler-i PGlite üstündə sürür.
// SMS_URL qurulmayıb → log rejimi; kod console.log-dan tutulur (istehsalda
// bunu yalnız funksiya loglarını görən adam edə bilər — test də "o adamdır").

let pg;
let kohneSecret;

beforeAll(async () => {
  kohneSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "test-sirri";
  delete process.env.SMS_URL;
  pg = new PGlite();
  await pg.waitReady;
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

function reqYarat({ method = "POST", body, headers = {} } = {}) {
  return { method, body, headers };
}

function resYarat() {
  const res = {
    statusCode: null,
    govde: null,
    basliqlar: {},
    status(kod) {
      res.statusCode = kod;
      return res;
    },
    json(g) {
      res.govde = g;
      return res;
    },
    setHeader(ad, deyer) {
      res.basliqlar[ad] = deyer;
    },
  };
  return res;
}

async function isle(req) {
  const res = resYarat();
  await handler(req, res);
  return res;
}

const TEL = "+994501234567";

/** kod-iste çağırır, kodu log sətrindən çıxarır */
async function kodAl(telefon = TEL) {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    const res = await isle(reqYarat({ body: { emel: "kod-iste", telefon } }));
    expect(res.statusCode).toBe(200);
    const setir = log.mock.calls.map((c) => c.join(" ")).find((s) => s.includes("[sms:log]"));
    // Nömrənin özü də rəqəmdir — kod mesajın SONUNDAKI 6 rəqəmdir
    return /(\d{6})\s*$/.exec(setir)[1];
  } finally {
    log.mockRestore();
  }
}

/** Tam giriş: kod istə + təsdiqlə → cookie başlığı üçün token */
async function girisEt(telefon = TEL) {
  const kod = await kodAl(telefon);
  const res = await isle(reqYarat({ body: { emel: "kod-tesdiq", telefon, kod } }));
  expect(res.statusCode).toBe(200);
  const token = /agrifin_sessiya=([^;]+)/.exec(res.basliqlar["Set-Cookie"])[1];
  return { token, cookie: `agrifin_sessiya=${token}` };
}

describe("api/hesab GET (diaqnostika)", () => {
  it("qurulub vəziyyətini qaytarır, sirr sızdırmır", async () => {
    const res = await isle(reqYarat({ method: "GET" }));
    expect(res.statusCode).toBe(200);
    expect(res.govde).toEqual({ dbQurulub: true, hesabQurulub: true, smsRejimi: "log" });
  });

  it("sessiya cookie-si varsa telefonu göstərir", async () => {
    const { cookie } = await girisEt();
    const res = await isle(reqYarat({ method: "GET", headers: { cookie } }));
    expect(res.govde.telefon).toBe(TEL);
  });
});

describe("api/hesab qurulmayıb", () => {
  it("db yoxdursa POST 501 qaytarır", async () => {
    musterTeyin(null);
    const kohne = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const res = await isle(reqYarat({ body: { emel: "kod-iste", telefon: TEL } }));
      expect(res.statusCode).toBe(501);
      // GET isə 200 ilə "qurulmayıb" deyir — diaqnostika həmişə işləyir
      const diaq = await isle(reqYarat({ method: "GET" }));
      expect(diaq.statusCode).toBe(200);
      expect(diaq.govde.dbQurulub).toBe(false);
    } finally {
      if (kohne) process.env.DATABASE_URL = kohne;
    }
  });
});

describe("api/hesab kod-iste", () => {
  it("yararsız telefona 400", async () => {
    const res = await isle(reqYarat({ body: { emel: "kod-iste", telefon: "12345" } }));
    expect(res.statusCode).toBe(400);
    expect(res.govde.error).toBe("telefonYanlis");
  });

  it("log rejimində kod göndərilir və rejim cavabda deyilir", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const res = await isle(reqYarat({ body: { emel: "kod-iste", telefon: "0501234567" } }));
      expect(res.statusCode).toBe(200);
      expect(res.govde).toEqual({ gonderildi: true, rejim: "log" });
      // Kod UI-a yox, loga düşür — normallaşdırılmış nömrə ilə
      expect(log.mock.calls.join(" ")).toContain(TEL);
    } finally {
      log.mockRestore();
    }
  });

  it("həddən sonra 429", async () => {
    await kodAl();
    await kodAl();
    await kodAl();
    const res = await isle(reqYarat({ body: { emel: "kod-iste", telefon: TEL } }));
    expect(res.statusCode).toBe(429);
    expect(res.govde.error).toBe("hedd");
  });
});

describe("api/hesab kod-tesdiq", () => {
  it("düzgün kod cookie qoyur", async () => {
    const kod = await kodAl();
    const res = await isle(reqYarat({ body: { emel: "kod-tesdiq", telefon: TEL, kod } }));
    expect(res.statusCode).toBe(200);
    expect(res.govde).toEqual({ telefon: TEL });
    const cookie = res.basliqlar["Set-Cookie"];
    expect(cookie).toContain("agrifin_sessiya=");
    expect(cookie).toContain("HttpOnly");
    // Mock sorğuda x-forwarded-proto yoxdur → Secure qoyulmur (yerli http)
    expect(cookie).not.toContain("Secure");
  });

  it("kod formatı yanlışdırsa 400", async () => {
    const res = await isle(reqYarat({ body: { emel: "kod-tesdiq", telefon: TEL, kod: "12ab56" } }));
    expect(res.statusCode).toBe(400);
  });

  it("yanlış koda 401 'yanlis'", async () => {
    const kod = await kodAl();
    const sehv = kod === "000000" ? "111111" : "000000";
    const res = await isle(reqYarat({ body: { emel: "kod-tesdiq", telefon: TEL, kod: sehv } }));
    expect(res.statusCode).toBe(401);
    expect(res.govde.error).toBe("yanlis");
  });

  it("kod istənməyibsə 401 'bitib'", async () => {
    const res = await isle(
      reqYarat({ body: { emel: "kod-tesdiq", telefon: TEL, kod: "123456" } }),
    );
    expect(res.statusCode).toBe(401);
    expect(res.govde.error).toBe("bitib");
  });
});

describe("api/hesab cix", () => {
  it("sessiyanı bağlayır və cookie silir", async () => {
    const { cookie } = await girisEt();
    const res = await isle(reqYarat({ body: { emel: "cix" }, headers: { cookie } }));
    expect(res.statusCode).toBe(200);
    expect(res.basliqlar["Set-Cookie"]).toContain("Max-Age=0");

    const sonra = await isle(reqYarat({ method: "GET", headers: { cookie } }));
    expect(sonra.govde.telefon).toBeUndefined();
  });
});

describe("api/hesab digər", () => {
  it("naməlum əmələ 400, yad metoda 405", async () => {
    expect((await isle(reqYarat({ body: { emel: "sil" } }))).statusCode).toBe(400);
    expect((await isle(reqYarat({ method: "DELETE" }))).statusCode).toBe(405);
  });
});
