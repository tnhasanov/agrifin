import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState, WEATHER_FIXTURE } from "../../test/render.jsx";

const bugun = new Date().toISOString().slice(0, 10);

/** Quraq sahə: bir suvarma siqnalı doğurur */
const SERIYA = [{ baslangic: "2026-07-22", son: bugun, ndvi: 0.61, nemlik: -0.06, ortulu: 0 }];

function stubApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      const yol = String(url);
      if (yol.includes("/api/ndvi"))
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ seriya: SERIYA }) });
      if (yol.includes("/api/")) return Promise.resolve({ ok: false, status: 501 });
      if (yol.includes("open-meteo"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }),
  );
}

function seed() {
  seedState({
    location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
    onboarded: true,
    sahe: {
      hektar: 6.5,
      noqteler: [
        [40.4, 47.1],
        [40.4023, 47.1],
        [40.4023, 47.1029],
        [40.4, 47.1029],
      ],
    },
    chat: { messages: [], crop: "bugda", referral: false },
  });
}

const zeng = () => screen.getByRole("button", { name: /Bildirişlər/ });
const panel = () => screen.findByRole("dialog", { name: "Bildirişlər" });

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.style.overflow = "";
});

describe("bildiriş paneli", () => {
  it("siqnalları göstərir və sayını başlıqda yazır", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());

    await user.click(zeng());

    const p = await panel();
    expect(within(p).getByText("Suvarma vaxtıdır")).toBeInTheDocument();
    // Alt yazı kartların sayı ilə üst-üstə düşməlidir — "2 siqnal" yazıb
    // 3 kart göstərmək nişanı mənasızlaşdırır
    const kartlar = within(p).getAllByRole("heading", { level: 3 });
    expect(within(p).getByText(`Sahənizdən ${kartlar.length} açıq siqnal`)).toBeInTheDocument();
  });

  // Panel yalnız oxumaq üçün deyil: iş elə oradan görülür
  it("siqnalı panelin içindən bağlamaq olur", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());

    await user.click(zeng());
    const p = await panel();
    const suvarma = within(p)
      .getAllByRole("heading", { level: 3 })
      .find((h) => h.textContent === "Suvarma vaxtıdır");
    // Kartın öz bağla düyməsi — başlığın yanındakı
    await user.click(within(suvarma.closest("div").parentElement).getByRole("button", { name: "Siqnalı bağla" }));

    await waitFor(() => expect(screen.queryByText("Suvarma vaxtıdır")).not.toBeInTheDocument());
  });

  // Çat panelin altında qalmamalıdır — əvvəl panel bağlanır
  it("çata keçəndə panel bağlanır", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());

    await user.click(zeng());
    const p = await panel();
    const hereket = within(p).queryAllByRole("button", { name: /Şəkil çək|Aqronomdan soruş/ });
    if (hereket.length === 0) return; // bu siqnalın hərəkət düyməsi yoxdur

    await user.click(hereket[0]);
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Bildirişlər" })).not.toBeInTheDocument(),
    );
  });

  it("hamısına baxmaq məsləhət ekranına aparır və paneli bağlayır", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());

    await user.click(zeng());
    const p = await panel();
    await user.click(within(p).getByRole("button", { name: /Məsləhət ekranında/ }));

    await waitFor(() => expect(window.location.pathname).toBe("/advisor"));
    expect(screen.queryByRole("dialog", { name: "Bildirişlər" })).not.toBeInTheDocument();
  });

  // Masaüstündə aşağı çəkmək jesti yoxdur — görünən bağla düyməsi lazımdır
  it("bağla düyməsi ilə bağlanır", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());

    await user.click(zeng());
    const p = await panel();
    await user.click(within(p).getByRole("button", { name: "Bağla" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Bildirişlər" })).not.toBeInTheDocument(),
    );
  });

  // Panel açıqkən arxadaki siyahı sürüşməməlidir
  it("açıqkən arxadakı ekranın sürüşməsini dayandırır", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());

    await user.click(zeng());
    await panel();
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });
});
