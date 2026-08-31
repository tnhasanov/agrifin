import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState, WEATHER_FIXTURE } from "../../test/render.jsx";
import { ehateliSiqnallar, menbeSetri } from "./siqnalEhate.js";

/**
 * SİQNAL ƏHATƏSİ — sahəsiz fermerə sahə dəlili iddia edilmir.
 *
 * Brief B: sahə yoxdursa hava xəbərdarlıqları YALNIZ rayon adı ilə göstərilir;
 * "Sahənizdən", "sahənin koordinatı" və peyk iddiaları qadağandır.
 */

// Şaxtalı proqnoz: sahəsiz də doğulan hava siqnalı (mənbə = siqnal.menbe.hava)
const SAXTALI = {
  ...WEATHER_FIXTURE,
  daily: {
    ...WEATHER_FIXTURE.daily,
    temperature_2m_min: [-1, 2, 3, 4, 5],
  },
};

const XACMAZ = { name: "Xaçmaz", lat: 41.4566, lon: 48.8022, gps: false };

function stubApi(hava = SAXTALI) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) =>
      String(url).includes("/api/")
        ? Promise.resolve({ ok: false, status: 501, json: () => Promise.resolve({}) })
        : Promise.resolve({ ok: true, json: () => Promise.resolve(hava) }),
    ),
  );
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

afterEach(() => vi.unstubAllGlobals());

describe("siqnalEhate — saf funksiyalar", () => {
  const hava = { id: "a", menbeKey: "siqnal.menbe.hava" };
  const rutubet = { id: "b", menbeKey: "siqnal.menbe.rutubet" };
  const peyk = { id: "c", menbeKey: "siqnal.menbe.peyk" };
  const radar = { id: "d", menbeKey: "siqnal.menbe.radar" };
  const birge = { id: "e", menbeKey: "siqnal.menbe.hamisi" };

  it("sahə varsa siyahı və mənbə toxunulmaz qalır", () => {
    const hamisi = [hava, peyk, radar, birge];
    expect(ehateliSiqnallar(hamisi, true)).toBe(hamisi);
    expect(menbeSetri(hava, { saheVar: true, rayon: "Xaçmaz" })).toEqual({
      key: "siqnal.menbe.hava",
      vars: null,
    });
  });

  it("sahə yoxdursa peyk/radar mənbəli siqnallar süzülür", () => {
    expect(ehateliSiqnallar([hava, peyk, radar, birge, rutubet], false)).toEqual([hava, rutubet]);
  });

  it("sahə yoxdursa hava mənbəyi rayon adı ilə yazılır", () => {
    expect(menbeSetri(hava, { saheVar: false, rayon: "Xaçmaz" })).toEqual({
      key: "siqnal.menbe.havaRayon",
      vars: { rayon: "Xaçmaz" },
    });
    expect(menbeSetri(rutubet, { saheVar: false, rayon: "Xaçmaz" })).toEqual({
      key: "siqnal.menbe.rutubetRayon",
      vars: { rayon: "Xaçmaz" },
    });
  });

  it("tanınmayan mənbə olduğu kimi qalır", () => {
    expect(menbeSetri({ menbeKey: "siqnal.menbe.yeni" }, { saheVar: false })).toEqual({
      key: "siqnal.menbe.yeni",
      vars: null,
    });
    expect(menbeSetri(null, { saheVar: false })).toEqual({ key: undefined, vars: null });
  });
});

describe("sahəsiz fermer — rayon dili", () => {
  it("Kömək ekranında başlıq rayon üzrədir, sahə iddiası yoxdur", async () => {
    const user = userEvent.setup();
    seedState({ location: XACMAZ, onboarded: true });
    stubApi();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Kömək" }));

    expect(await screen.findByText("Xaçmaz üzrə hava xəbərdarlıqları")).toBeInTheDocument();
    // QADAĞAN OLUNAN CÜMLƏLƏR
    expect(screen.queryByText(/Sahənizdən/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sahənin koordinatı/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sahənizdə/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sentinel/)).not.toBeInTheDocument();
    // Aqro kartının vədi də sahə/peyk iddiası daşımır
    expect(
      screen.queryByText("Sahənizin havası və peyk göstəriciləri nəzərə alınır"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Xaçmaz üzrə hava proqnozu nəzərə alınır")).toBeInTheDocument();
  });

  it("siqnal kartının mənbə sətri rayon mərkəzini göstərir", async () => {
    const user = userEvent.setup();
    seedState({ location: XACMAZ, onboarded: true });
    stubApi();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Kömək" }));
    expect(await screen.findByText("Şaxta riski")).toBeInTheDocument();
    expect(screen.getAllByText("Hava proqnozu · Xaçmaz rayon mərkəzi").length).toBeGreaterThan(0);
  });

  it("bildiriş paneli də rayon dilində danışır", async () => {
    const user = userEvent.setup();
    seedState({ location: XACMAZ, onboarded: true });
    stubApi();
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Bildirişlər/ })).toHaveAccessibleName(/\d+ yeni/),
    );
    await user.click(screen.getByRole("button", { name: /Bildirişlər/ }));

    const panel = within(await screen.findByRole("dialog", { name: "Bildirişlər" }));
    expect(panel.getByText(/Xaçmaz üzrə \d+ açıq hava xəbərdarlığı/)).toBeInTheDocument();
    expect(panel.queryByText(/Sahənizdən/)).not.toBeInTheDocument();
  });

  it("hava zolağının başlığı 'Sahədə hava' demir", async () => {
    seedState({ location: XACMAZ, onboarded: true });
    stubApi();
    renderApp(<App />);

    expect(await screen.findByText("Xaçmaz üzrə hava")).toBeInTheDocument();
    expect(screen.queryByText("Sahədə hava")).not.toBeInTheDocument();
  });
});

describe("sahəsi olan fermer — sahə dili qalır", () => {
  it("başlıq və mənbə sahəyə istinad edir", async () => {
    const user = userEvent.setup();
    seedState({
      location: XACMAZ,
      onboarded: true,
      sahe: {
        hektar: 10,
        noqteler: [
          [41.45, 48.8],
          [41.4523, 48.8],
          [41.4523, 48.8029],
          [41.45, 48.8029],
        ],
      },
      chat: { messages: [], crop: "alma", referral: false },
    });
    stubApi();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Kömək" }));
    expect(await screen.findByText("Sahənizdən siqnallar")).toBeInTheDocument();
    expect(screen.queryByText("Xaçmaz üzrə hava xəbərdarlıqları")).not.toBeInTheDocument();
    expect(screen.getAllByText("Hava proqnozu · sahənin koordinatı").length).toBeGreaterThan(0);
  });
});
