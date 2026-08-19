import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Aqronom } from "./Aqronom.jsx";

/** SVG kökünü tapır — komponent rol vermir (bilərəkdən aria-hidden) */
const kok = (qab) => qab.container.querySelector("svg.aqro");

describe("Aqronom", () => {
  it("halı sinif kimi verir — animasiya CSS-dədir, komponentdə yox", () => {
    for (const hal of ["sakit", "dusunur", "danisir", "sevincli", "narahat"]) {
      const qab = render(<Aqronom hal={hal} />);
      expect(kok(qab).getAttribute("class"), hal).toContain(`aqro--${hal}`);
      qab.unmount();
    }
  });

  it("naməlum hal sakitə düşür — yazı səhvi personajı sındırmır", () => {
    const qab = render(<Aqronom hal="uydurma" />);
    expect(kok(qab).getAttribute("class")).toContain("aqro--sakit");
  });

  it("hal verilməsə sakitdir", () => {
    expect(kok(render(<Aqronom />)).getAttribute("class")).toContain("aqro--sakit");
  });

  // Personaj bəzəkdir: ekran oxuyucusu onu oxumamalıdır, çünki yanındakı
  // mətn onsuz da eyni şeyi deyir. İki dəfə eşitmək yorucudur.
  it("ekran oxuyucudan gizlidir", () => {
    const svg = kok(render(<Aqronom />));
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
  });

  it("ölçü nisbəti qorunur", () => {
    const svg = kok(render(<Aqronom olcu={32} />));
    expect(svg.getAttribute("width")).toBe("32");
    expect(svg.getAttribute("height")).toBe(String(32 * (76 / 64)));
  });

  // Hər ifadə AYRI forma ilə fərqlənməlidir — yalnız rənglə fərqlənsə
  // rəng korluğu olan istifadəçi üçün beş hal eyni görünər
  it("hər halda üz elementləri mövcuddur", () => {
    const qab = render(<Aqronom hal="narahat" />);
    const svg = kok(qab);
    expect(svg.querySelectorAll(".aqro-goz")).toHaveLength(2);
    expect(svg.querySelector(".aqro-agiz")).toBeTruthy();
    expect(svg.querySelector(".aqro-papaq")).toBeTruthy();
    expect(svg.querySelectorAll(".aqro-yarpaq")).toHaveLength(2);
  });

  it("əlavə sinifləri itirmir", () => {
    const svg = kok(render(<Aqronom className="shrink-0" />));
    expect(svg.getAttribute("class")).toContain("shrink-0");
  });
});
