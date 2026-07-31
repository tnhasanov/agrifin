import { describe, expect, it } from "vitest";
import { havaNoqtesi } from "./saheYeri.js";

const BERDE = { name: "Bərdə", lat: 40.3705, lon: 47.1265 };

// Bərdə rayon mərkəzindən ~15 km şimalda çəkilmiş sahə
const SAHE = {
  hektar: 6.5,
  noqteler: [
    [40.5, 47.2],
    [40.5023, 47.2],
    [40.5023, 47.2029],
    [40.5, 47.2029],
  ],
};

describe("havaNoqtesi", () => {
  it("sahə çəkilibsə onun mərkəzini qaytarır", () => {
    const n = havaNoqtesi({ location: BERDE, sahe: SAHE });
    expect(n.deqiq).toBe(true);
    expect(n.lat).toBeCloseTo(40.5012, 3);
    expect(n.lon).toBeCloseTo(47.2015, 3);
  });

  // Əsas fayda: rayon mərkəzi sahədən onlarla km uzaq ola bilər
  it("qaytardığı nöqtə rayon mərkəzindən fərqlidir", () => {
    const n = havaNoqtesi({ location: BERDE, sahe: SAHE });
    expect(n.lat).not.toBeCloseTo(BERDE.lat, 2);
    expect(n.lon).not.toBeCloseTo(BERDE.lon, 2);
  });

  it("sahə yoxdursa rayon mərkəzinə qayıdır və dəqiqlik iddia etmir", () => {
    expect(havaNoqtesi({ location: BERDE })).toEqual({
      lat: BERDE.lat,
      lon: BERDE.lon,
      deqiq: false,
    });
  });

  it("yarımçıq sahəni (3 nöqtədən az) etibarlı saymır", () => {
    const yarim = { noqteler: [[40.5, 47.2], [40.51, 47.2]] };
    expect(havaNoqtesi({ location: BERDE, sahe: yarim }).deqiq).toBe(false);
  });

  it("zədələnmiş sahədə çökmür", () => {
    expect(havaNoqtesi({ location: BERDE, sahe: {} }).deqiq).toBe(false);
    expect(havaNoqtesi({ location: BERDE, sahe: null }).deqiq).toBe(false);
  });
});
