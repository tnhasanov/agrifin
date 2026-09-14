import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { BERDE, SAHE, sebekeniQur, temizAcilis, veziyyetEk } from "./kome.js";
import { BAZAR_FERMERI, bazarServeri } from "./bazarKome.js";

/**
 * BÜTÜN ƏSAS EKRANLARIN GÖRÜNTÜSÜ — dizayn baxışı üçün, yoxlama üçün deyil.
 *
 *   npm run build && TAM_SHOTS=./shots npx playwright test e2e/tam.shots.spec.js --project=390x844
 *
 * Onboarding (4 addım) + sahəli fermerin beş tabı + zəng paneli + bazar.
 * Server 501 qaytarır (kome.js), yəni ekranlar "qurulmayıb" halındadır —
 * tipoqrafiya, boşluq və xrom məhz bu halda ən dürüst görünür. Şriftlər
 * paketdən gəldiyi üçün görüntü prod ilə eynidir. CI-da atlanır.
 */
const QOVLUQ = process.env.TAM_SHOTS;
test.skip(!QOVLUQ, "TAM_SHOTS yoxdur");

test("onboarding ekranları", async ({ page }, ti) => {
  test.setTimeout(120_000);
  mkdirSync(QOVLUQ, { recursive: true });
  const cek = (ad) => page.screenshot({ path: `${QOVLUQ}/${ti.project.name}-${ad}.png`, fullPage: true });
  await sebekeniQur(page);
  await temizAcilis(page);
  await page.goto("/");
  await page.waitForTimeout(600);
  await cek("00-welcome");
  await page.getByRole("button", { name: "Başlayaq" }).click();
  await page.waitForTimeout(500);
  await cek("01-rayon");
  await page.getByRole("button", { name: "İndi yox" }).click();
  await page.waitForTimeout(500);
  await cek("02-bitki");
  await page.getByRole("button", { name: "Hələ qərar verməmişəm" }).click();
  await page.waitForTimeout(500);
  await cek("03-sahe");
});

test("əsas ekranlar (sahəli fermer)", async ({ page }, ti) => {
  test.setTimeout(180_000);
  mkdirSync(QOVLUQ, { recursive: true });
  const cek = (ad) => page.screenshot({ path: `${QOVLUQ}/${ti.project.name}-${ad}.png`, fullPage: true });
  const sakit = () => page.waitForTimeout(600);
  await sebekeniQur(page);
  await veziyyetEk(page, BAZAR_FERMERI(BERDE, SAHE));
  await bazarServeri().qur(page);

  await page.goto("/");
  await sakit();
  await cek("10-ev");

  const nav = page.getByRole("navigation");
  await nav.getByRole("button", { name: "Sahələr" }).click();
  await sakit();
  await cek("11-saheler");

  await nav.getByRole("button", { name: "Maliyyə" }).click();
  await sakit();
  await cek("12-maliyye");

  await nav.getByRole("button", { name: "Kömək" }).click();
  await sakit();
  await cek("13-komek");

  await nav.getByRole("button", { name: "Ana səhifə" }).click();
  await sakit();
  const zeng = page.getByRole("button", { name: /bildiriş/i }).first();
  if (await zeng.isVisible().catch(() => false)) {
    await zeng.click();
    await sakit();
    await cek("14-zeng-paneli");
    await page.keyboard.press("Escape");
  }

  await page.goto("/bazar");
  await sakit();
  await cek("20-bazar-ev");
  await page.goto("/bazar/mehsul/karbamid-46-50kq");
  await sakit();
  await cek("21-bazar-mehsul");
});
