import { describe, expect, it } from "vitest";
import { hesabatMelumati, koordinatMetni, movsumSetirleri } from "./hesabatMelumati.js";

// Bərdə yaxınlığında təxminən 4 ha-lıq düzbucaq
const KONTUR = [
  [40.4, 47.1],
  [40.4, 47.1024],
  [40.4018, 47.1024],
  [40.4018, 47.1],
];

const XULASE = {
  ndvi: 0.68,
  istiqamet: "artir",
  suSeviyyesi: "kafi",
  nemlik: 0.22,
  ortulu: 0.05,
  tarix: "2026-08-30",
};

const ESAS = {
  sahe: { noqteler: KONTUR, hektar: 999 },
  bitkiKey: "pomidor",
  location: { name: "Bərdə (GPS)" },
  hesab: { telefon: "+994501234567" },
  fermerAdi: "Samir",
  peyk: {
    hal: "hazir",
    xulase: XULASE,
    seriya: [
      { son: "2026-08-20", ndvi: 0.64 },
      { son: "2026-08-30", ndvi: 0.68 },
    ],
  },
  indi: new Date("2026-09-01T09:00:00Z"),
};

describe("koordinatMetni", () => {
  it("konturun mərkəzini beş onluqla verir", () => {
    expect(koordinatMetni(KONTUR)).toBe("40.40090, 47.10120");
  });

  it("üç nöqtədən az kontur ünvan vermir", () => {
    expect(koordinatMetni([[40.4, 47.1]])).toBeNull();
    expect(koordinatMetni(null)).toBeNull();
  });
});

describe("movsumSetirleri", () => {
  it("ölçülməmiş ili cədvəldən çıxarır — sıfır kimi göstərmir", () => {
    const setirler = movsumSetirleri(
      [
        { il: 2024, zirve: 0.7 },
        { il: 2025, zirve: null },
      ],
      2026,
    );
    expect(setirler.map((s) => s.il)).toEqual([2024]);
  });

  it("keçmiş ilin aşağı zirvəsi boş, cari ilinki isə davam edən sayılır", () => {
    const setirler = movsumSetirleri(
      [
        { il: 2024, zirve: 0.1 },
        { il: 2026, zirve: 0.1 },
      ],
      2026,
    );
    expect(setirler[0]).toMatchObject({ il: 2024, bos: true, davamEdir: false });
    expect(setirler[1]).toMatchObject({ il: 2026, bos: false, davamEdir: true });
  });
});

describe("hesabatMelumati — kimlik", () => {
  it("fermerin adı, telefonu, rayonu və sahənin mərkəzi sənədə düşür", () => {
    const m = hesabatMelumati(ESAS);
    expect(m.fermer).toEqual({
      ad: "Samir",
      telefon: "+994501234567",
      rayon: "Bərdə",
      koordinat: "40.40090, 47.10120",
    });
  });

  it("hektar SAXLANMIŞ dəyərdən deyil, konturdan yenidən hesablanır", () => {
    const m = hesabatMelumati(ESAS);
    expect(m.sahe.hektar).not.toBe(999);
    expect(m.sahe.hektar).toBeGreaterThan(3);
    expect(m.sahe.hektar).toBeLessThan(5);
  });

  it("kontur yoxdursa saxlanmış hektara qayıdır", () => {
    const m = hesabatMelumati({ ...ESAS, sahe: { hektar: 12 } });
    expect(m.sahe.hektar).toBe(12);
    expect(m.fermer.koordinat).toBeNull();
  });
});

describe("hesabatMelumati — ölçülən və hesablanan ayrılığı", () => {
  it("peyk xülasəsi olduğu kimi ölçülən bölməsinə düşür", () => {
    const m = hesabatMelumati(ESAS);
    expect(m.olculen).toMatchObject({
      ndvi: 0.68,
      suSeviyyesi: "kafi",
      tarix: "2026-08-30",
      olcmeSayi: 2,
    });
    expect(m.olculen.faiz).toBeGreaterThan(0);
  });

  it("gəlir yalnız hesablama hazır olanda düşür və modelin halı ilə gəlir", () => {
    const kredit = {
      gelir: {
        hal: "hazir",
        baza: { xalisGelir: 145300, xerc: 65000 },
        pessimist: { xalisGelir: 59950 },
        optimist: { xalisGelir: 200650 },
        ferziyyeler: [
          { acar: "mehsuldarliq", deyer: 38, vahid: "t/ha" },
          { acar: "qiymet", deyer: 620, vahid: "₼/t" },
        ],
        yoxlanilib: false,
      },
    };
    const m = hesabatMelumati({ ...ESAS, kredit });
    expect(m.gelir).toMatchObject({ baza: 145300, xerc: 65000 });
    expect(m.gelir.mehsuldarliq.deyer).toBe(38);
    // Kalibrlənməmiş model sənəddə gizlədilmir
    expect(m.gelir.model.kalibrlenib).toBe(false);
  });

  it("gəlir hesablanmayıbsa sənəddə gəlir bölməsi olmur", () => {
    const m = hesabatMelumati({ ...ESAS, kredit: { gelir: { hal: "yoxdur" } } });
    expect(m.gelir).toBeNull();
  });
});

describe("hesabatMelumati — kredit", () => {
  const AKTIV = {
    kredit: {
      hal: "active",
      qaliqBorc: 4748,
      esasBorc: 4800,
      illikFaiz: 11.5,
      novbetiTarix: "2026-09-15",
      novbetiMebleg: 45,
    },
  };

  it("yalnız serverdə aktiv kredit varsa göstərilir", () => {
    const m = hesabatMelumati({ ...ESAS, kreditHali: AKTIV });
    expect(m.kredit).toMatchObject({ qaliqBorc: 4748, gecikmeGun: 0 });
  });

  it("təklif (hesablanmış tavan) sənədə borc kimi düşmür", () => {
    const m = hesabatMelumati({
      ...ESAS,
      kredit: { mebleg: 8000 },
      kreditHali: { kredit: { hal: "none" } },
    });
    expect(m.kredit).toBeNull();
  });
});

describe("hesabatMelumati — boş hallar", () => {
  it("ölçmə yoxdursa sahələr null qalır, funksiya partlamır", () => {
    const m = hesabatMelumati();
    expect(m.olculen.ndvi).toBeNull();
    expect(m.olculen.movsumler).toEqual([]);
    expect(m.bal).toBeNull();
    expect(m.muqayise).toBeNull();
    expect(m.sahe.noqteSayi).toBe(0);
  });

  it("yaradılma vaxtı ISO formatındadır — sənəddə tarix var", () => {
    const m = hesabatMelumati(ESAS);
    expect(m.yaradilib).toBe("2026-09-01T09:00:00.000Z");
  });
});
