import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { musterTeyin, sorgu } from "./db.js";
import {
  emrlereBol,
  MIQRASIYA_CEDVELI,
  mezmunHash,
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

  it("checksum Windows CRLF və Vercel LF sətir sonlarında eynidir", () => {
    expect(mezmunHash("CREATE TABLE a (id INT);\r\n")).toBe(
      mezmunHash("CREATE TABLE a (id INT);\n"),
    );
  });
});

describe("miqrasiya icrası", () => {
  it("boş bazada hamısını tətbiq edir və qeyd aparır", async () => {
    const yeniler = await miqrasiyalariTetbiqEt(sorgu);
    expect(yeniler).toEqual(miqrasiyaFayllari());

    const olanlar = await tetbiqOlunanlar(sorgu);
    expect(olanlar.map((s) => s.ad)).toEqual(miqrasiyaFayllari());
    // Hər tətbiq olunan faylın məzmun hash-ı da qeyd olunur
    for (const setir of olanlar) expect(setir.mezmun_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ikinci dəfə heç nə etmir (idempotent)", async () => {
    await miqrasiyalariTetbiqEt(sorgu);
    const ikinci = await miqrasiyalariTetbiqEt(sorgu);
    expect(ikinci).toEqual([]);
  });

  // Tətbiq olunmuş fayl dondurulmuş sənəddir: məzmun dəyişibsə icra
  // DAYANMALIDIR — "artıq tətbiq olunub" iddiası diskdəki faylla üst-üstə
  // düşməyəndə sxem vəziyyəti qeyri-müəyyəndir
  it("tətbiq olunmuş faylın məzmunu dəyişibsə xəta atır", async () => {
    await miqrasiyalariTetbiqEt(sorgu);
    await sorgu(`UPDATE ${MIQRASIYA_CEDVELI} SET mezmun_hash='uydurma' WHERE ad='001_baseline.sql'`);
    await expect(miqrasiyalariTetbiqEt(sorgu)).rejects.toThrow(/dəyişib/);
    // Bərpa: instans testlər arası bölüşülür — zəhərli hash qalmasın
    await sorgu(`UPDATE ${MIQRASIYA_CEDVELI} SET mezmun_hash=NULL WHERE ad='001_baseline.sql'`);
    await miqrasiyalariTetbiqEt(sorgu);
  });

  it("hash-sız legacy qeyd bir dəfə mənimsənilir", async () => {
    await miqrasiyalariTetbiqEt(sorgu);
    await sorgu(`UPDATE ${MIQRASIYA_CEDVELI} SET mezmun_hash=NULL WHERE ad='001_baseline.sql'`);
    await miqrasiyalariTetbiqEt(sorgu); // atmır — mənimsəyir
    const [setir] = await sorgu(
      `SELECT mezmun_hash FROM ${MIQRASIYA_CEDVELI} WHERE ad='001_baseline.sql'`,
    );
    expect(setir.mezmun_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("köhnə CRLF checksum-u kanonik LF checksum-a keçirir", async () => {
    await miqrasiyalariTetbiqEt(sorgu);
    const metn = readFileSync("db/migrations/001_baseline.sql", "utf-8").replace(
      /\r\n?/g,
      "\n",
    );
    const crlfHash = createHash("sha256")
      .update(metn.replace(/\n/g, "\r\n"))
      .digest("hex");
    expect(crlfHash).not.toBe(mezmunHash(metn));

    await sorgu(
      `UPDATE ${MIQRASIYA_CEDVELI} SET mezmun_hash=$2 WHERE ad=$1`,
      ["001_baseline.sql", crlfHash],
    );
    // Checksum-un üstündən yazılması SƏSSİZ olmamalıdır — operator build
    // logunda görməlidir ki, qorumaya niyə toxunulub
    const loglar = [];
    await expect(miqrasiyalariTetbiqEt(sorgu, (m) => loglar.push(m))).resolves.toEqual([]);
    expect(loglar.join("\n")).toMatch(/001_baseline\.sql.*CRLF→LF/);

    const [setir] = await sorgu(
      `SELECT mezmun_hash FROM ${MIQRASIYA_CEDVELI} WHERE ad='001_baseline.sql'`,
    );
    expect(setir.mezmun_hash).toBe(mezmunHash(metn));
  });

  // QORUMA ZƏİFLƏMƏMƏLİDİR: sətir sonu güzəşti YALNIZ eyni mətnin CRLF
  // variantına aiddir. SQL-in özü dəyişibsə — sətir sonları düz olsa belə —
  // icra dayanmalıdır, yoxsa normallaşdırma qorumanı deşən arxa qapı olardı.
  it("sətir sonu güzəşti həqiqi SQL dəyişikliyini gizlətmir", async () => {
    await miqrasiyalariTetbiqEt(sorgu);
    const metn = readFileSync("db/migrations/001_baseline.sql", "utf-8").replace(/\r\n?/g, "\n");
    // Məzmunu dəyişdirib CRLF-ə çeviririk: sətir sonları "düzgün" köhnə
    // formatdadır, amma SQL fərqlidir
    const deyismisCrlf = createHash("sha256")
      .update(`${metn}\nALTER TABLE istifadeciler ADD COLUMN arxa_qapi TEXT;\n`.replace(/\n/g, "\r\n"))
      .digest("hex");
    await sorgu(`UPDATE ${MIQRASIYA_CEDVELI} SET mezmun_hash=$2 WHERE ad=$1`, [
      "001_baseline.sql",
      deyismisCrlf,
    ]);
    await expect(miqrasiyalariTetbiqEt(sorgu)).rejects.toThrow(/dəyişib/);

    // Bərpa: instans testlər arası bölüşülür
    await sorgu(`UPDATE ${MIQRASIYA_CEDVELI} SET mezmun_hash=$2 WHERE ad=$1`, [
      "001_baseline.sql",
      mezmunHash(metn),
    ]);
  });

  // PARALEL DEPLOYMENT: eyni branch-a iki push getsə Vercel iki build işlədir
  // və hər ikisi EYNİ preview bazasına miqrasiya tətbiq edir. Hər iki icra
  // jurnalı yazmağa çalışır; qoruma olmasa uduzan tərəf unikal açar xətası
  // ilə build-i sındırırdı. Yarış burada qəsdən modelləşdirilir: "digər
  // build" jurnal sətrini biz onu yazmağa çatmamış əlavə edir.
  //
  // TƏMİZ bazada işləyir — paylaşılan instansda tətbiq ediləsi miqrasiya
  // qalmayıb ("ikinci dəfə heç nə etmir" testindən sonra).
  it("jurnal sətri artıq varsa icra sınmır (paralel build yarışı)", async () => {
    const temiz = new PGlite();
    await temiz.waitReady;
    try {
      musterTeyin(temiz);
      const yarisanSorgu = async (metn, params = []) => {
        const netice = await sorgu(metn, params);
        // İlk faylın son əmri icra olunan kimi "digər build" jurnala yazır
        if (metn.startsWith("CREATE INDEX IF NOT EXISTS bal_sahe_idx")) {
          await sorgu(
            `INSERT INTO ${MIQRASIYA_CEDVELI} (ad, mezmun_hash) VALUES ('001_baseline.sql', 'diger-build')
             ON CONFLICT (ad) DO NOTHING`,
          );
        }
        return netice;
      };

      const yeniler = await miqrasiyalariTetbiqEt(yarisanSorgu);
      expect(yeniler).toContain("001_baseline.sql");
      // Qalib sətir olduğu kimi qalır — üstündən yazılmır
      const [setir] = await sorgu(
        `SELECT mezmun_hash FROM ${MIQRASIYA_CEDVELI} WHERE ad='001_baseline.sql'`,
      );
      expect(setir.mezmun_hash).toBe("diger-build");
    } finally {
      await temiz.close();
      musterTeyin(pg);
    }
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
