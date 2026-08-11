import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEYISME_HEDDI_DB, SU_PAYI_HEDDI, fetchRadar, radarXulasesi } from "./radar.js";

const SAHE = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

const olcme = (son, vv, suPayi = 0) => ({ baslangic: son, son, vv, vh: -19, suPayi, piksel: 400 });

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("radar xülasəsi", () => {
  // Baza SON ölçmə deyil, keçmişin MEDİANIdır: bir keçidin səs-küyü
  // nəticəni çevirməməlidir
  it("sahənin öz keçmişi ilə müqayisə edir", () => {
    const x = radarXulasesi([
      olcme("2026-07-08", -13),
      olcme("2026-07-14", -12),
      olcme("2026-07-20", -13),
      olcme("2026-07-26", -9),
    ]);
    // Keçmiş [-13, -12, -13] → medyan -13; son -9 → +4 dB
    expect(x.deyisme).toBe(4);
    expect(x.istiqamet).toBe("nemlenib");
    expect(x.tarix).toBe("2026-07-26");
  });

  it("səpilmə düşəndə quruma deyir", () => {
    const x = radarXulasesi([olcme("2026-07-14", -10), olcme("2026-07-20", -10), olcme("2026-07-26", -14)]);
    expect(x.istiqamet).toBe("quruyub");
  });

  // Peykin öz təkrarlanma xətası ~0,5 dB — kiçik fərq "dəyişmə" deyil
  it("həddən kiçik fərqi dəyişmə saymır", () => {
    const kicik = DEYISME_HEDDI_DB - 0.5;
    const x = radarXulasesi([olcme("2026-07-20", -12), olcme("2026-07-26", -12 + kicik)]);
    expect(x.istiqamet).toBe("sabit");
  });

  it("durmuş suyu payına görə tapır", () => {
    const az = radarXulasesi([olcme("2026-07-26", -13, SU_PAYI_HEDDI - 0.05)]);
    expect(az.suVar).toBe(false);

    const cox = radarXulasesi([olcme("2026-07-26", -20, SU_PAYI_HEDDI + 0.1)]);
    expect(cox.suVar).toBe(true);
    expect(cox.suPayi).toBeCloseTo(0.25, 2);
  });

  // Tək ölçmə varsa müqayisə edəcək keçmiş yoxdur — uydurmuruq
  it("tək ölçmədə istiqamət iddia etmir", () => {
    const x = radarXulasesi([olcme("2026-07-26", -12)]);
    expect(x.deyisme).toBeNull();
    expect(x.istiqamet).toBe("sabit");
    // Su payı tək ölçmədən də bilinir — o, müqayisə tələb etmir
    expect(x.suVar).toBe(false);
  });

  it("ölçmə yoxdursa null qaytarır", () => {
    expect(radarXulasesi([])).toBeNull();
    expect(radarXulasesi(null)).toBeNull();
    expect(radarXulasesi([{ son: "2026-07-26", vv: null }])).toBeNull();
  });
});

describe("fetchRadar", () => {
  it("serverdən seriya alır və keşləyir", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ seriya: [olcme("2026-07-26", -12)] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const birinci = await fetchRadar({ noqteler: SAHE });
    expect(birinci).toHaveLength(1);

    // İkinci çağırış keşdən gəlir — Copernicus emal kvotası pulludur
    const ikinci = await fetchRadar({ noqteler: SAHE });
    expect(ikinci).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sahə dəyişəndə keş etibarsızdır", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ seriya: [] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchRadar({ noqteler: SAHE });
    await fetchRadar({ noqteler: SAHE.map(([en, uz]) => [en + 0.01, uz]) });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("server xətasında statusu daşıyan xəta atır", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 501 })));
    await expect(fetchRadar({ noqteler: SAHE })).rejects.toMatchObject({ status: 501 });
  });

  it("sahə yoxdursa sorğu göndərmir", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchRadar({ noqteler: null })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
