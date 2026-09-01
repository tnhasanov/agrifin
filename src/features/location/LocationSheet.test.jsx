import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedLocation, seedOnboarded, WEATHER_FIXTURE } from "../../test/render.jsx";

/**
 * Paneli hava zolağındaki düymə ilə açır. İlk açılışda panel artıq özü
 * qalxmır — bu işi qeydiyyat axını görür (bax: Onboarding.test.jsx).
 */
async function acPanel(user) {
  await user.click(screen.getByRole("button", { name: /Bərdə|Yeri seçin/ }));
  return screen.getByRole("dialog", { name: "Sahənizin yeri" });
}

// Qeydiyyat keçilib, amma rayon seçilməyib — panelin öz davranışı yoxlanılır.
beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  seedOnboarded();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("yer seçimi", () => {
  it("ilk açılışda özü qalxmır — bu, qeydiyyat axınının işidir", () => {
    renderApp(<App />);
    expect(screen.queryByRole("dialog", { name: "Sahənizin yeri" })).not.toBeInTheDocument();
  });

  it("hava zolağındaki düymə ilə açılır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    expect(await acPanel(user)).toBeInTheDocument();
  });

  it("axtarış rayon siyahısını süzür", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acPanel(user);

    expect(screen.getByRole("button", { name: "Gəncə" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Rayon axtarın" }), "quba");

    expect(screen.getByRole("button", { name: "Quba" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gəncə" })).not.toBeInTheDocument();
  });

  it("tapılmayan ad üçün mesaj göstərir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acPanel(user);

    await user.type(screen.getByRole("textbox", { name: "Rayon axtarın" }), "belərayonyoxdur");
    expect(screen.getByText("Rayon tapılmadı.")).toBeInTheDocument();
  });

  it("rayon seçmək paneli bağlayır, bildiriş verir və başlığı yeniləyir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acPanel(user);

    await user.click(screen.getByRole("button", { name: "Gəncə" }));

    expect(screen.queryByRole("dialog", { name: "Sahənizin yeri" })).not.toBeInTheDocument();
    expect(screen.getByText("Gəncə üçün hava proqnozu yükləndi")).toBeInTheDocument();
    // Hava başlığındaki düymə artıq seçilmiş rayonu göstərir
    expect(screen.getByRole("button", { name: /Gəncə/ })).toBeInTheDocument();
  });

  it("seçilmiş rayon üçün yeni proqnoz sorğusu göndərir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acPanel(user);

    await user.click(screen.getByRole("button", { name: "Quba" }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("latitude=41.3608")),
    );
  });

  it("«Sonra seçəcəyəm» seçim etmədən bağlayır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acPanel(user);

    await user.click(screen.getByRole("button", { name: "Sonra seçəcəyəm" }));

    expect(screen.queryByRole("dialog", { name: "Sahənizin yeri" })).not.toBeInTheDocument();
    // Default rayonun proqnozu göstərilir
    expect(screen.getByRole("button", { name: /Bərdə/ })).toBeInTheDocument();
  });

  it("Escape ilə bağlanır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await acPanel(user);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Sahənizin yeri" })).not.toBeInTheDocument();
  });

  it("rayon seçildikdən sonra düymə paneli yenidən açır", async () => {
    const user = userEvent.setup();
    seedLocation();
    renderApp(<App />);

    expect(await acPanel(user)).toBeInTheDocument();
  });

  it("köhnə prototipin saxladığı yeri qəbul edir və yenidən soruşmur", () => {
    window.localStorage.setItem(
      "agrifin.yer",
      JSON.stringify({ ad: "Lənkəran", lat: 38.7536, lon: 48.8511, gps: false }),
    );
    renderApp(<App />);

    expect(screen.queryByRole("dialog", { name: "Sahənizin yeri" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lənkəran/ })).toBeInTheDocument();
  });
});

describe("yer seçimi — GPS", () => {
  it("cihaz dəstəkləmirsə səbəbi yazır", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", { ...window.navigator, geolocation: undefined });
    renderApp(<App />);
    await acPanel(user);

    await user.click(screen.getByRole("button", { name: "Sahəmin yerini təyin et" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Bu cihaz yer təyinini dəstəkləmir.");
  });

  it("icazə verilmədikdə rayon seçməyi təklif edir", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...window.navigator,
      geolocation: { getCurrentPosition: (_ok, fail) => fail({ code: 1 }) },
    });
    renderApp(<App />);
    await acPanel(user);

    await user.click(screen.getByRole("button", { name: "Sahəmin yerini təyin et" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Məkan icazəsi verilmədi");
  });

  it("siqnal tapılmadıqda ayrı mesaj göstərir", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...window.navigator,
      geolocation: { getCurrentPosition: (_ok, fail) => fail({ code: 2 }) },
    });
    renderApp(<App />);
    await acPanel(user);

    await user.click(screen.getByRole("button", { name: "Sahəmin yerini təyin et" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Siqnal tapılmadı");
  });

  it("koordinat alındıqda ən yaxın rayonun adını verir", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      ...window.navigator,
      geolocation: {
        getCurrentPosition: (ok) =>
          ok({ coords: { latitude: 40.68281, longitude: 46.36055 } }),
      },
    });
    renderApp(<App />);
    await acPanel(user);

    await user.click(screen.getByRole("button", { name: "Sahəmin yerini təyin et" }));

    expect(screen.queryByRole("dialog", { name: "Sahənizin yeri" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gəncə \(GPS\)/ })).toBeInTheDocument();
  });
});
