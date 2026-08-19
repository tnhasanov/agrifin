import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState } from "../../test/render.jsx";
import { qonsuMuqayisesi } from "../../services/ndvi.js";

const bugun = new Date().toISOString().slice(0, 10);

const SERIYA = [
  { baslangic: "2026-07-17", son: "2026-07-22", ndvi: 0.66, nemlik: 0.3, ortulu: 0 },
  { baslangic: "2026-07-22", son: bugun, ndvi: 0.68, nemlik: 0.31, ortulu: 0 },
];

/** Sahə (0.68) medianın (0.58) üstündə, amma p75-dən (0.72) aşağı */
const ORTA_QONSU = { p25: 0.45, medyan: 0.58, p75: 0.72, orta: 0.58, son: bugun, piksel: 5000 };

const gunler = Array.from({ length: 7 }, (_, i) =>
  new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
);

const HAVA = {
  daily: {
    time: gunler,
    weather_code: [0, 1, 0, 1, 0, 1, 0],
    temperature_2m_max: [28, 27, 29, 28, 27, 28, 28],
    temperature_2m_min: [17, 16, 18, 17, 16, 17, 17],
    precipitation_sum: [0, 0, 0, 0, 0, 0, 0],
    et0_fao_evapotranspiration: [3, 3, 3, 3, 3, 3, 3],
  },
  hourly: {
    time: Array.from({ length: 48 }, (_, i) => `${gunler[0]}T${String(i % 24).padStart(2, "0")}:00`),
    wind_speed_10m: Array.from({ length: 48 }, () => 25),
    precipitation_probability: Array.from({ length: 48 }, () => 60),
    soil_moisture_0_to_7cm: Array.from({ length: 48 }, () => 0.2),
  },
};

let qonsuYuku = null;

function stubApi({ qonsu = ORTA_QONSU, qonsuStatus = 200, seriya = SERIYA } = {}) {
  qonsuYuku = null;
  vi.stubGlobal(
    "fetch",
    vi.fn((url, opts) => {
      if (String(url).includes("/api/qonsu")) {
        qonsuYuku = JSON.parse(opts.body);
        return Promise.resolve(
          qonsuStatus === 200
            ? { ok: true, status: 200, json: () => Promise.resolve({ qonsu, radiusKm: 5 }) }
            : { ok: false, status: qonsuStatus },
        );
      }
      if (String(url).includes("/api/ndvi")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ seriya }) });
      }
      if (String(url).includes("/api/saheSekli")) {
        return Promise.resolve({ ok: false, status: 501 });
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
      return Promise.resolve({ ok: true, json: () => Promise.resolve(HAVA) });
    }),
  );
}

