import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { BERDE, SAHE, sebekeniQur, temizAcilis, veziyyetEk } from "./kome.js";
import { BAZAR_FERMERI, bazarServeri } from "./bazarKome.js";
import { kreditServeri } from "./kreditKome.js";

/**
 * EKRAN MATRİSİ — vizual QA üçün, yoxlama üçün deyil.
 *
 *   npm run build && MATRIS=./shots npx playwright test e2e/matris.shots.spec.js
 *
 * Üç en (360/390/430, playwright.config.js layihələri) × on dörd ssenari:
 * onboarding, sahəsiz/sahəli ana səhifə, yüklənmə/xəta, kredit təklifi,
 * aktiv kredit, gecikmiş kredit, kredit müraciəti (vərəq), bazar, məhsul,
 * səbət, checkout, uğurlu sifariş. Hər görüntü fayl adında en daşıyır.
 *
 * Kredit halları e2e/kreditKome.js ilə təqlid olunur — server formasında.
 * CI-da atlanır (MATRIS yoxdur).
 */
const QOVLUQ = process.env.MATRIS;
test.skip(!QOVLUQ, "MATRIS qovluğu verilməyib");

const sahesiz = () => ({ ...BAZAR_FERMERI(BERDE, SAHE), sahe: null, chat: { messages: [], crop: null, referral: false } });

function cekici(page, ti) {
  mkdirSync(QOVLUQ, { recursive: true });
  return async (ad) => {
    await page.waitForTimeout(650);
    await page.screenshot({ path: `${QOVLUQ}/${ti.project.name}-${ad}.png`, fullPage: false });
  };
}

test("onboarding", async ({ page }, ti) => {
  const cek = cekici(page, ti);
  await sebekeniQur(page);
  await temizAcilis(page);
  await page.goto("/");
  await cek("01-onboarding");
});

test("ana səhifə — sahəsiz", async ({ page }, ti) => {
  const cek = cekici(page, ti);
  await sebekeniQur(page);
  await veziyyetEk(page, sahesiz());
  await kreditServeri(page, "bos");
  await page.goto("/");
  await cek("02-ev-sahesiz");
});

test("ana səhifə — sahəli", async ({ page }, ti) => {
  const cek = cekici(page, ti);
  await sebekeniQur(page);
  await veziyyetEk(page, BAZAR_FERMERI(BERDE, SAHE));
  await kreditServeri(page, "bos");
  await page.goto("/");
  await cek("03-ev-saheli");
});

for (const [ad, hal] of [
  ["04-maliyye-yuklenir", "yuklenir"],
  ["05-maliyye-xeta", "xeta"],
  ["06-maliyye-teklif", "teklif"],
  ["07-maliyye-aktiv", "aktiv"],
  ["08-maliyye-gecikmis", "gecikmis"],
]) {
  test(`maliyyə — ${hal}`, async ({ page }, ti) => {
    const cek = cekici(page, ti);
    await sebekeniQur(page);
    await veziyyetEk(page, BAZAR_FERMERI(BERDE, SAHE));
    await kreditServeri(page, hal);
    await page.goto("/money");
    await cek(ad);
  });
}

test("kredit müraciəti (vərəq)", async ({ page }, ti) => {
  const cek = cekici(page, ti);
  await sebekeniQur(page);
  await veziyyetEk(page, BAZAR_FERMERI(BERDE, SAHE));
  await kreditServeri(page, "bos");
  await page.goto("/money");
  await page.getByRole("button", { name: /Təklifi yoxla/ }).first().click();
  await page.getByRole("dialog").waitFor();
  await cek("09-kredit-muraciet");
});

test("bazar → məhsul → səbət → checkout → uğur", async ({ page }, ti) => {
  test.setTimeout(120_000);
  const cek = cekici(page, ti);
  await sebekeniQur(page);
  await veziyyetEk(page, BAZAR_FERMERI(BERDE, SAHE));
  await kreditServeri(page, "bos");
  await bazarServeri().qur(page);

  await page.goto("/bazar");
  await cek("10-bazar");

  await page.goto("/bazar/mehsul/karbamid-46-50kq");
  await cek("11-mehsul");

  await page.getByRole("textbox", { name: "Miqdar" }).fill("20");
  await page.getByRole("textbox", { name: "Miqdar" }).press("Enter");
  await page.getByRole("button", { name: "Səbətə əlavə et", exact: true }).click();
  await page.goto("/bazar/sebet");
  await cek("12-sebet");

  await page.getByRole("button", { name: "Sifarişi tamamla" }).click();
  await page.getByLabel("Alıcının adı").fill("Tural Həsənov");
  await cek("13-checkout");

  await page.getByRole("button", { name: "Davam et" }).click();
  await page.getByText("Yekun server tərəfindən hesablanıb").waitFor();
  await cek("14-checkout-tesdiq");
  await page.getByRole("button", { name: "Sifarişi təsdiqlə" }).click();
  await page.getByRole("heading", { name: "Sifarişiniz qəbul edildi" }).waitFor();
  await cek("15-ugur");
});
