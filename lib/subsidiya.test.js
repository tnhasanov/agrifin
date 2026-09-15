import { describe, expect, it } from "vitest";
import { GELIR_CONFIG, gelirModeli } from "./gelir.js";
import { SUBSIDIYA_QAYDALARI, muracietPenceresi, subsidiyaHesabla } from "./subsidiya.js";

describe("subsidiya — tək mənbə", () => {
  it("gəlir modeli eyni dərəcələri oxuyur (iki nüsxə yoxdur)", () => {
    expect(GELIR_CONFIG.subsidiya).toBe(SUBSIDIYA_QAYDALARI.hektarBaza);
    const model = gelirModeli({ bitki: "bugda", hektar: 10 });
    const orta = model.ssenariler.find((s) => s.ad === "orta") ?? model.ssenariler[0];
    expect(orta.subsidiya).toBe(subsidiyaHesabla({ bitki: "bugda", hektar: 10 }).cemi);
  });

  it("nümunə cədvəl təsdiqli deyil və bunu açıq deyir", () => {
    expect(SUBSIDIYA_QAYDALARI.tesdiqli).toBe(false);
    expect(subsidiyaHesabla({ bitki: "bugda", hektar: 4 }).tesdiqli).toBe(false);
  });
});

describe("subsidiyaHesabla", () => {
  it("sahə və bitki yoxdursa hesablamır", () => {
    expect(subsidiyaHesabla({}).hal).toBe("saheYoxdur");
    expect(subsidiyaHesabla({ hektar: 0, bitki: "bugda" }).hal).toBe("saheYoxdur");
    expect(subsidiyaHesabla({ hektar: 5 }).hal).toBe("bitkiYoxdur");
  });

  it("dərəcəsi olmayan bitkidə məbləğ uydurmur", () => {
    const n = subsidiyaHesabla({ bitki: "pomidor", hektar: 10 });
    expect(n.hal).toBe("dereceYoxdur");
    expect(n.cemi).toBeUndefined();
  });

  it("hektar × dərəcə, qəpik dəqiqliyi, sətir izahı ilə", () => {
    const n = subsidiyaHesabla({ bitki: "bugda", hektar: 10.02, indi: new Date("2026-11-15") });
    expect(n.hal).toBe("hazir");
    expect(n.cemi).toBe(2505);
    expect(n.setirler).toEqual([{ acar: "hektarBaza", hektar: 10.02, derece: 250, mebleg: 2505 }]);
    expect(n.pencere).toEqual({ baslangicAy: 10, sonAy: 12, hal: "acig" });
    expect(n.versiya).toBe(SUBSIDIYA_QAYDALARI.versiya);
  });
});

describe("müraciət pəncərəsi", () => {
  it("payızlıq: oktyabr–dekabr açıq, yayda gözlənilir", () => {
    expect(muracietPenceresi("bugda", new Date("2026-07-01")).hal).toBe("gozlenilir");
    expect(muracietPenceresi("bugda", new Date("2026-12-31")).hal).toBe("acig");
  });
  it("yazlıq: mart–may açıq, iyunda bağlı; pəncərəsiz bitkidə null", () => {
    expect(muracietPenceresi("pambiq", new Date("2026-04-10")).hal).toBe("acig");
    expect(muracietPenceresi("pambiq", new Date("2026-06-10")).hal).toBe("bagli");
    expect(muracietPenceresi("pomidor")).toBeNull();
  });
});
