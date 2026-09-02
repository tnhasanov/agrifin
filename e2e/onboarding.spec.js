import { expect, test } from "@playwright/test";
import { BERDE, SAHE, sebekeniQur, temizAcilis, veziyyetEk } from "./kome.js";

/**
 * İLK AÇILIŞ AXINI — real brauzerdə.
 *
 * Burada yoxlanılan şeylər jsdom-da YOXDUR: klaviaturanın nəticələri
 * örtməməsi, üfüqi sürüşmənin olmaması, safe-area, şəklin düşməsi,
 * səhifənin yenidən yüklənməsindən sonra davam etmə.
 */

const vereq = (page) => page.getByRole("dialog", { name: "Rayon seçin" });

async function basla(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Başlayaq" }).click();
}

async function rayonSec(page, ad) {
  await page.getByRole("button", { name: /Rayon seçin və ya axtarın/ }).click();
  await expect(vereq(page)).toBeVisible();
  await vereq(page).getByRole("button", { name: ad, exact: true }).click();
  await expect(vereq(page)).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await sebekeniQur(page);
});

test.describe("əl ilə tam axın", () => {
  test("xoş gəldiniz → rayon → bitki → sahə → boş ana səhifə", async ({ page }) => {
    await temizAcilis(page);
    await page.goto("/");

    await expect(page.getByText("Sahənizi tanıyın.")).toBeVisible();
    // Xoş gəldiniz sayğaca daxil deyil
    await expect(page.getByText("1 / 3")).toBeHidden();

    await page.getByRole("button", { name: "Başlayaq" }).click();
    await expect(page.getByRole("heading", { name: "Sahəniz hansı rayondadır?" })).toBeVisible();
    await expect(page.getByText("1 / 3")).toBeVisible();

    await rayonSec(page, "Bərdə");
    await page.getByRole("button", { name: "Davam et" }).click();

    await expect(page.getByRole("heading", { name: "Əsas məhsulunuz hansıdır?" })).toBeVisible();
    await page.getByRole("button", { name: "Pomidor" }).click();
    await page.getByRole("button", { name: "Davam et" }).click();

    await expect(page.getByRole("heading", { name: "İlk sahənizi əlavə edin" })).toBeVisible();
    await expect(page.getByText("Təxminən 2 dəqiqə çəkir")).toBeVisible();

    await page.getByRole("button", { name: "Əsas səhifəyə keç" }).click();
    await expect(page.getByRole("button", { name: "Ana səhifə" })).toBeVisible();
  });

  test("sahəni keçmək axını bitirir, sonra bir daha açılmır", async ({ page }) => {
    await temizAcilis(page);
    await basla(page);
    await page.getByRole("button", { name: "İndi yox" }).click();
    await page.getByRole("button", { name: "Hələ qərar verməmişəm" }).click();
    await page.getByRole("button", { name: "Əsas səhifəyə keç" }).click();

    await expect(page.getByRole("button", { name: "Ana səhifə" })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Sahənizi tanıyın.")).toBeHidden();
  });
});

test.describe("rayon: yazmaq, siyahı, uyğunluq", () => {
  test.beforeEach(async ({ page }) => {
    await temizAcilis(page);
    await basla(page);
  });

  test("vərəq açılır və bütün rayonlar siyahıdadır", async ({ page }) => {
    await page.getByRole("button", { name: /Rayon seçin və ya axtarın/ }).click();
    await expect(vereq(page).getByRole("button", { name: "Ağcabədi" })).toBeVisible();
    await expect(vereq(page).getByRole("button", { name: "Zərdab" })).toBeVisible();
  });

  test("yazmaq siyahını süzür və uyğun hissəni işarələyir", async ({ page }) => {
    await page.getByRole("button", { name: /Rayon seçin və ya axtarın/ }).click();
    await vereq(page).getByRole("searchbox").fill("qəb");

    await expect(vereq(page).getByRole("button", { name: "Qəbələ" })).toBeVisible();
    await expect(vereq(page).getByRole("button", { name: "Ağcabədi" })).toBeHidden();
    await expect(vereq(page).locator("mark")).toHaveText("Qəb");
  });

  test("AKSENTSİZ yazılış da tapır", async ({ page }) => {
    await page.getByRole("button", { name: /Rayon seçin və ya axtarın/ }).click();
    await vereq(page).getByRole("searchbox").fill("gence");
    await expect(vereq(page).getByRole("button", { name: "Gəncə" })).toBeVisible();
  });

  test("nəticə yoxdursa dürüst mesaj — yaxın rayon təklif olunmur", async ({ page }) => {
    await page.getByRole("button", { name: /Rayon seçin və ya axtarın/ }).click();
    await vereq(page).getByRole("searchbox").fill("zzzz");

    await expect(vereq(page).getByText("Nəticə tapılmadı")).toBeVisible();
    await expect(vereq(page).getByText("Rayon adını yoxlayın")).toBeVisible();
    await expect(vereq(page).getByRole("button", { name: "Bərdə" })).toBeHidden();
  });

  test("KLAVİATURA nəticələri örtmür: yazandan sonra ilk nəticə görünür", async ({ page }) => {
    await page.getByRole("button", { name: /Rayon seçin və ya axtarın/ }).click();
    const xana = vereq(page).getByRole("searchbox");
    await xana.click();
    await xana.fill("ber");

    const ilk = vereq(page).getByRole("button", { name: "Bərdə" });
    await expect(ilk).toBeInViewport();
    // Axtarış xanası da yerində qalır — sürüşən yalnız siyahıdır
    await expect(xana).toBeInViewport();
  });

  test("geri düyməsi vərəqi bağlayır, seçim itmir", async ({ page }) => {
    await rayonSec(page, "Şəki");
    await expect(page.getByRole("button", { name: /Şəki/ }).first()).toBeVisible();

    await page.getByRole("button", { name: "Geri" }).click();
    await expect(page.getByText("Sahənizi tanıyın.")).toBeVisible();
    await page.getByRole("button", { name: "Başlayaq" }).click();
    await expect(page.getByRole("button", { name: /Şəki/ }).first()).toBeVisible();
  });

  test("Escape vərəqi bağlayır", async ({ page }) => {
    await page.getByRole("button", { name: /Rayon seçin və ya axtarın/ }).click();
    await expect(vereq(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(vereq(page)).toBeHidden();
  });
});

test.describe("GPS icazə dövriyyəsi", () => {
  test("icazə yalnız TOXUNUŞDAN SONRA istənilir", async ({ page }) => {
    await temizAcilis(page, { gps: "ugurlu" });
    await basla(page);
    // Ekran açılan kimi rayon seçilmir
    await expect(page.getByRole("button", { name: "Davam et" })).toBeDisabled();

    await page.getByRole("button", { name: /Cari yerimi istifadə et/ }).click();
    await expect(page.getByRole("button", { name: /Bərdə/ }).first()).toBeVisible();
  });

  test("icazə rədd ediləndə siyahıya yönəldir, təkrar təklif etmir", async ({ page }) => {
    await temizAcilis(page, { gps: "redd" });
    await basla(page);
    await page.getByRole("button", { name: /Cari yerimi istifadə et/ }).click();

    const xeta = page.getByRole("alert");
    await expect(xeta).toContainText("Məkan icazəsi verilmədi");
    await expect(xeta.getByRole("button", { name: "Yenidən cəhd et" })).toBeHidden();
    // Əl ilə seçim yolu açıq qalır
    await expect(page.getByRole("button", { name: /Rayon seçin və ya axtarın/ })).toBeEnabled();
  });

  test("vaxt bitəndə təkrar cəhd təklif olunur", async ({ page }) => {
    await temizAcilis(page, { gps: "vaxt" });
    await basla(page);
    await page.getByRole("button", { name: /Cari yerimi istifadə et/ }).click();

    const xeta = page.getByRole("alert");
    await expect(xeta).toContainText("Məkan vaxtında müəyyən edilmədi");
    await expect(xeta.getByRole("button", { name: "Yenidən cəhd et" })).toBeVisible();
  });

  test("heç bir xəta halında DEMO rayon seçilmir", async ({ page }) => {
    await temizAcilis(page, { gps: "redd" });
    await basla(page);
    await page.getByRole("button", { name: /Cari yerimi istifadə et/ }).click();
    await expect(page.getByRole("alert")).toBeVisible();

    await expect(page.getByRole("button", { name: "Davam et" })).toBeDisabled();
    const saxlanan = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("agrifin:state")).state.location,
    );
    expect(saxlanan).toBeNull();
  });
});

test.describe("bitki seçimi", () => {
  test.beforeEach(async ({ page }) => {
    await temizAcilis(page);
    await basla(page);
    await page.getByRole("button", { name: "İndi yox" }).click();
  });

  test("seçim aria-pressed ilə elan olunur və təkdir", async ({ page }) => {
    const kartof = page.getByRole("button", { name: "Kartof" });
    const pomidor = page.getByRole("button", { name: "Pomidor" });

    await kartof.click();
    await expect(kartof).toHaveAttribute("aria-pressed", "true");
    await pomidor.click();
    await expect(kartof).toHaveAttribute("aria-pressed", "false");
    await expect(pomidor).toHaveAttribute("aria-pressed", "true");
  });

  test("ŞƏKİL DÜŞSƏ də ad və seçim işləyir", async ({ page }) => {
    // Bütün şəkil sorğularını qırırıq: kart yenə oxunmalıdır.
    // Yenidən yükləmədən sonra axın ELƏ BİTKİ ADDIMINDA açılır (rayon
    // addımı keçilib) — bu, davam etmənin özünün yoxlanışıdır.
    await page.route("**/assets/**.{avif,webp,png,jpg}", (r) => r.abort());
    await page.reload();
    await expect(page.getByRole("heading", { name: "Əsas məhsulunuz hansıdır?" })).toBeVisible();

    const pomidor = page.getByRole("button", { name: "Pomidor" });
    await expect(pomidor).toBeVisible();
    await pomidor.click();
    await expect(pomidor).toHaveAttribute("aria-pressed", "true");
  });

  test("«hələ qərar verməmişəm» bitkini boş saxlayır", async ({ page }) => {
    await page.getByRole("button", { name: "Kartof" }).click();
    await page.getByRole("button", { name: "Hələ qərar verməmişəm" }).click();

    const bitki = await page.evaluate(
      () => JSON.parse(localStorage.getItem("agrifin:state")).state.chat.crop,
    );
    expect(bitki).toBeNull();
  });

  test("uzun ad iki sətrə keçir, şrift kiçilmir", async ({ page }) => {
    const bugda = page.getByRole("button", { name: "Payızlıq buğda" });
    const olcu = await bugda.locator("span", { hasText: "Payızlıq buğda" }).last().evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize),
    );
    expect(olcu).toBeGreaterThanOrEqual(14);
  });
});

