import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HesabatDuymesi } from "./HesabatDuymesi.jsx";
import { renderApp, seedState } from "../../test/render.jsx";
import { DEFAULT_LOCATION } from "../../services/location.js";

// jsPDF və şrift (~110 KB base64) testdə yüklənmir: burada yoxlanılan şey
// sənədin ÇƏKİLİŞİ deyil, düymənin davranışıdır.
const pdfQur = vi.fn(() => ({
  output: (nov) => (nov === "blob" ? new Blob(["%PDF"], { type: "application/pdf" }) : ""),
}));
vi.mock("./pdfQur.js", () => ({ pdfQur: (...a) => pdfQur(...a) }));
vi.mock("../../services/ndvi.js", async (esl) => ({
  ...(await esl()),
  fetchSaheSekli: vi.fn(() => Promise.resolve({ sekil: null })),
}));

const SAHE = {
  hektar: 10,
  noqteler: [
    [40.4, 47.1],
    [40.4023, 47.1],
    [40.4023, 47.1029],
    [40.4, 47.1029],
  ],
};

const PEYK_HAZIR = {
  hal: "hazir",
  xulase: { ndvi: 0.68, istiqamet: "artir", suSeviyyesi: "kafi", tarix: "2026-08-30" },
  seriya: [{ son: "2026-08-30", ndvi: 0.68 }],
};

function ciz(props = {}) {
  seedState({
    location: DEFAULT_LOCATION,
    onboarded: true,
    sahe: SAHE,
    chat: { messages: [], crop: "pomidor", referral: false },
  });
  return renderApp(<HesabatDuymesi peyk={PEYK_HAZIR} {...props} />);
}

beforeEach(() => {
  pdfQur.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("hesabat düyməsi", () => {
  it("ölçmə hazır deyilsə düymə göstərilmir — boş sənəd təklif olunmur", () => {
    ciz({ peyk: { hal: "gedir", xulase: null } });
    expect(screen.queryByRole("button", { name: /pasport/i })).not.toBeInTheDocument();
  });

  it("sahə çəkilməyibsə düymə göstərilmir", () => {
    seedState({ location: DEFAULT_LOCATION, onboarded: true, sahe: null });
    renderApp(<HesabatDuymesi peyk={PEYK_HAZIR} />);
    expect(screen.queryByRole("button", { name: /pasport/i })).not.toBeInTheDocument();
  });

  it("basılanda sənəd qurulur və fayl endirilir", async () => {
    const user = userEvent.setup();
    const yarat = vi.fn(() => "blob:sened");
    vi.stubGlobal("URL", { ...URL, createObjectURL: yarat, revokeObjectURL: vi.fn() });
    const basma = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    ciz();
    await user.click(screen.getByRole("button", { name: /pasport/i }));

    await waitFor(() => expect(pdfQur).toHaveBeenCalledTimes(1));
    expect(basma).toHaveBeenCalled();
    // Sənədə gedən məlumat düymənin özündə deyil, hesabatMelumati()-də yığılır
    expect(pdfQur.mock.calls[0][0].melumat.sahe.noqteSayi).toBe(4);
    basma.mockRestore();
  });

  it("paylaşma vərəqi faylı qəbul edirsə endirmə əvəzinə paylaşılır", async () => {
    const user = userEvent.setup();
    const paylas = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", {
      ...navigator,
      canShare: () => true,
      share: paylas,
      clipboard: navigator.clipboard,
    });

    ciz();
    await user.click(screen.getByRole("button", { name: /pasport/i }));

    await waitFor(() => expect(paylas).toHaveBeenCalledTimes(1));
    expect(paylas.mock.calls[0][0].files).toHaveLength(1);
  });

  it("sənəd qurulmasa xəta görünür", async () => {
    const user = userEvent.setup();
    pdfQur.mockImplementationOnce(() => {
      throw new Error("şrift yüklənmədi");
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    ciz();
    await user.click(screen.getByRole("button", { name: /pasport/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
