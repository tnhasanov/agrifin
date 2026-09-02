import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState } from "../../test/render.jsx";

const bugun = new Date().toISOString().slice(0, 10);
const BASLIQ = "FarmScore";

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

function stubApi({
  movsumSiyahisi = movsumler(),
  tarixceStatus = 200,
  // Cari mövsüm: standart dəyərlər sahəni ətrafdan yuxarı qoyur (risk yoxdur)
  cariNdvi = 0.7,
  qonsuMedyan = 0.6,
} = {}) {
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
              seriya: [{ baslangic: "2026-07-22", son: bugun, ndvi: cariNdvi, nemlik: 0.3, ortulu: 0 }],
            }),
        });
      }
      if (yol.includes("/api/qonsu")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              qonsu: { p25: 0.5, medyan: qonsuMedyan, p75: 0.72, son: bugun, piksel: 5000 },
            }),
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

    // Sahəsiz açılışda dəvət artıq pano kartıdır (hal A): bal/limit YOXDUR
    await waitFor(() =>
      expect(screen.getAllByText("İlk sahənizi əlavə edin").length).toBeGreaterThan(0),
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

    await waitFor(() => expect(screen.getByText("Tarixçə yığılır")).toBeInTheDocument());
    expect(screen.getByText(/ən azı 3 istifadə oluna bilən mövsüm/)).toBeInTheDocument();
    // Gedişat və bildiriş vədi dəqiq mətnlərlə
    expect(screen.getByText(/\/ 3 mövsüm/)).toBeInTheDocument();
    expect(screen.getByText("Hələ qiymətləndirilməyib")).toBeInTheDocument();
    expect(screen.getByText("Məlumat kifayət etdikdə sizə xəbər verəcəyik.")).toBeInTheDocument();
    expect(screen.queryByText("Yüksək")).not.toBeInTheDocument();
  });

  // PDF 14: hal B-nin əsas hərəkəti "Sahəyə bax"dır — bal yoxdursa fermerin
  // görə biləcəyi yeganə dəlil sahə ekranındadır
  it("tarixçə yığılan halda ana səhifədə 'Sahəyə bax' əsas hərəkətdir", async () => {
    const user = userEvent.setup();
    seed();
    stubApi({ movsumSiyahisi: movsumler({ sayi: 2 }) });
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("Tarixçə yığılır")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Sahəyə bax" }));
    expect(window.location.pathname).toBe("/fields");
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
    // Qalan ekran işləyir: hava zolağı yerindədir
    expect(await screen.findByText(/Sahədə hava/)).toBeInTheDocument();
  });

  // ── CARİ MÖVSÜM QATI ────────────────────────────────────────────────
  // İstehsalda görülən vəziyyət: güclü tarixçə 82 bal verir, amma sahə bu
  // mövsüm ətrafdan 16 bənd geridədir. "Yüksək" sözü tək qalsa fermer
  // bunu "hər şey qaydasındadır" kimi oxuyur.
  describe("cari mövsüm riski", () => {
    it("güclü tarixçə + zəif cari mövsüm: bant qalır, yanında risk görünür", async () => {
      seed();
      stubApi({ cariNdvi: 0.39, qonsuMedyan: 0.55 });
      renderApp(<App />);
      await waitFor(() => screen.getByText(BASLIQ));

      // Bal AŞAĞI SALINMIR — bant yerindədir
      expect(screen.getByText("Yüksək")).toBeInTheDocument();
      // Amma tək deyil
      expect(screen.getByText(/cari mövsümdə risk/)).toBeInTheDocument();
      // İki oxu ayrıca yazılır, hər ikisi rəqəmlə
      expect(screen.getByText(/Tarixi performans: Yüksək/)).toBeInTheDocument();
      expect(screen.getByText(/Cari mövsüm: Zəif — sahə 39%, ətraf 55%/)).toBeInTheDocument();
    });

    it("risk ekran oxuyucudan da gizlədilmir", async () => {
      seed();
      stubApi({ cariNdvi: 0.39, qonsuMedyan: 0.55 });
      renderApp(<App />);
      await waitFor(() => screen.getByText(BASLIQ));

      expect(
        screen.getByRole("button", { name: /cari mövsümdə risk/ }),
      ).toBeInTheDocument();
    });

    it("sahə ətrafdan yuxarıdırsa risk yoxdur", async () => {
      seed();
      stubApi();
      renderApp(<App />);
      await waitFor(() => screen.getByText(BASLIQ));

      expect(screen.getByText("Yüksək")).toBeInTheDocument();
      expect(screen.queryByText(/cari mövsümdə risk/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Tarixi performans:/)).not.toBeInTheDocument();
    });

    // BİÇİLMİŞ SAHƏ RİSK DEYİL: amil ölçülmür, ona görə bayraq da qalxmır
    it("biçilmiş sahədə risk bayrağı qalxmır", async () => {
      seed();
      stubApi({ cariNdvi: 0.2, qonsuMedyan: 0.55 });
      renderApp(<App />);
      await waitFor(() => screen.getByText(BASLIQ));

      expect(screen.queryByText(/cari mövsümdə risk/)).not.toBeInTheDocument();
    });

    // "30/30" səs sayıdır — rəqəmin yanında neçə mövsümdən neçəsi olduğu yazılır
    it("nisbi performansın yanında mövsüm sayı və median fərq görünür", async () => {
      const user = userEvent.setup();
      seed();
      stubApi();
      renderApp(<App />);
      await waitFor(() => screen.getByText(BASLIQ));

      await user.click(screen.getByRole("button", { name: new RegExp(BASLIQ) }));
      expect(screen.getByText(/mövsüm · median fərq \+12 b\./)).toBeInTheDocument();
    });
  });
});
