import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState, WEATHER_FIXTURE } from "../../test/render.jsx";
import { DEFAULT_LOCATION } from "../../services/location.js";

const SAHE = {
  hektar: 10,
  noqteler: [
    [40.4, 47.1],
    [40.4023, 47.1],
    [40.4023, 47.1029],
    [40.4, 47.1029],
  ],
};

function seed({ sahe = SAHE, crop = "pomidor" } = {}) {
  seedState({
    location: DEFAULT_LOCATION,
    onboarded: true,
    sahe,
    chat: { messages: [], crop, referral: false },
  });
}

/**
 * Kredit vəziyyəti SERVERDƏN gəlir — localStorage-a müraciət "əkmək" artıq
 * mümkün deyil (bax: api/kredit.js). Testlər serveri təqlid edir.
 */
function serverVeziyyeti(veziyyet) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url, secim) => {
      if (String(url).includes("/api/kredit")) {
        const govde = secim?.body ? JSON.parse(secim.body) : null;
        if (govde?.emel === "legv") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ muraciet: null, qerar: null, teklif: null, kredit: null }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(veziyyet) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) });
    }),
  );
}

beforeEach(() => {
  window.history.pushState({}, "", "/money");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mövsüm pulu — Pul ekranı", () => {
  it("mövsümün qövsünü və gəlir aralığını göstərir", async () => {
    seed();
    renderApp(<App />);

    expect(await screen.findByText("Pomidor mövsümü")).toBeInTheDocument();
    // Avqust pomidorun biçin ayıdır — test hansı ayda işləsə də sağ küncdə
    // ya "Biçinə N ay", ya "Biçin ayıdır" dayanır
    expect(screen.getByText(/Biçinə \d+ ay|Biçin ayıdır/)).toBeInTheDocument();
    // Gəlir TƏK RƏQƏM DEYİL: kalibrlənməmiş modeldən aralıq göstərilir
    expect(screen.getByText("Gözlənilən xalis gəlir")).toBeInTheDocument();
    // Aralıq indi zolaqdır: uc rəqəmləri ayrı-ayrı sətirlərdədir, tam
    // aralıq isə zolağın əlçatan adındadır (ekran oxuyucu da eşidir)
    expect(
      screen.getByRole("img", { name: /Gözlənilən xalis gəlir aralığı: .*₼ – .*₼/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mövsümün xərci")).toBeInTheDocument();
    // Mənbə gizlədilmir
    expect(screen.getByText(/kalibrlənməmiş model/)).toBeInTheDocument();
  });

  it("sahə çəkilməyibsə kart ümumiyyətlə yoxdur — uydurma mövsüm olmaz", () => {
    seed({ sahe: null });
    renderApp(<App />);

    expect(screen.queryByText(/mövsümü$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Gözlənilən xalis gəlir")).not.toBeInTheDocument();
  });

  it("bitki seçilməyibsə kart yoxdur", () => {
    seed({ crop: null });
    renderApp(<App />);

    expect(screen.queryByText("Gözlənilən xalis gəlir")).not.toBeInTheDocument();
  });

  it("gözləyən müraciət bağlanmalı əsas borc sətri kimi görünür", async () => {
    seed();
    serverVeziyyeti({
      muraciet: { id: 1, hal: "reviewing", mebleg: 3000, muddetAy: 10, bitki: "pomidor" },
      qerar: null,
      teklif: null,
      kredit: null,
    });
    renderApp(<App />);
    await screen.findByText("Bağlanmalı əsas borc (müraciət)");

    // Faiz aylıq ödənilir və qalığa hesablanır — "yekun ödəniş" rəqəmi
    // yoxdur, kartda əsas borcun özü görünür
    expect(screen.getByText("Bağlanmalı əsas borc (müraciət)")).toBeInTheDocument();
    expect(screen.getByText("−3.000 ₼")).toBeInTheDocument();
  });

  it("müraciət yoxdursa borc sətri də yoxdur", () => {
    seed();
    renderApp(<App />);

    expect(screen.queryByText("Bağlanmalı əsas borc (müraciət)")).not.toBeInTheDocument();
  });

  // Müraciət kartı LoanSheet-i açır və ləğv oradan mümkündür
  it("müraciəti panelin içindən geri götürmək olur", async () => {
    const user = userEvent.setup();
    seed();
    serverVeziyyeti({
      muraciet: { id: 1, hal: "reviewing", mebleg: 3000, muddetAy: 10, bitki: "pomidor" },
      qerar: null,
      teklif: null,
      kredit: null,
    });
    renderApp(<App />);

    await user.click(await screen.findByRole("button", { name: "Gözləyən müraciətiniz var" }));
    expect(await screen.findByText(/müraciətiniz baxılır/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Müraciəti geri götür" }));
    // Serverin qaytardığı yeni vəziyyət: müraciət yoxdur → kart itir
    await waitFor(() =>
      expect(screen.queryByText(/Kredit müraciəti —/)).not.toBeInTheDocument(),
    );
  });
});
