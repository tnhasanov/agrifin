import { beforeEach, describe, expect, it, vi } from "vitest";

// Hava xülasəsi bu testin mövzusu deyil — axının özünü yoxlayırıq
vi.mock("./weather.js", () => ({
  fetchForecast: vi.fn(async () => ({ data: { daily: {} } })),
  summarizeForecast: () => ({ maxTemp: 34, yagis: 18, balans: 12 }),
}));

import { askAgronomist } from "./agronom.js";

/** NDJSON cavabı — parçalar göstərilən sərhədlərlə gəlir */
function ndjsonResponse(parcalar) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () =>
          i < parcalar.length
            ? { done: false, value: encoder.encode(parcalar[i++]) }
            : { done: true, value: undefined },
      }),
    },
  };
}

/** Hadisələri NDJSON sətirlərinə çevirir */
const setirler = (...hadiseler) => hadiseler.map((h) => `${JSON.stringify(h)}\n`);

const SORGU = {
  messages: [{ role: "user", content: "Yarpaqlar saralır" }],
  location: { name: "Bərdə", lat: 40.37, lon: 47.13 },
  lang: "az",
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("askAgronomist", () => {
  it("deltaları toplayır və onDelta-ya toplanmış mətni verir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjsonResponse([
          ...setirler({ t: "delta", v: "Bu, " }, { t: "delta", v: "sarı pas " }),
          ...setirler({ t: "delta", v: "ola bilər." }, { t: "done", aqronomTeklif: false }),
        ]),
      ),
    );

    const goruntuler = [];
    const result = await askAgronomist({ ...SORGU, onDelta: (m) => goruntuler.push(m) });

    expect(result).toEqual({ answer: "Bu, sarı pas ola bilər.", referral: false });
    // Hər çağırışda mətn uzanır — ekranda tədricən görünən budur
    expect(goruntuler).toEqual(["Bu, ", "Bu, sarı pas ", "Bu, sarı pas ola bilər."]);
  });

  // Şəbəkə paketləri JSON sərhədlərinə uyğun gəlmir; yarımçıq sətir
  // növbəti oxumaya saxlanılmalıdır, yoxsa hadisə itir.
  it("hadisənin ortasından bölünmüş paketləri düzgün birləşdirir", async () => {
    const tam = setirler(
      { t: "delta", v: "Birinci hissə. " },
      { t: "delta", v: "İkinci hissə." },
      { t: "done", aqronomTeklif: true },
    ).join("");

    for (const kesim of [1, 5, 17, 33, tam.length - 1]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ndjsonResponse([tam.slice(0, kesim), tam.slice(kesim)])),
      );
      const result = await askAgronomist(SORGU);
      expect(result, `kəsim ${kesim}`).toEqual({
        answer: "Birinci hissə. İkinci hissə.",
        referral: true,
      });
    }
  });

  it("simvol-simvol gələn paketlərdə də çökmür", async () => {
    const tam = setirler({ t: "delta", v: "Salam" }, { t: "done" }).join("");
    vi.stubGlobal("fetch", vi.fn(async () => ndjsonResponse([...tam])));
    await expect(askAgronomist(SORGU)).resolves.toEqual({ answer: "Salam", referral: false });
  });

  // Doza qoruyucusu: göstərilmiş mətn tamamilə ləğv olunmalıdır
  it("replace hadisəsi göstərilən mətni əvəz edir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjsonResponse(
          setirler(
            { t: "delta", v: "Sahəyə " },
            { t: "replace", v: "Bu sual dozaya aiddir.", aqronomTeklif: true },
          ),
        ),
      ),
    );

    const goruntuler = [];
    const result = await askAgronomist({ ...SORGU, onDelta: (m) => goruntuler.push(m) });

    expect(result).toEqual({ answer: "Bu sual dozaya aiddir.", referral: true });
    // Ekranda köhnə mətn qalmır
    expect(goruntuler.at(-1)).toBe("Bu sual dozaya aiddir.");
  });

  it("axın ortasındakı xəta hadisəsi xəta kimi atılır", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ndjsonResponse(setirler({ t: "delta", v: "Yarımçıq" }, { t: "error" }))),
    );
    await expect(askAgronomist(SORGU)).rejects.toThrow();
  });

  it("boş axın xəta sayılır", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ndjsonResponse([])));
    await expect(askAgronomist(SORGU)).rejects.toThrow();
  });

  // Status kodu saxlanılmalıdır — çat ekranı ona görə fərqli mesaj göstərir
  it("uğursuz cavabda status kodunu saxlayır", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429 })));
    await expect(askAgronomist(SORGU)).rejects.toMatchObject({ status: 429 });
  });

  // Axın dəstəyi olmayan köhnə WebView-lər: cavab birdəfəlik mətn kimi gəlir
  it("axın oxuyucusu olmayan brauzerdə mətni bütöv oxuyur", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        body: null,
        text: async () =>
          setirler({ t: "delta", v: "Bütöv cavab." }, { t: "done", aqronomTeklif: true }).join(""),
      })),
    );
    await expect(askAgronomist(SORGU)).resolves.toEqual({
      answer: "Bütöv cavab.",
      referral: true,
    });
  });

  it("zədələnmiş sətri atır, qalan hadisələri işləyir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjsonResponse([
          `{"t":"delta","v":"Yaxşı "}\n{bu JSON deyil}\n`,
          ...setirler({ t: "delta", v: "cavab." }, { t: "done" }),
        ]),
      ),
    );
    await expect(askAgronomist(SORGU)).resolves.toMatchObject({ answer: "Yaxşı cavab." });
  });

  it("hava alınmasa sual yenə göndərilir", async () => {
    const { fetchForecast } = await import("./weather.js");
    fetchForecast.mockRejectedValueOnce(new Error("hava yoxdur"));
    const fetchMock = vi.fn(async () =>
      ndjsonResponse(setirler({ t: "delta", v: "Cavab" }, { t: "done" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(askAgronomist(SORGU)).resolves.toMatchObject({ answer: "Cavab" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).hava).toBeNull();
  });
});
