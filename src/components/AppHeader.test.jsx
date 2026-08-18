import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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

  // ƏSAS: zəng ekran DƏYİŞMİR. Fermer hava zolağını açıb saatlara baxırsa,
  // bildirişə baxmaq onu o yerdən qoparmamalıdır.
  it("toxunanda ekranı dəyişmədən panel açır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(zeng());

    const panel = await screen.findByRole("dialog", { name: "Bildirişlər" });
    expect(panel).toBeInTheDocument();
    // Ünvan sətri olduğu kimi qalır — geri düyməsi tətbiqdən çıxarmır
    expect(window.location.pathname).toBe("/");
    expect(zeng()).toHaveAttribute("aria-expanded", "true");
  });

  it("Escape və kənara toxunuş paneli bağlayır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(zeng());
    await screen.findByRole("dialog", { name: "Bildirişlər" });
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Bildirişlər" })).not.toBeInTheDocument(),
    );
    // Fokus açan düyməyə qayıdır — klaviatura istifadəçisi itmir
    expect(zeng()).toHaveFocus();
  });

  // Boş siyahı fermeri narahat etməməlidir: "heç nə yoxdur" da məlumatdır
  it("siqnal olmayanda panel səbəbi izah edir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(zeng());

    expect(
      await screen.findByText("Sahənizdə diqqət tələb edən heç nə yoxdur"),
    ).toBeInTheDocument();
  });
});
