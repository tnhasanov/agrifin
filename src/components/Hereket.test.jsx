import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "./Sparkline.jsx";

/**
 * Hərəkət paketinin STRUKTUR testləri. Animasiyanın özü CSS-dədir və
 * jsdom-da oynamır — testlər onu işə salan sinif və atributları bağlayır
 * ki, refaktorda səssizcə itməsin. prefers-reduced-motion qaydası bütün
 * paketi bir yerdən söndürür (bax: index.css) — bunu ayrıca yoxlamırıq.
 */
describe("hərəkət paketi", () => {
  it("sparkline cızılma sinfi və pathLength daşıyır", () => {
    const { container } = render(<Sparkline points={[1, 2, 3]} up />);
    const xett = container.querySelector("polyline");
    expect(xett.getAttribute("class")).toContain("cizgi-cek");
    // pathLength=1 olmadan CSS-dəki dasharray:1 xəttin faktiki uzunluğuna
    // nisbətdə cüzi qalır və cızılma görünmür
    expect(xett.getAttribute("pathLength")).toBe("1");
  });
});
