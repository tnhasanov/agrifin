import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedLocation, seedState } from "../../test/render.jsx";
import { hadiseleriOxu, hadiseleriTemizle } from "../../lib/analytics.js";
import { DEFAULT_LOCATION } from "../../services/location.js";

const dialoq = () => screen.queryByRole("dialog", { name: "Başlanğıc" });
const saxlanan = () => JSON.parse(window.localStorage.getItem("agrifin:state")).state;

/** Xoş gəldiniz ekranını keçib rayon addımına düşür */
async function basla(user) {
  await user.click(screen.getByRole("button", { name: "Başlayaq" }));
}

/** Rayon vərəqini açıb bir rayon seçir */
async function rayonSec(user, ad) {
  await user.click(screen.getByRole("button", { name: /Rayon seçin və ya axtarın/ }));
  const vereq = await screen.findByRole("dialog", { name: "Rayon seçin" });
  await user.click(within(vereq).getByRole("button", { name: ad }));
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  hadiseleriTemizle();
  // Hava sorğusu bu testin mövzusu deyil
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("ilk açılış — dəyər əvvəl", () => {
  it("xoş gəldiniz ekranı sayğacın içində DEYİL və icazə soruşmur", () => {
    renderApp(<App />);

    expect(screen.getByText("Sahənizi tanıyın.")).toBeInTheDocument();
    expect(screen.getByText("Maliyyənizi planlayın.")).toBeInTheDocument();
    // Sayğac yalnız işi sayır — xoş gəldiniz iş deyil
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 3")).not.toBeInTheDocument();
    // Bu ekranda heç bir icazə/giriş sahəsi yoxdur
    expect(dialoq().querySelectorAll("input")).toHaveLength(0);
  });

  it("nə nömrə, nə parol, nə şəxsiyyət soruşur", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await basla(user);

    const panel = dialoq();
    expect(panel.querySelector('input[type="tel"]')).toBeNull();
    expect(panel.querySelector('input[type="password"]')).toBeNull();
    expect(panel.querySelector('input[type="email"]')).toBeNull();
    expect(panel.textContent).not.toMatch(/SİMA|parol|ASAN/i);
  });
});

describe("ilk açılış axını", () => {
  it("rayon → bitki → sahə ardıcıllığı ilə gedir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await basla(user);
    expect(screen.getByText("Sahəniz hansı rayondadır?")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    await rayonSec(user, "Bərdə");
    await user.click(screen.getByRole("button", { name: "Davam et" }));

    expect(screen.getByText("Əsas məhsulunuz hansıdır?")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kartof" }));
    await user.click(screen.getByRole("button", { name: "Davam et" }));

    // ÜÇÜNCÜ ADDIM: axının əsl işi — sayğacdan kənarda qalmır
    expect(screen.getByText("İlk sahənizi əlavə edin")).toBeInTheDocument();
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByText("Təxminən 2 dəqiqə çəkir")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Əsas səhifəyə keç" }));
    expect(dialoq()).not.toBeInTheDocument();
  });

  it("seçim edilməyibsə davam düyməsi işləmir — boş dəyər süni doldurulmur", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await basla(user);

    expect(screen.getByRole("button", { name: "Davam et" })).toBeDisabled();
    await rayonSec(user, "Bərdə");
    expect(screen.getByRole("button", { name: "Davam et" })).toBeEnabled();
  });

  it("seçilən rayon KODLA saxlanılır, göstərilən adla yox", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await basla(user);
    await rayonSec(user, "Şəki");
    await user.click(screen.getByRole("button", { name: "Davam et" }));
    await user.click(screen.getByRole("button", { name: "Üzüm" }));
    await user.click(screen.getByRole("button", { name: "Davam et" }));
    await user.click(screen.getByRole("button", { name: "Əsas səhifəyə keç" }));
    await waitFor(() => expect(dialoq()).not.toBeInTheDocument());

    expect(saxlanan().location.kod).toBe("seki");
    expect(saxlanan().chat.crop).toBe("uzum");
    expect(saxlanan().onboarded).toBe(true);
  });

  it("hər addım keçilə bilir və keçilən dəyər NULL qalır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await basla(user);
    await user.click(screen.getByRole("button", { name: "İndi yox" }));
    await user.click(screen.getByRole("button", { name: "Hələ qərar verməmişəm" }));
    await user.click(screen.getByRole("button", { name: "Əsas səhifəyə keç" }));

    expect(dialoq()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ana səhifə" })).toBeInTheDocument();
    // Rayon seçilməyib: standart rayon "seçilmiş" kimi yazılmır
    expect(saxlanan().location).toBeNull();
    expect(saxlanan().chat.crop).toBeNull();
  });

  it("geri düyməsi əvvəlki addıma qaytarır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await basla(user);
    await rayonSec(user, "Bərdə");
    await user.click(screen.getByRole("button", { name: "Davam et" }));
    expect(screen.getByText("Əsas məhsulunuz hansıdır?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Geri" }));
    expect(screen.getByText("Sahəniz hansı rayondadır?")).toBeInTheDocument();
  });

  it("keçmiş fermerə yenidən göstərilmir", () => {
    seedLocation();
    renderApp(<App />);
    expect(dialoq()).not.toBeInTheDocument();
  });

  it("hər addımı qeyd edir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await basla(user);
    await rayonSec(user, "Bərdə");
    await user.click(screen.getByRole("button", { name: "Davam et" }));
    await user.click(screen.getByRole("button", { name: "Kartof" }));
    await user.click(screen.getByRole("button", { name: "Davam et" }));

    expect(hadiseleriOxu().filter((h) => h.addim).map((h) => h.addim)).toEqual([
      "xosgeldin",
      "rayon",
      "bitki",
    ]);
  });
});

