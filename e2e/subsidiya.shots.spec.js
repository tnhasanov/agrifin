/**
 * BRİF EKRAN GÖRÜNTÜLƏRİ — subsidiya (3) + FarmScore (3).
 *
 *   npm run build && SUBSIDIYA_SHOTS=./shots npx playwright test e2e/subsidiya.shots.spec.js
 *
 * CI-da atlanır (SUBSIDIYA_SHOTS yoxdur).
 *   1. subsidiya-deqiq        — buğda, müasir suvarma seçilib: tək rəqəm
 *   2. subsidiya-araliq       — qarğıdalı, suvarma bilinmir: 2 real tarif üzrə aralıq
 *   3. subsidiya-uygunluqsuz  — pambıq: məhsul modeli, uyğunluq/şərtlər təsdiqsiz
 *   4. farmscore-ilkin        — 4 mövsüm, v3: tavan "ən çoxu Orta"
 *   5. farmscore-yuksek       — 9 mövsüm güclü, v3: Yüksək, etibar yüksək
 *   6. farmscore-cari-risk    — 9 mövsüm güclü, cari 39% / 55%: risk zolağı
 * FarmScore görüntüləri ?farmscore=v3 bayrağı ilədir (istehsal defoltu v2).
 */
import { test } from "@playwright/test";
import path from "node:path";
import { BERDE, SAHE, sebekeniQur, veziyyetEk } from "./kome.js";
import { BAZAR_FERMERI } from "./bazarKome.js";
import { kreditServeri } from "./kreditKome.js";

const QOVLUQ = process.env.SUBSIDIYA_SHOTS;
test.skip(!QOVLUQ, "SUBSIDIYA_SHOTS qovluğu verilməyib");

const BUGUN = new Date().toISOString().slice(0, 10);

/** Peyk uclarını təqlid edir — sebekeniQur-dan SONRA (son qeydiyyat qalib gəlir) */
async function peykServeri(page, { movsumler, cariNdvi = 0.7, qonsuMedyan = 0.6 }) {
  await page.route("**/api/tarixce**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ movsumler }) }),
  );
  await page.route("**/api/ndvi**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ seriya: [{ baslangic: "2026-07-22", son: BUGUN, ndvi: cariNdvi, nemlik: 0.3, ortulu: 0 }] }),
    }),
  );
  await page.route("**/api/qonsu**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ qonsu: { p25: 0.5, medyan: qonsuMedyan, p75: 0.72, son: BUGUN, piksel: 5000 } }),
    }),
  );
}

const movsumler = (say, ferq, etraf = 0.6) => {
  const sonIl = new Date().getFullYear() - 1;
  return Array.from({ length: say }, (_, i) => ({
    il: sonIl - say + 1 + i,
    zirve: Math.round((etraf + ferq) * 100) / 100,
    zirveAyi: `${sonIl - say + 1 + i}-05`,
    etrafMedyan: etraf,
    olcmeSayi: 6,
  }));
};

async function maliyye(page, { crop, suvarma = null }) {
  // Hərəkət azaldılır: say-artımı və giriş animasiyaları dərhal yekun halı verir
  await page.emulateMedia({ reducedMotion: "reduce" });
  await sebekeniQur(page);
  const veziyyet = BAZAR_FERMERI(BERDE, SAHE);
  veziyyet.chat.crop = crop;
  if (suvarma) veziyyet.sahe.suvarma = suvarma;
  await veziyyetEk(page, veziyyet);
  await kreditServeri(page, "bos");
  await page.goto("/money");
  await page.getByText("Təxmini əkin subsidiyası").scrollIntoViewIfNeeded();
}

test("1 · subsidiya — dəqiq (buğda, müasir)", async ({ page }, ti) => {
  await maliyye(page, { crop: "bugda", suvarma: "muasir" });
  await page.screenshot({ path: path.join(QOVLUQ, `${ti.project.name}-1-subsidiya-deqiq.png`), fullPage: true });
});

test("2 · subsidiya — suvarması bilinməyən aralıq (qarğıdalı, 2 tarif)", async ({ page }, ti) => {
  await maliyye(page, { crop: "qargidali" });
  await page.screenshot({ path: path.join(QOVLUQ, `${ti.project.name}-2-subsidiya-araliq.png`), fullPage: true });
});

test("3 · subsidiya — uyğunluğu təsdiqlənməyən (pambıq, məhsul modeli)", async ({ page }, ti) => {
  await maliyye(page, { crop: "pambiq" });
  await page.screenshot({ path: path.join(QOVLUQ, `${ti.project.name}-3-subsidiya-uygunluqsuz.png`), fullPage: true });
});

async function anaSehife(page, peyk) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await sebekeniQur(page);
  const veziyyet = BAZAR_FERMERI(BERDE, SAHE);
  veziyyet.chat.crop = "bugda";
  await veziyyetEk(page, veziyyet);
  await peykServeri(page, peyk);
  await kreditServeri(page, "bos");
  await page.goto("/?farmscore=v3");
  await page.getByText("FarmScore").first().waitFor();
  await page.getByText("v3 · konservativ").waitFor();
  await page.waitForTimeout(400);
}

test("4 · FarmScore — ilkin (4 mövsüm, tavan Orta)", async ({ page }, ti) => {
  await anaSehife(page, { movsumler: movsumler(4, 0.2), cariNdvi: 0.8, qonsuMedyan: 0.6 });
  await page.getByText("4 mövsüm → ən çoxu Orta").waitFor();
  await page.getByRole("button", { name: /FarmScore/ }).click();
  await page.getByText(/Etibar tavanı:/).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(QOVLUQ, `${ti.project.name}-4-farmscore-ilkin.png`), fullPage: true });
});

test("5 · FarmScore — yüksək etibarlı (9 mövsüm güclü)", async ({ page }, ti) => {
  await anaSehife(page, { movsumler: movsumler(9, 0.2), cariNdvi: 0.8, qonsuMedyan: 0.6 });
  await page.getByText("Etibarlılıq: Yüksək").waitFor();
  await page.screenshot({ path: path.join(QOVLUQ, `${ti.project.name}-5-farmscore-yuksek.png`), fullPage: true });
});

test("6 · FarmScore — cari riskli (9 mövsüm, 39% / 55%)", async ({ page }, ti) => {
  await anaSehife(page, { movsumler: movsumler(9, 0.2), cariNdvi: 0.39, qonsuMedyan: 0.55 });
  await page.getByText(/cari mövsümdə risk/).first().waitFor();
  await page.screenshot({ path: path.join(QOVLUQ, `${ti.project.name}-6-farmscore-cari-risk.png`), fullPage: true });
});
