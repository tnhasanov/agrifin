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
import { sorgu, dbQurulub } from "../lib/db.js";
import { miqrasiyalariTetbiqEt } from "../lib/miqrasiya.js";

const qovluq = dirname(fileURLToPath(import.meta.url));
const muhit = process.env.VERCEL_ENV ?? "local";

if (muhit === "preview") {
  if (!dbQurulub()) {
    throw new Error("Preview bazası qoşulmayıb — DATABASE_URL/POSTGRES_URL tapılmadı.");
  }
  console.log("Preview bazası: miqrasiyalar tətbiq edilir…");
  const yeniler = await miqrasiyalariTetbiqEt(sorgu, (mesaj) => console.log(mesaj));
  console.log(yeniler.length ? `${yeniler.length} preview miqrasiyası tətbiq olundu.` : "Preview sxemi yenidir.");
}

if (muhit === "preview" || muhit === "production") {
  if (!dbQurulub()) {
    throw new Error(`${muhit} bazası qoşulmayıb — deployment dayandırıldı.`);
  }
  const yoxlama = spawnSync(process.execPath, [join(qovluq, "miqrasiya-yoxla.mjs")], {
    cwd: join(qovluq, ".."),
    env: process.env,
    stdio: "inherit",
  });
  if (yoxlama.status !== 0) {
    throw new Error(`Database readiness yoxlaması keçmədi (${muhit}).`);
  }
}

await build();
