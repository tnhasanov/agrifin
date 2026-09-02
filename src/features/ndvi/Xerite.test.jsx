import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState } from "../../test/render.jsx";

// jsdom-da Leaflet ölçü hesablaya bilmir. Bu testin mövzusu qat keçidi və
// sorğu sayıdır, ona görə xəritə qatı sadə şəkillə əvəz olunur.
vi.mock("../ndvi/XeriteQati.jsx", () => ({
  XeriteQati: ({ sekil, etiket }) => <img src={sekil} alt={etiket} />,
}));

const bugun = new Date().toISOString().slice(0, 10);
const SERIYA = [{ baslangic: "2026-07-22", son: bugun, ndvi: 0.68, nemlik: 0.3, ortulu: 0 }];

// 1×1 şəffaf PNG
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

let sekilSorgulari = [];

function stubApi({ xeta = {} } = {}) {
  sekilSorgulari = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url, opts) => {
      const yol = String(url);
      if (yol.includes("/api/saheSekli")) {
        const { qat } = JSON.parse(opts.body);
        sekilSorgulari.push(qat);
        if (xeta[qat]) return Promise.resolve({ ok: false, status: xeta[qat] });
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              qat,
              sekil: PNG,
              en: 64,
              hundurluk: 64,
              son: bugun,
            }),
        });
      }
      if (yol.includes("/api/ndvi")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ seriya: SERIYA }) });
      }
      if (yol.includes("/api/qonsu") || yol.includes("/api/zona")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
      if (yol.includes("/api/teqvim")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ teqvim: null }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }),
  );
}

function seed() {
  seedState({
    location: { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false },
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
  window.history.pushState({}, "", "/fields");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("xəritə qatları", () => {
  it("iki qat düyməsi göstərir, ilk açılışda bitki qatı seçilidir", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Bitki" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Nəmlik" })).toBeInTheDocument();
    // Əsl rəng qatı çıxarılıb — sahəni tanımaq işini çəkmə xəritəsi görür
    expect(screen.queryByRole("button", { name: "Əsl görüntü" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bitki" })).toHaveAttribute("aria-pressed", "true");
  });

  // ƏSAS: iki qat birdən yüklənsə Copernicus emal kvotası iki dəfə xərclənər
  it("yalnız açılmış qatı yükləyir", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(sekilSorgulari).toEqual(["bitki"]));

    await user.click(screen.getByRole("button", { name: "Nəmlik" }));
    await waitFor(() => expect(sekilSorgulari).toEqual(["bitki", "nemlik"]));
  });

  it("eyni qata qayıdanda təkrar sorğu göndərmir", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(sekilSorgulari).toEqual(["bitki"]));

    await user.click(screen.getByRole("button", { name: "Nəmlik" }));
    await waitFor(() => expect(sekilSorgulari).toHaveLength(2));
    await user.click(screen.getByRole("button", { name: "Bitki" }));

    // Keşdən gəlir — üçüncü sorğu yoxdur
    expect(sekilSorgulari).toEqual(["bitki", "nemlik"]);
  });

  it("qata görə izahat və leyend dəyişir", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/tünd yaşıl sıx bitki/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Nəmlik" }));
    await waitFor(() => expect(screen.getByText(/Mavi bitkidə su çoxdur/)).toBeInTheDocument());
    expect(screen.getByText("quru — suvarma çatmır")).toBeInTheDocument();
    expect(screen.queryByText(/tünd yaşıl sıx bitki/)).not.toBeInTheDocument();
  });

  // Bir qat alınmasa qalanları işləməyə davam etməlidir
  it("ikinci qat alınmasa kart qalır və səbəbi deyir", async () => {
    const user = userEvent.setup();
    seed();
    stubApi({ xeta: { nemlik: 502 } });
    renderApp(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Nəmlik" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Nəmlik" }));

    await waitFor(() => expect(screen.getByText(/Bu qat hazırda alınmadı/)).toBeInTheDocument());
    // Bitki qatına qayıtmaq mümkün olmalıdır
    expect(screen.getByRole("button", { name: "Bitki" })).toBeInTheDocument();
  });

  // Kartdakı xəritə bilərəkdən hərəkətsizdir — yaxınlaşdırmaq üçün tam ekran
  it("böyüt düyməsi xəritəni tam ekranda açır", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Böyüt" })).toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Böyüt" }));

    const pencere = await screen.findByRole("dialog");
    expect(pencere).toBeInTheDocument();
    // Yaxınlaşdırmanın detal artırmadığı açıq yazılır
    expect(screen.getByText(/bir rəng xanası 10×10 metrdir/)).toBeInTheDocument();
  });

  it("tam ekran Escape və bağla düyməsi ilə bağlanır", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => screen.getByRole("button", { name: "Böyüt" }));

    await user.click(screen.getByRole("button", { name: "Böyüt" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Böyüt" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Bağla" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  // Tam ekranda qat dəyişmək eyni keşdən gəlir — kvota ikinci dəfə xərclənmir
  it("tam ekranda qat dəyişəndə təkrar sorğu getmir", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);
    await waitFor(() => expect(sekilSorgulari).toEqual(["bitki"]));

    await user.click(screen.getByRole("button", { name: "Nəmlik" }));
    await waitFor(() => expect(sekilSorgulari).toEqual(["bitki", "nemlik"]));
    await user.click(screen.getByRole("button", { name: "Böyüt" }));
    await screen.findByRole("dialog");

    // Tam ekrandakı qat düymələri — kartdakılarla eyni siyahı
    const bitkiDuymeleri = screen.getAllByRole("button", { name: "Bitki" });
    await user.click(bitkiDuymeleri[bitkiDuymeleri.length - 1]);

    expect(sekilSorgulari).toEqual(["bitki", "nemlik"]);
  });

  // Əsas qat alınmasa xəritə ümumiyyətlə göstərilmir (statusu peyk zolağı deyir)
  it("bitki qatı alınmasa bütün kart gizlənir", async () => {
    seed();
    stubApi({ xeta: { bitki: 502 } });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText(/Peyk ölçməsi ·/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Nəmlik" })).not.toBeInTheDocument();
  });

  // PDF 15: sahə ekranının ƏSAS hərəkəti — xəbərdarlıq yoxdursa xəritəyə
  // baxmaqdır. Künçdəki kiçik "Böyüt" düyməsi əsas hərəkət kimi oxunmur.
  it("xəbərdarlıq yoxdursa tam enli 'Xəritədə bax' düyməsi göstərilir", async () => {
    const user = userEvent.setup();
    seed();
    stubApi();
    renderApp(<App />);

    // Ölçmə statusu ayrıca "Məlumat keyfiyyəti" bölməsindədir
    expect(await screen.findByText("Məlumat keyfiyyəti")).toBeInTheDocument();

    const cta = await screen.findByRole("button", { name: "Xəritədə bax" });
    await user.click(cta);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  // ƏLÇATANLIQ: seçili qat düyməsinin fonu da, mətni də tünd şam rəngi idi —
  // ad görünmürdü. Mətn fonla eyni rəngdə OLMAMALIDIR (WCAG AA).
  it("seçili qat düyməsinin adı fonda itmir", async () => {
    seed();
    stubApi();
    renderApp(<App />);

    const secili = await screen.findByRole("button", { name: "Bitki" });
    const stil = window.getComputedStyle(secili);
    expect(stil.color).not.toBe(stil.backgroundColor);
    expect(stil.color).toBe("rgb(255, 255, 255)");
  });
});
