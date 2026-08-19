import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Aqronom } from "./Aqronom.jsx";
import { CROP_KEYS } from "../services/crops.js";

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
    // Nisbət viewBox-dan çıxarılır: rəsm hündürlüyü dəyişəndə test də
    // özü uyğunlaşır, amma uyğunsuzluğu tutur (əvvəl rəqəm bərkidilmişdi
    // və viewBox dəyişəndə test yalandan qırıldı)
    const [, , vbEn, vbHund] = svg.getAttribute("viewBox").split(/\s+/).map(Number);
    expect(svg.getAttribute("width")).toBe("32");
    expect(svg.getAttribute("height")).toBe(String(32 * (vbHund / vbEn)));
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

  // ── Bitkiyə görə başlıq ──────────────────────────────────────────
  it("hər bitki üçün başlıq var və hamısı fərqlidir", () => {
    const formalar = new Map();
    for (const bitki of CROP_KEYS) {
      const qab = render(<Aqronom bitki={bitki} />);
      const baslik = kok(qab).querySelector(".aqro-baslik");
      expect(baslik, bitki).toBeTruthy();
      formalar.set(bitki, baslik.innerHTML);
      qab.unmount();
    }
    // Heç iki bitki eyni görünməməlidir — fermer öz bitkisini tanımalıdır
    expect(new Set(formalar.values()).size).toBe(CROP_KEYS.length);
  });

  it("bitki seçilməyibsə yarpaqlara qayıdır", () => {
    const svg = kok(render(<Aqronom />));
    expect(svg.querySelectorAll(".aqro-yarpaq")).toHaveLength(2);
  });

  it("naməlum bitki adı personajı sındırmır", () => {
    const svg = kok(render(<Aqronom bitki="banan" />));
    expect(svg.querySelectorAll(".aqro-yarpaq")).toHaveLength(2);
  });

  // Papaq brend qızılı OLMAMALIDIR: buğda və arpa da qızıldır və eyni
  // rəngdə olanda sünbül papağın fonunda itir (istehsalda görüldü)
  it("papaq buğdanın rəngindən fərqlənir", () => {
    const svg = kok(render(<Aqronom bitki="bugda" />));
    const papaqRengleri = [...svg.querySelectorAll(".aqro-papaq *")].map((e) => e.getAttribute("fill"));
    const deneRengleri = [...svg.querySelectorAll(".aqro-baslik ellipse")].map((e) => e.getAttribute("fill"));
    for (const r of deneRengleri.filter(Boolean)) {
      expect(papaqRengleri).not.toContain(r);
    }
  });

  it("əlavə sinifləri itirmir", () => {
    const svg = kok(render(<Aqronom className="shrink-0" />));
    expect(svg.getAttribute("class")).toContain("shrink-0");
  });
});
