import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import { renderApp, seedLocation } from "../test/render.jsx";

const zeng = () => screen.getByRole("button", { name: /Bildirişlər/ });

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  seedLocation();
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

// Əvvəl zəng düyməsində sabit qırmızı nöqtə vardı və düymənin onClick-i
// ümumiyyətlə yox idi: fermer toxunurdu, heç nə olmurdu. Sonra nişan nümunə
// tövsiyələri sayırdı — yəni "4" həmişə görünürdü, halbuki ölçmədən çıxan
// heç nə yox idi. İndi nişan YALNIZ sahədən gələn siqnalları sayır (sayma
// testləri: features/signals/Siqnal.test.jsx).
describe("başlıqdaki bildiriş zəngi", () => {
  it("siqnal yoxdursa nişan göstərmir", () => {
    renderApp(<App />);

    expect(zeng()).toHaveAccessibleName("Bildirişlər — yeni bildiriş yoxdur");
    // Rəqəm də, nöqtə də olmamalıdır — yanlış "səni nəsə gözləyir" siqnalı verməsin
    expect(zeng()).toHaveTextContent("");
  });

  it("toxunanda məsləhət ekranını açır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(zeng());

    expect(window.location.pathname).toBe("/advisor");
    expect(screen.getByText("Sahənizdən siqnallar")).toBeInTheDocument();
  });

  // Boş siyahı fermeri narahat etməməlidir: "heç nə yoxdur" da məlumatdır
  it("siqnal olmayanda məsləhət ekranı səbəbi izah edir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(zeng());

    expect(screen.getByText("Sahənizdə diqqət tələb edən heç nə yoxdur")).toBeInTheDocument();
  });
});
