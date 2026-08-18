import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { BAGLANTI_ACARLARI, baglantiAcari, dbQurulub, musterTeyin, sorgu } from "./db.js";

// PGlite-in WASM başlanğıcı bahalıdır (~bir neçə saniyə) — fayl boyu BİR
// instans, testlər arası isə cədvəllər təmizlənir
let pg;

beforeAll(async () => {
  pg = new PGlite();
  await pg.waitReady;
}, 60_000);

afterAll(async () => {
  musterTeyin(null);
  await pg.close();
});

beforeEach(async () => {
  musterTeyin(pg);
  await sorgu("TRUNCATE istifadeciler RESTART IDENTITY CASCADE");
  await sorgu("TRUNCATE otp_kodlar RESTART IDENTITY");
});

describe("db qatı", () => {
  it("ilk sorğudan əvvəl sxemi qurur", async () => {
    const setirler = await sorgu(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
    );
    const adlar = setirler.map((s) => s.table_name);
    expect(adlar).toEqual([
      "bal_jurnali",
      "istifadeciler",
      "otp_kodlar",
      "peyk_snapshotlar",
      "saheler",
      "sessiyalar",
    ]);
  });

  // IF NOT EXISTS: miqrasiya təkrar işləyəndə (yeni instans, isti başlanğıc)
  // heç nə pozulmamalıdır
  it("miqrasiya idempotentdir", async () => {
    await sorgu("INSERT INTO istifadeciler (telefon) VALUES ($1)", ["+994501234567"]);
    // İkinci instansın gəlişini təqlid edirik: hazırla yenidən işləyir
    musterTeyin(pg);
    const setirler = await sorgu("SELECT telefon FROM istifadeciler");
    expect(setirler).toEqual([{ telefon: "+994501234567" }]);
  });

  it("parametrli sorğu işləyir və sətirlər qayıdır", async () => {
    await sorgu("INSERT INTO istifadeciler (telefon) VALUES ($1)", ["+994551112233"]);
    const setirler = await sorgu("SELECT id, telefon FROM istifadeciler WHERE telefon=$1", [
      "+994551112233",
    ]);
    expect(setirler).toHaveLength(1);
    expect(setirler[0].telefon).toBe("+994551112233");
  });

  it("bir istifadəçiyə ikinci sahə yazıla bilmir (Faza 1: tək sahə)", async () => {
    await sorgu("INSERT INTO istifadeciler (telefon) VALUES ($1)", ["+994501234567"]);
    const [{ id }] = await sorgu("SELECT id FROM istifadeciler LIMIT 1");
    await sorgu("INSERT INTO saheler (istifadeci_id, noqteler, hektar) VALUES ($1, $2, $3)", [
      id,
      JSON.stringify([[40.4, 47.1]]),
      5,
    ]);
    await expect(
      sorgu("INSERT INTO saheler (istifadeci_id, noqteler) VALUES ($1, $2)", [
        id,
        JSON.stringify([[41, 48]]),
      ]),
    ).rejects.toThrow();
  });

  describe("bağlantı açarı", () => {
    // Bütün açarları saxlayıb təmizləyirik: birini unutsaq test yalançı
    // yaşıl verər (mühitdə qalan açar "qurulub" göstərər)
    let kohne;
    beforeEach(() => {
      musterTeyin(null);
      kohne = Object.fromEntries(BAGLANTI_ACARLARI.map((ad) => [ad, process.env[ad]]));
      for (const ad of BAGLANTI_ACARLARI) delete process.env[ad];
    });
    afterEach(() => {
      for (const [ad, deyer] of Object.entries(kohne)) {
        if (deyer === undefined) delete process.env[ad];
        else process.env[ad] = deyer;
      }
    });

    it("heç bir açar yoxdursa qurulmayıb sayılır", () => {
      expect(dbQurulub()).toBe(false);
      expect(baglantiAcari()).toBeNull();
    });

    // Vercel inteqrasiyadan asılı olaraq DATABASE_URL və ya POSTGRES_URL
    // yeridir — ikisi də tanınmalıdır, yoxsa baza var, tətbiq "yoxdur" deyir
    it("POSTGRES_URL də tanınır", () => {
      process.env.POSTGRES_URL = "postgres://saxta/baza";
      expect(dbQurulub()).toBe(true);
      expect(baglantiAcari()).toBe("POSTGRES_URL");
    });

    it("hovuzlu ünvana üstünlük verilir", () => {
      process.env.DATABASE_URL_UNPOOLED = "postgres://saxta/tek";
      process.env.DATABASE_URL = "postgres://saxta/hovuz";
      expect(baglantiAcari()).toBe("DATABASE_URL");
    });
  });
});
