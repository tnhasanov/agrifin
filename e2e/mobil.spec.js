import { expect, test } from "@playwright/test";
import { sebekeniQur, temizAcilis } from "./kome.js";

/**
 * MOBİL SAĞLAMLIQ — ölçü, klaviatura, zoom, hərəkət.
 *
 * Bu testlər dizaynı yox, POZULMA hallarını yoxlayır: üfüqi sürüşmə,
 * ekrandan çıxan düymə, 200% mətn zoomunda oxunmayan başlıq, azaldılmış
 * hərəkət rejimində gizli qalan element.
 */

const ADDIMLAR = [
  { ad: "xoş gəldiniz", hazirla: async () => {} },
  {
    ad: "rayon",
    hazirla: async (page) => page.getByRole("button", { name: "Başlayaq" }).click(),
  },
  {
    ad: "bitki",
    hazirla: async (page) => {
      await page.getByRole("button", { name: "Başlayaq" }).click();
      await page.getByRole("button", { name: "İndi yox" }).click();
    },
  },
  {
    ad: "sahə",
    hazirla: async (page) => {
      await page.getByRole("button", { name: "Başlayaq" }).click();
      await page.getByRole("button", { name: "İndi yox" }).click();
      await page.getByRole("button", { name: "Hələ qərar verməmişəm" }).click();
    },
  },
];

test.beforeEach(async ({ page }) => {
  await sebekeniQur(page);
  await temizAcilis(page);
});

for (const { ad, hazirla } of ADDIMLAR) {
  test(`«${ad}» addımında ÜFÜQİ sürüşmə yoxdur`, async ({ page }) => {
    await page.goto("/");
    await hazirla(page);

    const dasir = await page.evaluate(() => {
      const kok = document.scrollingElement;
      // 1 piksellik yuvarlaqlaşma fərqi sürüşmə deyil
      return kok.scrollWidth - kok.clientWidth > 1;
    });
    expect(dasir).toBe(false);
  });

  test(`«${ad}» addımında əsas hərəkət EKRANDA görünür`, async ({ page }) => {
    await page.goto("/");
    await hazirla(page);

    // Hər ekranda bir dolu CTA var və o, sürüşdürmədən görünür
    const cta = page.locator("footer button, [role=dialog] > div:last-child button").first();
    await expect(cta.first()).toBeInViewport();
  });
}

test("200% mətn zoomunda başlıq və CTA görünür", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Başlayaq" }).click();
  // Brauzer mətn zoomunun sadə qarşılığı: kök şrift ölçüsünü ikiqat etmək
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });

  await expect(page.getByRole("heading", { name: "Sahəniz hansı rayondadır?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Cari yerimi istifadə et/ })).toBeVisible();

  const dasir = await page.evaluate(() => {
    const kok = document.scrollingElement;
    return kok.scrollWidth - kok.clientWidth > 1;
  });
  expect(dasir).toBe(false);
});

test("toxunma hədəfləri ən azı 44 pikseldir", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Başlayaq" }).click();

  const kicikler = await page.evaluate(() => {
    const pis = [];
    for (const d of document.querySelectorAll("button")) {
      const r = d.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue; // gizli
      if (r.height < 44 || r.width < 44) pis.push(`${d.textContent.trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return pis;
  });
  expect(kicikler).toEqual([]);
});

test("azaldılmış hərəkət rejimində axın tam işləyir", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await page.getByRole("button", { name: "Başlayaq" }).click();
  await page.getByRole("button", { name: /Rayon seçin və ya axtarın/ }).click();
  const vereq = page.getByRole("dialog", { name: "Rayon seçin" });
  await expect(vereq).toBeVisible();
  await vereq.getByRole("button", { name: "Bərdə", exact: true }).click();
  await expect(vereq).toBeHidden();
  await expect(page.getByRole("button", { name: "Davam et" })).toBeEnabled();
});

test("vərəq ekranın 70–85%-ni tutur", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Başlayaq" }).click();
  await page.getByRole("button", { name: /Rayon seçin və ya axtarın/ }).click();

  const vereq = page.getByRole("dialog", { name: "Rayon seçin" });
  const qutu = await vereq.boundingBox();
  const cerceve = await page.locator(".az-frame").boundingBox();
  const nisbet = qutu.height / cerceve.height;
  expect(nisbet).toBeGreaterThan(0.68);
  expect(nisbet).toBeLessThan(0.87);
});

test("safe-area dəyişənləri tətbiq olunur — ətək jest zolağının altında qalmır", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Başlayaq" }).click();

  const etek = page.locator("footer");
  const doldurma = await etek.evaluate((el) => getComputedStyle(el).paddingBottom);
  // env() dəstəklənməyəndə 12px-lik ehtiyat qalır — sıfır olmamalıdır
  expect(parseFloat(doldurma)).toBeGreaterThanOrEqual(12);
});
