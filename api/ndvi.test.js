import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler, { seriyaCixar } from "./ndvi.js";

const SAHE = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

function makeRes() {
  return {
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
}

const makeReq = (body, method = "POST") => ({
  method,
  body,
  headers: { "x-forwarded-for": `10.0.1.${Math.floor(Math.random() * 250)}` },
  socket: { remoteAddress: "127.0.0.1" },
});

const ok = (payload) => ({
  ok: true,
  status: 200,
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});

const fail = (status, text = "xəta") => ({
  ok: false,
  status,
  json: async () => ({}),
  text: async () => text,
});

/** Statistical API-nin bir dövrü */
const dovr = (from, to, mean, sample = 640, noData = 0, nem = 0.18) => ({
  interval: { from: `${from}T00:00:00Z`, to: `${to}T00:00:00Z` },
  outputs: {
    ndvi: { bands: { B0: { stats: { mean, sampleCount: sample, noDataCount: noData } } } },
    nemlik: { bands: { B0: { stats: { mean: nem, sampleCount: sample, noDataCount: noData } } } },
  },
});

beforeEach(() => {
  vi.stubEnv("SENTINEL_CLIENT_ID", "test-id");
  vi.stubEnv("SENTINEL_CLIENT_SECRET", "cox-gizli-acar");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("seriyaCixar", () => {
  it("dövrləri sadə seriyaya çevirir", () => {
    const seriya = seriyaCixar({
      data: [dovr("2026-07-01", "2026-07-06", 0.7213), dovr("2026-07-06", "2026-07-11", 0.684)],
    });
    expect(seriya).toEqual([
      { baslangic: "2026-07-01", son: "2026-07-06", ndvi: 0.721, nemlik: 0.18, ortulu: 0 },
      { baslangic: "2026-07-06", son: "2026-07-11", ndvi: 0.684, nemlik: 0.18, ortulu: 0 },
    ]);
  });

  // Buludlu həftədə ölçmə olmur — bu normaldır, xəta deyil
  it("boş və xətalı dövrləri atır", () => {
    const seriya = seriyaCixar({
      data: [
        dovr("2026-07-01", "2026-07-06", 0.7),
        { interval: { from: "2026-07-06T00:00:00Z", to: "2026-07-11T00:00:00Z" }, outputs: {} },
        { interval: { from: "2026-07-11T00:00:00Z" }, error: { type: "BAD_REQUEST" } },
        dovr("2026-07-16", "2026-07-21", 0.65),
      ],
    });
    expect(seriya).toHaveLength(2);
    expect(seriya.map((s) => s.ndvi)).toEqual([0.7, 0.65]);
  });

  it("örtülü piksellərin payını hesablayır", () => {
    const [nokte] = seriyaCixar({ data: [dovr("2026-07-01", "2026-07-06", 0.6, 300, 700)] });
    expect(nokte.ortulu).toBe(0.7);
  });

  it("tam örtülü dövrü buraxmır", () => {
    expect(seriyaCixar({ data: [dovr("2026-07-01", "2026-07-06", 0, 0, 640)] })).toEqual([]);
  });

  it("nəticəni tarixə görə sıralayır", () => {
    const seriya = seriyaCixar({
      data: [dovr("2026-07-16", "2026-07-21", 0.6), dovr("2026-07-01", "2026-07-06", 0.7)],
    });
    expect(seriya.map((s) => s.son)).toEqual(["2026-07-06", "2026-07-21"]);
  });

  // Rütubət ayrıca çıxışdır — gəlmirsə NDVI yenə işləməlidir (köhnə keş, natamam cavab)
  it("rütubət olmadan da seriya qurur", () => {
    const seriya = seriyaCixar({
      data: [
        {
          interval: { from: "2026-07-01T00:00:00Z", to: "2026-07-06T00:00:00Z" },
          outputs: { ndvi: { bands: { B0: { stats: { mean: 0.7, sampleCount: 640 } } } } },
        },
      ],
    });
    expect(seriya[0].ndvi).toBe(0.7);
    expect(seriya[0].nemlik).toBeNull();
  });

  it("zədələnmiş cavabda çökmür", () => {
    expect(seriyaCixar(null)).toEqual([]);
    expect(seriyaCixar({})).toEqual([]);
    expect(seriyaCixar({ data: "yox" })).toEqual([]);
    expect(seriyaCixar({ data: [{}] })).toEqual([]);
  });
});

describe("api/ndvi — quraşdırma", () => {
  it("GET açarların qurulduğunu göstərir və token yoxlayır", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok({ access_token: "t" })));
    const res = makeRes();
    await handler(makeReq({}, "GET"), res);
    expect(res.body).toEqual({ acarQurulub: true, tokenAlindi: true });
  });

  // Ən vacib təhlükəsizlik xassəsi: diaqnostika açarı heç bir formada verməməlidir
  it("GET cavabında açar sızmır", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fail(401, "invalid_client cox-gizli-acar")));
    const res = makeRes();
    await handler(makeReq({}, "GET"), res);

    const metn = JSON.stringify(res.body);
    expect(metn).not.toContain("cox-gizli-acar");
    expect(metn).not.toContain("test-id");
    expect(res.body.tokenAlindi).toBe(false);
    expect(res.body.tokenStatus).toBe(401);
  });

  it("açar yoxdursa GET bunu açıq deyir və şəbəkəyə çıxmır", async () => {
    vi.stubEnv("SENTINEL_CLIENT_ID", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(makeReq({}, "GET"), res);

    expect(res.body.acarQurulub).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("açar yoxdursa POST 501 qaytarır", async () => {
    vi.stubEnv("SENTINEL_CLIENT_SECRET", "");
    const res = makeRes();
    await handler(makeReq({ noqteler: SAHE }), res);
    expect(res.statusCode).toBe(501);
  });

  it("yalnız GET və POST qəbul edir", async () => {
    const res = makeRes();
    await handler(makeReq({}, "DELETE"), res);
    expect(res.statusCode).toBe(405);
  });
});

describe("api/ndvi — sorğu", () => {
  it("uğurlu halda seriya qaytarır", async () => {
    const fetchMock = vi.fn(async (url) =>
      String(url).includes("token")
        ? ok({ access_token: "t" })
        : ok({ data: [dovr("2026-07-01", "2026-07-06", 0.72)] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = makeRes();
    await handler(makeReq({ noqteler: SAHE }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.seriya).toHaveLength(1);
    expect(res.body.seriya[0].ndvi).toBe(0.72);
    expect(res.body.menbe).toContain("Sentinel-2");
  });

  it("sorğuda konturu GeoJSON sırası ilə göndərir", async () => {
    const fetchMock = vi.fn(async (url) =>
      String(url).includes("token") ? ok({ access_token: "t" }) : ok({ data: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await handler(makeReq({ noqteler: SAHE }), makeRes());

    const statCall = fetchMock.mock.calls.find(([url]) => String(url).includes("statistics"));
    const yuk = JSON.parse(statCall[1].body);
    const halqa = yuk.input.bounds.geometry.coordinates[0];
    // [uzunluq, en] — Azərbaycanda uzunluq (47) endən (40) böyükdür
    expect(halqa[0][0]).toBeGreaterThan(halqa[0][1]);
    // Halqa qapalıdır
    expect(halqa[0]).toEqual(halqa[halqa.length - 1]);
    // Buludu maskalayan skript göndərilir
    expect(yuk.aggregation.evalscript).toContain("SCL");
  });

  // Rütubət eyni sorğuda gəlir — ayrıca çağırış emal kvotasını iki dəfə yandırardı
  it("NDVI və rütubəti bir sorğuda istəyir", async () => {
    const fetchMock = vi.fn(async (url) =>
      String(url).includes("token") ? ok({ access_token: "t" }) : ok({ data: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await handler(makeReq({ noqteler: SAHE }), makeRes());

    const statCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("statistics"));
    expect(statCalls).toHaveLength(1);

    const yuk = JSON.parse(statCalls[0][1].body);
    expect(Object.keys(yuk.calculations).sort()).toEqual(["ndvi", "nemlik"]);
    // B11 rütubət üçün lazımdır və eyni məhsuldadır
    expect(yuk.aggregation.evalscript).toContain("B11");
  });

  it("token sorğusunu düzgün formada göndərir", async () => {
    const fetchMock = vi.fn(async (url) =>
      String(url).includes("token") ? ok({ access_token: "t" }) : ok({ data: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await handler(makeReq({ noqteler: SAHE }), makeRes());

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("openid-connect/token");
    expect(String(options.body)).toContain("grant_type=client_credentials");
  });

  it("yararsız konturu 400 ilə rədd edir və peykə sorğu göndərmir", async () => {
    const fetchMock = vi.fn(async () => ok({ access_token: "t" }));
    vi.stubGlobal("fetch", fetchMock);

    const res = makeRes();
    await handler(makeReq({ noqteler: [[40, 47], [41, 47]] }), res);

    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("həddindən böyük sahəni rədd edir", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(
      makeReq({ noqteler: [[40, 47], [41, 47], [41, 48], [40, 48]] }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("peyk xidməti xəta verəndə 502 qaytarır", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        String(url).includes("token") ? ok({ access_token: "t" }) : fail(500, "server error"),
      ),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = makeRes();
    await handler(makeReq({ noqteler: SAHE }), res);

    expect(res.statusCode).toBe(502);
    expect(res.body.menbeStatus).toBe(500);
    error.mockRestore();
  });

  it("açarlar yanlışdırsa 502 qaytarır və açarı loga yazmır", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fail(401, "invalid_client")));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = makeRes();
    await handler(makeReq({ noqteler: SAHE }), res);

    expect(res.statusCode).toBe(502);
    for (const call of error.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("cox-gizli-acar");
    }
    error.mockRestore();
  });

  it("ölçmə tapılmayanda boş seriya qaytarır, xəta yox", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        String(url).includes("token") ? ok({ access_token: "t" }) : ok({ data: [] }),
      ),
    );
    const res = makeRes();
    await handler(makeReq({ noqteler: SAHE }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.seriya).toEqual([]);
  });

  it("gün sayını hədlərə salır", async () => {
    const fetchMock = vi.fn(async (url) =>
      String(url).includes("token") ? ok({ access_token: "t" }) : ok({ data: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await handler(makeReq({ noqteler: SAHE, gun: 9999 }), makeRes());

    const statCall = fetchMock.mock.calls.find(([url]) => String(url).includes("statistics"));
    const { from, to } = JSON.parse(statCall[1].body).aggregation.timeRange;
    const genislik = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    // 9999 rədd edilib, standart 60 günə düşüb
    expect(genislik).toBeGreaterThan(59);
    expect(genislik).toBeLessThan(62);
  });

  it("eyni IP-dən həddən çox sorğunu 429 ilə kəsir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) =>
        String(url).includes("token") ? ok({ access_token: "t" }) : ok({ data: [] }),
      ),
    );
    const req = {
      method: "POST",
      body: { noqteler: SAHE },
      headers: { "x-forwarded-for": "203.0.113.99" },
      socket: { remoteAddress: "203.0.113.99" },
    };
    let last = null;
    for (let i = 0; i < 35; i += 1) {
      last = makeRes();
      await handler(req, last);
    }
    expect(last.statusCode).toBe(429);
  });
});
