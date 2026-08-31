import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByText("Sahə lenti")).toBeInTheDocument());

    // Siyahı YIĞILIB: əsas cavab qrafikdədir (bax: VegetasiyaQrafiki)
    expect(screen.getByRole("button", { name: /Bütün ölçmələr \(3\)/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getAllByText("Peyk ölçməsi")[0]).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: /Bütün ölçmələr/ }));
    const setirler = screen.getAllByText("Peyk ölçməsi");
    expect(setirler).toHaveLength(3);
    expect(setirler[0]).toBeVisible();

    // Ən yeni ölçmə (61%) siyahının başındadır
    const kart = setirler[0].closest("div.giris");
    expect(within(kart).getByText("61%")).toBeInTheDocument();
    expect(within(kart).getByText("Bu gün · Sentinel-2")).toBeInTheDocument();

    // Təkrar toxunuş bağlayır
    await user.click(screen.getByRole("button", { name: /Ölçmələri gizlət/ }));
    expect(screen.getAllByText("Peyk ölçməsi")[0]).not.toBeVisible();
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

  // 150 günlük pəncərədə 30-a qədər ölçmə gəlir — düymə sayı özü deyir,
  // yəni fermer açmadan da nə qədər sübut olduğunu bilir
  it("düymə ölçmə sayını göstərir, siyahı açılanda hamısı gəlir", async () => {
    const user = userEvent.setup();
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
    expect(screen.getByRole("button", { name: /Bütün ölçmələr \(26\)/ })).toBeInTheDocument();

    // Açılanda HAMISI gəlir — kəsilmiş siyahı deyil
    await user.click(screen.getByRole("button", { name: /Bütün ölçmələr/ }));
    expect(screen.getAllByText("Peyk ölçməsi")).toHaveLength(26);
  });
});
