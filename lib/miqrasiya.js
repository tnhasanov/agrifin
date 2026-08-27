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
 * `sxem_miqrasiyalari` cədvəlində AD + MƏZMUN HASH-ı ilə qeyd olunur.
 * Runtime HEÇ NƏ tətbiq etmir — yalnız `npm run db:migrate`
 * (bax: scripts/migrate.mjs) və testlər.
 *
 * ═══ MEXANİZMİN AÇIQ MƏHDUDİYYƏTİ ═════════════════════════════════════
 * Neon HTTP sürücüsü çox-ifadəli tranzaksiya vermir: hər əmr öz kiçik
 * tranzaksiyasıdır. Ona görə fayl YARIDA qırıla bilər və qeydə düşməmiş
 * qalar — növbəti icra onu BAŞDAN təkrar işlədəcək. Buradan MƏCBURİ QAYDA:
 *
 *   Hər miqrasiya faylının hər əmri təkrar icraya davamlı olmalıdır —
 *   CREATE ... IF NOT EXISTS, DROP ... IF EXISTS + ADD cütü,
 *   INSERT ... ON CONFLICT. Çılpaq ALTER/DML yazmaq QADAĞANDIR;
 *   belə dəyişiklik lazım olsa idempotent formaya salınmalıdır
 *   (nümunə: db/migrations/003 — DROP IF EXISTS + ADD cütləri).
 *
 * ═══ CHECKSUM ═════════════════════════════════════════════════════════
 * Tətbiq olunmuş faylın məzmunu sonradan dəyişərsə icra XƏTA İLƏ DAYANIR:
 * "artıq tətbiq olunub" deyilən şeylə diskdəki fayl eyni olmalıdır —
 * miqrasiya faylı dondurulmuş sənəddir, düzəliş yeni nömrə ilə gedir.
 * (Köhnə qeydlərdə hash yoxdursa bir dəfə mənimsənilir — legacy keçidi.)
 */

import { createHash } from "node:crypto";
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

export function mezmunHash(metn) {
  return createHash("sha256").update(metn).digest("hex");
}

/**
 * SQL mətnini ayrı əmrlərə bölür.
 *
 * Neon HTTP sürücüsü bir çağırışda bir əmr istəyir. Əvvəl tam sətirlik
 * şərhlər atılır (yoxsa ";"-lə bölünən parça şərhlə başlayır və bütöv
 * CREATE onunla birlikdə itə bilər), sonra bölmə. Sadə bölmə kifayətdir:
 * miqrasiyalarda funksiya gövdəsi və dollar-quote YOXDUR — bu qayda
 * yuxarıdakı məcburi qaydanın bir hissəsidir.
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
       tetbiq_olunub TIMESTAMPTZ NOT NULL DEFAULT now(),
       mezmun_hash TEXT
     )`,
    [],
  );
  // Köhnə quruluşda hash sütunu yox idi — mövcud cədvələ əlavə olunur
  await sorgu(`ALTER TABLE ${MIQRASIYA_CEDVELI} ADD COLUMN IF NOT EXISTS mezmun_hash TEXT`, []);
}

/** Tətbiq olunmuş miqrasiyalar: [{ad, mezmun_hash}] */
export async function tetbiqOlunanlar(sorgu) {
  await jurnalYarat(sorgu);
  return sorgu(`SELECT ad, mezmun_hash FROM ${MIQRASIYA_CEDVELI} ORDER BY ad`, []);
}

/**
 * Tətbiq olunmamış miqrasiyaları sırayla işlədir; tətbiq olunmuşların
 * məzmununu checksum ilə yoxlayır.
 *
 * @param {(metn: string, params: any[]) => Promise<any>} sorgu
 * @param {(mesaj: string) => void} [log]
 * @returns {Promise<string[]>} bu çağırışda tətbiq olunanların adları
 */
export async function miqrasiyalariTetbiqEt(sorgu, log = () => {}) {
  const olanlar = new Map((await tetbiqOlunanlar(sorgu)).map((s) => [s.ad, s.mezmun_hash]));
  const yeniler = [];

  for (const ad of miqrasiyaFayllari()) {
    const metn = readFileSync(join(qovluq(), ad), "utf-8");
    const hash = mezmunHash(metn);

    if (olanlar.has(ad)) {
      const kohneHash = olanlar.get(ad);
      if (kohneHash == null) {
        // Legacy qeyd (hash-dan əvvəl tətbiq olunub) — bir dəfə mənimsənilir
        await sorgu(`UPDATE ${MIQRASIYA_CEDVELI} SET mezmun_hash=$2 WHERE ad=$1`, [ad, hash]);
      } else if (kohneHash !== hash) {
        throw new Error(
          `Miqrasiya faylı dəyişib: ${ad} artıq tətbiq olunub, amma diskdəki məzmun ` +
            `fərqlidir. Tətbiq olunmuş fayl dondurulmuş sənəddir — düzəlişi yeni ` +
            `nömrəli faylla edin.`,
        );
      }
      continue;
    }

    const emrler = emrlereBol(metn);
    log(`→ ${ad} (${emrler.length} əmr)`);
    for (const emr of emrler) {
      try {
        await sorgu(emr, []);
      } catch (xeta) {
        // Səssiz davam YOXDUR: hansı fayl, hansı əmr — dərhal görünsün.
        // Qeyd yazılmır: növbəti icra faylı başdan təkrar işlədəcək
        // (əmrlər idempotentdir — yuxarıdakı məcburi qayda).
        xeta.message = `Miqrasiya uğursuz (${ad}): ${xeta.message}\n${emr.slice(0, 200)}`;
        throw xeta;
      }
    }
    await sorgu(`INSERT INTO ${MIQRASIYA_CEDVELI} (ad, mezmun_hash) VALUES ($1, $2)`, [ad, hash]);
    yeniler.push(ad);
  }

  return yeniler;
}
