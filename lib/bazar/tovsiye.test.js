import { describe, expect, it } from "vitest";
import { PLANLI_BITKILER, TESDIQ, ekinPlani, kateqoriyaXercleri } from "./tovsiye.js";
import { CROP_KEYS } from "../../src/services/crops.js";
import { mehsulTap } from "./kataloq.js";

const INDI = new Date("2026-09-13T10:00:00Z");

describe("ekinPlani", () => {
  it("normalar açıq şəkildə təsdiqsizdir", () => {
    expect(TESDIQ.aqronom).toBe(false);
  });

  it("hər kanonik bitkinin planı var və plan mövcud məhsullara istinad edir", () => {
    for (const bitki of CROP_KEYS) {
      expect(PLANLI_BITKILER, bitki).toContain(bitki);
      const plan = ekinPlani({ bitki, hektar: 3.8, indi: INDI });
      expect(plan.hal, bitki).toBe("hazir");
      for (const setir of plan.setirler) for (const m of setir.mehsullar) expect(mehsulTap(m.kod)).not.toBeNull();
    }
  });

  it("bitki və ya sahə yoxdursa uydurmur", () => {
    expect(ekinPlani({ bitki: null, hektar: 3 }).hal).toBe("bitkiYoxdur");
    expect(ekinPlani({ bitki: "pomidor", hektar: null }).hal).toBe("saheYoxdur");
    expect(ekinPlani({ bitki: "pomidor", hektar: 0 }).hal).toBe("saheYoxdur");
  });

  it("saylar hektara görə yuxarı yuvarlaqlanır və minimumdan aşağı düşmür", () => {
    const plan = ekinPlani({ bitki: "pomidor", hektar: 3.8, indi: INDI });
    const toxum = plan.setirler.find((s) => s.kateqoriya === "toxum").mehsullar[0];
    // 2.5 × 3.8 = 9.5 → 10 paket
    expect(toxum.say).toBe(10);
    expect(toxum.cemi).toBe(1100);
    const kartof = ekinPlani({ bitki: "kartof", hektar: 0.01, indi: INDI });
    // 80 × 0.01 = 0.8 → 1, amma minSay 4
    expect(kartof.setirler.find((s) => s.kateqoriya === "toxum").mehsullar[0].say).toBe(4);
  });

  it("sifarişsiz fermerdə əhatə 0-dır — uydurma ✓ yoxdur", () => {
    const plan = ekinPlani({ bitki: "pomidor", hektar: 3.8, indi: INDI });
    expect(plan.setirler.every((s) => s.ehate === 0)).toBe(true);
    expect(plan.alinanMebleg).toBe(0);
    expect(plan.qalanMebleg).toBe(plan.cemiMebleg);
  });

  it("əhatə real sifarişlərdən hesablanır, ləğv olunmuş və köhnə sifariş sayılmır", () => {
    const plan0 = ekinPlani({ bitki: "pomidor", hektar: 3.8, indi: INDI });
    const toxumLazim = plan0.setirler.find((s) => s.kateqoriya === "toxum").lazimMebleg;
    const sifarisler = [
      // Toxumu tam alıb
      { hal: "completed", tarix: "2026-08-01T00:00:00Z", setirler: [{ kateqoriya: "toxum", cemi: toxumLazim }] },
      // Gübrənin yarısı — hələ çatdırılmayıb, amma ləğv də olunmayıb
      { hal: "new", tarix: "2026-09-10T00:00:00Z", setirler: [{ kateqoriya: "gubre", cemi: 1 }] },
      // Ləğv olunub → sayılmır
      { hal: "cancelled", tarix: "2026-09-10T00:00:00Z", setirler: [{ kateqoriya: "suvarma", cemi: 9999 }] },
      // 13 ay əvvəl → pəncərədən kənar
      { hal: "completed", tarix: "2025-08-01T00:00:00Z", setirler: [{ kateqoriya: "muhafize", cemi: 9999 }] },
    ];
    const plan = ekinPlani({ bitki: "pomidor", hektar: 3.8, sifarisler, indi: INDI });
    const setir = (k) => plan.setirler.find((s) => s.kateqoriya === k);
    expect(setir("toxum").ehate).toBe(1);
    expect(setir("gubre").ehate).toBeGreaterThan(0);
    expect(setir("gubre").ehate).toBeLessThan(1);
    expect(setir("suvarma").ehate).toBe(0);
    expect(setir("muhafize").ehate).toBe(0);
    expect(plan.qalanMebleg).toBe(Math.round((plan.cemiMebleg - toxumLazim - 1) * 100) / 100);
  });

  it("əhatə 100%-i keçmir — artıq alınan qalan ehtiyacı mənfiyə salmır", () => {
    const sifarisler = [{ hal: "completed", tarix: "2026-09-01T00:00:00Z", setirler: [{ kateqoriya: "toxum", cemi: 99999 }] }];
    const plan = ekinPlani({ bitki: "pomidor", hektar: 1, sifarisler, indi: INDI });
    expect(plan.setirler.find((s) => s.kateqoriya === "toxum").ehate).toBe(1);
    expect(plan.qalanMebleg).toBeGreaterThanOrEqual(0);
  });

  it("kateqoriyaXercleri yararsız tarixi atır", () => {
    const cem = kateqoriyaXercleri([{ hal: "new", tarix: "abc", setirler: [{ kateqoriya: "gubre", cemi: 5 }] }], INDI);
    expect(cem.size).toBe(0);
  });
});
