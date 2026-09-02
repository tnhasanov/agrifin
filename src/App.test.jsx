import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { kreditServeri, renderApp, seedLocation, seedOnboarded, seedState, WEATHER_FIXTURE } from "./test/render.jsx";
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
  // ── Hal A: yeni fermer — sahəsiz ekranda UYDURMA METRİKA YOXDUR ─────
  it("sahəsiz fermer ilk sahə dəvətini görür, saxta göstərici görmür", async () => {
    renderApp(<App />);

    // Dəqiq məhsul mətni: BİR aydın hərəkət + dürüst vaxt gözləntisi.
    // Dəvət təkdir — ikinci "nə etməli" kartı ilə CTA təkrarlanmır
    expect(screen.getAllByText("İlk sahənizi əlavə edin")).toHaveLength(1);
    expect(screen.getByText(/Sahəni xəritədə çəkin\. Biz peyk məlumatlarını/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Sahə əlavə et" })).toHaveLength(1);
    expect(screen.getByText("Təxminən 2 dəqiqə çəkir")).toBeInTheDocument();
    expect(screen.getByText("Təsərrüfatınızı birlikdə quraq")).toBeInTheDocument();

    // Hal A qadağaları: nə bal, nə KPI, nə kredit, nə demo pulqabı
    expect(screen.queryByText(/FARMSCORE/i)).not.toBeInTheDocument();
    expect(screen.queryByText("12.000 ₼")).not.toBeInTheDocument();
    expect(screen.queryByText("7.280 ₼")).not.toBeInTheDocument();
    expect(screen.queryByText("Kredit imkanı")).not.toBeInTheDocument();
    expect(screen.queryByText("Aktiv kredit")).not.toBeInTheDocument();

    // Hal A-da "nə etməli" kartı YOXDUR: dəvət elə bir nömrəli işdir,
    // hava siqnalı da sahəsiz fermeri "Sahəyə bax"-a aparmamalıdır
    expect(screen.queryByText("Bu gün nə etməli?")).not.toBeInTheDocument();
  });

  it("real hava məlumatını gətirib tövsiyə göstərir", async () => {
    renderApp(<App />);

    await waitFor(() => expect(screen.getByText("34°")).toBeInTheDocument());
    // İkinci arqument yoxdur: proqnoz sorğusu paylaşılır, ona görə heç bir
    // çağıranın `signal`-ı ötürülmür (bax: services/weather.js)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("api.open-meteo.com"));
  });

  it("rayon seçilməyibsə Bərdəni uydurmur və sahədən əvvəl yer seçdirir", async () => {
    const user = userEvent.setup();
    seedOnboarded();
    renderApp(<App />);

    expect(screen.getByText("Hava üçün yer seçin")).toBeInTheDocument();
    expect(screen.queryByText(/Bərdə/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sahə əlavə et" }));
    expect(screen.getByRole("dialog", { name: "Sahənizin yeri" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Sahənizi çəkin" })).not.toBeInTheDocument();
  });

  // Naviqasiya DÜZ DÖRD yerdir: Ana səhifə, Sahələr, Maliyyə, Kömək.
  // Bazar/karbon əsas naviqasiyada YOXDUR, amma dərin linkləri işləyir.
  it("aşağı naviqasiyada düz dörd yer var və URL-i dəyişir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    const nav = screen.getByRole("navigation");
    const duymeler = Array.from(nav.querySelectorAll("button")).map((b) => b.textContent);
    expect(duymeler).toEqual(["Ana səhifə", "Sahələr", "Maliyyə", "Kömək"]);

    await user.click(screen.getByRole("button", { name: "Sahələr" }));
    expect(window.location.pathname).toBe("/fields");

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    expect(window.location.pathname).toBe("/money");

    await user.click(screen.getByRole("button", { name: "Kömək" }));
    expect(window.location.pathname).toBe("/advisor");
    expect(await screen.findByText("Aqronom köməkçisi")).toBeInTheDocument();
  });

  it("dərin link birbaşa müvafiq ekranı açır — bazar/karbon linkləri qırılmır", async () => {
    window.history.pushState({}, "", "/carbon");
    renderApp(<App />);
    // Ekran açılır (link qırılmayıb), amma SAHƏSİZ istifadəçiyə ölçülmüş
    // iddia göstərilmir: "MRV təsdiqli" və tCO₂e rəqəmi arxasında heç nə yoxdur
    expect(await screen.findByText("Karbon üçün təsdiqlənmiş sahə lazımdır")).toBeInTheDocument();
    expect(screen.queryByText("BU MÖVSÜM KARBON")).not.toBeInTheDocument();
    expect(screen.queryByText("MRV təsdiqli")).not.toBeInTheDocument();
    expect(screen.queryByText(/tCO/)).not.toBeInTheDocument();
  });

  it("bazar dərin linki naviqasiyasız da işləyir", async () => {
    window.history.pushState({}, "", "/market");
    renderApp(<App />);
    expect(await screen.findByText("Məhsul qiymətləriniz")).toBeInTheDocument();
  });

  // ── Dürüst kredit axını ────────────────────────────────────────────
  // Köhnə axın "Qəbul et" ilə pulqabına DƏRHAL pul yazırdı — qərar
  // mühərriki olmayan yerdə bu, yalan idi. Yeni axın müraciətlə bitir.
  // v2 DALAN QADAĞASI: Maliyyə ekranı kredit panelini AÇIB içində "əvvəl
  // sahə çək" deməməlidir. Ekranın özü növbəti əskik şərti göstərir.
  it("sahə çəkilməyibsə Maliyyə dalan açmır — birbaşa sahə çəkməyə aparır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    // Sahəsiz ana səhifədə kredit CTA-sı YOXDUR (hal A)
    expect(screen.queryByRole("button", { name: "Məhsul dövrü krediti al" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Maliyyə" }));

    expect(await screen.findByText("Maliyyələşmə")).toBeInTheDocument();
    expect(
      screen.getByText("Kredit imkanını hesablamaq üçün sahənizi əlavə edin."),
    ).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /Kredit üçün növbəti addım|Əlavə vəsait lazımdır/ });
    expect(cta.textContent).toContain("Sahə əlavə et");
    expect(cta.textContent).not.toContain("Yeni müraciət");

    await user.click(cta);
    // Kredit paneli DEYİL, sahə çəkmə açılır
    expect(await screen.findByText("Sahənizi çəkin")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByText("İmkan hələ hesablana bilmir")).not.toBeInTheDocument();
  });

  it("bitki seçilməyibsə növbəti addım bitki seçimidir", async () => {
    const user = userEvent.setup();
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
      chat: { messages: [], crop: null, referral: false },
    });
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    expect(
      await screen.findByText("Kredit imkanını hesablamaq üçün bitkinizi seçin."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Kredit üçün növbəti addım|Əlavə vəsait lazımdır/ }));
    // Bitki seçici açılır — kredit paneli yox
    expect(await screen.findByRole("dialog", { name: "Əsas məhsulunuz hansıdır?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pomidor" }));

    // Seçimdən sonra növbəti addım təklif yoxlamasıdır
    await waitFor(() =>
      expect(
        screen.getByText("Məlumatlarınız hazırdır. Sizə uyğun təklifi yoxlayaq."),
      ).toBeInTheDocument(),
    );
  });

  it("server 401 deyəndə növbəti addım hesab yaratmaqdır", async () => {
    const user = userEvent.setup();
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
    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        String(url).includes("/api/kredit")
          ? Promise.resolve({
              ok: false,
              status: 401,
              json: () => Promise.resolve({ error: "girisLazim" }),
            })
          : Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) }),
      ),
    );
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    const cta = await screen.findByRole("button", { name: /Kredit üçün növbəti addım|Əlavə vəsait lazımdır/ });
    expect(cta.textContent).toContain("Hesab yarat");

    await user.click(cta);
    expect(await screen.findByRole("dialog", { name: "Hesab" })).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    await user.click(await screen.findByRole("button", { name: /Kredit üçün növbəti addım|Əlavə vəsait lazımdır/ }));

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
    // "~" nişanı PANELDƏ axtarılır: arxadakı mövsüm kartı da orta ssenarini
    // "~" ilə yazır, ona görə ekran boyu axtarış iki nəticə verir
    expect(within(screen.getByRole("dialog")).getByText(/^~/)).toBeInTheDocument();
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
    // PUL KÖÇÜRÜLMÜR və demo pulqabı ARTIQ HEÇ YERDƏ GÖSTƏRİLMİR:
    // real kredit qalığının yanında uydurma 7.280 ₼ balans dayanmır.
    // İki "Bağla" var: Sheet-in başlıqdakı düyməsi və məzmundakı CTA
    await user.click(screen.getAllByRole("button", { name: "Bağla" }).at(-1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText("7.280 ₼")).not.toBeInTheDocument();

    // Aktiv kredit Maliyyə ekranında serverdən görünür (dəqiq mətnlərlə)
    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    expect(screen.getByText("Əsas borc qalığı")).toBeInTheDocument();
    expect(screen.getByText("Ödənişlər vaxtındadır")).toBeInTheDocument();
    // Sonda ödəniləcək ümumi məbləğ HEÇ YERDƏ yoxdur
    expect(screen.queryByText(/[Üü]mumi .*ödəni/)).not.toBeInTheDocument();
  });

  // Kredit mühərriki: aktiv kredit ekranı balansı, növbəti ödənişi və
  // gecikməni göstərir; ödəniş ƏVVƏL faizi bağlayır (bax: api/kredit.js)
  it("aktiv kredit ekranı ödənişi faizdən başlayır", async () => {
    const user = userEvent.setup();
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
    const server = kreditServeri({ faizBorc: 117, gecikmeGun: 5 });
    vi.stubGlobal(
      "fetch",
      vi.fn((url, secim) =>
        server.isle(url, secim) ??
        Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) }),
      ),
    );
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    await user.click(await screen.findByRole("button", { name: /Kredit üçün növbəti addım|Əlavə vəsait lazımdır/ }));
    await screen.findByRole("slider");
    await user.click(screen.getByRole("button", { name: "Şərtlərə bax" }));
    await user.click(screen.getByRole("button", { name: /üçün müraciət göndər/ }));
    await waitFor(() => expect(screen.getByText("Təklifiniz hazırdır")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Təklifi qəbul et" }));
    await waitFor(() => expect(screen.getByText("Aktiv krediti­niz")).toBeInTheDocument());

    // Balans tam açılır: ödənilməmiş faiz, növbəti ödəniş, gecikmə, jurnal
    // (arxadakı ana səhifə kartı da "Növbəti ödəniş" deyir — dialoqa baxılır)
    const dialoq = within(screen.getByRole("dialog"));
    expect(dialoq.getByText("Ödənilməmiş faiz")).toBeInTheDocument();
    expect(dialoq.getByText("Növbəti ödəniş")).toBeInTheDocument();
    expect(dialoq.getByText("5 gün gecikmə")).toBeInTheDocument();
    expect(dialoq.getByText("Kredit verildi")).toBeInTheDocument();

    const qaliqEvvel = server.oxu().kredit.qaliqBorc;
    await user.type(dialoq.getByLabelText("Məbləğ"), "200");
    await user.click(dialoq.getByRole("button", { name: /^200 ₼ ödə$/ }));

    // 200 ₼ → əvvəl 117 faizə, qalan 83 əsas borca
    await waitFor(() => expect(server.oxu().kredit.faizBorc).toBe(0));
    expect(server.oxu().kredit.qaliqBorc).toBe(qaliqEvvel - 83);
    expect(server.oxu().kredit.gecikmeGun).toBe(0);

    // Jurnalda ödəniş BİR sətirdir, bölgüsü ilə birlikdə
    await waitFor(() => expect(dialoq.getByText("Ödəniş")).toBeInTheDocument());
    expect(dialoq.getByText(/faiz .* · əsas .* · qalıq/)).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    await user.click(await screen.findByRole("button", { name: /Kredit üçün növbəti addım|Əlavə vəsait lazımdır/ }));
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

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    await user.click(screen.getByRole("button", { name: /Kredit üçün növbəti addım|Əlavə vəsait lazımdır/ }));
    await user.keyboard("{Escape}");

    // Sheet bağlanma animasiyası bitənədək DOM-da qalır (bax: Sheet.jsx)
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  // GİZLİ DEMO PULQABI: karbon ekranındakı "sat" düyməsi heç bir ekranda
  // göstərilməyən balansı artırırdı. Düymə də, gizli pul hərəkəti də getdi.
  it("karbon ekranında gizli pulqabı dəyişən satış düyməsi yoxdur", async () => {
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
    });
    window.history.pushState({}, "", "/carbon");
    renderApp(<App />);

    expect(screen.queryByRole("button", { name: /sat$/ })).not.toBeInTheDocument();
    expect(screen.getByText("Satış hələ açıq deyil")).toBeInTheDocument();
    expect(screen.queryByText(/pulqabınıza əlavə olundu/)).not.toBeInTheDocument();
  });

  it("bazarda işləməyən forvard düyməsi yoxdur, qiymətlər nümunə kimi etiketlənir", () => {
    window.history.pushState({}, "", "/market");
    renderApp(<App />);

    expect(screen.queryByRole("button", { name: "Forvard müqaviləsi yarat" })).not.toBeInTheDocument();
    expect(screen.getByText(/Qiymətlər nümunədir/)).toBeInTheDocument();
  });

  it("dil düyməsi interfeysi ingiliscəyə keçirir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: /Dili dəyiş/ }));

    expect(screen.getByRole("button", { name: "Fields" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
    expect(screen.getByText("Add your first field")).toBeInTheDocument();
  });

  it("vəziyyəti localStorage-da saxlayır", () => {
    const { unmount } = renderApp(<App />);
    expect(screen.getAllByText("İlk sahənizi əlavə edin")).toHaveLength(1);
    unmount();

    // Sahə saxlanmış vəziyyətdən gəlir — yenidən montaj onu itirmir
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
    });
    renderApp(<App />);
    expect(screen.queryByText("İlk sahənizi əlavə edin")).not.toBeInTheDocument();
  });
});
