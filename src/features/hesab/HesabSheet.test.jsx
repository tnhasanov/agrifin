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
    fireEvent.click(screen.getByRole("button", { name: /kod göndər/i }));

    // Log rejimi gizlədilmir: fermer SMS gözləməsin
    await screen.findByText(/sınaq rejimi/i);
    expect(fetchMock.mock.calls[0][1].body).toContain("kod-iste");

    fireEvent.change(screen.getByLabelText(/sms kodu/i), { target: { value: "123456" } });
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
    fireEvent.click(screen.getByRole("button", { name: /kod göndər/i }));

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
