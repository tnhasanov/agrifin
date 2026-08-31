import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState, WEATHER_FIXTURE } from "../../test/render.jsx";
import { DEFAULT_LOCATION } from "../../services/location.js";

/**
 * HAL A — İLK SAHƏ AKTİVLƏŞDİRMƏSİ.
 *
 * Brief A: bu, qeydiyyatın üçüncü addımı deyil, panonun bir halıdır. Sahə
 * silinsə geri qayıdır. Ekranda bal, kredit metrikası, hesab təbliği və
 * sahə-koordinat iddiaları OLMAMALIDIR; "Necə işləyir?" isə ümumi çatı yox,
 * üç addımlıq izahı açır.
 */

const SAHE = {
  hektar: 10,
  noqteler: [
    [40.4, 47.1],
    [40.4023, 47.1],
    [40.4023, 47.1029],
    [40.4, 47.1029],
  ],
};

function stubApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) =>
      String(url).includes("/api/")
        ? Promise.resolve({ ok: false, status: 501, json: () => Promise.resolve({}) })
        : Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) }),
    ),
  );
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  stubApi();
});

afterEach(() => vi.unstubAllGlobals());

describe("hal A — 'Necə işləyir?' ayrıca izahdır", () => {
  it("üç addımlı panel açılır, Aqronom çatı AÇILMIR", async () => {
    const user = userEvent.setup();
    seedState({ location: DEFAULT_LOCATION, onboarded: true });
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Necə işləyir?" }));

    const panel = within(await screen.findByRole("dialog", { name: "Necə işləyir?" }));
    expect(panel.getByText("Sahə çəkmək üç addımdır — təxminən 2 dəqiqə.")).toBeInTheDocument();
    expect(panel.getByText("Künclərə toxunun")).toBeInTheDocument();
    expect(panel.getByText("Ən azı üç künc")).toBeInTheDocument();
    expect(panel.getByText("Sahəni saxlayın")).toBeInTheDocument();

    // Ümumi çatın əlamətləri panelin içində YOXDUR
    expect(screen.queryByPlaceholderText("Sualınızı yazın…")).not.toBeInTheDocument();
    expect(panel.queryByText("Aqronom köməkçisi")).not.toBeInTheDocument();
  });

  it("izahın sonundakı düymə birbaşa sahə çəkməyə aparır", async () => {
    const user = userEvent.setup();
    seedState({ location: DEFAULT_LOCATION, onboarded: true });
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Necə işləyir?" }));
    const panel = await screen.findByRole("dialog", { name: "Necə işləyir?" });
    await user.click(within(panel).getByRole("button", { name: "Sahə əlavə et" }));

    expect(await screen.findByText("Sahənizi çəkin")).toBeInTheDocument();
    // Yeni dəqiq mətn: künclərə ARDICILLIQLA toxunulur
    expect(screen.getByText("Sahənin künclərinə ardıcıllıqla toxunun.")).toBeInTheDocument();
  });

  it("Sahələr ekranındakı boş hal da eyni izahı açır", async () => {
    const user = userEvent.setup();
    seedState({ location: DEFAULT_LOCATION, onboarded: true });
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Sahələr" }));
    await user.click(screen.getByRole("button", { name: "Necə işləyir?" }));

    expect(await screen.findByRole("dialog", { name: "Necə işləyir?" })).toBeInTheDocument();
  });
});

describe("hal A — hesab təbliği yalnız dəyərdən sonra", () => {
  it("sahə yoxdursa Kömək ekranında hesab tapşırığı GÖSTƏRİLMİR", async () => {
    const user = userEvent.setup();
    seedState({ location: DEFAULT_LOCATION, onboarded: true });
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Kömək" }));
    expect(screen.queryByText("Açıq tapşırıqlar")).not.toBeInTheDocument();
    expect(screen.queryByText(/Hesab yarat/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sahən qorunsun/)).not.toBeInTheDocument();
  });

  it("sahə çəkiləndən sonra kontekstli hesab dəvəti çıxır", async () => {
    const user = userEvent.setup();
    seedState({ location: DEFAULT_LOCATION, onboarded: true, sahe: SAHE });
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Kömək" }));
    expect(await screen.findByText("Açıq tapşırıqlar")).toBeInTheDocument();
    // PDF 22 dəqiq mətni — qorunan şey adlandırılır
    await user.click(screen.getByRole("button", { name: "Sahəni hesabında qoruyun" }));

    const panel = within(await screen.findByRole("dialog", { name: "Hesab" }));
    expect(
      panel.getByText("Telefon dəyişsə belə sahə məlumatlarınız hesabınızda qalacaq."),
    ).toBeInTheDocument();
    expect(panel.getByLabelText(/Telefon nömrəsi/)).toBeInTheDocument();
    expect(panel.getByRole("button", { name: "Kodu göndər" })).toBeInTheDocument();
  });
});

describe("hal A — qadağalar", () => {
  it("ana səhifədə bal, kredit metrikası və hava-koordinat iddiası yoxdur", async () => {
    seedState({ location: DEFAULT_LOCATION, onboarded: true });
    renderApp(<App />);

    expect(screen.getAllByText("İlk sahənizi əlavə edin")).toHaveLength(1);
    expect(screen.queryByText("Kredit imkanı")).not.toBeInTheDocument();
    expect(screen.queryByText(/FarmScore/)).not.toBeInTheDocument();
    expect(screen.queryByText("Tarixçə yığılır")).not.toBeInTheDocument();
    expect(screen.queryByText("Bu gün nə etməli?")).not.toBeInTheDocument();
    // Hava zolağı qalır, amma rayon üzrə etiketlənir (aşağıda, ikinci dərəcəli)
    await waitFor(() =>
      expect(screen.getByText(`${DEFAULT_LOCATION.name} üzrə hava`)).toBeInTheDocument(),
    );
    expect(screen.queryByText("Sahədə hava")).not.toBeInTheDocument();
  });

  it("sahə silinsə hal A geri qayıdır (qeydiyyat addımı deyil, pano halıdır)", async () => {
    seedState({ location: DEFAULT_LOCATION, onboarded: true, sahe: SAHE });
    const { unmount } = renderApp(<App />);
    expect(screen.queryByText("İlk sahənizi əlavə edin")).not.toBeInTheDocument();
    unmount();

    // Sahə itir (silinmiş/deaktiv edilmiş) — qeydiyyat YENİDƏN açılmır,
    // pano öz hal A kompozisiyasına qayıdır
    seedState({ location: DEFAULT_LOCATION, onboarded: true, sahe: null });
    renderApp(<App />);
    expect(screen.getAllByText("İlk sahənizi əlavə edin")).toHaveLength(1);
    expect(screen.queryByText("Sahəniz haradadır?")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
