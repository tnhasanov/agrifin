import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { musterTeyin, sorgu } from "./db.js";
import { miqrasiyalariTetbiqEt } from "./miqrasiya.js";
import {
  OTP_IP_MAX,
  OTP_MAX_CEHD,
  OTP_PENCEREDE_MAX,
  cookieToken,
  cookieYaz,
  hesabQurulub,
  otpTesdiqle,
  otpYarat,
  sessiyaBagla,
  sessiyaOxu,
  telefonNormallasdir,
} from "./hesab.js";

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

const TEL = "+994501234567";

/** Tam axının qısa yolu: kod istə → təsdiqlə → token qaytar */
async function girisEt(telefon = TEL) {
  const { kod } = await otpYarat({ telefon, ip: "1.2.3.4" });
  return otpTesdiqle({ telefon, kod });
}

describe("telefonNormallasdir", () => {
  it("bütün qəbul olunan yazılışları eyni formaya salır", () => {
    expect(telefonNormallasdir("+994501234567")).toBe(TEL);
    expect(telefonNormallasdir("994501234567")).toBe(TEL);
    expect(telefonNormallasdir("0501234567")).toBe(TEL);
    expect(telefonNormallasdir("501234567")).toBe(TEL);
    // Boşluq/defis kimi ayırıcılar atılır
    expect(telefonNormallasdir("050 123-45-67")).toBe(TEL);
  });

  it("yararsız girişə null qaytarır", () => {
    expect(telefonNormallasdir("")).toBeNull();
    expect(telefonNormallasdir(null)).toBeNull();
    expect(telefonNormallasdir("12345")).toBeNull();
    expect(telefonNormallasdir("+7 900 000 00 00")).toBeNull();
    expect(telefonNormallasdir("salam")).toBeNull();
  });
});

