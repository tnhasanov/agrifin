import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedState, WEATHER_FIXTURE } from "../../test/render.jsx";
import { DEFAULT_LOCATION } from "../../services/location.js";
import { novbetiSert } from "./sertler.js";

/**
 * MALİYYƏ ŞƏRT ZƏNCİRİ — sahə → bitki → hesab → təklif.
 *
 * Brief-in dalan qadağası: kredit paneli AÇILIB içində "əvvəl sahə çək"
 * deməməlidir. Ekranın özü növbəti addımı bilməlidir.
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

describe("novbetiSert — saf sıra", () => {
  it("sahə yoxdursa birinci addım sahədir (bitki və giriş vəziyyətindən asılı olmayaraq)", () => {
    expect(novbetiSert({ sahe: null, bitki: "pomidor", serverHal: "hazir" })).toMatchObject({
      tip: "sahe",
      ctaKey: "maliyye.sert.saheCta",
      hereket: "saheCek",
    });
    expect(novbetiSert({ sahe: null, bitki: null, serverHal: "girisYox" }).tip).toBe("sahe");
  });

  it("sahə var, bitki yoxdursa ikinci addım bitkidir", () => {
    expect(novbetiSert({ sahe: SAHE, bitki: null, serverHal: "hazir" })).toMatchObject({
      tip: "bitki",
      ctaKey: "maliyye.sert.bitkiCta",
      hereket: "bitkiSec",
    });
    // Giriş də yoxdursa yenə bitki öndədir — sıra pozulmur
    expect(novbetiSert({ sahe: SAHE, bitki: null, serverHal: "girisYox" }).tip).toBe("bitki");
  });

  it("server 401 deyirsə üçüncü addım hesabdır", () => {
    expect(novbetiSert({ sahe: SAHE, bitki: "pomidor", serverHal: "girisYox" })).toMatchObject({
      tip: "hesab",
      ctaKey: "maliyye.sert.hesabCta",
      hereket: "hesab",
    });
  });

  it("hamısı hazırdırsa təklif yoxlanılır", () => {
    expect(novbetiSert({ sahe: SAHE, bitki: "pomidor", serverHal: "hazir" })).toMatchObject({
      tip: "hazir",
      ctaKey: "maliyye.sert.hazirCta",
      hereket: "teklif",
    });
  });

  // Kredit modulu qurulmayıbsa (501) sessiyanı bilmirik — bu, şərt DEYİL:
  // panel açılır və xidmətin əlçatan olmadığını özü deyir (dalan deyil)
  it("kredit modulu qurulmayıbsa şərt zənciri hesabda ilişmir", () => {
    expect(novbetiSert({ sahe: SAHE, bitki: "pomidor", serverHal: "qurulmayib" }).tip).toBe(
      "hazir",
    );
  });

  it("standart arqumentlərlə ilk addımı qaytarır", () => {
    expect(novbetiSert().tip).toBe("sahe");
  });
});

describe("Maliyyə ekranı — şərt kartı", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/money");
    window.localStorage.clear();
    window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        String(url).includes("/api/")
          ? Promise.resolve({ ok: false, status: 501, json: () => Promise.resolve({}) })
          : Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) }),
      ),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("hazır fermerə 'Təklifi yoxla' göstərilir və panel açılır", async () => {
    const user = userEvent.setup();
    seedState({
      location: DEFAULT_LOCATION,
      onboarded: true,
      sahe: SAHE,
      chat: { messages: [], crop: "pomidor", referral: false },
    });
    renderApp(<App />);

    const cta = await screen.findByRole("button", { name: /Kredit üçün növbəti addım|Əlavə vəsait lazımdır/ });
    expect(cta.textContent).toContain("Təklifi yoxla");
    expect(
      screen.getByText("Məlumatlarınız hazırdır. Sizə uyğun təklifi yoxlayaq."),
    ).toBeInTheDocument();

    await user.click(cta);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });

  // Hal A-nın maliyyə tərəfi: sahəsiz ekranda bal, limit və kredit rəqəmi yoxdur
  it("sahəsiz Maliyyə ekranında uydurma limit və demo balans yoxdur", async () => {
    seedState({ location: DEFAULT_LOCATION, onboarded: true });
    renderApp(<App />);

    expect(await screen.findByText("Maliyyələşmə")).toBeInTheDocument();
    expect(screen.queryByText("7.280 ₼")).not.toBeInTheDocument();
    expect(screen.queryByText("Kredit imkanı")).not.toBeInTheDocument();
    expect(screen.queryByText("Aktiv kredit")).not.toBeInTheDocument();
  });
});
