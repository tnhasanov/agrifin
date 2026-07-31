import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedLocation } from "../../test/render.jsx";

// Leaflet jsdom-da işləmir (həqiqi ölçülər tələb edir), ona görə xəritə
// imitasiya olunur. Toxunuşlar `xeriteyeToxun` ilə ötürülür — komponentin
// map.on("click") ilə qeyd etdiyi funksiyaya düşür.
const { leafletMock } = vi.hoisted(() => {
  const state = { clickHandler: null, markers: [] };

  const marker = (latlng) => {
    const m = {
      latlng: { ...latlng },
      getLatLng: () => m.latlng,
      on: vi.fn(),
      addTo: () => m,
    };
    return m;
  };

  const L = {
    map: () => ({
      on: (event, handler) => {
        if (event === "click") state.clickHandler = handler;
      },
      remove: vi.fn(),
      removeLayer: vi.fn(),
      fitBounds: vi.fn(),
      addLayer: vi.fn(),
    }),
    tileLayer: () => ({ addTo: vi.fn() }),
    control: { zoom: () => ({ addTo: vi.fn() }) },
    divIcon: (options) => options,
    marker: (latlng) => {
      const m = marker(latlng);
      state.markers.push(m);
      return m;
    },
    polygon: () => {
      const p = { setLatLngs: vi.fn(), addTo: () => p };
      return p;
    },
  };

  return { leafletMock: { state, L } };
});

vi.mock("leaflet", () => ({ default: leafletMock.L }));
vi.mock("leaflet/dist/leaflet.css", () => ({}));

const xeriteyeToxun = (lat, lng) =>
  act(() => leafletMock.state.clickHandler?.({ latlng: { lat, lng } }));

// Bərdə yaxınlığında ~6.5 ha (260×250 m) dördbucaqlının küncləri
const KUNCLER = [
  [40.4, 47.1],
  [40.40234, 47.1],
  [40.40234, 47.10294],
  [40.4, 47.10294],
];