describe("OTP axını", () => {
  it("düzgün kod sessiya açır, sessiyaOxu istifadəçini tapır", async () => {
    const netice = await girisEt();
    expect(netice.telefon).toBe(TEL);
    expect(netice.token).toMatch(/^[0-9a-f]{64}$/);

    const istifadeci = await sessiyaOxu(netice.token);
    expect(istifadeci).toMatchObject({ telefon: TEL });
    expect(istifadeci.id).toBeGreaterThan(0);
  });

  it("kod bazada yalnız hash kimi yaşayır", async () => {
    const { kod } = await otpYarat({ telefon: TEL, ip: null });
    const [setir] = await sorgu("SELECT kod_hash FROM otp_kodlar");
    expect(setir.kod_hash).not.toContain(kod);
    expect(setir.kod_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("yanlış kod rədd edilir, düzgünü hələ də işləyir", async () => {
    const { kod } = await otpYarat({ telefon: TEL, ip: null });
    const sehv = kod === "000000" ? "111111" : "000000";
    expect(await otpTesdiqle({ telefon: TEL, kod: sehv })).toEqual({ xeta: "yanlis" });
    const netice = await otpTesdiqle({ telefon: TEL, kod });
    expect(netice.telefon).toBe(TEL);
  });

  it(`${OTP_MAX_CEHD} yanlış cəhddən sonra kod kilidlənir`, async () => {
    const { kod } = await otpYarat({ telefon: TEL, ip: null });
    const sehv = kod === "000000" ? "111111" : "000000";
    for (let i = 0; i < OTP_MAX_CEHD; i++) {
      expect(await otpTesdiqle({ telefon: TEL, kod: sehv })).toEqual({ xeta: "yanlis" });
    }
    // Kilidlənəndən sonra DÜZGÜN kod da keçmir
    expect(await otpTesdiqle({ telefon: TEL, kod })).toEqual({ xeta: "bitib" });
  });

  it("kod birdəfəlikdir", async () => {
    const { kod } = await otpYarat({ telefon: TEL, ip: null });
    await otpTesdiqle({ telefon: TEL, kod });
    expect(await otpTesdiqle({ telefon: TEL, kod })).toEqual({ xeta: "bitib" });
  });

  it("vaxtı keçmiş kod rədd edilir", async () => {
    const { kod } = await otpYarat({ telefon: TEL, ip: null });
    await sorgu("UPDATE otp_kodlar SET bitir = now() - interval '1 minute'");
    expect(await otpTesdiqle({ telefon: TEL, kod })).toEqual({ xeta: "bitib" });
  });

  it("kod olmayan telefona 'bitib' qayıdır", async () => {
    expect(await otpTesdiqle({ telefon: TEL, kod: "123456" })).toEqual({ xeta: "bitib" });
  });

  it("təkrar giriş ikinci istifadəçi yaratmır", async () => {
    await girisEt();
    await girisEt();
    const setirler = await sorgu("SELECT count(*)::int AS say FROM istifadeciler");
    expect(setirler[0].say).toBe(1);
  });
});

describe("sürət hədləri", () => {
  it(`telefon başına pəncərədə ${OTP_PENCEREDE_MAX} kod — sonrası hədd`, async () => {
    for (let i = 0; i < OTP_PENCEREDE_MAX; i++) {
      expect((await otpYarat({ telefon: TEL, ip: null })).kod).toBeDefined();
    }
    expect(await otpYarat({ telefon: TEL, ip: null })).toEqual({ xeta: "hedd" });
  });

  it(`IP başına pəncərədə ${OTP_IP_MAX} kod — fərqli telefonlarla da hədd`, async () => {
    const ip = "9.9.9.9";
    for (let i = 0; i < OTP_IP_MAX; i++) {
      const telefon = `+99450${String(1000000 + i).slice(-7)}`;
      expect((await otpYarat({ telefon, ip })).kod).toBeDefined();
    }
    expect(await otpYarat({ telefon: "+994559999999", ip })).toEqual({ xeta: "hedd" });
  });
});

describe("sessiya", () => {
  it("token bazada yalnız hash kimi yaşayır", async () => {
    const { token } = await girisEt();
    const [setir] = await sorgu("SELECT token_hash FROM sessiyalar");
    expect(setir.token_hash).not.toBe(token);
  });

  it("sessiyaBagla tokeni etibarsız edir", async () => {
    const { token } = await girisEt();
    await sessiyaBagla(token);
    expect(await sessiyaOxu(token)).toBeNull();
  });

  it("vaxtı keçmiş sessiya oxunmur", async () => {
    const { token } = await girisEt();
    await sorgu("UPDATE sessiyalar SET bitir = now() - interval '1 minute'");
    expect(await sessiyaOxu(token)).toBeNull();
  });

  it("boş və uydurma token null qaytarır", async () => {
    expect(await sessiyaOxu(null)).toBeNull();
    expect(await sessiyaOxu("uydurma-token")).toBeNull();
  });
});

describe("hesabQurulub", () => {
  it("SESSION_SECRET-ə baxır", () => {
    expect(hesabQurulub()).toBe(true);
    delete process.env.SESSION_SECRET;
    expect(hesabQurulub()).toBe(false);
    process.env.SESSION_SECRET = "test-sirri";
  });
});

describe("cookie köməkçiləri", () => {
  it("cookieToken başlıqdan öz cookie-sini tapır", () => {
    expect(cookieToken({ headers: { cookie: "agrifin_sessiya=abc123" } })).toBe("abc123");
    expect(cookieToken({ headers: { cookie: "dil=az; agrifin_sessiya=abc123; tema=qara" } })).toBe(
      "abc123",
    );
    expect(cookieToken({ headers: { cookie: "dil=az" } })).toBeNull();
    expect(cookieToken({ headers: {} })).toBeNull();
  });

  it("cookieYaz httpOnly qoyur, Secure yalnız https-də", () => {
    const yaz = (proto) => {
      let deyer;
      const res = { setHeader: (_ad, d) => (deyer = d) };
      cookieYaz(res, { headers: { "x-forwarded-proto": proto } }, "tok");
      return deyer;
    };
    const http = yaz("");
    expect(http).toContain("agrifin_sessiya=tok");
    expect(http).toContain("HttpOnly");
    expect(http).toContain("SameSite=Lax");
    expect(http).not.toContain("Secure");
    expect(yaz("https")).toContain("Secure");
  });

  it("cookieYaz sil rejimində Max-Age=0 qoyur", () => {
    let deyer;
    const res = { setHeader: (_ad, d) => (deyer = d) };
    cookieYaz(res, { headers: {} }, "", { sil: true });
    expect(deyer).toContain("Max-Age=0");
    expect(deyer).toContain("agrifin_sessiya=;");
  });
});
