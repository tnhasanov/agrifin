import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * STATİK QORUYUCU — bütün endpoint-lər üçün.
 *
 * Copernicus Statistical API-də resx/resy sorğunun KOORDİNAT SİSTEMİNİN
 * vahidindədir. Biz hər yerdə EPSG:4326 göndəririk — orada vahid DƏRƏCƏdir.
 * `resx: 60` yazmaq "60 dərəcə piksel" deməkdir; 10 km-lik kvadrat bir
 * piksele yığılır və xidmət 400 qaytarır:
 *
 *   "Your request of 9991.58 meters per pixel exceeds the limit 1500.00
 *    meters per pixel of the collection S2L2A"
 *
 * Bu, istehsalda ətraf müqayisəsini TAMAMİLƏ söndürmüşdü və aylarla
 * görünmədi, çünki sahə sorğuları eyni səhvlə "uğurlu" qalırdı (kiçik
 * kontur bir piksele yığılanda hədd aşılmır).
 *
 * Bir endpoint-i düzəltmək kifayət deyil: səhv beş yerdə eyni idi və yeni
 * endpoint yazan adam onu təkrarlaya bilər. Ona görə yoxlama MƏTN
 * səviyyəsindədir — hər yeni api/ faylını avtomatik əhatə edir.
 */

const API_QOVLUGU = dirname(fileURLToPath(import.meta.url));

/** resx: 60 → tutulur; resx: olcu.resx → tutulmur */
const RESM_METR = /res[xy]\s*:\s*(\d+(?:\.\d+)?)/g;

// EPSG:4326-da real addım ~0.0001–0.001 dərəcədir. 0.01-dən böyük hər şey
// demək olar ki, metr yazılmasıdır.
const MAX_DERECE_ADDIM = 0.01;

function apiFayllari() {
  return readdirSync(API_QOVLUGU)
    .filter((ad) => ad.endsWith(".js") && !ad.endsWith(".test.js"))
    .map((ad) => [ad, readFileSync(join(API_QOVLUGU, ad), "utf-8")]);
}

describe("Copernicus sorğularının ölçüsü", () => {
  it("heç bir endpoint resx/resy-ə metr yazmır", () => {
    const pozanlar = [];

    for (const [ad, metn] of apiFayllari()) {
      // Şərh sətirləri sayılmır — sənəddə "resx: 60" nümunə kimi keçir
      const kod = metn
        .split("\n")
        .filter((setir) => {
          const t = setir.trim();
          return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
        })
        .join("\n");

      for (const uygunluq of kod.matchAll(RESM_METR)) {
        const deyer = Number(uygunluq[1]);
        if (deyer > MAX_DERECE_ADDIM) pozanlar.push(`${ad}: ${uygunluq[0]}`);
      }
    }

    expect(pozanlar, "resx/resy DƏRƏCƏ olmalıdır — bax: lib/geoJson.js, olcuDereceye").toEqual([]);
  });

  // Yoxlamanın özü işləyirmi: səhvi tutmasa yaşıl testin dəyəri yoxdur
  it("qoruyucu həqiqətən metr yazılışını tutur", () => {
    const nümunə = "aggregation: { resx: 60, resy: 60 }";
    const tapilanlar = [...nümunə.matchAll(RESM_METR)].map((u) => Number(u[1]));
    expect(tapilanlar).toEqual([60, 60]);
    expect(tapilanlar.every((d) => d > MAX_DERECE_ADDIM)).toBe(true);
  });

  it("düzgün yazılışı səhvən tutmur", () => {
    const duzgun = "aggregation: { resx: olcu.resx, resy: olcu.resy }";
    expect([...duzgun.matchAll(RESM_METR)]).toEqual([]);
  });

  it("bütün api fayllarını oxuyur", () => {
    const adlar = apiFayllari().map(([ad]) => ad);
    // Peyk sorğusu olan endpoint-lərin hamısı siyahıda olmalıdır
    for (const ad of ["qonsu.js", "tarixce.js", "ndvi.js", "radar.js", "zona.js"]) {
      expect(adlar).toContain(ad);
    }
  });
});
