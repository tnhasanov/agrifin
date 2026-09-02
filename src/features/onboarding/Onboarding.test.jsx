import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedLocation } from "../../test/render.jsx";
import { hadiseleriOxu, hadiseleriTemizle } from "../../lib/analytics.js";

const dialoq = () => screen.queryByRole("dialog", { name: "Başlanğıc" });

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  hadiseleriTemizle();
  // Hava sorğusu bu testin mövzusu deyil
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ilk açılış axını", () => {
  it("yeni fermerə göstərilir, rayon və bitki soruşur", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    expect(dialoq()).toBeInTheDocument();
    expect(screen.getByText("Sahəniz haradadır?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Bərdə/ }));

    expect(screen.getByText("Nə əkirsiniz?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kartof" }));

    // İki toxunuşdan sonra fermer tətbiqin içindədir — bağlanma personajın
    // sevinc fasiləsindən (SEVINC_MS) sonra gəlir
    await waitFor(() => expect(dialoq()).not.toBeInTheDocument(), { timeout: 2500 });
  });

  // Əsas qərar: qeydiyyatda şəxsiyyət soruşulmur. Ölçülərə görə uzun və
  // hesab tələb edən qeydiyyat fermerlərin böyük hissəsini itirir.
  it("nə nömrə, nə parol, nə şəxsiyyət soruşur", () => {
    renderApp(<App />);
    const panel = dialoq();

    // Nə telefon, nə parol, nə e-poçt sahəsi
    expect(panel.querySelector('input[type="tel"]')).toBeNull();
    expect(panel.querySelector('input[type="password"]')).toBeNull();
    expect(panel.querySelector('input[type="email"]')).toBeNull();
    expect(panel.textContent).not.toMatch(/SİMA|parol|ASAN/i);

    // Yeganə mətn sahəsi rayon axtarışıdır
    const sahələr = [...panel.querySelectorAll("input")];
    expect(sahələr).toHaveLength(1);
    expect(sahələr[0]).toHaveAttribute("aria-label", "Rayon axtarın");
  });

  it("seçilən rayon və bitki tətbiqdə qalır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: /Şəki/ }));
    await user.click(screen.getByRole("button", { name: "Üzüm" }));
    await waitFor(() => expect(dialoq()).not.toBeInTheDocument(), { timeout: 2500 });

    const saxlanan = JSON.parse(window.localStorage.getItem("agrifin:state"));
    expect(saxlanan.state.location.name).toBe("Şəki");
    expect(saxlanan.state.chat.crop).toBe("uzum");
    expect(saxlanan.state.onboarded).toBe(true);
  });

  it("rayon axtarışı siyahını süzür", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.type(screen.getByRole("textbox", { name: "Rayon axtarın" }), "Qəbələ");
    expect(screen.getByRole("button", { name: /Qəbələ/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Bərdə/ })).not.toBeInTheDocument();
  });

  it("hər iki addım keçilə bilir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Sonra seçəcəyəm" }));
    expect(
      screen.getByText("Tövsiyələri seçdiyiniz bitkiyə uyğunlaşdıracağıq. Rayonu sonra seçə bilərsiniz."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^üçün tövsiyələri/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hələ qərar verməmişəm" }));

    expect(dialoq()).not.toBeInTheDocument();
    // Rayon seçilməyib, amma tətbiq işləyir — standart rayon UYDURULMUR
    expect(screen.getByRole("button", { name: "Ana səhifə" })).toBeInTheDocument();
    expect(screen.getByText("Hava üçün yer seçin")).toBeInTheDocument();
    expect(screen.queryByText(/Bərdə üzrə hava/)).not.toBeInTheDocument();
    expect(fetch.mock.calls.some(([url]) => String(url).includes("api.open-meteo.com"))).toBe(false);
  });

  // Personaj bələdçidir: sual qabarcıqda onun sözüdür, seçim isə üzündə
  // təsdiqlənir — bitkiyə toxunan kimi onu geyinib sevincdən tullanır
  it("bitki seçiləndə personaj onu geyinib sevinir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    // Yer addımında personaj danışır — sual onun qabarcığındadır
    expect(dialoq().querySelector(".fermer--danisir")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Bərdə/ }));
    await user.click(screen.getByRole("button", { name: "Kartof" }));

    const fermer = dialoq().querySelector(".fermer");
    expect(fermer.className).toContain("fermer--sevincli");
    expect(fermer.querySelector("img").getAttribute("src")).toContain("kartof-sevincli");
    expect(screen.getByText(/Əla — Kartof!/)).toBeInTheDocument();

    await waitFor(() => expect(dialoq()).not.toBeInTheDocument(), { timeout: 2500 });
  });

  it("geri düyməsi əvvəlki addıma qaytarır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: /Bərdə/ }));
    expect(screen.getByText("Nə əkirsiniz?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Geri" }));
    expect(screen.getByText("Sahəniz haradadır?")).toBeInTheDocument();
  });

  it("keçmiş fermerə yenidən göstərilmir", () => {
    seedLocation();
    renderApp(<App />);
    expect(dialoq()).not.toBeInTheDocument();
  });

  // Qıfın hansı addımında fermerin əlini çəkdiyini görmək üçün
  it("hər addımı qeyd edir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: /Bərdə/ }));
    await user.click(screen.getByRole("button", { name: "Kartof" }));

    await waitFor(() =>
      expect(hadiseleriOxu().map((h) => h.addim)).toEqual(["yer", "bitki"]),
      { timeout: 2500 },
    );
  });
});

// Reqressiya: 2-ci versiyada rayonunu seçmiş fermer yeni versiyada
// qeydiyyatı yenidən keçməməlidir.
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
    // Köhnə məlumat da qalır, sadəcə atılmır
    expect(screen.getAllByText(/Gəncə/).length).toBeGreaterThan(0);
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
