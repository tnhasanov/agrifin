import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedLocation, WEATHER_FIXTURE } from "../../test/render.jsx";

// jsdom-da canvas yoxdur — kiçiltmə addımını əvəz edirik, çünki bu testin
// mövzusu şəklin çat axınından KEÇMƏSİDİR, JPEG kodlaşdırma deyil.
const { hazirlaMock } = vi.hoisted(() => ({ hazirlaMock: vi.fn() }));
vi.mock("../../lib/sekil.js", async (orijinal) => ({
  ...(await orijinal()),
  sekliHazirla: hazirlaMock,
}));

const SEKIL = {
  mediaType: "image/jpeg",
  data: "QUJDREVG",
  dataUrl: "data:image/jpeg;base64,QUJDREVG",
  en: 800,
  hundurluk: 600,
};

function stubApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (String(url).includes("/api/ndvi")) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ seriya: [] }) });
      }
      if (String(url).includes("/api/agronom")) {
        const encoder = new TextEncoder();
        const setirler = ['{"t":"delta","v":"Yarpaqda sarı pas görünür."}\n', '{"t":"done"}\n'];
        let i = 0;
        return Promise.resolve({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: async () =>
                i < setirler.length
                  ? { done: false, value: encoder.encode(setirler[i++]) }
                  : { done: true, value: undefined },
            }),
          },
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) });
    }),
  );
}

const fayl = () => new File(["xxx"], "yarpaq.jpg", { type: "image/jpeg" });

async function openChat(user) {
  await user.click(screen.getByRole("button", { name: "Kömək" }));
  await user.click(screen.getByRole("button", { name: "Aqronoma sual verin" }));
}

const kameraGirisi = () => document.querySelector('input[type="file"]');

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  seedLocation();
  stubApi();
  hazirlaMock.mockReset();
  hazirlaMock.mockResolvedValue(SEKIL);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("çatda şəkil", () => {
  it("kamera düyməsi və gizli fayl girişi var", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    expect(screen.getByRole("button", { name: "Şəkil çək və ya seç" })).toBeInTheDocument();
    const giris = kameraGirisi();
    // Telefonda birbaşa arxa kamera açılsın
    expect(giris).toHaveAttribute("capture", "environment");
    expect(giris.accept).toContain("image/jpeg");
  });

  it("seçilən şəkil önizləmə kimi görünür və silinə bilir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.upload(kameraGirisi(), fayl());
    await waitFor(() => expect(screen.getByAltText("Seçilmiş şəkil")).toBeInTheDocument());
    expect(screen.getByText(/Şəkil sualla birlikdə göndəriləcək/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Şəkli sil" }));
    expect(screen.queryByAltText("Seçilmiş şəkil")).not.toBeInTheDocument();
  });

  it("şəkil sualla birlikdə serverə gedir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.upload(kameraGirisi(), fayl());
    await waitFor(() => screen.getByAltText("Seçilmiş şəkil"));
    await user.type(screen.getByRole("textbox", { name: "Sualınızı yazın…" }), "Bu nədir?");
    await user.click(screen.getByRole("button", { name: "Göndər" }));

    await waitFor(() => screen.getByText("Yarpaqda sarı pas görünür."));
    const call = fetch.mock.calls.find(([url]) => String(url).includes("/api/agronom"));
    expect(JSON.parse(call[1].body).sekil).toEqual({
      mediaType: "image/jpeg",
      data: "QUJDREVG",
    });
  });

  // Fermer çox vaxt yalnız şəkli göstərmək istəyir — mətn yazmağa məcbur
  // etmək əsas maneədir
  it("mətn yazmadan yalnız şəkil göndərmək olar", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    expect(screen.getByRole("button", { name: "Göndər" })).toBeDisabled();

    await user.upload(kameraGirisi(), fayl());
    await waitFor(() => expect(screen.getByRole("button", { name: "Göndər" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Göndər" }));
    await waitFor(() => screen.getByText("Yarpaqda sarı pas görünür."));

    const call = fetch.mock.calls.find(([url]) => String(url).includes("/api/agronom"));
    const yuk = JSON.parse(call[1].body);
    expect(yuk.sekil.data).toBe("QUJDREVG");
    // Standart sual mətni əlavə olunur ki, model nə istədiyimizi bilsin
    expect(yuk.messages.at(-1).content).toBe("Bu şəkildə nə görürsünüz?");
  });

  // ƏSAS: base64 şəkil localStorage-ə düşsə bir neçə şəkildən sonra kvota
  // dolur və BÜTÜN saxlanan vəziyyət (sahə, söhbət) yazıla bilmir
  it("şəkil söhbət tarixçəsinə yazılmır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.upload(kameraGirisi(), fayl());
    await waitFor(() => screen.getByAltText("Seçilmiş şəkil"));
    await user.click(screen.getByRole("button", { name: "Göndər" }));
    await waitFor(() => screen.getByText("Yarpaqda sarı pas görünür."));

    const saxlanan = window.localStorage.getItem("agrifin:state");
    expect(saxlanan).not.toContain("QUJDREVG");
    expect(saxlanan).not.toContain("base64");
  });

  it("göndərildikdən sonra önizləmə təmizlənir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.upload(kameraGirisi(), fayl());
    await waitFor(() => screen.getByAltText("Seçilmiş şəkil"));
    await user.click(screen.getByRole("button", { name: "Göndər" }));

    await waitFor(() => expect(screen.queryByAltText("Seçilmiş şəkil")).not.toBeInTheDocument());
  });

  it("şəkil növü qəbul edilmirsə səbəbi göstərir", async () => {
    const xeta = new Error("nov");
    xeta.kod = "nov";
    hazirlaMock.mockRejectedValue(xeta);

    // applyAccept: false — bəzi platformalarda accept yalnız tövsiyədir və
    // istifadəçi uyğun olmayan faylı seçə bilir; server tərəf də buna görə
    // ayrıca yoxlayır
    const user = userEvent.setup({ applyAccept: false });
    renderApp(<App />);
    await openChat(user);
    await user.upload(kameraGirisi(), new File(["x"], "s.pdf", { type: "application/pdf" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Yalnız şəkil/));
    expect(screen.queryByAltText("Seçilmiş şəkil")).not.toBeInTheDocument();
  });

  it("şəkil çox böyükdürsə ayrı mesaj göstərir", async () => {
    const xeta = new Error("boyuk");
    xeta.kod = "boyuk";
    hazirlaMock.mockRejectedValue(xeta);

    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);
    await user.upload(kameraGirisi(), fayl());

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/çox böyükdür/));
  });
});
