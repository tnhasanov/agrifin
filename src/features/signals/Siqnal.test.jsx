import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState } from "../../test/render.jsx";

const SAHE = {
  hektar: 6.5,
  noqteler: [
    [40.4, 47.1],
    [40.4023, 47.1],
    [40.4023, 47.1029],
    [40.4, 47.1029],
  ],
};

const bugun = new Date().toISOString().slice(0, 10);

/** Quraq sahə: son ölçmədə NDMI mənfidir */
const QURAQ = [
  { baslangic: "2026-07-17", son: "2026-07-22", ndvi: 0.71, nemlik: 0.05, ortulu: 0 },
  { baslangic: "2026-07-22", son: bugun, ndvi: 0.68, nemlik: -0.07, ortulu: 0 },
];

/** Sahəyə su kifayət edir və heç nə dəyişmir */
const SAKIT = [
  { baslangic: "2026-07-17", son: "2026-07-22", ndvi: 0.7, nemlik: 0.3, ortulu: 0 },
  { baslangic: "2026-07-22", son: bugun, ndvi: 0.7, nemlik: 0.31, ortulu: 0 },
];

const gunler = Array.from({ length: 7 }, (_, i) =>
  new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
);

/** Sakit hava — nə şaxta, nə istilik, nə yağış */
function hava(deyisiklik = {}) {
  return {
    daily: {
      time: gunler,
      weather_code: [0, 1, 0, 1, 0, 1, 0],
      temperature_2m_max: [28, 27, 29, 28, 27, 28, 28],
      temperature_2m_min: [17, 16, 18, 17, 16, 17, 17],
      precipitation_sum: [0, 0, 0, 0, 0, 0, 0],
      et0_fao_evapotranspiration: [3, 3, 3, 3, 3, 3, 3],
      ...deyisiklik,
    },
    hourly: {
      time: Array.from({ length: 48 }, (_, i) => `${gunler[0]}T${String(i % 24).padStart(2, "0")}:00`),
      wind_speed_10m: Array.from({ length: 48 }, () => 25),
      precipitation_probability: Array.from({ length: 48 }, () => 60),
      soil_moisture_0_to_7cm: Array.from({ length: 48 }, () => 0.2),
    },
  };
}

function stubApi({ seriya = QURAQ, proqnoz = hava() } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (String(url).includes("/api/ndvi")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ seriya }) });
      }
      if (String(url).includes("/api/saheSekli")) {
        return Promise.resolve({ ok: false, status: 501 });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(proqnoz) });
    }),
  );
}

function seed(sahe = SAHE) {
  seedState({
    location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
    onboarded: true,
    sahe,
    chat: { messages: [], crop: "bugda", referral: false },
  });
}

const zeng = () => screen.getByRole("button", { name: /Bildirişlər/ });

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sahə siqnalları — əsas ekran", () => {
  it("ən vacib siqnalı ekranın başında göstərir", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());
    expect(screen.getByText(/3 gündə yağış gözlənmir/)).toBeInTheDocument();
    // Mənbə göstərilir: fermer rəqəmin haradan gəldiyini bilməlidir
    expect(screen.getByText("Peyk ölçməsi + hava proqnozu")).toBeInTheDocument();
  });

  // Bu siqnalın bütün mənası budur: quraq sahəyə yağış gəlirsə suvarmaq
  // suyu və yanacağı boş yerə xərcləməkdir
  it("yağış gələndə suvarmağı dayandırmağı deyir", async () => {
    seed();
    stubApi({ proqnoz: hava({ precipitation_sum: [0, 11, 5, 0, 0, 0, 0] }) });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Suvarmanı saxlayın")).toBeInTheDocument());
    expect(screen.getByText(/16 mm yağış gözlənilir/)).toBeInTheDocument();
    expect(screen.queryByText("Suvarma vaxtıdır")).not.toBeInTheDocument();
  });

  // Hava zolağının bir sətirlik məsləhəti eyni proqnozdan çıxır; siqnal
  // varkən ikisini yan-yana göstərmək eyni sözü iki dəfə deməkdir
  it("siqnal varkən hava zolağının məsləhəti təkrarlanmır", async () => {
    seed();
    stubApi({ proqnoz: hava({ precipitation_sum: [0, 11, 5, 0, 0, 0, 0] }) });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Suvarmanı saxlayın")).toBeInTheDocument());
    expect(screen.getAllByText(/16 mm yağış gözlənilir/)).toHaveLength(1);
  });

  it("siqnal yoxdursa hava zolağı öz məsləhətini göstərir", async () => {
    seed();
    stubApi({ seriya: SAKIT });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Şərait normaldır/)).toBeInTheDocument());
  });

  it("şaxta xəbərdarlığı suvarmadan da öndə gəlir", async () => {
    seed();
    stubApi({ proqnoz: hava({ temperature_2m_min: [17, -3, 18, 17, 16, 17, 17] }) });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Şaxta riski")).toBeInTheDocument());
    expect(screen.getByText(/-3°-yə düşür/)).toBeInTheDocument();
  });

  it("sakit havada və sağlam sahədə xəbərdarlıq göstərilmir", async () => {
    seed();
    stubApi({ seriya: SAKIT });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument());
    expect(screen.queryByText("Suvarma vaxtıdır")).not.toBeInTheDocument();
    expect(screen.queryByText("Şaxta riski")).not.toBeInTheDocument();
  });

  // Sahə çəkilməyibsə peyk siqnalları qurula bilmir, hava siqnalları isə
  // rayonun koordinatı üçün yenə işləməlidir
  it("sahə çəkilməyibsə də şaxta xəbərdarlığı gəlir", async () => {
    seed(null);
    stubApi({ proqnoz: hava({ temperature_2m_min: [17, -3, 18, 17, 16, 17, 17] }) });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Şaxta riski")).toBeInTheDocument());
    expect(fetch.mock.calls.some(([url]) => String(url).includes("/api/ndvi"))).toBe(false);
  });
});

