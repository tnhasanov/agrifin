import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { BitkiSekli } from "./BitkiSekli.jsx";
import { BitkiSebekesi } from "./BitkiSebekesi.jsx";
import { renderApp } from "../../test/render.jsx";

// Assetlər ayrıca göndərilir və qovluq boş ola bilər, ona görə testlər ONLARIN
// VARLIĞINDAN ASILI DEYİL: xəritə burada idarə olunur.
const SEKIL = { avif: "/pomidor.avif", webp: "/pomidor.webp" };
let xerite = () => null;

vi.mock("../../services/bitkiSekilleri.js", () => ({
  bitkiSekli: (kod) => xerite(kod),
  sekilliBitkiler: () => [],
}));

afterEach(() => {
  xerite = () => null;
});

describe("bitki şəkli", () => {
  it("asset varsa AVIF və WebP mənbələri ilə <picture> verir", () => {
    xerite = () => SEKIL;
    const { container } = renderApp(<BitkiSekli kod="pomidor" />);

    const novler = [...container.querySelectorAll("source")].map((s) => s.getAttribute("type"));
    expect(novler).toEqual(["image/avif", "image/webp"]);
    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
  });

  it("ayrıca şəkil YÜKLƏNMƏSƏ foto-mozaikaya keçir — kart boş qalmır", () => {
    xerite = () => SEKIL;
    const { container } = renderApp(<BitkiSekli kod="pomidor" />);

    fireEvent.error(container.querySelector("img"));
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-crop-photo="pomidor"]')).toBeTruthy();
  });

  it("yalnız bir format varsa da işləyir", () => {
    xerite = () => ({ avif: null, webp: "/pomidor.webp" });
    const { container } = renderApp(<BitkiSekli kod="pomidor" />);

    expect(container.querySelectorAll("source")).toHaveLength(1);
    expect(container.querySelector("img")).toHaveAttribute("src", "/pomidor.webp");
  });

  it("asset yoxdursa ölçü SAXLANILIR — düzülüş sıçramır", () => {
    const { container } = renderApp(<BitkiSekli kod="pomidor" en={48} hund={58} />);
    expect(container.firstChild).toHaveStyle({ width: "48px", height: "58px" });
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-crop-photo="pomidor"]')).toBeTruthy();
  });

  it("şəkil bəzəkdir: ekran oxuyucudan gizlədilir", () => {
    xerite = () => SEKIL;
    const { container } = renderApp(<BitkiSekli kod="pomidor" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("bitki şəbəkəsi", () => {
  it("hər kartın adı şəkildən ASILI OLMADAN oxunur", () => {
    renderApp(<BitkiSebekesi secilen={null} onSec={() => {}} />);
    expect(screen.getByRole("button", { name: "Payızlıq buğda" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fındıq" })).toBeInTheDocument();
  });

  it("seçim aria-pressed ilə elan olunur", () => {
    renderApp(<BitkiSebekesi secilen="pomidor" onSec={() => {}} />);
    expect(screen.getByRole("button", { name: "Pomidor" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Kartof" })).toHaveAttribute("aria-pressed", "false");
  });

  it("on kanonik bitkinin hamısı göstərilir", () => {
    renderApp(<BitkiSebekesi secilen={null} onSec={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(10);
  });
});
