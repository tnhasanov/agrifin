import { describe, expect, it } from "vitest";
import { esasHereket } from "./esasHereket.js";

const SAHE = { noqteler: [[40.4, 47.1], [40.41, 47.1], [40.41, 47.11]], hektar: 5 };
const AKTIV = {
  hal: "active",
  qaliqBorc: 4820,
  gecikmeGun: 0,
  gecikmisMebleg: 0,
  novbetiTarix: "2026-09-15",
  novbetiMebleg: 72,
};
const TEKLIF = { hal: "issued", mebleg: 8000 };
const MURACIET = { hal: "offer_issued" };
const TECILI = { id: "saxta:1", ciddilik: "tecili", nov: "saxta" };
const DIQQET = { id: "bitkiZeifleyir:1", ciddilik: "diqqet", nov: "bitkiZeifleyir" };
const INDI = new Date("2026-09-10T00:00:00Z");

/** Hər şeyin bir yerdə olduğu "dolu" vəziyyət — prioriteti bu sınayır */
const DOLU = {
  kredit: { ...AKTIV, gecikmeGun: 3, gecikmisMebleg: 72 },
  teklif: TEKLIF,
  muraciet: MURACIET,
  serverHal: "girisYox",
  siqnallar: [TECILI, DIQQET],
  sahe: SAHE,
  indi: INDI,
};

describe("əsas hərəkət prioriteti — determinist zəncir", () => {
  it("1: gecikmə hər şeydən üstündür", () => {
    const h = esasHereket(DOLU);
    expect(h.tip).toBe("gecikme");
    expect(h.prioritet).toBe(1);
    expect(h.hereket).toBe("odenis");
  });

  it("2: gecikmə yoxdursa təcili siqnal", () => {
    const h = esasHereket({ ...DOLU, kredit: AKTIV });
    expect(h.tip).toBe("siqnal");
    expect(h.prioritet).toBe(2);
    expect(h.siqnal).toBe(TECILI);
  });

  it("3: təcili siqnal yoxdursa bloklayan giriş addımı", () => {
    const h = esasHereket({ ...DOLU, kredit: AKTIV, siqnallar: [DIQQET] });
    expect(h.tip).toBe("giris");
    expect(h.prioritet).toBe(3);
  });

  it("4: giriş varsa baxılmamış təklif", () => {
    const h = esasHereket({ ...DOLU, kredit: null, serverHal: "hazir", siqnallar: [DIQQET] });
    expect(h.tip).toBe("teklif");
    expect(h.prioritet).toBe(4);
    expect(h.hereket).toBe("teklif");
  });

  it("5: təklif yoxdursa 7 gün içindəki ödəniş", () => {
    const h = esasHereket({
      kredit: AKTIV,
      serverHal: "hazir",
      siqnallar: [DIQQET],
      sahe: SAHE,
      indi: INDI, // son tarixə 5 gün
    });
    expect(h.tip).toBe("odenisYaxin");
    expect(h.prioritet).toBe(5);
  });

  it("5: ödənişə 7 gündən çox qalıbsa yaxın ödəniş SAYILMIR", () => {
    const h = esasHereket({
      kredit: AKTIV,
      serverHal: "hazir",
      siqnallar: [DIQQET],
      sahe: SAHE,
      indi: new Date("2026-08-20T00:00:00Z"), // 26 gün qalır
    });
    expect(h.tip).toBe("siqnal");
    expect(h.prioritet).toBe(6);
    expect(h.siqnal).toBe(DIQQET);
  });

  it("6: diqqət siqnalı adi tövsiyədir — mühərrikin ciddiliyi yenidən yazılmır", () => {
    const h = esasHereket({ serverHal: "hazir", siqnallar: [DIQQET], sahe: SAHE, indi: INDI });
    expect(h.prioritet).toBe(6);
    expect(h.siqnal.nov).toBe("bitkiZeifleyir");
  });

  it("7: sahə yoxdursa quraşdırma, hər şey boşdursa kömək", () => {
    expect(esasHereket({ serverHal: "hazir", indi: INDI }).tip).toBe("saheCek");
    expect(esasHereket({ serverHal: "hazir", sahe: SAHE, indi: INDI }).tip).toBe("komek");
  });

  it("determinizm: eyni giriş həmişə eyni nəticə", () => {
    const a = esasHereket(DOLU);
    const b = esasHereket({ ...DOLU });
    expect(a).toEqual(b);
  });

  it("bağlanmış kredit gecikmə/ödəniş hərəkəti yaratmır", () => {
    const h = esasHereket({
      kredit: { ...AKTIV, hal: "repaid", gecikmeGun: 3 },
      serverHal: "hazir",
      sahe: SAHE,
      indi: INDI,
    });
    expect(h.tip).toBe("komek");
  });

  it("girişsiz, sahəsiz fermer üçün giriş bloklayıcı deyil — əvvəl sahə", () => {
    const h = esasHereket({ serverHal: "girisYox", indi: INDI });
    expect(h.tip).toBe("saheCek");
  });

  // Hava siqnalları rayon üzrə gəlir və sahəsiz də mövcuddur — amma
  // "Sahəyə bax" CTA-sı sahəsiz fermeri boşluğa aparır. Hal A-da pano
  // BİR dəvət göstərir; siqnallar zəngdə qalır.
  it("sahə yoxdursa siqnal pilləri (2 və 6) işləmir — dəvət üstündür", () => {
    const tecili = esasHereket({ serverHal: "hazir", siqnallar: [TECILI], indi: INDI });
    expect(tecili.tip).toBe("saheCek");
    const adi = esasHereket({ serverHal: "hazir", siqnallar: [DIQQET], indi: INDI });
    expect(adi.tip).toBe("saheCek");
  });
});
