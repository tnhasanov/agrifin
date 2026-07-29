import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  class Anthropic {
    constructor() {
      this.messages = { create: mockCreate };
    }
  }
  Anthropic.APIError = APIError;
  return { default: Anthropic };
});

import handler from "./agronom.js";

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

const makeReq = (body, method = "POST") => ({
  method,
  body,
  headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
  socket: { remoteAddress: "127.0.0.1" },
});

const textResponse = (text) => ({
  content: [{ type: "text", text }],
  stop_reason: "end_turn",
});

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
  mockCreate.mockReset();
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

  it("açar yoxdursa 500 qaytarır", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "salam" }] }), res);
    expect(res.statusCode).toBe(500);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("boş mesaj siyahısını rədd edir", async () => {
    const res = makeRes();
    await handler(makeReq({ messages: [] }), res);
    expect(res.statusCode).toBe(400);
  });

  it("uğurlu cavabı düzgün formada qaytarır", async () => {
    mockCreate.mockResolvedValue(textResponse("Bu, sarı pas ola bilər. Sahəyə baxın."));
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
    expect(res.body.cavab).toContain("sarı pas");
    expect(res.body.aqronomTeklif).toBe(false);

    // Sorğunun quruluşu: keşlənən sabit sistem + dəyişən kontekst
    const request = mockCreate.mock.calls[0][0];
    expect(request.model).toBe("claude-sonnet-5");
    expect(request.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(request.system[1].text).toContain("CAVAB DİLİ: Azərbaycan dili");
    expect(request.system[1].text).toContain("Payızlıq buğda");
    expect(request.system[1].text).toContain("NDVI: 0.72");
  });

  it("başda qalan assistant mesajlarını atır (API ilk user tələb edir)", async () => {
    mockCreate.mockResolvedValue(textResponse("Cavab"));
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
    const request = mockCreate.mock.calls[0][0];
    expect(request.messages[0].role).toBe("user");
  });

  it("naməlum bitki açarını və həddən kənar dəyərləri süzür", async () => {
    mockCreate.mockResolvedValue(textResponse("Cavab"));
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
    const request = mockCreate.mock.calls[0][0];
    expect(request.system[1].text).toContain("Bitki seçilməyib");
    expect(request.system[1].text).not.toContain("NDVI: 7");
  });

  it("cavaba doza sızarsa kəsir və aqronoma yönləndirir", async () => {
    mockCreate.mockResolvedValue(textResponse("Sahəyə 2 l/ha vurun."));
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "doza?" }] }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.cavab).not.toContain("l/ha");
    expect(res.body.aqronomTeklif).toBe(true);
  });

  it("cavabda 'aqronom' keçəndə yönləndirmə bayrağı qalxır", async () => {
    mockCreate.mockResolvedValue(
      textResponse("Bunu dəqiq demək üçün sahədə baxış lazımdır, aqronoma müraciət edin."),
    );
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "nə edim?" }] }), res);
    expect(res.body.aqronomTeklif).toBe(true);
  });

  it("model imtina edəndə təhlükəsiz cavab qaytarır", async () => {
    mockCreate.mockResolvedValue({ content: [], stop_reason: "refusal" });
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "sual" }] }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.aqronomTeklif).toBe(true);
    expect(res.body.cavab).toBeTruthy();
  });

  it("Anthropic xətasında 502 qaytarır", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    mockCreate.mockRejectedValue(new Anthropic.APIError(429, "rate limited"));
    const res = makeRes();
    await handler(makeReq({ messages: [{ role: "user", content: "sual" }] }), res);
    expect(res.statusCode).toBe(502);
  });

  it("eyni IP-dən həddən çox sorğunu 429 ilə kəsir", async () => {
    mockCreate.mockResolvedValue(textResponse("Cavab"));
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
