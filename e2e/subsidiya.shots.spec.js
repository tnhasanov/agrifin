/**
 * SUBSİDİYA EKRAN GÖRÜNTÜSÜ — buğda sahəsi ilə Maliyyə ekranı.
 *
 *   npm run build && SUBSIDIYA_SHOTS=./shots npx playwright test e2e/subsidiya.shots.spec.js
 *
 * CI-da atlanır (SUBSIDIYA_SHOTS yoxdur). Buğda, suvarma bilinmir →
 * ekranda aralıq və suvarma sualı görünməlidir.
 */
import { test } from "@playwright/test";
import path from "node:path";
import { BERDE, SAHE, sebekeniQur, veziyyetEk } from "./kome.js";
import { BAZAR_FERMERI } from "./bazarKome.js";
import { kreditServeri } from "./kreditKome.js";

const QOVLUQ = process.env.SUBSIDIYA_SHOTS;
test.skip(!QOVLUQ, "SUBSIDIYA_SHOTS qovluğu verilməyib");

test("maliyyə — buğda, təxmini əkin subsidiyası (aralıq)", async ({ page }, ti) => {
  await sebekeniQur(page);
  const veziyyet = BAZAR_FERMERI(BERDE, SAHE);
  veziyyet.chat.crop = "bugda";
  await veziyyetEk(page, veziyyet);
  await kreditServeri(page, "bos");
  await page.goto("/money");
  await page.getByText("Təxmini əkin subsidiyası").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(QOVLUQ, `${ti.project.name}-maliyye-subsidiya.png`) });
});
