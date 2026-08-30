import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { kreditServeri, renderApp, seedState, WEATHER_FIXTURE } from "../../test/render.jsx";
import { DEFAULT_LOCATION } from "../../services/location.js";
import { formatMoney } from "../../lib/format.js";
import { SaheXebardarligi } from "./SaheXebardarligi.jsx";
import { EtibarNisani } from "./EtibarNisani.jsx";

/**
 * PANO HALLARI — brief-in altı əməliyyat halının ekran testləri.
 * Dəqiq Azərbaycanca məhsul mətnləri yoxlanılır; "sonda ödəniləcək ümumi
 * məbləğ" HEÇ BİR halda görünməməlidir.
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

function seedSahe() {
  seedState({
    location: DEFAULT_LOCATION,
    onboarded: true,
    sahe: SAHE,
    chat: { messages: [], crop: "pomidor", referral: false },
  });
}

function stubla(server) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url, secim) =>
        server?.isle(url, secim) ??
        Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) }),
    ),
  );
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Müraciət göndərib təklifə çatır (server stub vasitəsilə) */
async function teklifeCat(user) {
  await user.click(await screen.findByRole("button", { name: "Məhsul dövrü krediti al" }));
  await screen.findByRole("slider");
  await user.click(screen.getByRole("button", { name: "Şərtlərə bax" }));
  await user.click(screen.getByRole("button", { name: /üçün müraciət göndər/ }));
  await waitFor(() => expect(screen.getByText("Təklifiniz hazırdır")).toBeInTheDocument());
}

