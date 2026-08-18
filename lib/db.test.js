import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { dbQurulub, musterTeyin, sorgu } from "./db.js";

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

  it("DATABASE_URL yoxdursa qurulmayıb sayılır", () => {
    musterTeyin(null);
    const kohne = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    expect(dbQurulub()).toBe(false);
    if (kohne) process.env.DATABASE_URL = kohne;
  });
});
