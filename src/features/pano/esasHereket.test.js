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

describe("server cavabı gəlməyəndə sakitlik VƏD EDİLMİR", () => {
  // Ən təhlükəli yalan: gecikmiş borcalan "Hər şey qaydasındadır" oxuyur,
  // çünki kredit cavabı hələ gəlməyib və ya şəbəkə qırılıb.
  it("yüklənir: kömək əvəzinə yüklənmə halı, CTA yoxdur", () => {
    const h = esasHereket({ serverHal: "yuklenir", sahe: SAHE, indi: INDI });
    expect(h.tip).toBe("yuklenir");
    expect(h.basliqKey).not.toBe("hereket.komek.basliq");
    expect(h.ctaKey).toBeNull();
  });

  it("xəta: açıq deyilir və təkrar cəhd təklif olunur", () => {
    const h = esasHereket({ serverHal: "xeta", sahe: SAHE, indi: INDI });
    expect(h.tip).toBe("xeta");
    expect(h.hereket).toBe("yenile");
  });

  // 501 = kredit modulu qurulmayıb: gözləniləsi borc da yoxdur, sükut düzdür
  it("qurulmayıb: kömək halı düzgündür", () => {
    const h = esasHereket({ serverHal: "qurulmayib", sahe: SAHE, indi: INDI });
    expect(h.tip).toBe("komek");
  });

  // Sahə xəbərdarlığı kredit cavabından ASILI DEYİL — yüklənmə onu udmur
  it("yüklənmə təcili sahə siqnalını udmur", () => {
    const h = esasHereket({
      serverHal: "yuklenir",
      siqnallar: [{ id: "suGolu:1", nov: "suGolu", ciddilik: "tecili" }],
      sahe: SAHE,
      indi: INDI,
    });
    expect(h.prioritet).toBe(2);
  });
});

describe("ödəniş günü boşluğu", () => {
  // Son tarix günü: DPD hələ 0-dır (floor(0 gün)), amma məbləğ artıq
  // ödənilməlidir. Əvvəl nə 1-ci, nə 5-ci pillə işləmirdi — fermer məhz
  // ödəniş günü "Hər şey qaydasındadır" oxuyurdu.
  it("son tarix günü: 'vaxtı çatıb' halı, sükut yox", () => {
    const h = esasHereket({
      kredit: { ...AKTIV, gecikmeGun: 0, gecikmisMebleg: 72, novbetiTarix: "2026-09-15" },
      serverHal: "hazir",
      sahe: SAHE,
      indi: new Date("2026-09-15T09:00:00Z"),
    });
    expect(h.tip).toBe("gecikme");
    expect(h.prioritet).toBe(1);
    expect(h.basliqKey).toBe("hereket.gecikme.basliqBuGun");
  });

  it("gecikmə günü varsa gecikmə mətni işlədilir", () => {
    const h = esasHereket({
      kredit: { ...AKTIV, gecikmeGun: 3, gecikmisMebleg: 72 },
      serverHal: "hazir",
      sahe: SAHE,
      indi: INDI,
    });
    expect(h.basliqKey).toBe("hereket.gecikme.basliq");
  });

  // Son tarix günü heç nə borclu deyilsə (məs. faiz artıq ödənilib) ödəniş
  // pəncərəsi yenə də günü ƏHATƏ EDİR — "sabaha qalıb" demək yanlışdır
  it("son tarix günü borc yoxdursa yaxın ödəniş pilləsi işləyir", () => {
    const h = esasHereket({
      kredit: { ...AKTIV, novbetiTarix: "2026-09-15" },
      serverHal: "hazir",
      sahe: SAHE,
      indi: new Date("2026-09-15T20:00:00Z"),
    });
    expect(h.tip).toBe("odenisYaxin");
  });

  // Tarix ISO kimi ötürülür, amma AYRICA sahədə — kart onu formatlayır
  it("ödəniş tarixi vars-a ISO kimi yazılmır", () => {
    const h = esasHereket({
      kredit: AKTIV,
      serverHal: "hazir",
      sahe: SAHE,
      indi: INDI,
    });
    expect(h.vars.tarix).toBeUndefined();
    expect(h.tarix).toBe("2026-09-15");
  });
});

describe("siqnal marşrutu", () => {
  // Hava siqnalı Sahələr ekranında GÖRÜNMÜR — ora göndərmək fermeri
  // "Sahə yaxşı vəziyyətdədir" yazısının qarşısına çıxarardı
  it("sahə siqnalı Sahələrə, hava siqnalı siyahıya aparır", () => {
    const sahede = esasHereket({
      serverHal: "hazir",
      siqnallar: [{ id: "suGolu:1", nov: "suGolu", ciddilik: "tecili" }],
      sahe: SAHE,
      indi: INDI,
    });
    expect(sahede.hereket).toBe("sahe");
    expect(sahede.ctaKey).toBe("hereket.siqnal.cta");

    const hava = esasHereket({
      serverHal: "hazir",
      siqnallar: [{ id: "saxta:1", nov: "saxta", ciddilik: "tecili" }],
      sahe: SAHE,
      indi: INDI,
    });
    expect(hava.hereket).toBe("siqnalSiyahi");
    expect(hava.ctaKey).toBe("hereket.siqnal.ctaSiyahi");
  });

  // "melumat" səviyyəsi bir nömrəli iş deyil (ölçmə köhnəlib və s.)
  it("məlumat siqnalı 6-cı pilləni tutmur", () => {
    const h = esasHereket({
      serverHal: "hazir",
      siqnallar: [{ id: "olcmeKohne:1", nov: "olcmeKohne", ciddilik: "melumat" }],
      sahe: SAHE,
      indi: INDI,
    });
    expect(h.tip).toBe("komek");
  });
});