describe("sahə siqnalları — bildiriş mərkəzi", () => {
  it("zəngin nişanı açıq siqnalların sayını göstərir", async () => {
    seed();
    stubApi({ proqnoz: hava({ temperature_2m_min: [17, -3, 18, 17, 16, 17, 17] }) });
    renderApp(<App />);

    // Şaxta + suvarma. Nümunə tövsiyələr sayılmır — hamısı ölçmədən çıxır.
    await waitFor(() => expect(zeng()).toHaveTextContent("2"));
  });

  it("məsləhət ekranı bütün siqnalları ciddiliyə görə sıralayır", async () => {
    const user = userEvent.setup();
    seed();
    stubApi({ proqnoz: hava({ temperature_2m_min: [17, -3, 18, 17, 16, 17, 17] }) });
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Şaxta riski")).toBeInTheDocument());

    await user.click(zeng());

    expect(screen.getByText("Sahənizdən siqnallar")).toBeInTheDocument();
    const basliqlar = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(basliqlar.slice(0, 2)).toEqual(["Şaxta riski", "Suvarma vaxtıdır"]);
  });

  it("bağlanan siqnal qayıtmır və nişan azalır", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());
    expect(zeng()).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Siqnalı bağla" }));

    expect(screen.queryByText("Suvarma vaxtıdır")).not.toBeInTheDocument();
    // Tək siqnal idi — nişan tamamilə yox olur
    expect(zeng()).toHaveTextContent("");
    // Səhifə yenilənəndə də qayıtmamalıdır
    expect(window.localStorage.getItem("agrifin:state")).toContain("suvar:");
  });

  // Peyk xəstəliyi görmür: NDVI düşür, su isə kifayətdir — bu, yarpağa
  // baxmaq üçün siqnaldır və düymə birbaşa çata aparır
  it("su kifayət edəndə düşən NDVI fermeri şəkil çəkməyə yönləndirir", async () => {
    const user = userEvent.setup();
    seed();
    stubApi({
      seriya: [
        { baslangic: "2026-07-12", son: "2026-07-17", ndvi: 0.78, nemlik: 0.31, ortulu: 0 },
        { baslangic: "2026-07-17", son: bugun, ndvi: 0.66, nemlik: 0.3, ortulu: 0 },
      ],
    });
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText("Bitki zəifləyir — səbəb su deyil")).toBeInTheDocument(),
    );
    // Mətn iki səviyyəni tam faizlə deyir — "0,12 azalıb" fermerə heç nədir
    expect(screen.getByText(/örtüyü 78% idi, indi 66%/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Şəkil çək" }));
    expect(screen.getByRole("button", { name: "Şəkil çək və ya seç" })).toBeInTheDocument();
  });
});

describe("sahə siqnalları — sorğu sayı", () => {
  // Başlıq, əsas ekran və məsləhət ekranı eyni siyahını göstərir; hər biri
  // ayrıca soruşsaydı Copernicus emal kvotası üç dəfə xərclənərdi
  it("üç yer eyni siyahını göstərsə də peyk bir dəfə soruşulur", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());

    await user.click(zeng());
    await waitFor(() => expect(screen.getByText("Sahənizdən siqnallar")).toBeInTheDocument());

    const peykSorgusu = fetch.mock.calls.filter(([url]) => String(url).includes("/api/ndvi"));
    expect(peykSorgusu).toHaveLength(1);
  });

  it("hava proqnozu paralel çağırışlarda birləşdirilir", async () => {
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(screen.getByText("Suvarma vaxtıdır")).toBeInTheDocument());

    const havaSorgusu = fetch.mock.calls.filter(([url]) =>
      String(url).includes("api.open-meteo.com"),
    );
    expect(havaSorgusu).toHaveLength(1);
  });
});

describe("siqnal kartı", () => {
  it("ciddiliyə görə fərqli rəng göstərir", async () => {
    seed();
    stubApi({ proqnoz: hava({ temperature_2m_min: [17, -3, 18, 17, 16, 17, 17] }) });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Şaxta riski")).toBeInTheDocument());
    const kart = screen.getByText("Şaxta riski").closest("div.rounded-2xl");
    expect(within(kart).getByText(/Həssas əkinləri örtün/)).toBeInTheDocument();
    expect(kart).toHaveStyle({ backgroundColor: "rgb(251, 234, 231)" });
  });
});
