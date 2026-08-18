import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState } from "../../test/render.jsx";

const bugun = new Date().toISOString().slice(0, 10);
const BASLIQ = "Aqronomik performans indeksi";

/** 2017-dən bu ilə: hər il əkilmiş, ətrafdan yuxarı sahə */
function movsumler({ bosIl = null, etrafsiz = false, sayi = null } = {}) {
  const sonIl = new Date().getFullYear();
  const siyahi = [];
  const ilkIl = sayi ? sonIl - sayi + 1 : 2017;
  for (let il = ilkIl; il <= sonIl; il += 1) {
    siyahi.push({
      il,
      zirve: il === bosIl ? 0.12 : 0.72,
      zirveAyi: `${il}-05`,
      etrafMedyan: etrafsiz ? null : 0.6,
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

describe("aqronomik performans indeksi — əsas ekran", () => {
  it("sahə çəkilibsə nümunə 782 əvəzinə həqiqi indeks görünür", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(BASLIQ)).toBeInTheDocument());
    // Nümunə bal görünmür
    expect(screen.queryByText("782")).not.toBeInTheDocument();
    // Tarixçə tam, hər il ətrafdan yuxarı → yüksək bant
    expect(screen.getByText("Yüksək")).toBeInTheDocument();
    expect(screen.getByText(/mövsüm ölçülüb/)).toBeInTheDocument();
  });

  // ETİBAR BALDAN AYRIDIR: rəqəmin yanında ayrıca nişan kimi görünməlidir
  it("etibarlılıq baldan ayrı nişanda göstərilir", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(BASLIQ)).toBeInTheDocument());
    expect(screen.getByText(/Etibarlılıq:/)).toBeInTheDocument();
  });

  it("sahə çəkilməyibsə dəvət göstərilir və indeks sorğusu getmir", async () => {
    seed(false);
    stubApi();
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText(/Sahənizi çəkin — aqronomik performans indeksiniz/)).toBeInTheDocument(),
    );
    // Bahalı tarixçə sorğusu sahəsiz getməməlidir
    expect(tarixceSorgusu).toBe(0);
    expect(screen.queryByText(BASLIQ)).not.toBeInTheDocument();
  });

  // MƏLUMAT KEYFİYYƏTİ QAPISI: bir-iki mövsümdən "94 / Yüksək" çıxmamalıdır
  it("3 mövsümdən az tarixçədə nə bal, nə bant göstərilir", async () => {
    seed();
    stubApi({ movsumSiyahisi: movsumler({ sayi: 2 }) });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Tarixçə kifayət deyil")).toBeInTheDocument());
    expect(screen.getByText(/minimum 3 ölçülə bilən mövsüm/)).toBeInTheDocument();
    expect(screen.queryByText("Yüksək")).not.toBeInTheDocument();
  });

  // Fermer balın SƏBƏBİNİ görməlidir — gizli düstur etibar yaratmır
  it("kart açılanda amil adları, səbəblər və mövsüm zolağı görünür", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => screen.getByText(BASLIQ));

    await user.click(screen.getByRole("button", { name: new RegExp(BASLIQ) }));

    // Altı amilin adı da göründüyü üçün aqronom hansı sətri mübahisə
    // etdiyini bilir
    expect(screen.getByText("Əkin davamlılığı")).toBeInTheDocument();
    expect(screen.getByText("Nisbi aqronomik performans")).toBeInTheDocument();
    expect(screen.getByText("Mövsümi vegetasiya keyfiyyəti")).toBeInTheDocument();
    expect(screen.getByText("Performans sabitliyi")).toBeInTheDocument();
    expect(screen.getByText("Son dövrün meyli")).toBeInTheDocument();
    expect(screen.getByText("Cari mövsümün vəziyyəti")).toBeInTheDocument();

    expect(
      screen.getByText("Müşahidə olunan mövsümlərin demək olar hamısında əkin altında olub"),
    ).toBeInTheDocument();
    // "Kredit balı deyil" açıq yazılır
    expect(screen.getByText(/kredit balı deyil/)).toBeInTheDocument();
  });

  // Təxmini metodologiya gizlədilmir
  it("proxy amillər 'təxmini' nişanı ilə işarələnir", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => screen.getByText(BASLIQ));

    await user.click(screen.getByRole("button", { name: new RegExp(BASLIQ) }));
    expect(screen.getAllByText("təxmini").length).toBeGreaterThan(0);
  });

  it("boş illər balı endirir və səbəbdə görünür", async () => {
    const user = userEvent.setup();
    seed();
    // Mövsümlərin bir hissəsi boş → davamlılıq aşağı bant
    stubApi({
      movsumSiyahisi: movsumler().map((m) =>
        [2019, 2021, 2023].includes(m.il) ? { ...m, zirve: 0.12 } : m,
      ),
    });
    renderApp(<App />);
    await waitFor(() => screen.getByText(BASLIQ));

    await user.click(screen.getByRole("button", { name: new RegExp(BASLIQ) }));
    expect(screen.getByText(/əkin xaricində qalıb/)).toBeInTheDocument();
  });

  // Kritik amil (müqayisə) yoxdursa nəticəyə ad verilmir
  it("ətraf müqayisəsi yoxdursa bant göstərilmir, səbəbi izah olunur", async () => {
    const user = userEvent.setup();
    seed();
    stubApi({ movsumSiyahisi: movsumler({ etrafsiz: true }) });
    renderApp(<App />);
    await waitFor(() => screen.getByText(BASLIQ));

    expect(screen.getByText("Bant verilmir")).toBeInTheDocument();
    expect(screen.queryByText("Yüksək")).not.toBeInTheDocument();
    // Natamam nəticə açıq deyilir
    expect(screen.getByText(/Natamam məlumat/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: new RegExp(BASLIQ) }));
    expect(screen.getByText(/müdafiə edilə bilməz/)).toBeInTheDocument();
  });

  it("tarixçə alınmasa səbəbini deyir, qalan ekran işləyir", async () => {
    seed();
    stubApi({ tarixceStatus: 502 });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Tarixçə alınmadı/)).toBeInTheDocument());
    // Peyk zolağı yerindədir
    expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument();
  });
});
