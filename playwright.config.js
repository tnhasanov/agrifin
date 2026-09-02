import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

/**
 * Brauzer testləri — YALNIZ ilk açılış axını.
 *
 * NİYƏ AYRI QOŞQU: vitest+jsdom məntiqi yoxlayır, amma real klaviatura,
 * safe-area, sürüşdürmə, şəkil yüklənməsi və ekran ölçüsü orada yoxdur.
 * Bu axın məhz o şeylərdə sınır.
 *
 * BRAUZER YÜKLƏNMİR: mühitdə hazır Chromium var
 * (PLAYWRIGHT_BROWSERS_PATH), ona görə `playwright install` çağırılmır.
 *
 * DETERMİNİSTLİK: bütün şəbəkə sorğuları testin özündə əvəzlənir
 * (bax: e2e/kome.js) — Copernicus və hava xidmətinə real sorğu getmir.
 */
const PORT = 4173;
const SYSTEM_CHROME = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((yol) => yol && existsSync(yol));

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: `http://localhost:${PORT}`,
    // Öz sw.js-imiz GET sorğularını tutur — test şəbəkəni idarə edə bilməsin
    serviceWorkers: "block",
    trace: "retain-on-failure",
    locale: "az-AZ",
    // Lokal Windows mühitində artıq quraşdırılmış təhlükəsiz brauzerdən
    // istifadə et; CI-də yol yoxdursa Playwright öz Chromium-una düşür.
    launchOptions: SYSTEM_CHROME ? { executablePath: SYSTEM_CHROME } : undefined,
  },

  projects: [
    // Üç ölçü: ən kiçik yayılmış Android, iPhone 14/15, ən böyük telefon
    { name: "390x844", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "360x800", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 } } },
    { name: "430x932", use: { ...devices["Desktop Chrome"], viewport: { width: 430, height: 932 } } },
  ],

  webServer: {
    command: `npx vite preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
