import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ARXIV_GECIKME_GUN,
  fetchIstilik,
  gunlukGdd,
  gunlukSuret,
  istilikMuqayisesi,
  movsumBaslangici,
  toplamGdd,
} from "./istilik.js";

/** n günlük sabit temperaturlu seriya */
const seriya = (gun, max, min) => ({
  time: Array.from({ length: gun }, (_, i) => `2026-04-${String(i + 1).padStart(2, "0")}`),
  temperature_2m_max: Array.from({ length: gun }, () => max),
  temperature_2m_min: Array.from({ length: gun }, () => min),
});

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dərəcə-gün", () => {
  it("orta temperaturdan bazanı çıxır", () => {
    expect(gunlukGdd(20, 10, 0)).toBe(15);
    expect(gunlukGdd(20, 10, 10)).toBe(5);
  });

  // Soyuq gün inkişafı GERİ aparmır — mənfi toplamaq yanlışdır
  it("bazadan soyuq günü sıfır sayır", () => {
    expect(gunlukGdd(4, -2, 10)).toBe(0);
  });

  it("naqis ölçmədə sıfır qaytarır", () => {
    expect(gunlukGdd(null, 10, 0)).toBe(0);
    expect(gunlukGdd(20, 10, null)).toBe(0);
  });

  it("seriyanı toplayır", () => {
    expect(toplamGdd(seriya(10, 20, 10), 0)).toBe(150);
  });

  it("son günlərin sürətini verir", () => {
    expect(gunlukSuret(seriya(20, 22, 12), 0, 10)).toBe(17);
    expect(gunlukSuret({ temperature_2m_max: [], temperature_2m_min: [] }, 0)).toBeNull();
  });
});

describe("illər arası müqayisə", () => {
  // "8% qabaqda" fermerə heç nə demir; "4 gün qabaqda" plana düşür
  it("fərqi günə çevirir", () => {
    // Bu il 30 gün × 15 = 450; keçən il 30 gün × 12 = 360; sürət 15/gün
    const netice = istilikMuqayisesi({
      bu: seriya(30, 20, 10),
      kecen: seriya(30, 17, 7),
      baza: 0,
    });
    expect(netice.cem).toBe(450);
    expect(netice.kecenCem).toBe(360);
    expect(netice.gun).toBe(6);
    expect(netice.istiqamet).toBe("qabaq");
  });

  it("bu il sərin olanda geri qaldığını deyir", () => {
    const netice = istilikMuqayisesi({ bu: seriya(30, 17, 7), kecen: seriya(30, 20, 10), baza: 0 });
    expect(netice.istiqamet).toBe("geri");
    expect(netice.gun).toBe(7);
  });

  // Bir-iki günlük fərq ölçmə səs-küyüdür, xəbər deyil
  it("kiçik fərqi 'eyni' sayır", () => {
    const netice = istilikMuqayisesi({ bu: seriya(30, 20, 10), kecen: seriya(30, 20, 9.7), baza: 0 });
    expect(netice.istiqamet).toBe("eyni");
  });

  it("məlumat çatmayanda null qaytarır", () => {
    expect(istilikMuqayisesi({ bu: null, kecen: seriya(10, 20, 10), baza: 0 })).toBeNull();
    expect(istilikMuqayisesi({ bu: seriya(10, 20, 10), kecen: seriya(10, 20, 10), baza: null })).toBeNull();
    // Toplam sıfırdırsa (bitki üçün heç bir gün kifayət qədər isti olmayıb)
    expect(istilikMuqayisesi({ bu: seriya(10, 5, 0), kecen: seriya(10, 5, 0), baza: 15 })).toBeNull();
  });
});

describe("mövsümün başlanğıcı", () => {
  // Payızlıq buğda oktyabrda səpilir: avqustda mövsüm KEÇƏN il başlayıb
  it("səpin ayı hələ gəlməyibsə keçən ili götürür", () => {
    const bas = movsumBaslangici(10, new Date(Date.UTC(2026, 7, 11)));
    expect(bas.toISOString().slice(0, 10)).toBe("2025-10-01");
  });

  it("səpin ayı keçibsə bu ili götürür", () => {
    const bas = movsumBaslangici(3, new Date(Date.UTC(2026, 7, 11)));
    expect(bas.toISOString().slice(0, 10)).toBe("2026-03-01");
  });

  it("yararsız ayda null qaytarır", () => {
    expect(movsumBaslangici(null)).toBeNull();
    expect(movsumBaslangici(13)).toBeNull();
  });
});

describe("fetchIstilik", () => {
  const cavab = (daily) => ({ ok: true, status: 200, json: async () => ({ daily }) });

  it("iki ili eyni pəncərədə soruşur və keşləyir", async () => {
    const cagirislar = [];
    const fetchMock = vi.fn(async (url) => {
      cagirislar.push(String(url));
      return cavab(seriya(30, 20, 10).temperature_2m_max ? seriya(30, 20, 10) : null);
    });
    vi.stubGlobal("fetch", fetchMock);

    const indi = new Date(Date.UTC(2026, 5, 15));
    await fetchIstilik({ lat: 40.4, lon: 47.1, sepinAyi: 3, baza: 0, indi });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Eyni təqvim pəncərəsi, bir il fərqlə — müqayisə yalnız belə ədalətlidir
    expect(cagirislar[0]).toContain("start_date=2026-03-01");
    expect(cagirislar[1]).toContain("start_date=2025-03-01");
    // Arxiv gecikməsi hər iki ildə eyni kəsimi verir
    const son = new Date(indi.getTime() - ARXIV_GECIKME_GUN * 86_400_000).toISOString().slice(0, 10);
    expect(cagirislar[0]).toContain(`end_date=${son}`);

    await fetchIstilik({ lat: 40.4, lon: 47.1, sepinAyi: 3, baza: 0, indi });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("arxiv alınmasa xəta atır", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502 })));
    await expect(
      fetchIstilik({ lat: 40.4, lon: 47.1, sepinAyi: 3, baza: 0, indi: new Date(Date.UTC(2026, 5, 15)) }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("baza və ya səpin ayı yoxdursa sorğu göndərmir", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchIstilik({ lat: 40.4, lon: 47.1, sepinAyi: 3, baza: null })).toBeNull();
    expect(await fetchIstilik({ lat: 40.4, lon: 47.1, sepinAyi: null, baza: 0 })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