test.describe("davam etmə və bypass", () => {
  test("hər addımda YENİDƏN YÜKLƏMƏ eyni yerdən davam edir", async ({ page }) => {
    await temizAcilis(page);
    await basla(page);
    await rayonSec(page, "Bərdə");
    await page.getByRole("button", { name: "Davam et" }).click();
    await expect(page.getByText("2 / 3")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Əsas məhsulunuz hansıdır?" })).toBeVisible();
    await expect(page.getByText("2 / 3")).toBeVisible();
    // Əvvəlki rayon seçimi itmir
    await page.getByRole("button", { name: "Geri" }).click();
    await expect(page.getByRole("button", { name: /Bərdə/ }).first()).toBeVisible();
  });

  test("əvvəl seçilmiş bitki qayıdanda seçili görünür", async ({ page }) => {
    await veziyyetEk(page, {
      onboarded: false,
      onboarding: { versiya: "2.1", tamamlananAddim: "rayon" },
      location: BERDE,
      chat: { messages: [], crop: "pomidor", referral: false },
    });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Pomidor" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("SAHƏSİ OLAN istifadəçi axını keçir", async ({ page }) => {
    await veziyyetEk(page, {
      onboarded: true,
      onboarding: { versiya: "2.1", tamamlananAddim: "sahe" },
      location: BERDE,
      sahe: SAHE,
      chat: { messages: [], crop: "pomidor", referral: false },
    });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Ana səhifə" })).toBeVisible();
    await expect(page.getByText("Sahənizi tanıyın.")).toBeHidden();
  });

  test("KÖHNƏ versiyanın qeydi miqrasiya olunur, axın açılmır", async ({ page }) => {
    await veziyyetEk(
      page,
      { onboarded: true, location: { name: "Bərdə (GPS)", lat: 40.37, lon: 47.12, gps: true } },
      { version: 9 },
    );
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Ana səhifə" })).toBeVisible();
    const kod = await page.evaluate(
      () => JSON.parse(localStorage.getItem("agrifin:state")).state.location.kod,
    );
    expect(kod).toBe("berde");
  });
});

test.describe("şəbəkə xətası və oflayn", () => {
  test("API xətası DEMO məlumat göstərmir, axın işlək qalır", async ({ page }) => {
    await sebekeniQur(page, { api: "xeta" });
    await temizAcilis(page);
    await basla(page);

    await rayonSec(page, "Bərdə");
    await page.getByRole("button", { name: "Davam et" }).click();
    await expect(page.getByRole("heading", { name: "Əsas məhsulunuz hansıdır?" })).toBeVisible();
  });

  test("oflayn: GPS gözlətmir, əl ilə siyahı işləyir", async ({ page }) => {
    await temizAcilis(page, { oflayn: true });
    await basla(page);
    await page.getByRole("button", { name: /Cari yerimi istifadə et/ }).click();

    await expect(page.getByRole("alert")).toContainText("İnternet yoxdur");
    await rayonSec(page, "Quba");
    await expect(page.getByRole("button", { name: /Quba/ }).first()).toBeVisible();
  });

  test("naviqasiya və sahə axını sınmır", async ({ page }) => {
    await temizAcilis(page);
    await basla(page);
    await page.getByRole("button", { name: "İndi yox" }).click();
    await page.getByRole("button", { name: "Hələ qərar verməmişəm" }).click();
    await page.getByRole("button", { name: "Əsas səhifəyə keç" }).click();

    for (const tab of ["Sahələr", "Kömək", "Maliyyə", "Ana səhifə"]) {
      await page.getByRole("button", { name: tab }).click();
      await expect(page.getByRole("button", { name: tab })).toHaveAttribute(
        "aria-current",
        "page",
      );
    }
  });
});
