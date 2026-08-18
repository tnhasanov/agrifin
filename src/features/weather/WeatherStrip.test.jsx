import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedLocation, seedState, WEATHER_FIXTURE } from "../../test/render.jsx";

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

  // Şaxta gecə vurur: gündüz 34° olan gündə gecə 21° ola bilər və fermerin
  // qərarı gecə rəqəmindən asılıdır
  it("hər gün üçün gündüz və gecə temperaturunu göstərir", async () => {
    cavabVer(WEATHER_FIXTURE);
    renderApp(<App />);

    // Fikstur: gündüz 34,2 / gecə 21
    await waitFor(() => expect(screen.getByText("34°")).toBeInTheDocument());
    expect(screen.getByText("21°")).toBeInTheDocument();
  });

  // Fermerin sualı "sabah necədir" yox, "NEÇƏDƏ"-dir: şaxta gecə 4-də vurur
  it("günə toxunanda o günün saatları açılır", async () => {
    const user = userEvent.setup();
    cavabVer(WEATHER_FIXTURE);
    renderApp(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Bu gün/ })).toBeInTheDocument());

    // Standart bağlıdır — zolaq ilk baxışda qısa qalmalıdır
    expect(screen.queryByText(/Torpaq \(6 sm\)/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Bu gün/ }));

    // Fikstur saatlıq torpaq temperaturu verir
    await waitFor(() => expect(screen.getByText(/Torpaq \(6 sm\)/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Bu gün/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("eyni günə ikinci toxunuş paneli bağlayır", async () => {
    const user = userEvent.setup();
    cavabVer(WEATHER_FIXTURE);
    renderApp(<App />);
    await waitFor(() => screen.getByRole("button", { name: /Bu gün/ }));

    await user.click(screen.getByRole("button", { name: /Bu gün/ }));
    await waitFor(() => screen.getByText(/Torpaq \(6 sm\)/));
    await user.click(screen.getByRole("button", { name: /Bu gün/ }));

    await waitFor(() =>
      expect(screen.queryByText(/Torpaq \(6 sm\)/)).not.toBeInTheDocument(),
    );
  });

  // Bulud ikonu "sabah yağış var" deməkdir, amma NƏ QƏDƏR olduğunu demir.
  // Fermer 0,3 mm-lik damcını da yağış sayıb siqnala inanmırdı.
  it("yağışlı günlərdə neçə mm olduğunu yazır", async () => {
    cavabVer(WEATHER_FIXTURE);
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("12 mm")).toBeInTheDocument());
    expect(screen.getByText("4 mm")).toBeInTheDocument();
  });

  it("damcı səviyyəsində yağışı '<1 mm' kimi verir", async () => {
    cavabVer({
      ...WEATHER_FIXTURE,
      daily: { ...WEATHER_FIXTURE.daily, precipitation_sum: [0, 0.4, 0, 0, 0] },
    });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("<1 mm")).toBeInTheDocument());
  });

  // Fermer "hava mənim sahəm üçündürmü?" deyə soruşur — zolaq özü cavab
  // verməlidir. Sahə çəkilməyibsə proqnoz rayon mərkəzinindir.
  it("sahə çəkilməyibsə proqnozun rayon mərkəzinə aid olduğunu deyir", async () => {
    cavabVer(WEATHER_FIXTURE);
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText(/Proqnoz rayon mərkəzi üçündür/)).toBeInTheDocument(),
    );
  });

  it("sahə çəkilibsə proqnozun sahənin nöqtəsinə aid olduğunu deyir", async () => {
    seedState({
      location: { name: "Ağdam", lat: 39.9911, lon: 46.9297, gps: false },
      onboarded: true,
      sahe: {
        hektar: 4.4,
        noqteler: [
          [39.99, 46.93],
          [39.9923, 46.93],
          [39.9923, 46.9329],
          [39.99, 46.9329],
        ],
      },
      chat: { messages: [], crop: "bugda", referral: false },
    });
    cavabVer(WEATHER_FIXTURE);
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText("Proqnoz sahənizin öz nöqtəsi üçündür.")).toBeInTheDocument(),
    );
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
    expect(screen.getByText("Məhsul dövrü krediti al")).toBeInTheDocument();
  });
});
