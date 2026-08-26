import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { renderApp, seedLocation, seedState, WEATHER_FIXTURE } from "./test/render.jsx";
import { DEFAULT_LOCATION } from "./services/location.js";

beforeEach(() => {
  window.history.pushState({}, "", "/");
  // jsdom-un dili "en-US"-dur; ekran mətnlərini yoxlamaq üçün azərbaycancanı seçirik
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  seedLocation();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AgriFin tətbiqi", () => {
  it("əsas ekranda kredit limiti, pulqabı və indeks dəvəti göstərilir", async () => {
    renderApp(<App />);

    // Saxta 782 qövsü silinib: sahə çəkilməmiş nömrə YOX, dəvət göstərilir
    expect(
      screen.getByText(/Sahənizi çəkin — aqronomik performans indeksiniz/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/FARMSCORE/)).not.toBeInTheDocument();
    // Saxta 12.000 ₼ limiti SİLİNİB: sahə/bitki yoxdursa rəqəm də yoxdur —
    // uydurma rəqəm göstərməkdənsə boşluq göstərilir
    expect(screen.queryByText("12.000 ₼")).not.toBeInTheDocument();
    expect(screen.getByText("Kredit imkanı")).toBeInTheDocument();
    expect(screen.getByText(/sahənizi çəkin və bitkinizi seçin/i)).toBeInTheDocument();
    expect(screen.getByText("7.280 ₼")).toBeInTheDocument();
  });

  it("real hava məlumatını gətirib tövsiyə göstərir", async () => {
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("34°")).toBeInTheDocument());
    // İkinci arqument yoxdur: proqnoz sorğusu paylaşılır, ona görə heç bir
    // çağıranın `signal`-ı ötürülmür (bax: services/weather.js)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("api.open-meteo.com"));
  });

  it("aşağı naviqasiya ilə ekranlar arasında keçir və URL-i dəyişir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Bazar" }));

    expect(window.location.pathname).toBe("/market");
    expect(screen.getByText("Məhsul qiymətləriniz")).toBeInTheDocument();
    expect(screen.getByText("Buğda")).toBeInTheDocument();
  });

  it("dərin link birbaşa müvafiq ekranı açır", () => {
    window.history.pushState({}, "", "/carbon");
    renderApp(<App />);

    expect(screen.getByText("BU MÖVSÜM KARBON")).toBeInTheDocument();
  });

  // ── Dürüst kredit axını ────────────────────────────────────────────
  // Köhnə axın "Qəbul et" ilə pulqabına DƏRHAL pul yazırdı — qərar
  // mühərriki olmayan yerdə bu, yalan idi. Yeni axın müraciətlə bitir.
  it("sahə çəkilməmiş kredit paneli imkanın niyə olmadığını deyir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Məhsul dövrü krediti al" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("İmkan hələ hesablana bilmir")).toBeInTheDocument();
    expect(screen.getByText(/Sahənizi xəritədə çəkin/)).toBeInTheDocument();
    // Slayder yoxdur — uydurma tavanla məbləğ seçdirilmir
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("kredit axını pul köçürmür — müraciətlə bitir", async () => {
    const user = userEvent.setup();
    seedState({
      location: DEFAULT_LOCATION,
      onboarded: true,
      // Geniş marjalı bitki + böyük sahə: tavan slayder üçün kifayətdir
      sahe: {
        hektar: 10,
        noqteler: [
          [40.4, 47.1],
          [40.4023, 47.1],
          [40.4023, 47.1029],
          [40.4, 47.1029],
        ],
      },
      chat: { messages: [], crop: "pomidor", referral: false },
    });
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Məhsul dövrü krediti al" }));

    // Tavan izah olunur (Nubank "Me explica") və slayder tavana bağlıdır
    expect(screen.getByRole("slider")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Niyə ən çoxu/ }));
    expect(screen.getByText("Pessimist ssenaridə xalis gəlir")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Şərtlərə bax" }));
    // Müddət biçinə bağlıdır — şərtlərdə ay sayı görünür
    expect(screen.getByText(/ay — biçinə qədər/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /üçün müraciət göndər/ }));
    expect(screen.getByText(/müraciətiniz qeydə alındı/)).toBeInTheDocument();
    // PUL KÖÇÜRÜLMÜR: pulqabı dəyişməz qalır.
    // İki "Bağla" var: Sheet-in başlıqdakı düyməsi və məzmundakı CTA
    await user.click(screen.getAllByRole("button", { name: "Bağla" }).at(-1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("7.280 ₼")).toBeInTheDocument();

    // Müraciət Pul ekranında gözləyir
    await user.click(screen.getByRole("button", { name: "Pul" }));
    expect(screen.getByText(/Kredit müraciəti —/)).toBeInTheDocument();
    expect(screen.getByText("Gözləyir")).toBeInTheDocument();
  });

  it("Escape düyməsi kredit panelini bağlayır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Məhsul dövrü krediti al" }));
    await user.keyboard("{Escape}");

    // Sheet bağlanma animasiyası bitənədək DOM-da qalır (bax: Sheet.jsx)
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("karbon kreditlərini satır və pulqabına 360 ₼ əlavə edir", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/carbon");
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "360 ₼-a sat" }));

    expect(screen.getByText("Satıldı")).toBeInTheDocument();
    expect(screen.getByText("360 ₼ pulqabınıza əlavə olundu")).toBeInTheDocument();
  });

  it("dil düyməsi interfeysi ingiliscəyə keçirir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: /Dili dəyiş/ }));

    expect(screen.getByRole("button", { name: "Market" })).toBeInTheDocument();
    expect(screen.getByText("Canopy cover")).toBeInTheDocument();
  });

  it("vəziyyəti localStorage-da saxlayır", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/carbon");
    const { unmount } = renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "360 ₼-a sat" }));
    unmount();

    renderApp(<App />);
    expect(screen.getByText("Satıldı")).toBeInTheDocument();
  });
});
