import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Service worker QAYDALARI mətn səviyyəsində qorunur: SW brauzerdə işləyir,
 * vitest-də icra olunmur, amma reqressiya kifayət qədər bahalıdır —
 * /api/* keşə düşəndə ödənişdən sonra reload köhnə borcu göstərirdi.
 */
const sw = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

describe("public/sw.js", () => {
  it("/api/ yolunu keşdən keçirmir (şəbəkə-yalnız)", () => {
    const fetchBloku = sw.slice(sw.indexOf('addEventListener("fetch"'));
    const apiQapisi = fetchBloku.indexOf('url.pathname.startsWith("/api/")');
    const kesQapisi = fetchBloku.indexOf("caches.match(request)");
    expect(apiQapisi).toBeGreaterThan(-1);
    // Qapı keş oxunuşundan ƏVVƏL gəlməlidir
    expect(apiQapisi).toBeLessThan(kesQapisi);
    expect(fetchBloku.slice(apiQapisi, apiQapisi + 60)).toMatch(/return;/);
  });

  it("keş adı v1 deyil — köhnə keşdəki API cavabları activate-də silinsin", () => {
    expect(sw).not.toMatch(/const CACHE = "agrifin-v1"/);
    expect(sw).toMatch(/keys\.filter\(\(key\) => key !== CACHE\)/);
  });
});
