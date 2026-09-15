import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStore } from "../../state/store.jsx";
import { renderApp, seedState } from "../../test/render.jsx";
import { useHesab } from "./useHesab.js";
import * as hesabServisi from "../../services/hesab.js";

vi.mock("../../services/hesab.js", () => ({
  hesabVeziyyeti: vi.fn(),
  saheYukle: vi.fn(),
  saheGonder: vi.fn(),
  snapshotGonder: vi.fn(),
  balGonder: vi.fn(),
}));

const NOQTELER = [
  [40.37, 47.12],
  [40.38, 47.13],
  [40.37, 47.14],
];
const BOS_INDEKS = { hal: "yoxdur", movsumler: [], indeks: null };

/** Hook-u işlədib store-un görünən hissəsini çap edir */
function Sinaq() {
  useHesab(BOS_INDEKS);
  const { state, actions } = useStore();
  return (
    <div>
      <p data-testid="telefon">{state.hesab.telefon ?? "-"}</p>
      <p data-testid="hektar">{state.sahe?.hektar ?? "-"}</p>
      <p data-testid="bitki">{state.chat.crop ?? "-"}</p>
      <button type="button" onClick={() => actions.chatSetCrop("pambiq")}>
        bitkini dəyiş
      </button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  hesabServisi.saheGonder.mockResolvedValue({ yazildi: true });
  hesabServisi.snapshotGonder.mockResolvedValue({});
  hesabServisi.balGonder.mockResolvedValue({});
});
afterEach(() => vi.clearAllMocks());

describe("useHesab — sahə və bitki sinxronu", () => {
  it("yeni cihaz: serverdəki sahə BİTKİSİ İLƏ qəbul edilir, bitkisiz PUT getmir", async () => {
    hesabServisi.hesabVeziyyeti.mockResolvedValue({ telefon: "+994501234567" });
    hesabServisi.saheYukle.mockResolvedValue({
      sahe: { noqteler: NOQTELER, hektar: 94.19, bitki: "bugda" },
      snapshotlar: {},
    });
    seedState({ onboarded: false });
    renderApp(<Sinaq />);

    await waitFor(() => expect(screen.getByTestId("hektar").textContent).toBe("94.19"));
    expect(screen.getByTestId("bitki").textContent).toBe("bugda");
    // Sinxron effekti serverə bitkini NULL ilə göndərməməlidir
    await waitFor(() => expect(hesabServisi.saheGonder).toHaveBeenCalled());
    for (const [arg] of hesabServisi.saheGonder.mock.calls) expect(arg.bitki).toBe("bugda");
  });

  it("bitki dəyişəndə serverə yenidən yazılır", async () => {
    hesabServisi.hesabVeziyyeti.mockResolvedValue({ telefon: "+994501234567" });
    hesabServisi.saheYukle.mockResolvedValue({ sahe: null, snapshotlar: {} });
    seedState({
      onboarded: true,
      hesab: { telefon: "+994501234567" },
      sahe: { noqteler: NOQTELER, hektar: 94.19 },
      chat: { messages: [], crop: "bugda", referral: false },
    });
    renderApp(<Sinaq />);

    await waitFor(() => expect(hesabServisi.saheGonder).toHaveBeenCalledWith(expect.objectContaining({ bitki: "bugda" })));
    screen.getByRole("button", { name: "bitkini dəyiş" }).click();
    await waitFor(() =>
      expect(hesabServisi.saheGonder).toHaveBeenCalledWith(expect.objectContaining({ bitki: "pambiq" })),
    );
  });

  it("sonradan giriş: yerli sahə yoxdursa serverdəki dərhal gəlir (reload gözlənilmir)", async () => {
    hesabServisi.hesabVeziyyeti.mockResolvedValue({ telefon: null });
    hesabServisi.saheYukle.mockResolvedValue({
      sahe: { noqteler: NOQTELER, hektar: 94.19, bitki: "pomidor" },
      snapshotlar: {},
    });
    seedState({ onboarded: false });

    function GirisSinaq() {
      const { actions } = useStore();
      return (
        <>
          <Sinaq />
          <button type="button" onClick={() => actions.hesabTelefon("+994557654321")}>
            daxil ol
          </button>
        </>
      );
    }
    renderApp(<GirisSinaq />);
    expect(screen.getByTestId("hektar").textContent).toBe("-");

    screen.getByRole("button", { name: "daxil ol" }).click();
    await waitFor(() => expect(screen.getByTestId("hektar").textContent).toBe("94.19"));
    expect(screen.getByTestId("bitki").textContent).toBe("pomidor");
  });
});
