import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { musterTeyin, sorgu } from "./db.js";
import {
  emrlereBol,
  MIQRASIYA_CEDVELI,
  miqrasiyaFayllari,
  miqrasiyalariTetbiqEt,
  tetbiqOlunanlar,
} from "./miqrasiya.js";

let pg;

beforeAll(async () => {
  pg = new PGlite();
  await pg.waitReady;
}, 60_000);

afterAll(async () => {
  musterTeyin(null);
  await pg.close();
});

beforeEach(() => {
  musterTeyin(pg);
});

describe("miqrasiya faylları", () => {
  it("nömrələnib və sıralanır", () => {
    const fayllar = miqrasiyaFayllari();
    expect(fayllar.length).toBeGreaterThanOrEqual(2);
    expect(fayllar[0]).toBe("001_baseline.sql");
    expect(fayllar).toEqual([...fayllar].sort());
    for (const ad of fayllar) expect(ad).toMatch(/^\d{3}_[a-z_]+\.sql$/);
  });

  it("şərh sətirləri əmrlərə qarışmır", () => {
    const emrler = emrlereBol(`
      -- şərh
      CREATE TABLE a (id INT);
      -- ikinci şərh
      CREATE TABLE b (id INT);
    `);
    expect(emrler).toHaveLength(2);
    expect(emrler[0]).toContain("CREATE TABLE a");
    expect(emrler[1]).toContain("CREATE TABLE b");
  });
});

describe("miqrasiya icrası", () => {
  it("boş bazada hamısını tətbiq edir və qeyd aparır", async () => {
    const yeniler = await miqrasiyalariTetbiqEt(sorgu);
    expect(yeniler).toEqual(miqrasiyaFayllari());

    const olanlar = await tetbiqOlunanlar(sorgu);
    expect(olanlar).toEqual(miqrasiyaFayllari());
  });

  it("ikinci dəfə heç nə etmir (idempotent)", async () => {
    await miqrasiyalariTetbiqEt(sorgu);
    const ikinci = await miqrasiyalariTetbiqEt(sorgu);
    expect(ikinci).toEqual([]);
  });

  it("jurnal cədvəli tətbiq vaxtını saxlayır", async () => {
    await miqrasiyalariTetbiqEt(sorgu);
    const setirler = await sorgu(`SELECT ad, tetbiq_olunub FROM ${MIQRASIYA_CEDVELI} ORDER BY ad`);
    expect(setirler[0].tetbiq_olunub).toBeTruthy();
  });

  // SƏSSİZ DAVAM YOXDUR: uğursuz miqrasiya atır və hansı fayl olduğunu deyir.
  // TƏMİZ bazada işləyir — yuxarıdakı testlərdən sonra tətbiq ediləsi
  // miqrasiya qalmasa heç bir əmr icra olunmazdı.
  it("uğursuz əmrdə atır və faylın adını göstərir", async () => {
    const temiz = new PGlite();
    await temiz.waitReady;
    try {
      const pisSorgu = async (metn, params = []) => {
        if (metn.includes("CREATE TABLE") && !metn.includes("sxem_miqrasiyalari")) {
          throw new Error("izin yoxdur");
        }
        const netice = await temiz.query(metn, params);
        return netice.rows ?? netice;
      };
      await expect(miqrasiyalariTetbiqEt(pisSorgu)).rejects.toThrow(/Miqrasiya uğursuz \(001_/);
      // Uğursuz miqrasiya JURNALA YAZILMIR — növbəti icra onu təkrar sınayır
      const olanlar = await pisSorgu(`SELECT ad FROM ${MIQRASIYA_CEDVELI}`);
      expect(olanlar).toHaveLength(0);
    } finally {
      await temiz.close();
    }
    // Açıq vaxt həddi: ikinci PGlite instansı tam yığım altında yavaş qalxır
    // və standart 5 s-lik hədd təsadüfi qırmızı verirdi
  }, 60_000);
});