describe("bitki seçimi", () => {
  it("seçim aria-pressed ilə elan olunur və şəkildən asılı deyil", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await basla(user);
    await user.click(screen.getByRole("button", { name: "İndi yox" }));

    const kartof = screen.getByRole("button", { name: "Kartof" });
    expect(kartof).toHaveAttribute("aria-pressed", "false");
    await user.click(kartof);
    expect(kartof).toHaveAttribute("aria-pressed", "true");
  });

  it("tək seçimdir: ikinci bitki birincini əvəz edir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await basla(user);
    await user.click(screen.getByRole("button", { name: "İndi yox" }));

    await user.click(screen.getByRole("button", { name: "Kartof" }));
    await user.click(screen.getByRole("button", { name: "Pomidor" }));

    expect(screen.getByRole("button", { name: "Kartof" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Pomidor" })).toHaveAttribute("aria-pressed", "true");
  });

  it("«hələ qərar verməmişəm» bitkini NULL saxlayır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await basla(user);
    await user.click(screen.getByRole("button", { name: "İndi yox" }));
    await user.click(screen.getByRole("button", { name: "Kartof" }));
    await user.click(screen.getByRole("button", { name: "Hələ qərar verməmişəm" }));

    expect(saxlanan().chat.crop).toBeNull();
  });
});

describe("davam etmə", () => {
  it("yarımçıq axın son bitməmiş addımdan açılır və cavablar görünür", () => {
    seedState({
      onboarded: false,
      onboarding: { versiya: "2.1", tamamlananAddim: "rayon" },
      location: { ...DEFAULT_LOCATION },
      chat: { messages: [], crop: null, referral: false },
    });
    renderApp(<App />);

    // Rayon bitib — bitki addımı açılır
    expect(screen.getByText("Əsas məhsulunuz hansıdır?")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("əvvəl seçilmiş bitki qayıdanda seçili görünür", () => {
    seedState({
      onboarded: false,
      onboarding: { versiya: "2.1", tamamlananAddim: "rayon" },
      location: { ...DEFAULT_LOCATION },
      chat: { messages: [], crop: "pomidor", referral: false },
    });
    renderApp(<App />);

    expect(screen.getByRole("button", { name: "Pomidor" })).toHaveAttribute("aria-pressed", "true");
  });

  it("başqa versiyanın gedişi yeni axına sürüklənmir", () => {
    seedState({
      onboarded: false,
      onboarding: { versiya: "1.0", tamamlananAddim: "bitki" },
      location: null,
    });
    renderApp(<App />);

    // Gediş sıfırlanır: axın xoş gəldinizdən başlayır
    expect(screen.getByText("Sahənizi tanıyın.")).toBeInTheDocument();
  });
});

// Reqressiya: köhnə versiyada rayonunu seçmiş fermer yenidən keçməməlidir.
describe("saxlanan məlumatın miqrasiyası", () => {
  it("köhnə versiyada rayon seçmiş fermerə axın göstərilmir", () => {
    window.localStorage.setItem(
      "agrifin:state",
      JSON.stringify({
        version: 2,
        state: { location: { name: "Gəncə", lat: 40.68, lon: 46.36, gps: false }, wallet: 999 },
      }),
    );
    renderApp(<App />);

    expect(dialoq()).not.toBeInTheDocument();
    expect(screen.getAllByText(/Gəncə/).length).toBeGreaterThan(0);
  });

  it("köhnə qeyddəki ada RAYON KODU əlavə olunur", () => {
    window.localStorage.setItem(
      "agrifin:state",
      JSON.stringify({
        version: 9,
        state: {
          onboarded: true,
          location: { name: "Bərdə (GPS)", lat: 40.37, lon: 47.12, gps: true },
        },
      }),
    );
    renderApp(<App />);

    expect(saxlanan().location.kod).toBe("berde");
    // Göstərilən ad dəyişdirilmir
    expect(saxlanan().location.name).toBe("Bərdə (GPS)");
    expect(saxlanan().onboarding).toEqual({ versiya: "2.1", tamamlananAddim: "sahe" });
  });

  it("köhnə versiyada rayonu olmayan fermerdən soruşulur", () => {
    window.localStorage.setItem(
      "agrifin:state",
      JSON.stringify({ version: 2, state: { location: null } }),
    );
    renderApp(<App />);
    expect(dialoq()).toBeInTheDocument();
  });

  it("tanınmayan versiya sıfırdan başlayır", () => {
    window.localStorage.setItem(
      "agrifin:state",
      JSON.stringify({ version: 1, state: { location: { name: "Gəncə", lat: 40, lon: 46 } } }),
    );
    renderApp(<App />);
    expect(dialoq()).toBeInTheDocument();
  });
});