async function acFieldDraw(user) {
  await user.click(screen.getByRole("button", { name: /Sahəmi xəritədə çək/ }));
  await waitFor(() =>
    expect(screen.getByRole("dialog", { name: "Sahənizi çəkin" })).toBeInTheDocument(),
  );
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  seedLocation();
  leafletMock.state.clickHandler = null;
  leafletMock.state.markers = [];
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sahə çəkmə", () => {
  it("əsas ekrandan açılır və toxunuş göstərişi verir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acFieldDraw(user);

    await waitFor(() => expect(screen.getByText(/Künclərə toxunun/)).toBeInTheDocument());
  });

  it("künclər qoyulduqca sahə hektarla canlı görünür", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acFieldDraw(user);
    await waitFor(() => expect(leafletMock.state.clickHandler).toBeTruthy());

    for (const [lat, lng] of KUNCLER) xeriteyeToxun(lat, lng);

    // 260×250 m ≈ 6.5 ha
    expect(screen.getByText(/6[.,]\d+ hektar/)).toBeInTheDocument();
  });

  it("saxlanan sahə store-a düşür və əsas ekranda görünür", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acFieldDraw(user);
    await waitFor(() => expect(leafletMock.state.clickHandler).toBeTruthy());

    for (const [lat, lng] of KUNCLER) xeriteyeToxun(lat, lng);
    await user.click(screen.getByRole("button", { name: /Sahəni saxla/ }));

    // Dialoq bağlanır, əsas ekranda həqiqi hektar
    expect(screen.queryByRole("dialog", { name: "Sahənizi çəkin" })).not.toBeInTheDocument();
    expect(screen.getByText(/Sahəm: 6[.,]\d+ ha/)).toBeInTheDocument();

    const saxlanan = JSON.parse(window.localStorage.getItem("agrifin:state")).state;
    expect(saxlanan.sahe.noqteler).toHaveLength(4);
    expect(saxlanan.sahe.hektar).toBeCloseTo(6.5, 0);
  });

  it("öz-özünü kəsən konturu saxlamağa qoymur", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acFieldDraw(user);
    await waitFor(() => expect(leafletMock.state.clickHandler).toBeTruthy());

    // Papyon: kənarlar çarpazlaşır
    xeriteyeToxun(40.4, 47.1);
    xeriteyeToxun(40.402, 47.102);
    xeriteyeToxun(40.402, 47.1);
    xeriteyeToxun(40.4, 47.102);
    await user.click(screen.getByRole("button", { name: /Sahəni saxla/ }));

    expect(screen.getByRole("alert")).toHaveTextContent("Kontur öz-özünü kəsir");
    // Dialoq açıq qalır, store-a heç nə düşmür
    expect(screen.getByRole("dialog", { name: "Sahənizi çəkin" })).toBeInTheDocument();
    const saxlanan = JSON.parse(window.localStorage.getItem("agrifin:state")).state;
    expect(saxlanan.sahe ?? null).toBeNull();
  });

  it("3 küncdən az ikən saxla düyməsi qeyri-aktivdir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acFieldDraw(user);
    await waitFor(() => expect(leafletMock.state.clickHandler).toBeTruthy());

    xeriteyeToxun(40.4, 47.1);
    xeriteyeToxun(40.402, 47.1);
    expect(screen.getByRole("button", { name: /Sahəni saxla/ })).toBeDisabled();
  });

  it("geri al son küncü silir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acFieldDraw(user);
    await waitFor(() => expect(leafletMock.state.clickHandler).toBeTruthy());

    for (const [lat, lng] of KUNCLER) xeriteyeToxun(lat, lng);
    expect(screen.getByText(/hektar/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Geri al" }));
    // 3 künc qalıb — hələ də sahə var, amma fərqli
    await user.click(screen.getByRole("button", { name: "Geri al" }));
    // 2 künc — sahə yox, yenidən göstəriş
    expect(screen.getByText(/Künclərə toxunun \(2\/3\+\)/)).toBeInTheDocument();
  });

  it("rayondan uzaq sahə xəbərdarlıqla saxlanılır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acFieldDraw(user);
    await waitFor(() => expect(leafletMock.state.clickHandler).toBeTruthy());

    // Bərdə seçilib, sahə Lənkərandadır
    xeriteyeToxun(38.75, 48.85);
    xeriteyeToxun(38.7523, 48.85);
    xeriteyeToxun(38.7523, 48.853);
    xeriteyeToxun(38.75, 48.853);
    await user.click(screen.getByRole("button", { name: /Sahəni saxla/ }));

    expect(screen.queryByRole("dialog", { name: "Sahənizi çəkin" })).not.toBeInTheDocument();
    expect(screen.getByText(/rayondan uzaqdır/)).toBeInTheDocument();
  });

  it("mövcud sahə redaktəyə açılır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acFieldDraw(user);
    await waitFor(() => expect(leafletMock.state.clickHandler).toBeTruthy());
    for (const [lat, lng] of KUNCLER) xeriteyeToxun(lat, lng);
    await user.click(screen.getByRole("button", { name: /Sahəni saxla/ }));

    // Yenidən açılır — künclər yerindədir
    await user.click(screen.getByRole("button", { name: /Sahəm: .* ha — dəyiş/ }));
    await waitFor(() => expect(screen.getByText(/6[.,]\d+ hektar/)).toBeInTheDocument());
  });
});

describe("saxlanan sahənin yüklənməsi", () => {
  it("v3 → v4 miqrasiyası sahəsiz keçir, məlumat itmir", () => {
    window.localStorage.setItem(
      "agrifin:state",
      JSON.stringify({
        version: 3,
        state: {
          location: { name: "Gəncə", lat: 40.68, lon: 46.36, gps: false },
          onboarded: true,
        },
      }),
    );
    renderApp(<App />);
    expect(screen.getByText(/Gəncə/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sahəmi xəritədə çək/ })).toBeInTheDocument();
  });

  it("zədələnmiş sahə konturu səssizcə atılır", () => {
    window.localStorage.setItem(
      "agrifin:state",
      JSON.stringify({
        version: 4,
        state: {
          location: { name: "Gəncə", lat: 40.68, lon: 46.36, gps: false },
          onboarded: true,
          sahe: { noqteler: [[999, 999]], hektar: NaN },
        },
      }),
    );
    renderApp(<App />);
    // Tətbiq çökmür, sahə çəkilməmiş sayılır
    expect(screen.getByRole("button", { name: /Sahəmi xəritədə çək/ })).toBeInTheDocument();
  });
});
