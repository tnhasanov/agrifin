import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import App from "../../App.jsx";
import { renderApp, seedState } from "../../test/render.jsx";
import { KOHNE_GUN, radarLazimdir } from "./useRadar.js";

vi.mock("../ndvi/XeriteQati.jsx", () => ({
  XeriteQati: ({ sekil, etiket }) => <img src={sekil} alt={etiket} />,
}));

const bugun = new Date().toISOString().slice(0, 10);
const gunEvvel = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

const SAHE = {
  hektar: 6.5,
  noqteler: [
    [40.4, 47.1],
    [40.4023, 47.1],
    [40.4023, 47.1029],
    [40.4, 47.1029],
  ],
};

let radarSorgusu = 0;

/**
 * @param seriya  Sentinel-2 seriyası — boş massiv "buludlu" deməkdir
 * @param radar   Sentinel-1 seriyası
 */
function stubApi({ seriya = [], radar = [], radarStatus = 200 } = {}) {
  radarSorgusu = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      const yol = String(url);
      if (yol.includes("/api/radar")) {
        radarSorgusu += 1;
        return Promise.resolve(
          radarStatus === 200
            ? { ok: true, status: 200, json: () => Promise.resolve({ seriya: radar }) }
            : { ok: false, status: radarStatus },
        );
      }
      if (yol.includes("/api/ndvi")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ seriya }) });
      }
      if (yol.includes("/api/saheSekli")) return Promise.resolve({ ok: false, status: 501 });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }),
  );
}

function seed() {
  seedState({
    location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
    onboarded: true,
    sahe: SAHE,
    chat: { messages: [], crop: "bugda", referral: false },
  });
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("radarın çağırılma şərti", () => {
  it("optik ölçmə təzədirsə radar lazım deyil", () => {
    expect(radarLazimdir({ hal: "hazir", xulase: { tarix: bugun } })).toBe(false);
  });

  it("optik ölçmə köhnəlibsə radar lazımdır", () => {
    expect(radarLazimdir({ hal: "hazir", xulase: { tarix: gunEvvel(KOHNE_GUN) } })).toBe(true);
  });

  it("heç bir təmiz ölçmə yoxdursa radar lazımdır", () => {
    expect(radarLazimdir({ hal: "olcmeYox", xulase: null })).toBe(true);
  });

  // Xəta buludla bağlı deyil — açar və ya şəbəkə problemidir, radar da işləməz
  it("optik ölçmə xəta verirsə radar çağırılmır", () => {
    expect(radarLazimdir({ hal: "xeta", xulase: null })).toBe(false);
    expect(radarLazimdir({ hal: "yoxdur", xulase: null })).toBe(false);
  });
});

describe("radar ölçməsi — əsas ekran", () => {
  // KVOTA: günəşli həftədə ikinci peyk sorğusu boş xərcdir
  it("optik ölçmə təzə olanda radar sorğusu göndərilmir", async () => {
    seed();
    stubApi({ seriya: [{ baslangic: "2026-07-22", son: bugun, ndvi: 0.68, nemlik: 0.3, ortulu: 0 }] });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument());
    expect(radarSorgusu).toBe(0);
  });

  it("bulud üzündən ölçmə olmayanda radar çağırılır və nəticəni yazır", async () => {
    seed();
    stubApi({
      seriya: [],
      radar: [
        { baslangic: gunEvvel(18), son: gunEvvel(12), vv: -13, vh: -19, suPayi: 0.01 },
        { baslangic: gunEvvel(12), son: gunEvvel(3), vv: -9, vh: -17, suPayi: 0.02 },
      ],
    });
    renderApp(<App />);

    await waitFor(() => expect(radarSorgusu).toBe(1));
    // Optik peykin susduğu yerdə radar danışır
    await waitFor(() =>
      expect(screen.getByText("Torpaq son ölçmələrə nisbətən nəmlənib.")).toBeInTheDocument(),
    );
    expect(screen.getByText(/buludun arxasından/)).toBeInTheDocument();
  });

  it("durmuş suyu təcili siqnal kimi göstərir", async () => {
    seed();
    stubApi({
      seriya: [],
      radar: [
        { baslangic: gunEvvel(12), son: gunEvvel(6), vv: -12, vh: -19, suPayi: 0.02 },
        { baslangic: gunEvvel(6), son: gunEvvel(1), vv: -19, vh: -24, suPayi: 0.31 },
      ],
    });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Sahədə su durub")).toBeInTheDocument());
    expect(screen.getByText(/təxminən 31%-ni su altında/)).toBeInTheDocument();
  });

  // Ölçmə yoxdursa nümunə rəqəmi göstərmək "72% örtük" ilə "ölçmə yoxdur"
  // cümlələrini yan-yana qoyurdu — biri o birini yalanlayır
  it("optik ölçmə yoxdursa örtük faizi nümunə rəqəmi göstərmir", async () => {
    seed();
    stubApi({ seriya: [], radar: [] });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/buludlu olub/)).toBeInTheDocument());
    expect(screen.getByText("Bitki örtüyü").parentElement).toHaveTextContent("—");
    expect(screen.queryByText(/72%/)).not.toBeInTheDocument();
  });

  // Radar da alınmasa fermer səbəbini bilməlidir — boş yer qalmamalıdır
  it("radar sorğusu alınmasa səbəbi yazır", async () => {
    seed();
    stubApi({ seriya: [], radarStatus: 502 });
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText("Radar ölçməsi alınmadı")).toBeInTheDocument(),
    );
    // Optik ölçmənin öz mesajı yerində qalır
    expect(screen.getByText(/buludlu olub/)).toBeInTheDocument();
  });
});
