import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
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

function seed({ sahe = SAHE, crop = "pomidor", muraciet = null } = {}) {
  seedState({
    location: DEFAULT_LOCATION,
    onboarded: true,
    sahe,
    chat: { messages: [], crop, referral: false },
    ...(muraciet ? { muraciet } : {}),
  });
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
  it("mövsümün qövsünü və gəlir aralığını göstərir", () => {
    seed();
    renderApp(<App />);

    expect(screen.getByText("Pomidor mövsümü")).toBeInTheDocument();
    // Avqust pomidorun biçin ayıdır — test hansı ayda işləsə də sağ küncdə
    // ya "Biçinə N ay", ya "Biçin ayıdır" dayanır
    expect(screen.getByText(/Biçinə \d+ ay|Biçin ayıdır/)).toBeInTheDocument();
    // Gəlir TƏK RƏQƏM DEYİL: kalibrlənməmiş modeldən aralıq göstərilir
    expect(screen.getByText("Gözlənilən xalis gəlir")).toBeInTheDocument();
    expect(screen.getByText(/₼ – .*₼/)).toBeInTheDocument();
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

  it("gözləyən müraciət bağlanmalı əsas borc sətri kimi görünür", () => {
    seed({
      muraciet: {
        mebleg: 3000,
        ayliqFaiz: 29,
        muddetAy: 10,
        odemeTarixi: "2027-06-01T00:00:00.000Z",
        bitki: "pomidor",
        hektar: 10,
        tavan: 6000,
        tarix: "2026-08-26T00:00:00.000Z",
        hal: "gozleyir",
      },
    });
    renderApp(<App />);

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
    seed({
      muraciet: {
        mebleg: 3000,
        ayliqFaiz: 29,
        muddetAy: 10,
        odemeTarixi: "2027-06-01T00:00:00.000Z",
        bitki: "pomidor",
        hektar: 10,
        tavan: 6000,
        tarix: "2026-08-26T00:00:00.000Z",
        hal: "gozleyir",
      },
    });
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Gözləyən müraciətiniz var" }));
    expect(screen.getByText(/müraciət baxılmadadır/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Müraciəti geri götür" }));
    // Panel slayder addımına qayıdır, kart isə silinir
    expect(screen.queryByText(/Kredit müraciəti —/)).not.toBeInTheDocument();
  });
});
