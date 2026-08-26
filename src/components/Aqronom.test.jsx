import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Aqronom } from "./Aqronom.jsx";
import { BITKI_VARIANTI } from "./fermerVarianti.js";
import { CROP_KEYS } from "../services/crops.js";

/** Kökü tapır — komponent rol vermir (bilərəkdən aria-hidden) */
const kok = (qab) => qab.container.querySelector(".fermer");
const sekil = (qab) => kok(qab).querySelector("img.fermer-gov");

describe("Aqronom (raster fermer)", () => {
  it("halı sinif kimi verir — animasiya CSS-dədir, komponentdə yox", () => {
    for (const hal of ["sakit", "dusunur", "danisir", "sevincli", "narahat"]) {
      const qab = render(<Aqronom hal={hal} />);
      expect(kok(qab).className, hal).toContain(`fermer--${hal}`);
      qab.unmount();
    }
  });

  it("naməlum hal sakitə düşür — yazı səhvi personajı sındırmır", () => {
    expect(kok(render(<Aqronom hal="uydurma" />)).className).toContain("fermer--sakit");
  });

  // Personaj bəzəkdir: yanındakı mətn onsuz da eyni şeyi deyir
  it("ekran oxuyucudan gizlidir və şəklin alt mətni boşdur", () => {
    const qab = render(<Aqronom />);
    expect(kok(qab).getAttribute("aria-hidden")).toBe("true");
    expect(sekil(qab).getAttribute("alt")).toBe("");
  });

  // ── Görünüş seçimi ────────────────────────────────────────────────
  it("kiçik ölçüdə baş medalyonu, böyükdə tam boy", () => {
    const bas = render(<Aqronom olcu={40} />);
    expect(kok(bas).className).toContain("fermer--bas");
    expect(sekil(bas).getAttribute("src")).toContain("-bas");

    const tam = render(<Aqronom olcu={150} />);
    expect(kok(tam).className).toContain("fermer--tam");
    expect(sekil(tam).getAttribute("src")).toContain("-tam");
  });

  it("gorunus parametri avtomatik seçimi məcbur dəyişir", () => {
    const qab = render(<Aqronom olcu={40} gorunus="tam" />);
    expect(kok(qab).className).toContain("fermer--tam");
  });

  // Kölgə yalnız tam boydadır: medalyonda yer xətti yoxdur
  it("yer kölgəsi yalnız tam boyda görünür", () => {
    expect(kok(render(<Aqronom olcu={150} />)).querySelector(".fermer-kolge")).toBeTruthy();
    expect(kok(render(<Aqronom olcu={40} />)).querySelector(".fermer-kolge")).toBeNull();
  });

  // ── Bitki → render variantı ───────────────────────────────────────
  it("hər bitki üçün variant xəritədə var", () => {
    for (const bitki of CROP_KEYS) {
      expect(BITKI_VARIANTI[bitki], bitki).toBeTruthy();
    }
  });

  it("bitkiyə görə fərqli render yüklənir", () => {
    const bugda = sekil(render(<Aqronom bitki="bugda" />)).getAttribute("src");
    const pomidor = sekil(render(<Aqronom bitki="pomidor" />)).getAttribute("src");
    expect(bugda).not.toBe(pomidor);
  });

  // QƏSDƏN: arpa buğdanın renderini geyinir — hər ikisi sünbüldür,
  // istehsalçı arpa üçün ayrıca render göndərməyib
  it("arpa buğda ilə eyni renderi bölüşür", () => {
    const bugda = sekil(render(<Aqronom bitki="bugda" />)).getAttribute("src");
    const arpa = sekil(render(<Aqronom bitki="arpa" />)).getAttribute("src");
    expect(arpa).toBe(bugda);
  });

  // İkinci partiyadan sonra HƏR bitkinin öz renderi var (arpa istisna —
  // yuxarıya bax); cücərti yalnız naməlum ad və boş seçim üçündür
  it("bütün bitkilər öz renderini geyinir, naməlum ad cücərtiyə düşür", () => {
    const menbeler = CROP_KEYS.map((b) =>
      sekil(render(<Aqronom bitki={b} />)).getAttribute("src"),
    );
    // 10 bitki → 9 fərqli render (arpa buğdanı bölüşür)
    expect(new Set(menbeler).size).toBe(9);
    expect(menbeler.some((m) => m.includes("yarpaq"))).toBe(false);

    const banan = sekil(render(<Aqronom bitki="banan" />)).getAttribute("src");
    const bos = sekil(render(<Aqronom />)).getAttribute("src");
    expect(banan).toContain("yarpaq");
    expect(banan).toBe(bos);
  });

  // ── Hal göstəriciləri ─────────────────────────────────────────────
  // Üz dəyişmir (bir render var) — halı nöqtələr və CSS duruşu daşıyır.
  // Nöqtə elementləri HƏMİŞƏ DOM-dadır, görünmə CSS-dədir: testlər sinif
  // səviyyəsində bağlayır, göstərmə qaydası index.css-dədir.
  it("fikir və danışıq nöqtələri strukturda mövcuddur", () => {
    const qab = render(<Aqronom hal="dusunur" />);
    expect(kok(qab).querySelectorAll(".fermer-fikir i")).toHaveLength(3);
    expect(kok(qab).querySelectorAll(".fermer-danisiq i")).toHaveLength(3);
  });

  it("əlavə sinifləri itirmir", () => {
    expect(kok(render(<Aqronom className="shrink-0" />)).className).toContain("shrink-0");
  });
});
