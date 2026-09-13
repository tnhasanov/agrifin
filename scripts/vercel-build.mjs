#!/usr/bin/env node
/**
 * Vercel deployment qapısı.
 *
 * PREVIEW: Neon inteqrasiyası hər git branch üçün ayrıca baza yaradır. Təzə
 * bazada cədvəl olmadan tətbiqi READY etmək əvəzinə miqrasiyaları build
 * vaxtında həmin preview bazasına tətbiq edib read-only yoxlamadan keçiririk.
 *
 * PRODUCTION: build heç vaxt prod sxemini dəyişmir. Manual miqrasiya əvvəl
 * işləməyibsə read-only yoxlama build-i dayandırır; yarımçıq tətbiq READY
 * olmur. Lokal/CI `npm run build` bu qapıdan asılı deyil.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { build } from "vite";
import { sorgu, baglantiAcari, baglantiKimliyi, dbQurulub } from "../lib/db.js";
import { miqrasiyalariTetbiqEt } from "../lib/miqrasiya.js";

const qovluq = dirname(fileURLToPath(import.meta.url));

/** Baza yoxdursa nə edəcəyini deyən mesaj — build logunda tək baxışda oxunur */
function bazaYoxdurMesaji(neUcun) {
  return [
    `${neUcun} bazası qoşulmayıb — gözlənilən açarlardan heç biri yoxdur.`,
    "Neon inteqrasiyası bu mühit üçün aktiv deyil.",
    "Həll: Vercel → Project → Storage (və ya Integrations) → Neon →",
    `«${neUcun}» mühitini işarələ, sonra bu deployment-i Redeploy et.`,
    "Neon hər git branch üçün ayrıca baza yaradır və DATABASE_URL-i özü qoyur;",
    "miqrasiyalar həmin bazaya build zamanı tətbiq olunur.",
  ].join("\n  ");
}

async function qapi() {
  /**
   * MÜHİTİ SƏHV OXUMAQ SÜKUTLA KEÇMƏMƏLİDİR.
   *
   * `VERCEL_ENV ?? "local"` tək başına təhlükəlidir: Vercel-də "System
   * Environment Variables" söndürülübsə VERCEL_ENV gəlmir, qapı isə özünü
   * "lokal" sayıb HEÇ NƏ yoxlamır — nəticədə miqrasiyasız preview səssizcə
   * READY olur. Vercel-də olduğumuzu VERCEL dəyişəni deyir; o var, VERCEL_ENV
   * yoxdursa bu, quraşdırma xətasıdır və açıq deyilir.
   */
  if (process.env.VERCEL && !process.env.VERCEL_ENV) {
    throw new Error(
      "VERCEL_ENV yoxdur — Vercel → Settings → Environment Variables → " +
        "«Automatically expose System Environment Variables» aktiv edilməlidir. " +
        "Onsuz build baza qapısını atlayır və miqrasiyasız deployment READY olur.",
    );
  }

  const muhit = process.env.VERCEL_ENV ?? "local";

  if (muhit === "preview") {
    if (!dbQurulub()) throw new Error(bazaYoxdurMesaji("Preview"));
    // Hansı açar və hansı baza — parol/istifadəçi adı YOX (bax: lib/db.js).
    // "Miqrasiyanı işlətdim, amma xəta qalır" halının səbəbi adətən budur.
    console.log(`Preview bazası: ${baglantiAcari()} → ${baglantiKimliyi()}`);
    // SESSION_SECRET build-i DAYANDIRMIR: onsuz da tətbiq açılır, sadəcə
    // /api/* 501 qaytarır və ekranlar "bu quraşdırmada qurulmayıb" deyir.
    // Amma bunu heç yerdə görünməz qoymaq olmaz — README-ni deploy anında
    // kimsə oxumur, build logunu isə oxuyur.
    if (!process.env.SESSION_SECRET) {
      console.warn(
        "XƏBƏRDARLIQ: SESSION_SECRET bu mühitdə yoxdur — /api/* 501 qaytaracaq " +
          "(giriş, kredit və bazar sifarişi işləməyəcək). Vercel → Settings → " +
          "Environment Variables → SESSION_SECRET (openssl rand -hex 32), Preview işarəli.",
      );
    }
    console.log("Miqrasiyalar tətbiq edilir…");
    const yeniler = await miqrasiyalariTetbiqEt(sorgu, (mesaj) => console.log(mesaj));
    console.log(yeniler.length ? `${yeniler.length} preview miqrasiyası tətbiq olundu.` : "Preview sxemi yenidir.");
  }

  if (muhit === "preview" || muhit === "production") {
    if (!dbQurulub()) throw new Error(bazaYoxdurMesaji(muhit === "production" ? "Production" : "Preview"));
    const yoxlama = spawnSync(process.execPath, [join(qovluq, "miqrasiya-yoxla.mjs")], {
      cwd: join(qovluq, ".."),
      env: process.env,
      stdio: "inherit",
    });
    // Uşaq proses ümumiyyətlə başlamayıbsa (spawn xətası) və ya siqnalla
    // öldürülübsə `status` null olur — bunu "yoxlama keçmədi" kimi ümumiləşdirmək
    // əsl səbəbi gizlədir
    if (yoxlama.error) throw yoxlama.error;
    if (yoxlama.status !== 0) {
      const sebeb = yoxlama.signal ? `siqnal=${yoxlama.signal}` : `status=${yoxlama.status}`;
      throw new Error(
        `Database readiness yoxlaması keçmədi (${muhit}, ${sebeb}).\n  ` +
          (muhit === "production"
            ? "Prod sxemi build ilə DƏYİŞMİR: əvvəlcə miqrasiyanı işlədin " +
              "(git push origin <branch>:miqrasiya-run), sonra deploy edin."
            : "Yuxarıdakı ✗ sətirlərinə baxın."),
      );
    }
  }

  await build();
}

// ═══ XƏTA BUILD LOGUNUN SONUNDA OXUNAQLI QALIR ═══════════════════════
// Modul gövdəsindən atılan xəta Node-da "unhandled rejection" kimi çıxır:
// mesajın ətrafına mənbə sətri, tam stack və `Node.js v22.x` altlığı düşür,
// diqqətlə yazılmış həll təlimatı isə səs-küydə itir. Qapının xətaları
// ƏMƏLİYYAT təlimatıdır, proqram qüsuru deyil — ona görə yalnız mətn
// göstərilir. Çıxış kodu eynidir (1), davranış dəyişmir.
try {
  await qapi();
} catch (xeta) {
  console.error(`\n✗ Deployment qapısı dayandırdı:\n  ${xeta?.message ?? xeta}\n`);
  process.exit(1);
}
