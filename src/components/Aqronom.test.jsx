import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Aqronom } from "./Aqronom.jsx";
import { CROP_KEYS } from "../services/crops.js";

/** Personajın kökünü tapır — komponent rol vermir (bilərəkdən aria-hidden) */
const kok = (qab) => qab.container.querySelector(".aqro");
const sekil = (qab) => qab.container.querySelector("img.aqro-sekil");

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
    const qab = render(<Aqronom />);
    expect(kok(qab).getAttribute("aria-hidden")).toBe("true");
    expect(sekil(qab).getAttribute("alt")).toBe("");
  });

  it("büst kvadratdır: en = boy = olcu", () => {
    const img = sekil(render(<Aqronom olcu={32} />));
    expect(img.style.width).toBe("32px");
    expect(img.style.height).toBe("32px");
  });

  // Tam boyda fiqur şaqulidir — olcu hündürlüyü verir, en öz nisbətini
  // saxlayır. En bərkidilsəydi fiqur yastılanardı.
  it("tam boyda olcu hündürlükdür, en sərbəstdir", () => {
    const img = sekil(render(<Aqronom boy="tam" olcu={120} />));
    expect(img.style.height).toBe("120px");
    expect(img.style.width).toBe("auto");
  });

  // Fikir nöqtələri hər halda DOM-dadır (görünüşü CSS idarə edir) —
  // hal dəyişəndə element ağacı dəyişmir, animasiya kəsilmir
  it("fikir nöqtələri mövcuddur", () => {
    const qab = render(<Aqronom hal="dusunur" />);
    expect(qab.container.querySelectorAll(".aqro-nokte")).toHaveLength(3);
  });

  // ── Bitkiyə görə şəkil ───────────────────────────────────────────
  it("hər bitki üçün şəkil var və heç biri sınmır", () => {
    for (const bitki of CROP_KEYS) {
      const qab = render(<Aqronom bitki={bitki} />);
      const src = sekil(qab).getAttribute("src");
      expect(src, bitki).toBeTruthy();
      expect(src, bitki).toMatch(/\.webp$/);
      qab.unmount();
    }
  });

  // Şəkli olan bitkilər fərqlənməlidir — fermer öz bitkisini tanımalıdır.
  // (Şəkli olmayanlar ümumi varianta düşür, ona görə TAM fərqlilik yox,
  // yalnız çəkilmiş dəstin fərqliliyi yoxlanır.)
  it("çəkilmiş bitkilər fərqli şəkillər alır", () => {
    const cekilmis = ["bugda", "qargidali", "pambiq", "pomidor", "uzum"];
    const srcler = cekilmis.map((bitki) => {
      const qab = render(<Aqronom bitki={bitki} />);
      const src = sekil(qab).getAttribute("src");
      qab.unmount();
      return src;
    });
    expect(new Set(srcler).size).toBe(cekilmis.length);
  });

  // Arpa şəkli hələ yoxdur — vizual ən yaxını buğdadır, ümumi cücərti yox
  it("arpa buğdanın şəklinə düşür", () => {
    const arpa = sekil(render(<Aqronom bitki="arpa" />)).getAttribute("src");
    const bugda = sekil(render(<Aqronom bitki="bugda" />)).getAttribute("src");
    expect(arpa).toBe(bugda);
  });

  it("bitki seçilməyibsə ümumi varianta qayıdır", () => {
    const bos = sekil(render(<Aqronom />)).getAttribute("src");
    const bugda = sekil(render(<Aqronom bitki="bugda" />)).getAttribute("src");
    expect(bos).toBeTruthy();
    expect(bos).not.toBe(bugda);
  });

  it("naməlum bitki adı personajı sındırmır", () => {
    const bos = sekil(render(<Aqronom />)).getAttribute("src");
    expect(sekil(render(<Aqronom bitki="banan" />)).getAttribute("src")).toBe(bos);
  });

  // Tam boy da bitkini daşıyır — uğur ekranında da fermer öz bitkisini görür
  it("tam boyda da bitki seçilir", () => {
    const tam = sekil(render(<Aqronom boy="tam" bitki="uzum" />)).getAttribute("src");
    const byust = sekil(render(<Aqronom bitki="uzum" />)).getAttribute("src");
    expect(tam).toMatch(/\.webp$/);
    expect(tam).not.toBe(byust);
  });

  it("əlavə sinifləri itirmir", () => {
    const qab = render(<Aqronom className="shrink-0" />);
    expect(kok(qab).getAttribute("class")).toContain("shrink-0");
  });
});
