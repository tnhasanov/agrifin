import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockStream } = vi.hoisted(() => ({ mockStream: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  class Anthropic {
    constructor() {
      this.messages = { stream: mockStream };
    }
  }
  Anthropic.APIError = APIError;
  return { default: Anthropic };
});

import handler from "./agronom.js";

/**
 * SDK axınının imitasiyası: mətn parçalarını verir, sonda `finalMessage()`
 * qaytarır. `abort()` çağırıldıqda qalan parçalar dayandırılır — real SDK-da
 * olduğu kimi, doza aşkarlananda pul yandırmamaq üçün.
 */
function fakeStream(parcalar, final = {}) {
  let dayandirildi = false;
  return {
    abort() {
      dayandirildi = true;
    },
    get dayandirildi() {
      return dayandirildi;
    },
    async *[Symbol.asyncIterator]() {
      // Axının başında mətn olmayan hadisələr də gəlir — süzgəc onları atmalıdır
      yield { type: "message_start" };
      for (const parca of parcalar) {
        if (dayandirildi) return;
        yield { type: "content_block_delta", delta: { type: "text_delta", text: parca } };
      }
      yield { type: "message_stop" };
    },
    async finalMessage() {
      return {
        stop_reason: "end_turn",
        model: "claude-sonnet-5",
        usage: { input_tokens: 1200, output_tokens: 180, cache_read_input_tokens: 900 },
        ...final,
      };
    },
  };
}

/** Mətni bir neçə parçaya bölür — real axın da belə gəlir */
const parcalarla = (metn, olcu = 9) => {
  const out = [];
  for (let i = 0; i < metn.length; i += olcu) out.push(metn.slice(i, i + olcu));
  return out;
};

/**
 * res imitasiyası. Axın rejimində `writeHead` + `write` işlənir, xəta
 * rejimində `status().json()`. Hansının işləndiyini testlər ayırd edə bilsin
 * deyə hər ikisi qeyd olunur.
 */
function makeRes() {
  return {
    statusCode: null,
    body: null,
    headers: null,
    headersSent: false,
    chunks: [],
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers;
      this.headersSent = true;
      return this;
    },
    write(chunk) {
      this.chunks.push(chunk);
      return true;
    },
    end() {
      this.ended = true;
      return this;
    },
    /** Yazılmış NDJSON sətirlərini hadisə obyektlərinə çevirir */
    get hadiseler() {
      return this.chunks
        .join("")
        .split("\n")
        .filter(Boolean)
        .map((s) => JSON.parse(s));
    },
    /** İstifadəçinin ekranında görünəcək mətn */
    get gorunenMetn() {
      let metn = "";
      for (const h of this.hadiseler) {
        if (h.t === "delta") metn += h.v;
        else if (h.t === "replace") metn = h.v;
      }
      return metn;
    },
  };
}

