import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderApp, seedState } from "../../test/render.jsx";
import { HesabSheet } from "./HesabSheet.jsx";

function fetchCavabi(govde, { status = 200 } = {}) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(govde),
  });
}

beforeEach(() => {
  window.localStorage.clear();
  seedState({ onboarded: true });
});

describe("HesabSheet", () => {
  // HƏQİQİ XƏTA: fermer nömrənin hər rəqəmindən sonra yenidən xanaya
  // toxunmalı olurdu. Səbəb Sheet-də idi (bax: components/Sheet.jsx) — panel
  // hər render-də fokusu özünə qaytarırdı. Yoxlama burada dayanır, çünki
  // xəta məhz bu ekranda görünür.
  it("nömrə yazarkən fokus xanada qalır", () => {
    vi.stubGlobal("fetch", vi.fn(() => fetchCavabi({})));
    renderApp(<HesabSheet acilib onBagla={() => {}} />);

    const xana = screen.getByLabelText(/telefon/i);
    xana.focus();
    for (const deyer of ["0", "05", "050", "0501", "05012"]) {
      fireEvent.change(xana, { target: { value: deyer } });
      expect(document.activeElement, `"${deyer}" yazandan sonra`).toBe(xana);
    }
    expect(xana.value).toBe("05012");

    vi.unstubAllGlobals();
  });

  it("təsdiq kodunu yazarkən də fokus itmir", async () => {
    vi.stubGlobal("fetch", vi.fn(() => fetchCavabi({ gonderildi: true, rejim: "log" })));
    renderApp(<HesabSheet acilib onBagla={() => {}} />);

    fireEvent.change(screen.getByLabelText(/telefon/i), { target: { value: "0501234567" } });
    fireEvent.click(screen.getByRole("button", { name: /kodu göndər/i }));

    const kodXanasi = await screen.findByLabelText(/təsdiq kodu/i);
    kodXanasi.focus();
    for (const deyer of ["1", "12", "123"]) {
      fireEvent.change(kodXanasi, { target: { value: deyer } });
      expect(document.activeElement, `"${deyer}" yazandan sonra`).toBe(kodXanasi);
    }

    vi.unstubAllGlobals();
  });

  it("telefon → kod → giriş axını işləyir, log qeydi görünür", async () => {
    const fetchMock = vi
      .fn()
      // kod-iste
      .mockReturnValueOnce(fetchCavabi({ gonderildi: true, rejim: "log" }))
      // kod-tesdiq
      .mockReturnValueOnce(fetchCavabi({ telefon: "+994501234567" }));
    vi.stubGlobal("fetch", fetchMock);

    renderApp(<HesabSheet acilib onBagla={() => {}} />);

    fireEvent.change(screen.getByLabelText(/telefon/i), { target: { value: "0501234567" } });
    fireEvent.click(screen.getByRole("button", { name: /kodu göndər/i }));

    // Log rejimi gizlədilmir: fermer SMS gözləməsin
    await screen.findByText(/sınaq rejimi/i);
    expect(fetchMock.mock.calls[0][1].body).toContain("kod-iste");

    fireEvent.change(screen.getByLabelText(/təsdiq kodu/i), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /təsdiqlə/i }));

    // Giriş bitdi: toast + göndərilən əməl kod-tesdiq idi
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][1].body).toContain("kod-tesdiq");

    vi.unstubAllGlobals();
  });

  it("server xətası açarla göstərilir (hedd → 429)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(fetchCavabi({ error: "hedd" }, { status: 429 })),
    );

    renderApp(<HesabSheet acilib onBagla={() => {}} />);
    fireEvent.change(screen.getByLabelText(/telefon/i), { target: { value: "0501234567" } });
    fireEvent.click(screen.getByRole("button", { name: /kodu göndər/i }));

    const xeta = await screen.findByRole("alert");
    expect(xeta.textContent).toMatch(/çox cəhd/i);

    vi.unstubAllGlobals();
  });

  it("daxil olmuş istifadəçiyə nömrəsi və çıxış göstərilir", async () => {
    seedState({ onboarded: true, hesab: { telefon: "+994501234567" } });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchCavabi({ cixildi: true })));

    renderApp(<HesabSheet acilib onBagla={() => {}} />);
    expect(screen.getByText("+994501234567")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /hesabdan çıx/i }));
    // Çıxışdan sonra yenidən giriş forması gəlir
    await screen.findByLabelText(/telefon/i);

    vi.unstubAllGlobals();
  });
});
