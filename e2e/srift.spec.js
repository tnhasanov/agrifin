import { expect, test } from "@playwright/test";
import { BERDE, SAHE, sebekeniQur, veziyyetEk } from "./kome.js";
import { BAZAR_FERMERI, bazarServeri } from "./bazarKome.js";

/**
 * ŞRİFT QORUMASI.
 *
 * Bu fayl bir qüsurun təkrarlanmasının qarşısını alır: köhnə başlıq şrifti
 * (Sora) Azərbaycan «Ə/ə» hərfini ÜMUMİYYƏTLƏ daşımırdı, ona görə hər
 * başlıqda həmin hərf cihazın öz şriftinə düşürdü. Gözlə görünürdü, amma
 * heç bir test tutmurdu — çünki testlər o vaxt şrift sorğularını kəsirdi.
 *
 * Ölçü üsulu: eyni hərfi əvvəl brend şrifti ilə, sonra mövcud olmayan
 * şrift adı ilə çəkib enini müqayisə edirik. Hərf şriftdə yoxdursa hər iki
 * halda EYNİ ehtiyat şrift işlənir və enlər üst-üstə düşür.
 */

const AZ_HERFLERI = ["ə", "Ə", "ş", "ğ", "İ", "ı", "ç", "ö", "ü", "₼"];

test.beforeEach(async ({ page }) => {
  await sebekeniQur(page);
  await veziyyetEk(page, BAZAR_FERMERI(BERDE, SAHE));
});

test("brend şriftləri Azərbaycan əlifbasını və manat işarəsini daşıyır", async ({ page }) => {
  await bazarServeri().qur(page);
  await page.goto("/bazar");
  await page.evaluate(() => document.fonts.ready);

  const netice = await page.evaluate((herfler) => {
    const en = (metn, aile) => {
      const s = document.createElement("span");
      s.textContent = metn;
      s.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:64px;font-weight:700;font-family:${aile}`;
      document.body.appendChild(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return w;
    };
    const cix = {};
    for (const aile of ["PlusJakartaSans", "Inter"]) {
      cix[aile] = herfler.filter((h) => Math.abs(en(h, `"${aile}", serif`) - en(h, `"YoxBeleSrift", serif`)) < 0.5);
    }
    return cix;
  }, AZ_HERFLERI);

  // Boş siyahı = hər hərf brend şrifti ilə çəkilib
  expect(netice.PlusJakartaSans, "başlıq şriftində çatmayan hərflər").toEqual([]);
  expect(netice.Inter, "mətn şriftində çatmayan hərflər").toEqual([]);
});

// Plus Jakarta Sans-ın öz boşluğu em-in 17%-idir və qalın, kiçik başlıqlarda
// azərbaycanca sözlər bitişik oxunurdu ("Tövsiyə olunanməhsullar"). Subset
// qurulanda boşluq glifi genişləndirilir (scripts/srift-qur.py). Bu ölçmə
// həmin addımın faktiki nəticəsini yoxlayır — niyyəti yox.
test("başlıq şriftinin boşluğu sözləri bitişdirmir", async ({ page }) => {
  await bazarServeri().qur(page);
  await page.goto("/bazar");
  await page.evaluate(() => document.fonts.ready);

  const pay = await page.evaluate(() => {
    const en = (metn) => {
      const s = document.createElement("span");
      s.textContent = metn;
      s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-size:100px;font-weight:700;font-family:"PlusJakartaSans"';
      document.body.appendChild(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return w;
    };
    return (en("a a") - en("aa")) / 100; // em payı
  });

  expect(pay).toBeGreaterThan(0.19);
});

test("şriftlər paketdən gəlir, kənar origin-ə sorğu getmir", async ({ page }) => {
  const kenar = [];
  page.on("request", (s) => {
    const u = s.url();
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) kenar.push(u);
  });

  await bazarServeri().qur(page);
  await page.goto("/bazar");
  await page.evaluate(() => document.fonts.ready);

  expect(kenar, "Google Fonts-a sorğu getməməlidir").toEqual([]);

  // Yüklənən şrift faylları öz origin-imizdəndir
  const yuklenmis = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
  );
  expect(yuklenmis).toContain("PlusJakartaSans");
  expect(yuklenmis).toContain("Inter");
});
