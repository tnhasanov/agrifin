import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState } from "../../test/render.jsx";

const bugun = new Date().toISOString().slice(0, 10);

/** 2017-dən bu ilə: hər il əkilmiş, ətrafdan yuxarı sahə */
function movsumler({ bosIl = null } = {}) {
  const sonIl = new Date().getFullYear();
  const siyahi = [];
  for (let il = 2017; il <= sonIl; il += 1) {
    siyahi.push({
      il,
      zirve: il === bosIl ? 0.12 : 0.72,
      zirveAyi: `${il}-05`,
      etrafMedyan: 0.6,
      olcmeSayi: 6,
    });
  }
  return siyahi;
}

let tarixceSorgusu = 0;

function stubApi({ movsumSiyahisi = movsumler(), tarixceStatus = 200 } = {}) {
  tarixceSorgusu = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      const yol = String(url);
      if (yol.includes("/api/tarixce")) {
        tarixceSorgusu += 1;
        return Promise.resolve(
          tarixceStatus === 200
            ? { ok: true, status: 200, json: () => Promise.resolve({ movsumler: movsumSiyahisi }) }
            : { ok: false, status: tarixceStatus },
        );
      }
      if (yol.includes("/api/ndvi")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              seriya: [{ baslangic: "2026-07-22", son: bugun, ndvi: 0.7, nemlik: 0.3, ortulu: 0 }],
            }),
        });
      }
      if (yol.includes("/api/qonsu")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ qonsu: { p25: 0.5, medyan: 0.6, p75: 0.72, son: bugun, piksel: 5000 } }),
        });
      }
      if (yol.includes("/api/")) return Promise.resolve({ ok: false, status: 501 });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }),
  );
}

function seed(sahe = true) {
  seedState({
    location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
    onboarded: true,
    ...(sahe
      ? {
          sahe: {
            hektar: 6.5,
            noqteler: [
              [40.4, 47.1],
              [40.4023, 47.1],
              [40.4023, 47.1029],
              [40.4, 47.1029],
            ],
          },
        }
      : {}),
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

describe("məhsuldarlıq indeksi — əsas ekran", () => {
  it("sahə çəkilibsə nümunə 782 əvəzinə həqiqi indeks görünür", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Məhsuldarlıq indeksi")).toBeInTheDocument());
    // Nümunə bal görünmür
    expect(screen.queryByText("782")).not.toBeInTheDocument();
    // Tarixçə tam, hər il ətrafdan yuxarı → yüksək bant
    expect(screen.getByText("Yüksək")).toBeInTheDocument();
    expect(screen.getByText(/mövsüm ölçülüb/)).toBeInTheDocument();
  });

  it("sahə çəkilməyibsə nümunə qövs qalır və indeks sorğusu getmir", async () => {
    seed(false);
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/FARMSCORE/)).toBeInTheDocument());
    expect(tarixceSorgusu).toBe(0);
    expect(screen.queryByText("Məhsuldarlıq indeksi")).not.toBeInTheDocument();
  });

  // Fermer balın SƏBƏBİNİ görməlidir — gizli düstur etibar yaratmır
  it("kart açılanda səbəblər və mövsüm zolağı görünür", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => screen.getByText("Məhsuldarlıq indeksi"));

    await user.click(screen.getByRole("button", { name: /Məhsuldarlıq indeksi/ }));

    expect(screen.getByText("Sahə hər mövsüm əkilib")).toBeInTheDocument();
    // "Kredit balı deyil" açıq yazılır
    expect(screen.getByText(/kredit balı deyil/)).toBeInTheDocument();
  });

  it("boş illər balı endirir və səbəbdə görünür", async () => {
    const user = userEvent.setup();
    seed();
    // 10 mövsümün 3-ü boş → davamlılıq 0.7 → "orta" bantı
    stubApi({
      movsumSiyahisi: movsumler().map((m) =>
        [2019, 2021, 2023].includes(m.il) ? { ...m, zirve: 0.12 } : m,
      ),
    });
    renderApp(<App />);
    await waitFor(() => screen.getByText("Məhsuldarlıq indeksi"));

    await user.click(screen.getByRole("button", { name: /Məhsuldarlıq indeksi/ }));
    expect(screen.getByText("Bəzi mövsümlər əkilməyib")).toBeInTheDocument();
  });

  it("tarixçə alınmasa səbəbini deyir, qalan ekran işləyir", async () => {
    seed();
    stubApi({ tarixceStatus: 502 });
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText(/Tarixçə alınmadı/)).toBeInTheDocument(),
    );
    // Peyk zolağı yerindədir
    expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument();
  });
});
