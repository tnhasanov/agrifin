import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import App from "../../App.jsx";
import { renderApp, seedState, WEATHER_FIXTURE } from "../../test/render.jsx";
import { DEFAULT_LOCATION } from "../../services/location.js";

const bugun = new Date().toISOString().slice(0, 10);
const gunEvvel = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

/** Üç ölçmə: 72% → 68% → 61% (düşən mövsüm) */
const SERIYA = [
  { baslangic: gunEvvel(16), son: gunEvvel(11), ndvi: 0.72, nemlik: 0.3, ortulu: 0 },
  { baslangic: gunEvvel(11), son: gunEvvel(6), ndvi: 0.68, nemlik: 0.25, ortulu: 0 },
  { baslangic: gunEvvel(6), son: bugun, ndvi: 0.61, nemlik: -0.05, ortulu: 0 },
];

function stubApi({ seriya = SERIYA } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (String(url).includes("/api/ndvi")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ seriya }) });
      }
      if (String(url).includes("/api/")) return Promise.resolve({ ok: false, status: 501 });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) });
    }),
  );
}

function seed() {
  seedState({
    location: DEFAULT_LOCATION,
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

beforeEach(() => {
  window.history.pushState({}, "", "/advisor");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sahə lenti — məsləhət ekranı", () => {
  it("hər ölçmə tarixi və faizi ilə bir sətirdir, ən yenisi üstdə", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Sahə lenti")).toBeInTheDocument());
    const setirler = screen.getAllByText("Peyk ölçməsi");
    expect(setirler).toHaveLength(3);

    // Ən yeni ölçmə (61%) siyahının başındadır
    const kart = setirler[0].closest("div.giris");
    expect(within(kart).getByText("61%")).toBeInTheDocument();
    expect(within(kart).getByText("Bu gün · Sentinel-2")).toBeInTheDocument();
  });

  // Monzo lentindəki məbləğ dəyişməsi kimi: hər sətir əvvəlkinə görə fərqi deyir
  it("dəyişmə əvvəlki ölçmə ilə müqayisədə göstərilir", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => screen.getByText("Sahə lenti"));
    // 68% → 61%: son sətirdə ▼ 7 bənd
    expect(screen.getByText(/▼ 7 b\./)).toBeInTheDocument();
    // 72% → 68%
    expect(screen.getByText(/▼ 4 b\./)).toBeInTheDocument();
  });

  it("ilk ölçmənin müqayisəsi yoxdur — uydurma fərq yazılmır", async () => {
    seed();
    stubApi({ seriya: [SERIYA[0]] });
    renderApp(<App />);

    await waitFor(() => screen.getByText("Sahə lenti"));
    expect(screen.queryByText(/▼|▲/)).not.toBeInTheDocument();
  });

  it("ölçmə yoxdursa lent də yoxdur — nümunə sətir uydurulmur", async () => {
    seed();
    stubApi({ seriya: [] });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Aqronom köməkçisi")).toBeInTheDocument());
    expect(screen.queryByText("Sahə lenti")).not.toBeInTheDocument();
  });

  // Pəncərə 150 gündür (bax: useNdvi) — 30-a qədər ölçmə telefonda
  // sonsuz siyahıdır. Lent kəsilir, amma kəsilmə GİZLİ QALMIR.
  it("çox ölçmədə lent son 10-u göstərir və qalanını açıq deyir", async () => {
    seed();
    const cox = Array.from({ length: 26 }, (_, i) => ({
      baslangic: gunEvvel(150 - i * 5),
      son: gunEvvel(145 - i * 5),
      ndvi: 0.4 + i * 0.01,
      nemlik: 0.25,
    }));
    stubApi({ seriya: cox });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Sahə lenti")).toBeInTheDocument());
    expect(screen.getAllByText("Peyk ölçməsi")).toHaveLength(10);
    expect(screen.getByText("Daha 16 ölçmə göstərilmir · son 150 gündə cəmi 26")).toBeInTheDocument();
  });

  it("ölçmə azdırsa kəsilmə qeydi yazılmır", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Sahə lenti")).toBeInTheDocument());
    expect(screen.queryByText(/göstərilmir/)).not.toBeInTheDocument();
  });
});