describe("hal C — server təklifi Maliyyə ekranında", () => {
  it("təklif kartı dəqiq mətnlərlə göstərilir, ümumi yekun məbləğ YOXDUR", async () => {
    const user = userEvent.setup();
    seedSahe();
    const server = kreditServeri({ mebleg: 8000, muddetAy: 12 });
    stubla(server);
    renderApp(<App />);

    await teklifeCat(user);
    // Təklif paneldə açıqdır — bağlayıb Maliyyəyə keçirik
    await user.click(screen.getAllByRole("button", { name: "Bağla" }).at(-1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Maliyyə" }));

    // Dəqiq məhsul mətnləri
    expect(screen.getByText("Sizə uyğun təklif")).toBeInTheDocument();
    expect(screen.getByText("Təsərrüfat məlumatlarınıza əsasən")).toBeInTheDocument();
    expect(screen.getByText("Dövriyyə krediti")).toBeInTheDocument();
    expect(screen.getByText("Müddət")).toBeInTheDocument();
    expect(screen.getByText("12 ay")).toBeInTheDocument();
    expect(screen.getByText("İllik faiz")).toBeInTheDocument();
    expect(screen.getByText("Aylıq faiz ödənişi")).toBeInTheDocument();
    expect(screen.getByText("Niyə bu məbləğ?")).toBeInTheDocument();
    expect(screen.getByText("Mövsümi gəlirinizə uyğundur")).toBeInTheDocument();
    expect(screen.getByText("Ödəniş ehtiyatı nəzərə alınıb")).toBeInTheDocument();
    expect(screen.getByText("Sahə məlumatları qənaətbəxşdir")).toBeInTheDocument();
    expect(
      screen.getByText("Yekun qərar sənədlərin yoxlanılmasından sonra verilir."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Təklifi nəzərdən keçir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sonra" })).toBeInTheDocument();

    // Aylıq faiz TƏXMİNDİR (~) və ümumi yekun məbləğ heç yerdə yoxdur
    expect(screen.getByText(/~\d/)).toBeInTheDocument();
    expect(screen.queryByText(/[Üü]mumi/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Faizlə birlikdə/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bir ödəniş/)).not.toBeInTheDocument();

    // "Təklifi nəzərdən keçir" MÖVCUD qəbul axınını açır (atomik qəbul orada)
    await user.click(screen.getByRole("button", { name: "Təklifi nəzərdən keçir" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("Təklifiniz hazırdır")).toBeInTheDocument();
  });

  it("ana səhifədə əsas hərəkət təklifi göstərir (4-cü pillə)", async () => {
    const user = userEvent.setup();
    seedSahe();
    const server = kreditServeri({ mebleg: 8000 });
    stubla(server);
    renderApp(<App />);

    await teklifeCat(user);
    await user.click(screen.getAllByRole("button", { name: "Bağla" }).at(-1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(screen.getByText("Sizə uyğun təklif hazırdır")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Təklifi nəzərdən keçir" })).toBeInTheDocument();
  });
});

describe("hal D/E — aktiv kredit və gecikmə Maliyyə ekranında", () => {
  async function kreditAl(user, opts) {
    seedSahe();
    const server = kreditServeri(opts);
    stubla(server);
    renderApp(<App />);
    await teklifeCat(user);
    await user.click(screen.getByRole("button", { name: "Təklifi qəbul et" }));
    await waitFor(() => expect(screen.getByText("Aktiv krediti­niz")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: "Bağla" }).at(-1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    return server;
  }

  it("cari kredit: server dəyərləri, vaxtındadır nişanı, son əməliyyat", async () => {
    const user = userEvent.setup();
    const server = await kreditAl(user, { mebleg: 5000 });

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    expect(screen.getByText("Aktiv kredit")).toBeInTheDocument();
    expect(screen.getByText("Əsas borc qalığı")).toBeInTheDocument();
    // Məbləğ SERVERİN verdiyidir (slayderin standart seçimi) — UI hesablamır
    expect(
      screen.getAllByText(formatMoney(server.oxu().kredit.qaliqBorc, "az")).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Bu ayın faizi")).toBeInTheDocument();
    expect(screen.getByText("Son tarix")).toBeInTheDocument();
    expect(screen.getByText("Ödənilib 0%")).toBeInTheDocument();
    expect(screen.getByText("Ödənişlər vaxtındadır")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ödəniş et" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Qrafikə bax" })).toBeInTheDocument();

    // Ödənişdən sonra "Son əməliyyat" bölgü ilə görünür
    const evvelkiQaliq = server.oxu().kredit.qaliqBorc;
    await user.click(screen.getByRole("button", { name: "Ödəniş et" }));
    const dialoq = within(await screen.findByRole("dialog"));
    await user.type(dialoq.getByLabelText("Məbləğ"), "500");
    await user.click(dialoq.getByRole("button", { name: /^500 ₼ ödə$/ }));
    await waitFor(() => expect(server.oxu().kredit.qaliqBorc).toBe(evvelkiQaliq - 500));
    await user.click(screen.getAllByRole("button", { name: "Bağla" }).at(-1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(screen.getByText("Son əməliyyat")).toBeInTheDocument();
    expect(screen.getByText(/Əsas borc ödənişi/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bütün əməliyyatlar" })).toBeInTheDocument();
    // Aktiv borcalana yeni kredit KARTI GÖSTƏRİLMİR
    expect(screen.queryByText("Əlavə vəsait lazımdır?")).not.toBeInTheDocument();

    // Ana səhifə: aktiv borcluya "Kredit imkanı" təxmini də göstərilmir —
    // onun yerində real qalıq dayanır (server dəyəri)
    await user.click(screen.getByRole("button", { name: "Ana səhifə" }));
    expect(screen.queryByText("Kredit imkanı")).not.toBeInTheDocument();
    expect(screen.getAllByText("Aktiv kredit").length).toBeGreaterThan(0);
  });

  it("gecikmə: hörmətli mətn, iki yol, dəstəklənməyən cərimə vədi YOXDUR", async () => {
    const user = userEvent.setup();
    await kreditAl(user, { mebleg: 5000, faizBorc: 72, gecikmeGun: 3 });

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    expect(screen.getByText("Ödəniş gecikib")).toBeInTheDocument();
    expect(screen.getByText("72 ₼")).toBeInTheDocument();
    expect(screen.getByText("3 gün gecikmə")).toBeInTheDocument();
    expect(
      screen.getByText("Gecikən faiz ödənişini tamamlayın və ya bizimlə əlaqə saxlayın."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "İndi ödə" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dəstək al" })).toBeInTheDocument();
    expect(screen.getByText("Nə baş verəcək?")).toBeInTheDocument();
    expect(screen.getByText("Ödəniş tarixçəniz yenilənəcək")).toBeInTheDocument();
    expect(screen.getByText("Çətinlik varsa, sizə uyğun həll tapa bilərik.")).toBeInTheDocument();

    // Backend cərimə faizi TƏTBİQ ETMİR (bax: lib/kreditMuhasibat.js) —
    // ona görə "Əlavə faiz yarana bilər" YAZILMIR; faktiki qayda yazılır
    expect(screen.queryByText("Əlavə faiz yarana bilər")).not.toBeInTheDocument();
    expect(
      screen.getByText("Faiz qalan əsas borca hesablanmaqda davam edir"),
    ).toBeInTheDocument();

    // Ana səhifədə əsas hərəkət 1-ci pillədir: gecikmiş ödəniş
    await user.click(screen.getByRole("button", { name: "Ana səhifə" }));
    expect(screen.getByText("Gecikmiş ödənişi tamamlayın")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "İndi ödə" })).toBeInTheDocument();
  });
});

describe("hal F — sahə xəbərdarlığı kartı", () => {
  const SIQNAL_DIQQET = {
    id: "bitkiZeifleyir:2026-08-20",
    nov: "bitkiZeifleyir",
    ciddilik: "diqqet",
    icon: "Sprout",
    basliqKey: "siqnal.bitkiZeifleyir.basliq",
    metnKey: "siqnal.bitkiZeifleyir.metn",
    vars: { evvel: 72, indi: 61 },
    menbeKey: "siqnal.menbe.peyk",
  };

  it("diqqət siqnalı 'Diqqət' çipi ilə çıxır — ciddilik ŞİŞİRDİLMİR", () => {
    renderApp(<SaheXebardarligi siqnal={SIQNAL_DIQQET} etibar="orta" movsumSayi={5} />);

    expect(screen.getByText("Diqqət")).toBeInTheDocument();
    expect(screen.queryByText("Yüksək prioritet")).not.toBeInTheDocument();
    // Konkret addımlar və vaxt pəncərəsi
    expect(screen.getByText("İndi nə etməli?")).toBeInTheDocument();
    expect(screen.getByText("Sahəni 48 saat ərzində yoxlayın")).toBeInTheDocument();
    expect(screen.getByText("Suvarma və zərərverici izlərini yoxlayın")).toBeInTheDocument();
    expect(screen.getByText("Nəticəni tətbiqdə qeyd edin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yoxlamaya başla" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aqronomla danış" })).toBeInTheDocument();
    // Dəlil etibarlılığı: səviyyə + mövsüm sayı
    expect(screen.getByText(/Məlumat etibarlılığı: Orta • 5 mövsüm/)).toBeInTheDocument();
  });

  it("təcili siqnal 'Yüksək prioritet' çipi alır", () => {
    renderApp(
      <SaheXebardarligi
        siqnal={{
          ...SIQNAL_DIQQET,
          id: "suGolu:1",
          nov: "suGolu",
          ciddilik: "tecili",
          basliqKey: "siqnal.suGolu.basliq",
          metnKey: "siqnal.suGolu.metn",
          vars: { faiz: 22 },
        }}
      />,
    );
    expect(screen.getByText("Yüksək prioritet")).toBeInTheDocument();
  });
});

describe("məlumat etibarlılığı nişanı", () => {
  it.each([
    ["ilkin", "İlkin"],
    ["orta", "Orta"],
    ["yuksek", "Yüksək"],
  ])("%s → %s", (etibar, etiket) => {
    renderApp(<EtibarNisani etibar={etibar} />);
    expect(screen.getByText(etiket)).toBeInTheDocument();
  });

  it("etibar yoxdursa (3 mövsümdən az) nişan render olunmur", () => {
    const { container } = renderApp(<EtibarNisani etibar={null} say={2} />);
    expect(container.textContent).toBe("");
  });
});

/**
 * SERVER CAVABI GƏLMƏYƏNDƏ — ən təhlükəli hal: ekran boş qalır və fermer
 * "borcum yoxdur" nəticəsi çıxarır. Nə pano, nə Maliyyə bunu deməməlidir.
 */
describe("yüklənmə və xəta halları", () => {
  /** /api/kredit sorğusunu verilən statusla cavablandırır */
  function stubStatus(status) {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        String(url).includes("/api/kredit")
          ? Promise.resolve({ ok: false, status, json: () => Promise.resolve({ error: "xeta" }) })
          : Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) }),
      ),
    );
  }

  it("kredit sorğusu xəta verəndə ana səhifə 'hər şey qaydasındadır' DEMİR", async () => {
    seedSahe();
    stubStatus(500);
    renderApp(<App />);

    await waitFor(() =>
      expect(screen.getByText("Maliyyə məlumatı gətirilmədi")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Hər şey qaydasındadır")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yenidən cəhd et" })).toBeInTheDocument();
    // Vəziyyət bilinmirsə aktiv borcalana yeni kredit təklif olunmur
    expect(
      screen.queryByRole("button", { name: "Məhsul dövrü krediti al" }),
    ).not.toBeInTheDocument();
  });

  it("Maliyyə ekranı xətanı açıq deyir, 'əlavə vəsait' sırımır", async () => {
    const user = userEvent.setup();
    seedSahe();
    stubStatus(500);
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    await waitFor(() =>
      expect(screen.getByText("Kredit məlumatı gətirilmədi")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Əlavə vəsait lazımdır?")).not.toBeInTheDocument();
  });

  // Demo pulqabı qeydi REAL kredit rəqəmlərini "nümunə" adlandırmamalıdır
  it("Maliyyə ekranında 'bütün məlumatlar nümunədir' yazısı yoxdur", async () => {
    const user = userEvent.setup();
    seedSahe();
    const server = kreditServeri({ mebleg: 5000 });
    stubla(server);
    renderApp(<App />);

    await user.click(screen.getByRole("button", { name: "Maliyyə" }));
    expect(screen.queryByText(/bütün məlumatlar nümunədir/)).not.toBeInTheDocument();
    expect(screen.getByText(/Nümunə pulqabı balansı bu ekrandan çıxarıldı/)).toBeInTheDocument();
  });
});
