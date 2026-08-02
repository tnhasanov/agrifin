import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import { renderApp, seedLocation } from "../test/render.jsx";
import { RECOMMENDATIONS } from "../services/advisor.js";

const zeng = () => screen.getByRole("button", { name: /Bildirişlər/ });

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  seedLocation();
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

// Əvvəl zəng düyməsində sabit qırmızı nöqtə vardı və düymənin onClick-i
// ümumiyyətlə yox idi: fermer toxunurdu, heç nə olmurdu. Nişan indi
// gözləyən tövsiyələrin həqiqi sayıdır və düymə məsləhət ekranına aparır.
describe("başlıqdaki bildiriş zəngi", () => {
  it("gözləyən tövsiyələrin sayını göstərir", () => {
    renderApp(<App />);
    expect(zeng()).toHaveAccessibleName(`Bildirişlər — ${RECOMMENDATIONS.length} yeni`);
    expect(zeng()).toHaveTextContent(String(RECOMMENDATIONS.length));
  });

  it("toxunanda məsləhət ekranını açır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(zeng());

    expect(window.location.pathname).toBe("/advisor");
    expect(screen.getByText("Tövsiyələr")).toBeInTheDocument();
  });

  it("tövsiyə tamamlandıqca say azalır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await user.click(zeng());

    const evvel = RECOMMENDATIONS.length;
    await user.click(screen.getByRole("button", { name: "Planlaşdır" }));

    expect(zeng()).toHaveTextContent(String(evvel - 1));
  });

  it("hamısı tamamlananda nişan tamamilə yox olur", async () => {
    const user = userEvent.setup();
    // Bütün tövsiyələr tamamlanmış vəziyyətdə başlayırıq
    window.localStorage.setItem(
      "agrifin:state",
      JSON.stringify({
        version: 4,
        state: {
          location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
          onboarded: true,
          completedRecs: RECOMMENDATIONS.map((r) => r.id),
        },
      }),
    );
    renderApp(<App />);

    const dugme = screen.getByRole("button", { name: "Bildirişlər — yeni bildiriş yoxdur" });
    // Rəqəm də, nöqtə də olmamalıdır — yanlış "səni nəsə gözləyir" siqnalı verməsin
    expect(dugme).toHaveTextContent("");
    await user.click(dugme);
    expect(window.location.pathname).toBe("/advisor");
  });
});
