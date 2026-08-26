import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "./Skeleton.jsx";
import { Sheet } from "./Sheet.jsx";
import { I18nProvider } from "../i18n/index.jsx";

describe("Skeleton", () => {
  it("ölçünü alır və ekran oxuyucudan gizlidir", () => {
    const { container } = render(<Skeleton en={74} hund={74} radius={37} />);
    const el = container.firstChild;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.className).toContain("skelet");
    expect(el.style.width).toBe("74px");
    expect(el.style.borderRadius).toBe("37px");
  });
});

describe("toxunma hədəfləri", () => {
  // Audit tapıntısı: bağlama düymələri ~21-27px idi — barmaq üçün minimum
  // 40px-dir. Görünüş yox, toxunma sahəsi ölçülür.
  it("Sheet-in bağlama düyməsi ən azı 40px-dir", () => {
    window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
    render(
      <I18nProvider>
        <Sheet acilib onBagla={() => {}} baslik="Test">
          <p>məzmun</p>
        </Sheet>
      </I18nProvider>,
    );
    const bagla = screen.getByRole("button", { name: "Bağla" });
    expect(bagla.style.minWidth).toBe("40px");
    expect(bagla.style.minHeight).toBe("40px");
  });
});
