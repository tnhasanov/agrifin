import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState } from "../../test/render.jsx";

const bugun = new Date().toISOString().slice(0, 10);
const SERIYA = [
  { baslangic: "2026-07-17", son: "2026-07-22", ndvi: 0.66, nemlik: 0.3, ortulu: 0 },
  { baslangic: "2026-07-22", son: bugun, ndvi: 0.68, nemlik: 0.31, ortulu: 0 },
];
const QONSU = { p25: 0.45, medyan: 0.58, p75: 0.72, son: bugun, piksel: 5000 };

function stubApi({ seriya = SERIYA, qonsu = QONSU } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      const yol = String(url);
      if (yol.includes("/api/ndvi"))
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ seriya }) });
      if (yol.includes("/api/qonsu"))
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ qonsu }) });
      if (yol.includes("/api/saheSekli")) return Promise.resolve({ ok: false, status: 501 });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }),
  );
}

function seed(sahe = { hektar: 6.5, noqteler: [[40.4, 47.1], [40.4023, 47.1], [40.4023, 47.1029], [40.4, 47.1029]] }) {
  seedState({
    location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
    onboarded: true,
    sahe,
    chat: { messages: [], crop: "bugda", referral: false },
  });
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const duyme = () => screen.getByRole("button", { name: "Hesabatı paylaş" });

describe("hesabatın paylaşılması", () => {
  it("ölçmə hazır olanda hesabatı fermerin dilində qurur", async () => {
    const user = userEvent.setup();
    const share = vi.fn(async () => {});
    vi.stubGlobal("navigator", { share });
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(duyme()).toBeInTheDocument());
    await user.click(duyme());

    const { text } = share.mock.calls[0][0];
    expect(text).toContain("Sahə: 6,5 ha · Payızlıq buğda");
    // Rəqəmlər ekrandakı ilə eynidir: tam faiz, onluqsuz
    expect(text).toContain("Bitki örtüyü: 68% (ətrafın medianı 58%)");
    expect(text).toContain("Su kifayət edir");
    expect(text).toContain("Sentinel-2");
    // Mətnin sonundakı ünvan tətbiqi tanıdır — yayılma bunun üzərindədir
    expect(text.trim().endsWith(window.location.origin)).toBe(true);
  });

  // Boş hesabat paylaşmaq fermeri utandırır
  it("ölçmə yoxdursa düymə göstərilmir", async () => {
    seed();
    stubApi({ seriya: [] });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Peyk ölçməsi/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Hesabatı paylaş" })).not.toBeInTheDocument();
  });

  // Vərəq açılıbsa fermer artıq oradadır — ekranda mesaj lazım deyil
  it("paylaşma vərəqi açılanda mesaj göstərmir", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", { share: vi.fn(async () => {}) });
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(duyme()).toBeInTheDocument());
    await user.click(duyme());

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("vərəq və WhatsApp alınmasa mətnin buferə düşdüyünü deyir", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.stubGlobal("open", () => null);
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(duyme()).toBeInTheDocument());
    await user.click(duyme());

    await waitFor(() =>
      expect(screen.getByText("Hesabat mətn kimi kopyalandı")).toBeInTheDocument(),
    );
    expect(writeText.mock.calls[0][0]).toContain("Bitki örtüyü: 68%");
  });
});
