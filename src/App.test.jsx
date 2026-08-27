import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { kreditServeri, renderApp, seedLocation, seedState, WEATHER_FIXTURE } from "./test/render.jsx";
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
    // Kredit vəziyyəti SERVERDƏDİR — localStorage-da deyil (bax: api/kredit.js)
    const server = kreditServeri();
    vi.stubGlobal(
      "fetch",
      vi.fn((url, secim) =>
        server.isle(url, secim) ??
        Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) }),
      ),
    );
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Məhsul dövrü krediti al" }));

    // Tavan izah olunur (Nubank "Me explica") və slayder tavana bağlıdır
    const slayder = await screen.findByRole("slider");
    expect(slayder).toBeInTheDocument();

    // Aqro slaydere reaksiya verir: tavana yaxınlaşanda fikirləşir.
    // Arxadakı əsas ekranda da Aqro var — yalnız dialoqun içinə baxılır.
    const dialoq = screen.getByRole("dialog");
    expect(dialoq.querySelector(".fermer").className).toContain("fermer--sakit");

    // Aylıq faiz seçilmiş əsas borca görə hesablanır və slayderlə birlikdə
    // YENİLƏNİR — "sonda bir məbləğ" modeli deyil
    const faizSetri = () => screen.getByText(/İlk ayın faizi:/).textContent;
    const evvelkiFaiz = faizSetri();
    fireEvent.change(slayder, { target: { value: slayder.max } });
    expect(faizSetri()).not.toBe(evvelkiFaiz);
    expect(dialoq.querySelector(".fermer").className).toContain("fermer--dusunur");

    // "Bir ödəniş" təqdimatı TAM çıxarılıb: faiz aylıqdır, əsas borc
    // çevikdir, son tarix əsas borcun tam bağlanması üçündür
    expect(screen.queryByText(/Bir ödəniş/)).not.toBeInTheDocument();
    // Rəqəm SABİT aylıq ödəniş kimi oxunmamalıdır: əsas borc azaldıqca faiz
    // də azalır və məhsulun əsas üstünlüyü elə budur
    expect(screen.getByText(/Sonrakı aylarda qalan əsas borca görə azalır/)).toBeInTheDocument();
    expect(screen.getByText(/Son tarix:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Əsas borcu istənilən vaxt qismən və ya tam ödəyə bilərsiniz/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Niyə ən çoxu/ }));
    expect(screen.getByText("Ehtiyatlı ssenaridə xalis təsərrüfat gəliri")).toBeInTheDocument();
    expect(screen.getByText("Təklif olunan kredit limiti")).toBeInTheDocument();
    // Yanlış termin qayıtmasın
    expect(screen.queryByText("Faizlə birlikdə əsas məbləğ")).not.toBeInTheDocument();
    // 25% ehtiyat fermer dilində izah olunur, model-governance mətni yoxdur
    expect(screen.getByText(/25% ehtiyat saxlanılır/)).toBeInTheDocument();
    expect(screen.queryByText(/kalibrlənməyib/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Şərtlərə bax" }));
    // Şərtlər: ilk ay faizi (~ ilə, sabit deyil) + çevik əsas borc + son tarix
    expect(screen.getByText("İlk ayın faizi")).toBeInTheDocument();
    expect(screen.getByText(/^~/)).toBeInTheDocument();
    expect(screen.getByText("Müddət")).toBeInTheDocument();
    expect(screen.getByText("Son tarix")).toBeInTheDocument();
    expect(
      screen.getByText("İstənilən vaxt qismən və ya tam ödəyə bilərsiniz"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Bir ödəniş/)).not.toBeInTheDocument();

    // GİROV: peyk təsdiqi girovun əvəzi deyil — iki ayrı sətirdir
    expect(screen.getByText("İllik faiz")).toBeInTheDocument();
    expect(screen.getByText("Tələb olunmur")).toBeInTheDocument();
    expect(screen.queryByText(/əkininiz kifayətdir/)).not.toBeInTheDocument();
    // Peyk ölçməsi yoxdur (api 501) → "peyklə təsdiqlənib" YAZILMIR
    expect(screen.getByText("Sahə")).toBeInTheDocument();
    expect(screen.getByText(/Xəritədə çəkilib/)).toBeInTheDocument();
    expect(screen.queryByText(/Peyk məlumatları ilə təsdiqlənib/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /üçün müraciət göndər/ }));

    // Qərarı SERVER verir: nəticə təklifdir, yerli "gözləyir" yazısı deyil
    await waitFor(() => expect(screen.getByText("Təklifiniz hazırdır")).toBeInTheDocument());
    // Uğur anı: konfeti bir dəfə səpələnir (bax: index.css, .konfeti)
    expect(document.querySelectorAll(".konfeti")).toHaveLength(8);

    // Göndərilən yükdə YALNIZ məbləğ var — qərar/limit/dərəcə klientdən getmir
    const cagiris = fetch.mock.calls.find(
      ([, secim]) => secim?.body && JSON.parse(secim.body).emel === "muraciet",
    );
    const yuk = JSON.parse(cagiris[1].body);
    expect(Object.keys(yuk).sort()).toEqual(["acar", "emel", "mebleg"]);

    // Təklifi qəbul → aktiv kredit
    await user.click(screen.getByRole("button", { name: "Təklifi qəbul et" }));
    await waitFor(() => expect(screen.getByText("Aktiv krediti\u00adniz")).toBeInTheDocument());
    expect(server.oxu().kredit.hal).toBe("active");
    // PUL KÖÇÜRÜLMÜR: pulqabı dəyişməz qalır.
    // İki "Bağla" var: Sheet-in başlıqdakı düyməsi və məzmundakı CTA
    await user.click(screen.getAllByRole("button", { name: "Bağla" }).at(-1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("7.280 ₼")).toBeInTheDocument();

    // Aktiv kredit Pul ekranında görünür — nümunə rəqəm deyil, serverdən
    await user.click(screen.getByRole("button", { name: "Pul" }));
    expect(screen.getByText("Qalan əsas borc")).toBeInTheDocument();
  });

  // Peyk təsdiqi girovun əvəzi deyil, amma ölçmə VARSA bunu demək olar.
  // Ölçmə yoxdursa yuxarıdakı test "Xəritədə çəkilib" gözləyir — sətir
  // sahənin həqiqi vəziyyətini deyir, hər iki halda.
  it("peyk ölçməsi olanda sahə sətri təsdiqi göstərir", async () => {
    const user = userEvent.setup();
    const il = new Date().getFullYear();
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        const yol = String(url);
        if (yol.includes("/api/tarixce")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                movsumler: Array.from({ length: 6 }, (_, i) => ({
                  il: il - 5 + i,
                  zirve: 0.72,
                  zirveAyi: `${il - 5 + i}-05`,
                  etrafMedyan: 0.6,
                  olcmeSayi: 6,
                })),
              }),
          });
        }
        if (yol.includes("/api/kredit")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ muraciet: null, qerar: null, teklif: null, kredit: null }),
          });
        }
        if (yol.includes("/api/")) return Promise.resolve({ ok: false, status: 501 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) });
      }),
    );
    seedState({
      location: DEFAULT_LOCATION,
      onboarded: true,
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
    await user.click(screen.getByRole("button", { name: "Şərtlərə bax" }));

    await waitFor(() =>
      expect(screen.getByText("Peyk məlumatları ilə təsdiqlənib")).toBeInTheDocument(),
    );
    // Girov sətri yenə ayrıdır və "kifayətdir" demir
    expect(screen.getByText("Tələb olunmur")).toBeInTheDocument();
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
