import { describe, expect, it } from "vitest";
import { PLANLI_BITKILER, TESDIQ, ekinPlani, kateqoriyaXercleri, mehsulSaylari } from "./tovsiye.js";
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

  // Sifariş sətri API-də həm kateqoriyanı, həm MƏHSUL KODUNU və SAYI daşıyır
  // (api/bazar.js → setirler[]). Əhatə məhz koddan və saydan hesablanır.
  const sifaris = (hal, tarix, setirler) => ({ hal, tarix, setirler });
  const setir = (kod, say, kateqoriya, cemi = 0) => ({ kod, say, kateqoriya, cemi });

  it("əhatə real sifarişlərdən hesablanır, ləğv olunmuş və köhnə sifariş sayılmır", () => {
    const plan0 = ekinPlani({ bitki: "pomidor", hektar: 3.8, indi: INDI });
    const toxum0 = plan0.setirler.find((s) => s.kateqoriya === "toxum").mehsullar[0];
    const gubre0 = plan0.setirler.find((s) => s.kateqoriya === "gubre").mehsullar[0];

    const sifarisler = [
      sifaris("completed", "2026-08-01T00:00:00Z", [setir(toxum0.kod, toxum0.say, "toxum")]),
      // Gübrədən yalnız bir vahid — hələ çatdırılmayıb, amma ləğv də olunmayıb
      sifaris("new", "2026-09-10T00:00:00Z", [setir(gubre0.kod, 1, "gubre")]),
      // Ləğv olunub → sayılmır
      sifaris("cancelled", "2026-09-10T00:00:00Z", [setir("damci-lenti-1000m", 999, "suvarma")]),
      // 13 ay əvvəl → pəncərədən kənar
      sifaris("completed", "2025-08-01T00:00:00Z", [setir("fungisid-mis-1kq", 999, "muhafize")]),
    ];
    const plan = ekinPlani({ bitki: "pomidor", hektar: 3.8, sifarisler, indi: INDI });
    const s = (k) => plan.setirler.find((x) => x.kateqoriya === k);
    expect(s("toxum").ehate).toBe(1);
    expect(s("gubre").ehate).toBeGreaterThan(0);
    expect(s("gubre").ehate).toBeLessThan(1);
    expect(s("suvarma").ehate).toBe(0);
    expect(s("muhafize").ehate).toBe(0);
  });

  it("əhatə 100%-i keçmir — artıq alınan qalan ehtiyacı mənfiyə salmır", () => {
    const plan0 = ekinPlani({ bitki: "pomidor", hektar: 1, indi: INDI });
    const toxum0 = plan0.setirler.find((s) => s.kateqoriya === "toxum").mehsullar[0];
    const sifarisler = [sifaris("completed", "2026-09-01T00:00:00Z", [setir(toxum0.kod, 9999, "toxum")])];
    const plan = ekinPlani({ bitki: "pomidor", hektar: 1, sifarisler, indi: INDI });
    const toxum = plan.setirler.find((s) => s.kateqoriya === "toxum");
    expect(toxum.ehate).toBe(1);
    expect(toxum.mehsullar[0].qalanSay).toBe(0);
    expect(plan.qalanMebleg).toBeGreaterThanOrEqual(0);
  });

  // ═══ QÜSURUN QORUMASI ═══════════════════════════════════════════════
  // Əvvəl "qalanları səbətə əlavə et" düyməsi planın TAM miqdarını əlavə
  // edirdi, üzərində isə qalan MƏBLƏĞ yazılırdı. İki ayrı ölçü vahidi
  // (kateqoriya üzrə məbləğ vs məhsul üzrə miqdar) heç vaxt üst-üstə
  // düşmürdü: 90% qarşılanmış kateqoriya da tam yenidən səbətə düşürdü.
  // Aşağıdakı iki test həmin uyğunsuzluğu STRUKTUR olaraq bağlayır.
  it("qalanSay = plan − alınan, hər məhsul üçün ayrıca", () => {
    const plan0 = ekinPlani({ bitki: "pomidor", hektar: 3.8, indi: INDI });
    const gubre0 = plan0.setirler.find((s) => s.kateqoriya === "gubre").mehsullar[0];
    const alinan = 5;
    expect(gubre0.say).toBeGreaterThan(alinan);

    const plan = ekinPlani({
      bitki: "pomidor",
      hektar: 3.8,
      sifarisler: [sifaris("completed", "2026-09-01T00:00:00Z", [setir(gubre0.kod, alinan, "gubre")])],
      indi: INDI,
    });
    const gubre = plan.setirler.find((s) => s.kateqoriya === "gubre").mehsullar[0];
    expect(gubre.say).toBe(gubre0.say);
    expect(gubre.alinanSay).toBe(alinan);
    expect(gubre.qalanSay).toBe(gubre0.say - alinan);
    // Eyni kateqoriyadakı DİGƏR məhsula toxunmur — əhatə məhsul səviyyəsindədir
    const digeri = plan.setirler.find((s) => s.kateqoriya === "gubre").mehsullar[1];
    if (digeri) expect(digeri.qalanSay).toBe(digeri.say);
  });

  it("qalan məbləğ qalan MİQDARLARIN məbləğinə bərabərdir (etiket = əməl)", () => {
    const plan0 = ekinPlani({ bitki: "pomidor", hektar: 3.8, indi: INDI });
    const gubre0 = plan0.setirler.find((s) => s.kateqoriya === "gubre").mehsullar[0];
    const plan = ekinPlani({
      bitki: "pomidor",
      hektar: 3.8,
      sifarisler: [sifaris("completed", "2026-09-01T00:00:00Z", [setir(gubre0.kod, 5, "gubre")])],
      indi: INDI,
    });

    // Düymənin üzərindəki rəqəm budur; səbətə düşən də məhz qalanSay-lardır
    const mehsullar = plan.setirler.flatMap((s) => s.mehsullar);
    const elden = mehsullar.reduce((c, m) => c + mehsulTap(m.kod).qiymet * m.qalanSay, 0);
    expect(plan.qalanMebleg).toBeCloseTo(elden, 2);
    expect(mehsullar.reduce((c, m) => c + m.qalanCemi, 0)).toBeCloseTo(plan.qalanMebleg, 2);
    expect(plan.alinanMebleg + plan.qalanMebleg).toBeCloseTo(plan.cemiMebleg, 2);
  });

  it("kateqoriyaXercleri yararsız tarixi atır", () => {
    const cem = kateqoriyaXercleri([{ hal: "new", tarix: "abc", setirler: [{ kateqoriya: "gubre", cemi: 5 }] }], INDI);
    expect(cem.size).toBe(0);
  });

  it("mehsulSaylari ləğv olunmuş sifarişi saymır", () => {
    const setirler = [setir("karbamid-46-50kq", 3, "gubre")];
    expect(mehsulSaylari([sifaris("completed", "2026-09-01T00:00:00Z", setirler)], INDI).get("karbamid-46-50kq")).toBe(3);
    expect(mehsulSaylari([sifaris("cancelled", "2026-09-01T00:00:00Z", setirler)], INDI).size).toBe(0);
  });
});