const makeReq = (body, method = "POST") => ({
  method,
  body,
  headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
  socket: { remoteAddress: "127.0.0.1" },
});

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
  mockStream.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("api/agronom", () => {
  it("yalnız POST qəbul edir", async () => {
    const res = makeRes();
    await handler(makeReq({}, "GET"), res);
    expect(res.statusCode).toBe(405);
  });

  it("GET quraşdırma vəziyyətini göstərir, açarı sızdırmadan", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-super-secret-value");
    const res = makeRes();
    await handler(makeReq({}, "GET"), res);

    expect(res.body.acarQurulub).toBe(true);
    expect(res.body.anthropicDeyisenSayi).toBeGreaterThan(0);
    // Açarın heç bir hissəsi cavabda olmamalıdır
    expect(JSON.stringify(res.body)).not.toContain("sk-super-secret-value");
    expect(JSON.stringify(res.body)).not.toContain("secret");
  });

  it("açar yoxdursa GET bunu açıq göstərir", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = makeRes();
    await handler(makeReq({}, "GET"), res);
    expect(res.body.acarQurulub).toBe(false);
  });

  it("açar yoxdursa 500 qaytarır", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "salam" }] }), res);
    expect(res.statusCode).toBe(500);
    expect(mockStream).not.toHaveBeenCalled();
  });

  it("boş mesaj siyahısını rədd edir", async () => {
    const res = makeRes();
    await handler(makeReq({ messages: [] }), res);
    expect(res.statusCode).toBe(400);
  });

  it("cavabı parça-parça NDJSON kimi göndərir", async () => {
    const cavab = "Bu, sarı pas ola bilər. Sahənin bir neçə yerində yarpaqları yoxlayın.";
    mockStream.mockReturnValue(fakeStream(parcalarla(cavab)));
    const res = makeRes();
    await handler(
      makeReq({
        messages: [{ role: "user", content: "Yarpaqlar saralır" }],
        bitkiKey: "bugda",
        rayon: "Bərdə",
        ay: 4,
        ndvi: 0.72,
        dil: "az",
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toContain("x-ndjson");
    // Proxy buferləməsi söndürülməlidir, yoxsa axın hissə-hissə gəlmir
    expect(res.headers["X-Accel-Buffering"]).toBe("no");

    const hadiseler = res.hadiseler;
    // Bir neçə ayrı delta — yəni cavab həqiqətən axınla gedib
    expect(hadiseler.filter((h) => h.t === "delta").length).toBeGreaterThan(1);
    expect(res.gorunenMetn).toBe(cavab);
    expect(hadiseler.at(-1)).toEqual({ t: "done", aqronomTeklif: false });
    expect(res.ended).toBe(true);

    // Sorğunun quruluşu: keşlənən sabit sistem + dəyişən kontekst
    const request = mockStream.mock.calls[0][0];
    expect(request.model).toBe("claude-sonnet-5");
    expect(request.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(request.system[1].text).toContain("CAVAB DİLİ: Azərbaycan dili");
    expect(request.system[1].text).toContain("Payızlıq buğda");
    expect(request.system[1].text).toContain("NDVI: 0.72");
    // Düşünmə söndürülüb: max_tokens büdcəsi tam cavaba qalsın
    expect(request.thinking).toEqual({ type: "disabled" });
  });

  it("hər sətir tam JSON hadisədir", async () => {
    mockStream.mockReturnValue(fakeStream(["Sətir bir\n", "sətir iki"]));
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "sual" }] }), res);

    const setirler = res.chunks.join("").split("\n").filter(Boolean);
    // Mətnin içindəki sətir sonu hadisə sərhədini pozmamalıdır
    for (const setir of setirler) expect(() => JSON.parse(setir)).not.toThrow();
    expect(res.gorunenMetn).toBe("Sətir bir\nsətir iki");
  });

  it("başda qalan assistant mesajlarını atır (API ilk user tələb edir)", async () => {
    mockStream.mockReturnValue(fakeStream(["Cavab"]));
    const res = makeRes();
    await handler(
      makeReq({
        messages: [
          { role: "assistant", content: "köhnə cavab" },
          { role: "user", content: "sual" },
        ],
      }),
      res,
    );
    const request = mockStream.mock.calls[0][0];
    expect(request.messages[0].role).toBe("user");
  });

  it("naməlum bitki açarını və həddən kənar dəyərləri süzür", async () => {
    mockStream.mockReturnValue(fakeStream(["Cavab"]));
    const res = makeRes();
    await handler(
      makeReq({
        messages: [{ role: "user", content: "sual" }],
        bitkiKey: "yoxdur__proto__",
        ay: 99,
        ndvi: 7,
      }),
      res,
    );
    const request = mockStream.mock.calls[0][0];
    expect(request.system[1].text).toContain("Bitki seçilməyib");
    expect(request.system[1].text).not.toContain("NDVI: 7");
  });

  it("doza sızanda göstərilən mətni ləğv edir və aqronoma yönləndirir", async () => {
    // Uzun təhlükəsiz giriş — bir hissəsi artıq göndərilmiş olur, sonra doza gəlir
    const cavab =
      "Bu, sarı pas ola bilər. Yarpaqlarda narıncı toz ləkələri görünür. " +
      "Sahəyə 2 l/ha vurun.";
    mockStream.mockReturnValue(fakeStream(parcalarla(cavab, 6)));
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "doza?" }] }), res);

    const hadiseler = res.hadiseler;
    const evezle = hadiseler.at(-1);
    expect(evezle.t).toBe("replace");
    expect(evezle.aqronomTeklif).toBe(true);
    // Ekranda qalan mətndə doza olmamalıdır — nə deltalarda, nə sonda
    expect(res.gorunenMetn).not.toContain("l/ha");
    for (const h of hadiseler) expect(JSON.stringify(h)).not.toContain("2 l/ha");
  });

  it("doza aşkarlananda axını dayandırır (artıq token yandırmır)", async () => {
    const axin = fakeStream(parcalarla("Sahəyə 2 l/ha vurun. " + "Davamı ".repeat(50), 5));
    mockStream.mockReturnValue(axin);
    await handler(makeReq({ messages: [{ role: "user", content: "doza?" }] }), makeRes());
    expect(axin.dayandirildi).toBe(true);
  });

  it("cavabda 'aqronom' keçəndə yönləndirmə bayrağı qalxır", async () => {
    mockStream.mockReturnValue(
      fakeStream(parcalarla("Bunu dəqiq demək üçün sahədə baxış lazımdır, aqronoma müraciət edin.")),
    );
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "nə edim?" }] }), res);
    expect(res.hadiseler.at(-1)).toEqual({ t: "done", aqronomTeklif: true });
  });

  it("model imtina edəndə təhlükəsiz cavab qaytarır", async () => {
    mockStream.mockReturnValue(fakeStream([], { stop_reason: "refusal" }));
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "sual" }] }), res);
    expect(res.hadiseler.at(-1)).toMatchObject({ t: "replace", aqronomTeklif: true });
    expect(res.gorunenMetn).toBeTruthy();
  });

  it("modeli və token sayını loga yazır", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    mockStream.mockReturnValue(fakeStream(["Cavab"]));
    await handler(makeReq({ messages: [{ role: "user", content: "sual" }] }), makeRes());

    expect(log).toHaveBeenCalledWith(expect.stringContaining("model=claude-sonnet-5"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("cixis=180"));
    log.mockRestore();
  });

  // Axın başlamazdan əvvəlki xəta: başlıq hələ getməyib, ona görə həqiqi status
  // kodu qaytarmaq olar və müştəri səbəbə uyğun mesaj göstərir.
  it("axın başlamazdan əvvəlki Anthropic xətasında 502 qaytarır", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    mockStream.mockImplementation(() => {
      throw new Anthropic.APIError(429, "rate limited");
    });
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "sual" }] }), res);
    expect(res.statusCode).toBe(502);
    expect(res.headersSent).toBe(false);
  });

  // Axın ortasındakı xəta: status artıq 200-dür və dəyişdirilə bilməz,
  // ona görə xəta axının içində hadisə kimi gedir. Mətn gecikdirmə buferindən
  // keçəcək qədər uzun olmalıdır — yoxsa hələ heç nə yazılmayıb.
  it("axın ortasındakı xətanı hadisə kimi bildirir", async () => {
    mockStream.mockReturnValue({
      abort() {},
      async *[Symbol.asyncIterator]() {
        yield {
          type: "content_block_delta",
          delta: { type: "text_delta", text: "Bu, sarı pas ola bilər. ".repeat(5) },
        };
        throw new Error("bağlantı qırıldı");
      },
      async finalMessage() {
        throw new Error("bağlantı qırıldı");
      },
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "sual" }] }), res);

    expect(res.statusCode).toBe(200); // başlıq artıq getmişdi
    expect(res.hadiseler.at(-1)).toEqual({ t: "error" });
    expect(res.ended).toBe(true);
    error.mockRestore();
  });

  // Başlıqları gec yazmağın faydası: qısa mətndən sonra qırılan axın hələ də
  // həqiqi status kodu ala bilir, ona görə müştəri "server xətası" göstərir.
  it("heç nə yazılmamış qırılan axın hələ də 500 qaytarır", async () => {
    mockStream.mockReturnValue({
      abort() {},
      async *[Symbol.asyncIterator]() {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "Qısa" } };
        throw new Error("bağlantı qırıldı");
      },
      async finalMessage() {
        throw new Error("bağlantı qırıldı");
      },
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "sual" }] }), res);

    expect(res.statusCode).toBe(500);
    expect(res.headersSent).toBe(false);
    error.mockRestore();
  });

  it("eyni IP-dən həddən çox sorğunu 429 ilə kəsir", async () => {
    mockStream.mockImplementation(() => fakeStream(["Cavab"]));
    const req = {
      method: "POST",
      body: { messages: [{ role: "user", content: "sual" }] },
      headers: { "x-forwarded-for": "203.0.113.7" },
      socket: { remoteAddress: "203.0.113.7" },
    };
    let last = null;
    for (let i = 0; i < 25; i += 1) {
      last = makeRes();
      await handler(req, last);
    }
    expect(last.statusCode).toBe(429);
  });
});
