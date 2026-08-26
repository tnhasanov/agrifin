/**
 * SXEM MİQRASİYALARI — açıq, nömrələnmiş, izlənən.
 *
 * ═══ NİYƏ DƏYİŞDİ ═════════════════════════════════════════════════════
 * Əvvəl `db/schema.sql` HƏR serverless instansın ilk sorğusunda icra
 * olunurdu. Prototipdə bu rahat idi, maliyyə məhsulunda yolverilməzdir:
 *   • adi istifadəçi sorğusu prodakşn sxemini dəyişə bilirdi;
 *   • uğursuz DDL istifadəçi sorğusunun içində, səssizcə itirdi;
 *   • hansı sxemin tətbiq olunduğunu heç yerdən görmək olmurdu.
 *
 * İndi: `db/migrations/NNN_ad.sql` faylları sırayla işləyir, tətbiq olunanlar
 * `sxem_miqrasiyalari` cədvəlində qeyd olunur. Runtime HEÇ NƏ tətbiq etmir —
 * yalnız `npm run db:migrate` (bax: scripts/migrate.mjs) və testlər.
 *
 * Təkrar işlətmək təhlükəsizdir: tətbiq olunmuş fayl atlanır, DDL-in özü də
 * IF NOT EXISTS-lidir (yarımçıq qalmış icra ikinci dəfə tamamlanır).
 * Uğursuzluqda ATILIR — səssiz davam yoxdur.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const MIQRASIYA_CEDVELI = "sxem_miqrasiyalari";

function qovluq() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
}

/** Miqrasiya faylları — ad sırası icra sırasıdır (001, 002, ...) */
export function miqrasiyaFayllari() {
  return readdirSync(qovluq())
    .filter((ad) => ad.endsWith(".sql"))
    .sort();
}

/**
 * SQL mətnini ayrı əmrlərə bölür.
 *
 * Neon HTTP sürücüsü bir çağırışda bir əmr istəyir. Əvvəl tam sətirlik
 * şərhlər atılır (yoxsa ";"-lə bölünən parça şərhlə başlayır və bütöv
 * CREATE onunla birlikdə itə bilər). Sadə bölmə kifayətdir: miqrasiyalarda
 * funksiya gövdəsi və dollar-quote YOXDUR — bu qayda sənədləşdirilib.
 */
export function emrlereBol(metn) {
  return metn
    .split("\n")
    .filter((setir) => !setir.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((emr) => emr.trim())
    .filter(Boolean);
}

async function jurnalYarat(sorgu) {
  await sorgu(
    `CREATE TABLE IF NOT EXISTS ${MIQRASIYA_CEDVELI} (
       ad TEXT PRIMARY KEY,
       tetbiq_olunub TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
    [],
  );
}

/** Tətbiq olunmuş miqrasiyaların adları */
export async function tetbiqOlunanlar(sorgu) {
  await jurnalYarat(sorgu);
  const setirler = await sorgu(`SELECT ad FROM ${MIQRASIYA_CEDVELI} ORDER BY ad`, []);
  return setirler.map((s) => s.ad);
}

/**
 * Tətbiq olunmamış miqrasiyaları sırayla işlədir.
 *
 * @param {(metn: string, params: any[]) => Promise<any>} sorgu
 * @param {(mesaj: string) => void} [log]
 * @returns {Promise<string[]>} bu çağırışda tətbiq olunanların adları
 */
export async function miqrasiyalariTetbiqEt(sorgu, log = () => {}) {
  const olanlar = new Set(await tetbiqOlunanlar(sorgu));
  const yeniler = [];

  for (const ad of miqrasiyaFayllari()) {
    if (olanlar.has(ad)) continue;
    const emrler = emrlereBol(readFileSync(join(qovluq(), ad), "utf-8"));
    log(`→ ${ad} (${emrler.length} əmr)`);
    for (const emr of emrler) {
      try {
        await sorgu(emr, []);
      } catch (xeta) {
        // Səssiz davam YOXDUR: hansı fayl, hansı əmr — dərhal görünsün
        xeta.message = `Miqrasiya uğursuz (${ad}): ${xeta.message}\n${emr.slice(0, 200)}`;
        throw xeta;
      }
    }
    await sorgu(`INSERT INTO ${MIQRASIYA_CEDVELI} (ad) VALUES ($1)`, [ad]);
    yeniler.push(ad);
  }

  return yeniler;
}