function seed(sahe = { hektar: 6.5, noqteler: [[40.4, 47.1], [40.4023, 47.1], [40.4023, 47.1029], [40.4, 47.1029]] }) {
  seedState({
    location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
    onboarded: true,
    sahe,
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

describe("müqayisə məntiqi", () => {
  const q = { p25: 0.45, medyan: 0.58, p75: 0.72, son: bugun, piksel: 5000 };

  it("sahəni dörd pillədən birinə yerləşdirir", () => {
    expect(qonsuMuqayisesi(0.8, q).pille).toBe("ust");
    expect(qonsuMuqayisesi(0.72, q).pille).toBe("ust");
    expect(qonsuMuqayisesi(0.6, q).pille).toBe("yuxari");
    expect(qonsuMuqayisesi(0.5, q).pille).toBe("asagi");
    expect(qonsuMuqayisesi(0.3, q).pille).toBe("alt");
  });

  // Orta yox, median: bir neçə çox zəif sahə ortanı çəkir və hamı
  // "ortadan yaxşı" görünür
  it("faiz fərqini medianla hesablayır", () => {
    expect(qonsuMuqayisesi(0.696, q).ferq).toBe(20);
    expect(qonsuMuqayisesi(0.464, q).ferq).toBe(-20);
  });

  // 0-a yaxın medianda faiz mənasız böyük rəqəmlər verir (0.01 → 0.02 = +100%)
  it("median sıfıra yaxındırsa faiz göstərmir", () => {
    const zeif = { ...q, medyan: 0.02, p25: 0.01, p75: 0.04 };
    expect(qonsuMuqayisesi(0.03, zeif).ferq).toBeNull();
    // Pillə yenə hesablanır — faizsiz də "medianın üstündədir" mənalıdır
    expect(qonsuMuqayisesi(0.03, zeif).pille).toBe("yuxari");
  });

  it("naqis məlumatda null qaytarır", () => {
    expect(qonsuMuqayisesi(0.6, null)).toBeNull();
    expect(qonsuMuqayisesi(NaN, q)).toBeNull();
    expect(qonsuMuqayisesi(0.6, { medyan: 0.5 })).toBeNull();
  });
});

describe("müqayisə kartı", () => {
  it("sahənin ətrafdakı yerini göstərir", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText("Sahəniz ətrafın ortasından yuxarıdır")).toBeInTheDocument(),
    );
    // Bütün rəqəmlər eyni miqyasda: örtük faizi, onluqsuz
    expect(screen.getByText("Sizin sahə 68%")).toBeInTheDocument();
    expect(screen.getByText("Ətrafın medianı 58%")).toBeInTheDocument();
  });

  // Müqayisənin İKİ TƏRƏFİ eyni sayılmalıdır və fermer bunu bilməlidir:
  // əvvəl ətrafda yalnız yaşıl piksellər sayılırdı, sahədə isə hamısı —
  // hər sahə süni aşağı düşürdü (bax: lib/copernicus.js, MUQAYISE_SERTI)
  it("nə ilə müqayisə olunduğunu açıq yazır", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/EYNİ qayda ilə ölçülür/)).toBeInTheDocument());
    expect(screen.getByText(/5 km radiusdakı torpaq/)).toBeInTheDocument();
  });

  it("sahənin öz ölçmə tarixini serverə göndərir", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(qonsuYuku).not.toBeNull());
    // Eyni dövr müqayisə olunsun deyə
    expect(qonsuYuku.son).toBe(bugun);
  });

  it("sahə çəkilməyibsə sorğu göndərilmir", async () => {
    seed(null);
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Sahədə hava/)).toBeInTheDocument());
    expect(fetch.mock.calls.some(([url]) => String(url).includes("/api/qonsu"))).toBe(false);
  });

  // Ətrafda əkin yoxdursa (dağ, şəhər) müqayisə mənasızdır — xəta deyil
  it("ətraf məlumatı yoxdursa kart göstərilmir və tətbiq işləyir", async () => {
    seed();
    stubApi({ qonsu: null });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument());
    expect(screen.queryByText(/ətrafın/i)).not.toBeInTheDocument();
  });

  it("server xətasında kart göstərilmir", async () => {
    seed();
    stubApi({ qonsuStatus: 502 });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument());
    expect(screen.queryByText(/ətrafın/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Əsas" })).toBeInTheDocument();
  });
});

describe("müqayisə siqnalı", () => {
  // Hava hamıya eynidir: sahə ətrafdan xeyli geri qalırsa səbəb sahəyə xasdır
  it("alt çeyrəkdə xəbərdarlıq verir", async () => {
    seed();
    stubApi({ qonsu: { p25: 0.75, medyan: 0.82, p75: 0.9, son: bugun, piksel: 5000 } });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Sahə ətrafdan geri qalır")).toBeInTheDocument());
    expect(screen.getByText(/bitki örtüyü 68%, ətrafdakı əkinlərin medianı isə 82%/)).toBeInTheDocument();
  });

  // Təbrik bildirişi zəngi dəyərsizləşdirir
  it("üst çeyrəkdə siqnal vermir, yalnız kartda göstərir", async () => {
    seed();
    stubApi({ qonsu: { p25: 0.3, medyan: 0.4, p75: 0.5, son: bugun, piksel: 5000 } });
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText("Sahəniz ətrafın ən yaxşı 25%-indədir")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Sahə ətrafdan geri qalır")).not.toBeInTheDocument();
  });
});

describe("aqronom çatı", () => {
  it("müqayisə sorğuya düşür", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() =>
      expect(screen.getByText("Sahəniz ətrafın ortasından yuxarıdır")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Məsləhət" }));
    await user.click(screen.getByRole("button", { name: "Aqronoma sual verin" }));
    await user.click(screen.getByRole("button", { name: "NDVI göstəricim nə deyir?" }));

    await waitFor(() =>
      expect(fetch.mock.calls.some(([url]) => String(url).includes("/api/agronom"))).toBe(true),
    );
    const call = fetch.mock.calls.find(([url]) => String(url).includes("/api/agronom"));
    expect(JSON.parse(call[1].body).qonsu).toEqual({ medyan: 0.58, ferq: 17 });
  });
});
