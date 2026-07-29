import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App.jsx";
import { renderApp, seedLocation, WEATHER_FIXTURE } from "../../test/render.jsx";

function stubApi({ cavab = "Bu, sarı pas ola bilər.", aqronomTeklif = false, fail = false } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) => {
      if (String(url).includes("/api/agronom")) {
        if (fail) return Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({}) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ cavab, aqronomTeklif }) });
      }
      // hava sorğusu
      return Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) });
    }),
  );
}

async function openChat(user) {
  await user.click(screen.getByRole("button", { name: "Məsləhət" }));
  await user.click(screen.getByRole("button", { name: "Aqronoma sual verin" }));
}

beforeEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.setItem("agrifin:lang", JSON.stringify("az"));
  seedLocation();
  stubApi();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Aqronom çatı", () => {
  it("məsləhət ekranından açılır və bitki seçimini göstərir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    expect(screen.getByRole("dialog", { name: "Aqronom köməkçisi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Payızlıq buğda" })).toBeInTheDocument();
    // Başlıqda rayon görünür
    expect(screen.getByText(/Bərdə · bitki seçilməyib/)).toBeInTheDocument();
  });

  it("nümunə sual göndərilir və cavab göstərilir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.click(screen.getByRole("button", { name: "Suvarmanı nə vaxt etməliyəm?" }));

    await waitFor(() =>
      expect(screen.getByText("Bu, sarı pas ola bilər.")).toBeInTheDocument(),
    );

    // API-yə düzgün yük gedib: rayon, ndvi, dil və hava xülasəsi
    const call = fetch.mock.calls.find(([url]) => String(url).includes("/api/agronom"));
    const payload = JSON.parse(call[1].body);
    expect(payload.rayon).toBe("Bərdə");
    expect(payload.dil).toBe("az");
    expect(payload.ndvi).toBe(0.72);
    expect(payload.hava).toMatchObject({ maxTemp: 34 });
    expect(payload.messages.at(-1)).toEqual({
      role: "user",
      content: "Suvarmanı nə vaxt etməliyəm?",
    });
  });

  it("bitki seçimi sorğuya düşür", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.click(screen.getByRole("button", { name: "Kartof" }));
    await user.type(screen.getByRole("textbox", { name: "Sualınızı yazın…" }), "Yarpaqlar saralır");
    await user.click(screen.getByRole("button", { name: "Göndər" }));

    await waitFor(() =>
      expect(screen.getByText("Bu, sarı pas ola bilər.")).toBeInTheDocument(),
    );
    const call = fetch.mock.calls.find(([url]) => String(url).includes("/api/agronom"));
    expect(JSON.parse(call[1].body).bitkiKey).toBe("kartof");
  });

  it("server cavab vermədikdə lokallaşdırılmış xəta göstərir", async () => {
    stubApi({ fail: true });
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.click(screen.getByRole("button", { name: "NDVI göstəricim nə deyir?" }));

    await waitFor(() =>
      expect(
        screen.getByText("Cavab alınmadı. Bir az sonra yenidən yoxlayın."),
      ).toBeInTheDocument(),
    );
  });

  it("xəta mesajları növbəti sorğunun tarixçəsinə düşmür", async () => {
    stubApi({ fail: true });
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.click(screen.getByRole("button", { name: "NDVI göstəricim nə deyir?" }));
    await waitFor(() => screen.getByText("Cavab alınmadı. Bir az sonra yenidən yoxlayın."));

    stubApi(); // indi işləyir
    await user.type(screen.getByRole("textbox", { name: "Sualınızı yazın…" }), "təkrar sual");
    await user.click(screen.getByRole("button", { name: "Göndər" }));

    await waitFor(() => screen.getByText("Bu, sarı pas ola bilər."));
    const call = fetch.mock.calls.find(([url]) => String(url).includes("/api/agronom"));
    const history = JSON.parse(call[1].body).messages;
    expect(history.some((m) => String(m.content).includes("Cavab alınmadı"))).toBe(false);
  });

  it("yönləndirmə bayrağı 'Aqronoma göndər' düyməsini göstərir", async () => {
    stubApi({ cavab: "Sahədə baxış lazımdır.", aqronomTeklif: true });
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.click(screen.getByRole("button", { name: "Yarpaqlarda sarı ləkələr var, nə ola bilər?" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Aqronoma göndər/ })).toBeInTheDocument(),
    );
  });

  it("söhbət bağlanıb-açılanda tarixçə qalır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.click(screen.getByRole("button", { name: "Suvarmanı nə vaxt etməliyəm?" }));
    await waitFor(() => screen.getByText("Bu, sarı pas ola bilər."));

    await user.click(screen.getByRole("button", { name: "Geri" }));
    expect(screen.queryByRole("dialog", { name: "Aqronom köməkçisi" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aqronoma sual verin" }));
    expect(screen.getByText("Bu, sarı pas ola bilər.")).toBeInTheDocument();
  });

  it("təmizlə düyməsi tarixçəni silir", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.click(screen.getByRole("button", { name: "Suvarmanı nə vaxt etməliyəm?" }));
    await waitFor(() => screen.getByText("Bu, sarı pas ola bilər."));

    await user.click(screen.getByRole("button", { name: "Söhbəti təmizlə" }));
    expect(screen.queryByText("Bu, sarı pas ola bilər.")).not.toBeInTheDocument();
    // Boş vəziyyət yenidən görünür
    expect(screen.getByRole("button", { name: "Suvarmanı nə vaxt etməliyəm?" })).toBeInTheDocument();
  });

  // Reqressiya: onClose hər render-də yeni funksiya olduğu üçün Escape effekti
  // yenidən qurulur. Sorğunu dayandırma həmin effektin təmizliyində olsaydı,
  // mesaj göndərilən kimi (store yenilənəndə) uçuşdaki sorğu kəsilərdi.
  // Cavab gecikməli gəlir ki, React yenidən render-i arada tamamlaya bilsin.
  it("store yeniləndikdə uçuşdaki sorğu kəsilmir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url, options) => {
        if (String(url).includes("/api/agronom")) {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              if (options?.signal?.aborted) {
                const error = new Error("aborted");
                error.name = "AbortError";
                reject(error);
                return;
              }
              resolve({ ok: true, json: () => Promise.resolve({ cavab: "Gecikmiş cavab" }) });
            }, 40);
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(WEATHER_FIXTURE) });
      }),
    );

    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.click(screen.getByRole("button", { name: "Suvarmanı nə vaxt etməliyəm?" }));

    await waitFor(() => expect(screen.getByText("Gecikmiş cavab")).toBeInTheDocument());
  });

  it("Escape çatı bağlayır", async () => {
    const user = userEvent.setup();
    renderApp(<App />);
    await openChat(user);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Aqronom köməkçisi" })).not.toBeInTheDocument();
  });
});
