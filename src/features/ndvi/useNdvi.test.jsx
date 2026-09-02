import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, WEATHER_FIXTURE } from "../../test/render.jsx";

const SAHE = {
  hektar: 6.5,
  noqteler: [
    [40.4, 47.1],
    [40.4023, 47.1],
    [40.4023, 47.1029],
    [40.4, 47.1029],
  ],
};

/** Son 20 gündə azalan seriya — su stressi mənzərəsi */
const bugun = new Date().toISOString().slice(0, 10);
const SERIYA = [
  { baslangic: "2026-07-02", son: "2026-07-07", ndvi: 0.78, nemlik: 0.24, ortulu: 0 },
  { baslangic: "2026-07-07", son: "2026-07-12", ndvi: 0.76, nemlik: 0.18, ortulu: 0.1 },
  { baslangic: "2026-07-12", son: "2026-07-17", ndvi: 0.71, nemlik: 0.06, ortulu: 0 },
  { baslangic: "2026-07-17", son: bugun, ndvi: 0.68, nemlik: -0.05, ortulu: 0 },
];

function seedSahe(sahe = SAHE) {
  window.localStorage.setItem(
    "agrifin:state",
    JSON.stringify({
      version: 4,
      state: {
        location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
        onboarded: true,
        sahe,
        chat: { messages: [], crop: "bugda", referral: false },
      },
    }),
  );
}

/** ndviCavab: {ok, status, seriya} */
function stubApi({ ok: uygun = true, status = 200, seriya = SERIYA } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (String(url).includes("/api/ndvi")) {
        return Promise.resolve(
          uygun
            ? { ok: true, status: 200, json: () => Promise.resolve({ seriya }) }
            : { ok: false, status },
        );
      }
      if (String(url).includes("/api/agronom")) {
        const encoder = new TextEncoder();
        const setirler = ['{"t":"delta","v":"Cavab"}\n', '{"t":"done"}\n'];
        let i = 0;
        return Promise.resolve({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: async () =>
                i < setirler.length
                  ? { done: false, value: encoder.encode(setirler[i++]) }
                  : { done: true, value: undefined },
            }),
          },
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) });
    }),
  );
}

beforeEach(() => {
  // Peyk statusu, su sətri və ölçmə izahları SAHƏLƏR ekranındadır
  // (ana səhifə yalnız FarmScore lövhəsində yığcam faktları göstərir)
  window.history.pushState({}, "", "/fields");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("peyk ölçməsi — əsas ekran", () => {
  it("sahə çəkilibsə ölçülmüş örtük faizini və azalma oxunu göstərir", async () => {
    // Faiz + trend oxu ana səhifədəki FarmScore lövhəsindədir
    window.history.pushState({}, "", "/");
    seedSahe();
    stubApi();
    renderApp(<App />);

    // Nümunə 0,72 deyil, ölçülmüş 0,68 — ekranda tam faizlə: 68%
    await waitFor(() => expect(screen.getByText(/68%/)).toBeInTheDocument());
    expect(screen.getByText(/68%/).textContent).toContain("▼");
  });

  // Bu sətir ölçməni deyir, qərarı yox: "suvar" və ya "saxla" qərarı yağışdan
  // da asılıdır və siqnal kartında verilir (bax: services/siqnal.js)
  it("su çatışmazlığını fermerə açıq dillə deyir", async () => {
    seedSahe();
    stubApi();
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText("Torpaqda su azdır")).toBeInTheDocument(),
    );
    // Xam NDMI rəqəmi bilərəkdən göstərilmir — cümlə qərarı onsuz da deyir
    expect(screen.queryByText(/NDMI/)).not.toBeInTheDocument();
  });

  it("su kifayət edəndə xəbərdarlıq göstərmir", async () => {
    seedSahe();
    stubApi({ seriya: SERIYA.map((n) => ({ ...n, nemlik: 0.3 })) });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Su kifayət edir")).toBeInTheDocument());
    expect(screen.queryByText(/Torpaqda su azdır/)).not.toBeInTheDocument();
  });

  it("rütubət ölçülməyibsə su sətri göstərilmir", async () => {
    seedSahe();
    stubApi({ seriya: SERIYA.map((n) => ({ ...n, nemlik: null })) });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument());
    expect(screen.queryByText(/Torpaqda su azdır|Su kifayət/)).not.toBeInTheDocument();
  });

  it("konturu sorğuda serverə göndərir", async () => {
    seedSahe();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument());
    const call = fetch.mock.calls.find(([url]) => String(url).includes("/api/ndvi"));
    expect(JSON.parse(call[1].body).noqteler).toEqual(SAHE.noqteler);
  });

  it("sahə çəkilməyibsə peyk sorğusu göndərilmir", async () => {
    window.localStorage.setItem(
      "agrifin:state",
      JSON.stringify({
        version: 4,
        state: {
          location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
          onboarded: true,
        },
      }),
    );
    stubApi();
    renderApp(<App />);

    // Sahəsiz açılışda KPI plitəsi yoxdur — dəvət kartı görünür
    await waitFor(() =>
      expect(screen.getAllByText("İlk sahənizi əlavə edin").length).toBeGreaterThan(0),
    );
    expect(screen.queryByText("Bitki örtüyü")).not.toBeInTheDocument();
    expect(fetch.mock.calls.some(([url]) => String(url).includes("/api/ndvi"))).toBe(false);
  });

  // Buludlu dövr xəta deyil — fermerə səbəbi deyilməlidir
  it("ölçmə tapılmayanda buludu izah edir", async () => {
    seedSahe();
    stubApi({ seriya: [] });
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText(/təmiz ölçmə yoxdur/)).toBeInTheDocument(),
    );
  });

  it("inteqrasiya qurulmayıbsa bunu ayrıca deyir", async () => {
    seedSahe();
    stubApi({ ok: false, status: 501 });
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText(/hələ qurulmayıb/)).toBeInTheDocument(),
    );
  });

  it("digər xətalarda ayrı mesaj göstərir və tətbiq işləməyə davam edir", async () => {
    seedSahe();
    stubApi({ ok: false, status: 502 });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/alınmadı/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Ana səhifə" })).toBeInTheDocument();
  });
});

describe("peyk ölçməsi — aqronom çatı", () => {
  it("ölçülmüş NDVI və trend sorğuya düşür", async () => {
    const user = userEvent.setup();
    seedSahe();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Kömək" }));
    await user.click(await screen.findByRole("button", { name: "Aqronoma sual verin" }));
    await screen.findByRole("dialog", { name: "Aqronom köməkçisi" });
    await user.click(screen.getByRole("button", { name: "Suvarmanı nə vaxt etməliyəm?" }));

    await waitFor(() =>
      expect(fetch.mock.calls.some(([url]) => String(url).includes("/api/agronom"))).toBe(true),
    );
    const call = fetch.mock.calls.find(([url]) => String(url).includes("/api/agronom"));
    const yuk = JSON.parse(call[1].body);

    expect(yuk.ndvi).toBe(0.68);
    expect(yuk.ndviTarix).toBe(bugun);
    // 0.78 → 0.68 = azalma; model bunu şərh edə bilməlidir
    expect(yuk.ndviFerq).toBeCloseTo(-0.1, 2);
    // Rütubət də gedir: model suvarma tövsiyəsini buna görə verir
    expect(yuk.nemlik).toBe(-0.05);
  });
});
