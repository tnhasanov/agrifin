import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import App from "../../App.jsx";
import { renderApp, seedLocation, WEATHER_FIXTURE } from "../../test/render.jsx";

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  seedLocation();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const cavabVer = (payload, ok = true) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(payload) })),
  );

describe("hava zolağı", () => {
  it("düzgün proqnozu göstərir", async () => {
    cavabVer(WEATHER_FIXTURE);
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Bu gün")).toBeInTheDocument());
  });

  // Reqressiya: API 200 qaytarıb boş məzmun verəndə render `undefined.slice`
  // ilə çökürdü. Xəta sərhədi olmadığı üçün BÜTÜN tətbiq ağ ekrana düşürdü —
  // fermer üçün tətbiqin tamamilə itməsi. Brauzerdə təsdiqlənib.
  it.each([
    ["tamamilə boş", {}],
    ["daily boş", { daily: {}, hourly: {} }],
    ["günlər var, temperatur yoxdur", { daily: { time: ["2026-07-29"], weather_code: [0] } }],
    ["daily null", { daily: null }],
  ])("naqis cavabda (%s) çökmür, xəta mesajı göstərir", async (_ad, payload) => {
    cavabVer(payload);
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText("Hava məlumatı hazırda əlçatan deyil.")).toBeInTheDocument(),
    );
    // Ən vacibi: tətbiqin qalanı sağdır
    expect(screen.getByRole("button", { name: "Əsas" })).toBeInTheDocument();
    expect(screen.getByText(/FARMSCORE/)).toBeInTheDocument();
  });
});
