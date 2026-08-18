import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KES_MS, YARIMCIQ_KES_MS, fetchTarixce, yarimciqdir } from "./tarixce.js";

const SAHE = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

const tam = [{ il: 2024, zirve: 0.7, zirveAyi: "2024-05", etrafMedyan: 0.6, olcmeSayi: 6 }];
const yarimciq = [{ il: 2024, zirve: 0.7, zirveAyi: "2024-05", etrafMedyan: null, olcmeSayi: 6 }];

const cavab = (movsumler) => ({
  ok: true,
  status: 200,
  json: async () => ({ movsumler, etrafAlinib: true }),
});

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("tarixçə keşi", () => {
  it("yarımçıqlığı medianın varlığından tanıyır", () => {
    expect(yarimciqdir(tam)).toBe(false);
    expect(yarimciqdir(yarimciq)).toBe(true);
    expect(yarimciqdir([])).toBe(true);
    expect(yarimciqdir(null)).toBe(true);
  });

  it("tam nəticə uzun müddət keşlənir", async () => {
    const fetchMock = vi.fn(async () => cavab(tam));
    vi.stubGlobal("fetch", fetchMock);

    await fetchTarixce({ noqteler: SAHE });
    await fetchTarixce({ noqteler: SAHE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ƏSAS: ətraf sorğusu nasaz olanda medianlar boş qayıdır. Belə nəticə
  // 30 gün keşlənsəydi müvəqqəti nasazlıq indeksin iki amilini bir ay
  // "ölçülməyib" saxlayırdı — qısa müddətdən sonra təkrar cəhd edilməlidir.
  it("yarımçıq nəticə qısa müddətdən sonra təkrar soruşulur", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => cavab(yarimciq));
    vi.stubGlobal("fetch", fetchMock);

    await fetchTarixce({ noqteler: SAHE });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Qısa müddət keçməyib — keşdən gəlir
    vi.setSystemTime(Date.now() + YARIMCIQ_KES_MS / 2);
    await fetchTarixce({ noqteler: SAHE });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Qısa müddət keçib (30 gündən xeyli əvvəl) — təkrar cəhd
    vi.setSystemTime(Date.now() + YARIMCIQ_KES_MS);
    await fetchTarixce({ noqteler: SAHE });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // Bayraqdan əvvəl yazılmış köhnə keşlər də sağalmalıdır: yarımçıqlıq
  // yazılan bayraqdan yox, məzmunun özündən çıxarılır
  it("köhnə yarımçıq keş məzmunundan tanınıb təzələnir", async () => {
    window.localStorage.setItem(
      "agrifin:tarixce",
      JSON.stringify({
        acar: "40.40000,47.10000;40.40230,47.10000;40.40230,47.10290;40.40000,47.10290",
        vaxt: Date.now() - YARIMCIQ_KES_MS - 1000,
        movsumler: yarimciq,
      }),
    );
    const fetchMock = vi.fn(async () => cavab(tam));
    vi.stubGlobal("fetch", fetchMock);

    const netice = await fetchTarixce({ noqteler: SAHE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(netice).toEqual(tam);
  });

  it("tam nəticə qısa müddətdən sonra təzələnmir", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => cavab(tam));
    vi.stubGlobal("fetch", fetchMock);

    await fetchTarixce({ noqteler: SAHE });
    vi.setSystemTime(Date.now() + YARIMCIQ_KES_MS * 2);
    await fetchTarixce({ noqteler: SAHE });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 30 gün keçəndə isə təzələnir
    vi.setSystemTime(Date.now() + KES_MS);
    await fetchTarixce({ noqteler: SAHE });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
