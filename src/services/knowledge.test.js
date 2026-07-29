import { describe, expect, it } from "vitest";
import {
  BITKILER,
  BITKI_SECIMI,
  IQLIM_ZONALARI,
  kontekstQur,
  zonaTap,
} from "./knowledge.js";
import { DISTRICTS } from "./location.js";

describe("bilik bazası — struktur", () => {
  const crops = Object.entries(BITKILER);

  it("hər bitkinin adı, mərhələləri və problemləri var", () => {
    for (const [key, crop] of crops) {
      expect(crop.ad, key).toBeTruthy();
      expect(crop.merhaleler?.length, key).toBeGreaterThan(0);
      expect(crop.problemler?.length, key).toBeGreaterThan(0);
    }
  });

  it("mərhələ ayları 1–12 aralığındadır", () => {
    for (const [key, crop] of crops) {
      for (const stage of crop.merhaleler) {
        expect(stage.ad, key).toBeTruthy();
        expect(stage.isler, key).toBeTruthy();
        for (const month of stage.ay) {
          expect(month, `${key}/${stage.ad}`).toBeGreaterThanOrEqual(1);
          expect(month, `${key}/${stage.ad}`).toBeLessThanOrEqual(12);
        }
      }
    }
  });

  it("hər problemin adı və əlamətləri var", () => {
    for (const [key, crop] of crops) {
      for (const problem of crop.problemler) {
        expect(problem.ad, key).toBeTruthy();
        expect(problem.elametler, `${key}/${problem.ad}`).toBeTruthy();
      }
    }
  });

  it("bilik bazasında doza/norma yazılışı yoxdur (qadağan siyasəti)", () => {
    // Serverdəki qoruyucu regex-in eynisi — KB özü də təmiz olmalıdır
    const dozaRegex = /\b\d+([.,]\d+)?\s?(ml|l|litr|q|qr|qram|kq|gr|g)\s?\/\s?(ha|hektar|litr|l|sot)\b/i;
    const bütünMətn = JSON.stringify(BITKILER);
    expect(dozaRegex.test(bütünMətn)).toBe(false);
  });

  it("BITKI_SECIMI bütün bitkiləri əhatə edir", () => {
    expect(BITKI_SECIMI.map((item) => item.key).sort()).toEqual(
      Object.keys(BITKILER).sort(),
    );
  });

  it("hər bitki hələ aqronom yoxlanışı gözləyir (bayraq aşağı düşəndə bu test yenilənməlidir)", () => {
    for (const [key, crop] of crops) {
      expect(crop.yoxlanildi, key).toBe(false);
    }
  });
});

describe("iqlim zonaları", () => {
  const districtNames = new Set(DISTRICTS.map((d) => d.name));

  it("zonalardaki hər rayon adı rayon siyahısında mövcuddur", () => {
    const unknown = [];
    for (const zone of Object.values(IQLIM_ZONALARI)) {
      for (const name of zone.rayonlar) {
        if (!districtNames.has(name)) unknown.push(name);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("hər rayon hansısa zonaya düşür", () => {
    const zoned = new Set(
      Object.values(IQLIM_ZONALARI).flatMap((zone) => zone.rayonlar),
    );
    const missing = DISTRICTS.filter((d) => !zoned.has(d.name)).map((d) => d.name);
    expect(missing).toEqual([]);
  });

  it("zonaTap GPS şəkilçisini nəzərə alır", () => {
    expect(zonaTap("Gəncə (GPS)").key).toBe("daglik_qerb");
    expect(zonaTap("Lənkəran").key).toBe("lenkeran");
  });

  it("naməlum rayon üçün Arana düşür", () => {
    expect(zonaTap("Yoxdur").key).toBe("aran");
    expect(zonaTap(undefined).key).toBe("aran");
  });
});

describe("kontekstQur", () => {
  it("bitki seçiləndə cari mərhələni və problemləri daxil edir", () => {
    const text = kontekstQur({ bitkiKey: "bugda", rayon: "Bərdə", ay: 4 });
    expect(text).toContain("Payızlıq buğda");
    expect(text).toContain("Sünbülləmə"); // aprel mərhələsi
    expect(text).toContain("Sarı pas");
    expect(text).toContain("ÜMUMİ PRİNSİPLƏR");
  });

  it("bitki seçilməyəndə soruşmağı tapşırır", () => {
    const text = kontekstQur({ rayon: "Bərdə", ay: 4 });
    expect(text).toContain("Bitki seçilməyib");
    expect(text).toContain("Payızlıq buğda"); // mövcud siyahı
  });

  it("hava və NDVI veriləndə onları yazır", () => {
    const text = kontekstQur({
      bitkiKey: "bugda",
      rayon: "Bərdə",
      ay: 4,
      hava: { maxTemp: 31, yagis: 2, balans: 28 },
      ndvi: 0.72,
    });
    expect(text).toContain("maks 31°C");
    expect(text).toContain("NDVI: 0.72");
  });

  it("dekabrda 'növbəti ay' yanvara keçir", () => {
    const text = kontekstQur({ bitkiKey: "bugda", rayon: "Bərdə", ay: 12 });
    expect(text).toContain("Qış sükunəti"); // yanvar mərhələsi
  });
});
