import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler, { PILLELER, olcuHesabla } from "./saheSekli.js";

const SAHE = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

// Kiçik, etibarlı PNG başlığı — Buffer axını üçün kifayətdir
const PNG_BAYT = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

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
  headers: { "x-forwarded-for": `10.0.2.${Math.floor(Math.random() * 250)}` },
  socket: { remoteAddress: "127.0.0.1" },
});

const tokenOk = { ok: true, status: 200, json: async () => ({ access_token: "t" }) };
const sekilOk = {
  ok: true,
  status: 200,
  arrayBuffer: async () => PNG_BAYT.buffer,
  text: async () => "",
};

const stub = (sekilCavabi = sekilOk) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => (String(url).includes("token") ? tokenOk : sekilCavabi)),
  );

beforeEach(() => {
  vi.stubEnv("SENTINEL_CLIENT_ID", "test-id");
  vi.stubEnv("SENTINEL_CLIENT_SECRET", "cox-gizli-acar");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("olcuHesabla", () => {
  it("uzunsov sahədə nisbəti saxlayır", () => {
    // 400 m × 100 m — eni hündürlüyündən təxminən 4 dəfə böyük olmalıdır
    const olcu = olcuHesabla({ enFerq: 100 / 111_320, uzFerq: 400 / (111_320 * Math.cos(0.7)) }, 40);
    expect(olcu.width / olcu.height).toBeGreaterThan(3);
    expect(olcu.width / olcu.height).toBeLessThan(5);
  });

  it("böyük sahəni hədlə məhdudlaşdırır", () => {
    const olcu = olcuHesabla({ enFerq: 0.4, uzFerq: 0.4 }, 40);
    expect(olcu.width).toBeLessThanOrEqual(384);
    expect(olcu.height).toBeLessThanOrEqual(384);
  });

  it("çox kiçik sahədə də istifadə edilə bilən ölçü verir", () => {
    const olcu = olcuHesabla({ enFerq: 0.00001, uzFerq: 0.00001 }, 40);
    // Böyük tərəf ekranda görünəcək qədər olmalıdır
    expect(Math.max(olcu.width, olcu.height)).toBeGreaterThanOrEqual(64);
    expect(Math.min(olcu.width, olcu.height)).toBeGreaterThanOrEqual(1);
  });

  it("hündür sahədə nisbət tərsinə saxlanılır", () => {
    // 100 m en × 400 m şimal-cənub — hündürlük böyük olmalıdır
    const olcu = olcuHesabla({ enFerq: 400 / 111_320, uzFerq: 100 / (111_320 * Math.cos(0.7)) }, 40);
    expect(olcu.height).toBeGreaterThan(olcu.width * 3);
  });

  it("sıfır ölçüdə çökmür", () => {
    expect(olcuHesabla({ enFerq: 0, uzFerq: 0 }, 40)).toEqual({ width: 64, height: 64 });
  });
});

describe("PILLELER", () => {
  it("rəng pillələri artan sıradadır və leyend açarı var", () => {
    const hedler = PILLELER.map((p) => p.hedd);
    expect([...hedler].sort((a, b) => a - b)).toEqual(hedler);
    for (const p of PILLELER) {
      expect(p.reng).toMatch(/^#[0-9A-F]{6}$/i);
      expect(p.acar).toMatch(/^ndvi\.legend\./);
    }
  });
});

describe("api/saheSekli", () => {
  it("PNG-ni data URL kimi qaytarır", async () => {
    stub();
    const res = makeRes();
    await handler(makeReq({ noqteler: SAHE }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.sekil).toMatch(/^data:image\/png;base64,/);
    expect(res.body.en).toBeGreaterThan(0);
    expect(res.body.hundurluk).toBeGreaterThan(0);
  });

  it("konturu GeoJSON sırası ilə və şəffaflıqlı skriptlə göndərir", async () => {
    const fetchMock = vi.fn(async (url) => (String(url).includes("token") ? tokenOk : sekilOk));
    vi.stubGlobal("fetch", fetchMock);
    await handler(makeReq({ noqteler: SAHE }), makeRes());

    const cagiris = fetchMock.mock.calls.find(([url]) => String(url).includes("process"));
    const yuk = JSON.parse(cagiris[1].body);
    const halqa = yuk.input.bounds.geometry.coordinates[0];
    // [uzunluq, en] sırası
    expect(halqa[0][0]).toBeGreaterThan(halqa[0][1]);
    // Buludlu piksel şəffaf qalmalıdır
    expect(yuk.evalscript).toContain("return [0, 0, 0, 0]");
    expect(yuk.evalscript).toContain("SCL");
    // Dövrün ən az buludlu görüntüsü seçilir
    expect(yuk.input.data[0].dataFilter.mosaickingOrder).toBe("leastCC");
    expect(yuk.output.responses[0].format.type).toBe("image/png");
  });

  it("yararsız konturu peykə göndərmir", async () => {
    const fetchMock = vi.fn();
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
    await handler(makeReq({ noqteler: [[40, 47], [41, 47], [41, 48], [40, 48]] }), res);
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("açar yoxdursa 501 qaytarır", async () => {
    vi.stubEnv("SENTINEL_CLIENT_SECRET", "");
    const res = makeRes();
    await handler(makeReq({ noqteler: SAHE }), res);
    expect(res.statusCode).toBe(501);
  });

  it("peyk xidməti xəta verəndə 502 qaytarır və açarı sızdırmır", async () => {
    stub({ ok: false, status: 500, text: async () => "error cox-gizli-acar" });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = makeRes();
    await handler(makeReq({ noqteler: SAHE }), res);

    expect(res.statusCode).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain("cox-gizli-acar");
    for (const call of error.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("cox-gizli-acar");
    }
    error.mockRestore();
  });

  it("GET quraşdırmanı göstərir", async () => {
    stub();
    const res = makeRes();
    await handler(makeReq({}, "GET"), res);
    expect(res.body).toEqual({ acarQurulub: true, tokenAlindi: true });
  });

  it("eyni IP-dən həddən çox sorğunu kəsir", async () => {
    stub();
    const req = {
      method: "POST",
      body: { noqteler: SAHE },
      headers: { "x-forwarded-for": "203.0.113.55" },
      socket: { remoteAddress: "203.0.113.55" },
    };
    let last = null;
    for (let i = 0; i < 25; i += 1) {
      last = makeRes();
      await handler(req, last);
    }
    expect(last.statusCode).toBe(429);
  });
});
