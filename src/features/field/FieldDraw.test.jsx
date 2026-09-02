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
      setView: vi.fn(),
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
  // Hal A dəvəti: "Sahə əlavə et" (köhnə hero sətri PDF dizaynı ilə getdi)
  await user.click(screen.getByRole("button", { name: "Sahə əlavə et" }));
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

    await waitFor(() => expect(screen.getByText(/Ən azı 3 künc seçin/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Seçilmiş yerə qayıt" })).toBeInTheDocument();
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

    // Dialoq bağlanır, tətbiq sübut ekranına keçir və növbəti mərhələni deyir
    expect(screen.queryByRole("dialog", { name: "Sahənizi çəkin" })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/fields");
    expect(await screen.findByText("Sahə saxlanıldı")).toBeInTheDocument();
    expect(screen.getByText("Peyk məlumatı toplanır")).toBeInTheDocument();
    expect(screen.getAllByText(/6[.,]\d+ ha/).length).toBeGreaterThan(0);

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
    // Düymə həm sönükdür, həm də NƏYİN çatmadığını deyir — sönük "Sahəni
    // saxla" fermerə sistemin sındığını düşündürürdü
    const saxla = screen.getByRole("button", { name: "Daha 1 künc lazımdır" });
    expect(saxla).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Sahəni saxla/ })).not.toBeInTheDocument();
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
    expect(screen.getByText(/Ən azı 3 künc seçin — 2\/3/)).toBeInTheDocument();
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

    // Yenidən açılır — redaktə keçidi artıq Sahələr ekranındadır
    await user.click(screen.getByRole("button", { name: "Sahələr" }));
    await user.click(screen.getByRole("button", { name: "Dəyiş" }));
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
    // Rayon adı bir neçə yerdə görünür (yer seçicisi + rayon üzrə hava başlığı)
    expect(screen.getAllByText(/Gəncə/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Sahə əlavə et" })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Sahə əlavə et" })).toBeInTheDocument();
  });
});
