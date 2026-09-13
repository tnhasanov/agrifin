import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { BERDE, SAHE, sebekeniQur, veziyyetEk } from "./kome.js";
import { BAZAR_FERMERI, bazarServeri } from "./bazarKome.js";

/**
 * BAZAR EKRAN GÖRÜNTÜLƏRİ — dizayn baxışı üçün, yoxlama üçün deyil.
 *
 *   BAZAR_SHOTS=./shots npx playwright test e2e/bazar.shots.spec.js --project=390x844
 *
 * Dəyişən verilməyibsə test atlanır (CI-da işləmir). Hər ekran tam
 * hündürlükdə çəkilir ki, "ekranın altında nə var" da görünsün.
 */
const QOVLUQ = process.env.BAZAR_SHOTS;

test.skip(!QOVLUQ, "BAZAR_SHOTS qovluğu verilməyib");

test("bazar ekranları", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  mkdirSync(QOVLUQ, { recursive: true });
  const cek = (ad) => page.screenshot({ path: `${QOVLUQ}/${testInfo.project.name}-${ad}.png`, fullPage: true });
  const sakit = () => page.waitForTimeout(500);

  await sebekeniQur(page);
  await veziyyetEk(page, BAZAR_FERMERI(BERDE, SAHE));
  const server = bazarServeri();
  await server.qur(page);

  await page.goto("/bazar");
  await sakit();
  await cek("01-ev");

  await page.goto("/bazar/kateqoriya/gubre");
  await sakit();
  await cek("02-kateqoriya");

  await page.goto("/bazar/axtar");
  await page.getByRole("searchbox").fill("toxum");
  await sakit();
  await cek("03-axtaris");
  await page.getByRole("button", { name: /^Süzgəc/ }).click();
  await sakit();
  await cek("04-suzgec");
  await page.keyboard.press("Escape");

  await page.goto("/bazar/mehsul/karbamid-46-50kq");
  await page.getByRole("textbox", { name: "Miqdar" }).fill("20");
  await page.getByRole("textbox", { name: "Miqdar" }).press("Enter");
  await sakit();
  await cek("05-mehsul");
  await page.getByRole("button", { name: "Maliyyələşdirmə imkanını yoxla" }).click();
  await page.getByText("Sahəniz bu məbləği daşıya bilər").waitFor();
  await sakit();
  await cek("09-maliyye-vereqi");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Maliyyələşdirməni yoxla" }).waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Səbətə əlavə et", exact: true }).click();

  await page.goto("/bazar/tedarukcu/agrosupply");
  await sakit();
  await cek("06-tedarukcu");

  await page.goto("/bazar/mehsul/pomidor-toxumu-f1");
  await page.getByRole("button", { name: "+" }).click();
  await page.getByRole("button", { name: "Səbətə əlavə et" }).click();
  await page.goto("/bazar/sebet");
  await sakit();
  await cek("07-sebet");

  await page.getByRole("button", { name: "Sifarişi tamamla" }).click();
  await page.getByLabel("Alıcının adı").fill("Tural Həsənov");
  await sakit();
  await cek("08-sifaris-catdirilma");
  await page.getByRole("button", { name: "Davam et" }).click();
  await page.getByText("Yekun server tərəfindən hesablanıb").waitFor();
  await page.getByRole("radio", { name: /AgriFin ilə maliyyələşdir/ }).click();
  await page.getByText("Sahəniz bu məbləği daşıya bilər").waitFor();
  await sakit();
  await cek("10-sifaris-tesdiq-maliyye");
  await page.getByRole("button", { name: "Sifarişi təsdiqlə" }).click();
  await page.getByRole("heading", { name: "Sifarişiniz qəbul edildi" }).waitFor();
  await sakit();
  await cek("11-ugur");
  await page.getByRole("button", { name: "Sifarişə bax" }).click();
  await sakit();
  await cek("12-sifaris-detali");

  await page.goto("/bazar/sifarisler");
  await sakit();
  await cek("13-sifarisler");

  await page.goto("/bazar/tovsiye");
  await sakit();
  await cek("14-tovsiye");
});
