import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { renderApp, seedLocation, WEATHER_FIXTURE } from "./test/render.jsx";

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
  it("əsas ekranda FarmScore, kredit limiti və pulqabını göstərir", async () => {
    renderApp(<App />);

    expect(screen.getByRole("img", { name: /FARMSCORE: 782/ })).toBeInTheDocument();
    expect(screen.getByText("12.000 ₼")).toBeInTheDocument();
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

  it("kredit axını pulqabını artırır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Məhsul dövrü krediti al" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Şərtlərə bax" }));
    await user.click(screen.getByRole("button", { name: "Qəbul et və 5.000 ₼ al" }));

    expect(screen.getByText("5.000 ₼ pulqabınızdadır")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bağla" }));
    // 7.280 + 5.000
    expect(screen.getByText("12.280 ₼")).toBeInTheDocument();
  });

  it("Escape düyməsi kredit panelini bağlayır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Məhsul dövrü krediti al" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
