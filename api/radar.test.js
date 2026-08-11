import { describe, expect, it } from "vitest";
import { radarSeriyasi } from "./radar.js";

/** Statistical API cavabının bizim işlətdiyimiz forması */
const dovr = (from, to, { vv, vh = -18, su = 0, piksel = 400 } = {}) => ({
  interval: { from: `${from}T00:00:00Z`, to: `${to}T00:00:00Z` },
  outputs: {
    default: {
      bands: {
        B0: { stats: { mean: vv, sampleCount: piksel } },
        B1: { stats: { mean: vh } },
        B2: { stats: { mean: su } },
      },
    },
  },
});

describe("radar seriyası", () => {
  it("dB dəyərlərini və su payını çıxarır", () => {
    const seriya = radarSeriyasi({
      data: [dovr("2026-07-20", "2026-07-26", { vv: -12.34, vh: -19.87, su: 0.0234 })],
    });
    expect(seriya).toHaveLength(1);
    // Bir onluq bəsdir: peykin öz təkrarlanma xətası ~0,5 dB-dir
    expect(seriya[0].vv).toBe(-12.3);
    expect(seriya[0].vh).toBe(-19.9);
    expect(seriya[0].suPayi).toBe(0.023);
    expect(seriya[0].son).toBe("2026-07-26");
  });

  it("tarixə görə sıralayır", () => {
    const seriya = radarSeriyasi({
      data: [
        dovr("2026-07-26", "2026-08-01", { vv: -11 }),
        dovr("2026-07-14", "2026-07-20", { vv: -13 }),
        dovr("2026-07-20", "2026-07-26", { vv: -12 }),
      ],
    });
    expect(seriya.map((n) => n.vv)).toEqual([-13, -12, -11]);
  });

  // Peyk o dövrdə keçməyibsə xana boş gəlir — bu, xəta deyil
  it("boş dövrləri atır", () => {
    const seriya = radarSeriyasi({
      data: [
        dovr("2026-07-14", "2026-07-20", { vv: -13 }),
        { interval: { from: "2026-07-20T00:00:00Z", to: "2026-07-26T00:00:00Z" }, outputs: {} },
        dovr("2026-07-26", "2026-08-01", { vv: -12, piksel: 0 }),
      ],
    });
    expect(seriya).toHaveLength(1);
  });

  it("naqis cavabda çökmür", () => {
    expect(radarSeriyasi(null)).toEqual([]);
    expect(radarSeriyasi({})).toEqual([]);
    expect(radarSeriyasi({ data: "yox" })).toEqual([]);
  });
});
