import { beforeEach, describe, expect, it, vi } from "vitest";
import { KES_MS, fetchNdvi, necheGunEvvel, saheAcari, xulase } from "./ndvi.js";

const SAHE = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

const nokte = (son, ndvi) => ({ baslangic: son, son, ndvi, ortulu: 0 });

const ok = (seriya) => ({
  ok: true,
  status: 200,
  json: async () => ({ seriya, menbe: "Sentinel-2 · Copernicus" }),
});

beforeEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("saheAcari", () => {
  it("eyni kontur üçün eyni açar verir", () => {
    expect(saheAcari(SAHE)).toBe(saheAcari([...SAHE]));
  });

  // Sahə dəyişdikdə köhnə ölçmələr başqa yerə aiddir — keş etibarsız olmalıdır
  it("kontur dəyişdikdə açar dəyişir", () => {
    const basqa = [...SAHE.slice(0, 3), [40.41, 47.11]];
    expect(saheAcari(basqa)).not.toBe(saheAcari(SAHE));
  });

  it("boş konturda çökmür", () => {
    expect(saheAcari(null)).toBe("");
  });
});

describe("xulase", () => {
  it("son ölçünü və azalma trendini tapır", () => {
    const x = xulase([
      nokte("2026-07-01", 0.78),
      nokte("2026-07-06", 0.75),
      nokte("2026-07-11", 0.71),
      nokte("2026-07-16", 0.69),
    ]);
    expect(x.ndvi).toBe(0.69);
    expect(x.tarix).toBe("2026-07-16");
    expect(x.ferq).toBe(-0.09);
    expect(x.istiqamet).toBe("azalir");
  });

  it("artımı tanıyır", () => {
    const x = xulase([nokte("2026-05-01", 0.4), nokte("2026-05-06", 0.55)]);
    expect(x.istiqamet).toBe("artir");
  });

  // Kiçik dalğalanma ölçmə səs-küyüdür — fermerə "azalır" deməmək lazımdır
  it("cüzi fərqi trend saymır", () => {
    const x = xulase([nokte("2026-07-01", 0.72), nokte("2026-07-06", 0.71)]);
    expect(x.istiqamet).toBe("sabit");
  });

  it("tək ölçmədə trend iddia etmir", () => {
    const x = xulase([nokte("2026-07-01", 0.72)]);
    expect(x.ndvi).toBe(0.72);
    expect(x.ferq).toBeNull();
    expect(x.istiqamet).toBe("sabit");
  });

  it("ölçmə yoxdursa null qaytarır", () => {
    expect(xulase([])).toBeNull();
    expect(xulase(null)).toBeNull();
  });
});

describe("necheGunEvvel", () => {
  it("günləri düzgün sayır", () => {
    const indi = Date.parse("2026-08-01T12:00:00Z");
    expect(necheGunEvvel("2026-08-01", indi)).toBe(0);
    expect(necheGunEvvel("2026-07-29", indi)).toBe(3);
  });

  it("yararsız tarixdə null qaytarır", () => {
    expect(necheGunEvvel("filan")).toBeNull();
  });
});

describe("fetchNdvi", () => {
  it("serverdən seriya alır və keşləyir", async () => {
    const fetchMock = vi.fn(async () => ok([nokte("2026-07-16", 0.69)]));
    vi.stubGlobal("fetch", fetchMock);

    const netice = await fetchNdvi({ noqteler: SAHE });
    expect(netice.seriya).toHaveLength(1);
    expect(netice.kohne).toBe(false);

    // İkinci çağırış keşdən gəlir — şəbəkəyə çıxmır
    const ikinci = await fetchNdvi({ noqteler: SAHE });
    expect(ikinci.seriya).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keş vaxtı bitəndə yenidən soruşur", async () => {
    const fetchMock = vi.fn(async () => ok([nokte("2026-07-16", 0.69)]));
    vi.stubGlobal("fetch", fetchMock);
    await fetchNdvi({ noqteler: SAHE });

    // Keşin vaxtını geriyə çəkirik
    const kes = JSON.parse(window.localStorage.getItem("agrifin:ndvi"));
    kes.vaxt = Date.now() - KES_MS - 1000;
    window.localStorage.setItem("agrifin:ndvi", JSON.stringify(kes));

    await fetchNdvi({ noqteler: SAHE });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // Ən vacib keş xassəsi: başqa sahənin ölçüsü göstərilməməlidir
  it("sahə dəyişəndə keşi işlətmir", async () => {
    const fetchMock = vi.fn(async () => ok([nokte("2026-07-16", 0.69)]));
    vi.stubGlobal("fetch", fetchMock);
    await fetchNdvi({ noqteler: SAHE });

    const basqaSahe = [...SAHE.slice(0, 3), [40.41, 47.11]];
    await fetchNdvi({ noqteler: basqaSahe });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("məcburi yeniləmə keşi keçir", async () => {
    const fetchMock = vi.fn(async () => ok([nokte("2026-07-16", 0.69)]));
    vi.stubGlobal("fetch", fetchMock);
    await fetchNdvi({ noqteler: SAHE });
    await fetchNdvi({ noqteler: SAHE, mecburi: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // Fermer sahədədir, internet zəifdir — köhnə ölçmə boş ekrandan yaxşıdır
  it("şəbəkə kəsiləndə köhnə keşi qaytarır və bunu bildirir", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok([nokte("2026-07-16", 0.69)])));
    await fetchNdvi({ noqteler: SAHE });

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("şəbəkə yoxdur");
    }));
    const netice = await fetchNdvi({ noqteler: SAHE, mecburi: true });

    expect(netice.seriya).toHaveLength(1);
    expect(netice.kohne).toBe(true);
  });

  it("keş yoxdursa xətanı statusla birlikdə atır", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 501 })));
    await expect(fetchNdvi({ noqteler: SAHE })).rejects.toMatchObject({ status: 501 });
  });

  it("kontur yoxdursa şəbəkəyə çıxmır", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const netice = await fetchNdvi({ noqteler: [[40, 47]] });
    expect(netice.seriya).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ləğv siqnalını olduğu kimi ötürür", async () => {
    const xeta = new Error("ləğv");
    xeta.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw xeta;
    }));
    await expect(fetchNdvi({ noqteler: SAHE })).rejects.toThrow("ləğv");
  });
});
