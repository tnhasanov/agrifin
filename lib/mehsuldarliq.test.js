import { describe, expect, it } from "vitest";
import {
  BANTLAR,
  CARI_RISK,
  CEDVEL,
  EKIN_HEDDI,
  MIN_MOVSUM,
  SCORE_CONFIG,
  TESDIQ,
  amillerCixar,
  cariVeziyyetHali,
  deyiskenlik,
  egriAltiSahe,
  kenarlasma,
  medyan,
  mehsuldarliqIndeksi,
  melumatKeyfiyyeti,
  meylEmsali,
} from "./mehsuldarliq.js";

/** n mövsümlük tarixçə: hər il zirvə + ətraf medianı */
const tarixce = (zirveler, etraf = 0.55) =>
  zirveler.map((zirve, i) => ({ il: 2018 + i, zirve, etrafMedyan: etraf }));

/** Ətraf medianı olmayan tarixçə */
const etrafsiz = (zirveler) => zirveler.map((zirve, i) => ({ il: 2018 + i, zirve }));

const setir = (netice, id) => netice.setirler.find((s) => s.id === id);
const xal = (netice, id) => setir(netice, id).xal;

describe("cədvəlin quruluşu", () => {
  it("çəkilər tam 100-dür və heç bir amil 30%-i keçmir", () => {
    expect(CEDVEL.reduce((c, a) => c + a.maxXal, 0)).toBe(100);
    for (const amil of CEDVEL) {
      expect(amil.maxXal, amil.id).toBeLessThanOrEqual(30);
      expect(amil.maxXal, amil.id).toBeGreaterThan(0);
    }
  });

  it("gözlənilən çəki bölgüsünü saxlayır", () => {
    expect(Object.fromEntries(CEDVEL.map((a) => [a.id, a.maxXal]))).toEqual({
      davamliliq: 15,
      nisbiPerformans: 30,
      vegetasiya: 20,
      sabitlik: 15,
      sonMeyl: 10,
      cariVeziyyet: 10,
    });
  });

  it("hər bantın səbəb kodu var — bal görünürsə səbəb də görünməlidir", () => {
    for (const amil of CEDVEL) {
      const cedveller = Array.isArray(amil.bantlar) ? [amil.bantlar] : Object.values(amil.bantlar);
      for (const bantlar of cedveller) {
        for (const bant of bantlar) expect(bant.sebeb, amil.id).toBeTruthy();
      }
    }
  });

  // Hədlər ekspert təklifidir — ekran bunu deməlidir
  it("təsdiq vəziyyəti açıq saxlanılır", () => {
    expect(TESDIQ.aqronom).toBe(false);
    expect(TESDIQ.kreditMutexessisi).toBe(false);
    expect(TESDIQ.qeyd).toMatch(/kalibrlənməyib/);
  });

  it("bantlar 0–100 aralığını tam örtür", () => {
    expect(BANTLAR.map((b) => b.hedd)).toEqual([80, 60, 40, 0]);
  });
});

describe("statistik köməkçilər", () => {
  it("dəyişkənliyi nisbi, kənarlaşmanı mütləq hesablayır", () => {
    expect(deyiskenlik([0.7, 0.7, 0.7])).toBeCloseTo(0, 10);
    expect(deyiskenlik([0.7])).toBeNull();
    expect(kenarlasma([0.1, 0.1, 0.1])).toBeCloseTo(0, 10);
    expect(kenarlasma([0, 0.2])).toBeCloseTo(0.1, 10);
  });

  it("medianı verir", () => {
    expect(medyan([0.5, 0.9, 0.7])).toBe(0.7);
    expect(medyan([0.4, 0.6])).toBeCloseTo(0.5, 10);
    expect(medyan([])).toBeNull();
  });

  it("meyli mövsüm başına verir", () => {
    expect(meylEmsali([0.5, 0.6, 0.7])).toBeCloseTo(0.1, 5);
    expect(meylEmsali([0.7, 0.6, 0.5])).toBeCloseTo(-0.1, 5);
    expect(meylEmsali([0.6, 0.6])).toBeNull();
  });

  // Vegetasiya amilinin bütün mənası budur: zirvə tək başına aldadıcıdır
  it("əyri altı sahə uzun vegetasiyanı yüksək zirvədən üstün tutur", () => {
    const dolu = egriAltiSahe([0.2, 0.35, 0.55, 0.75, 0.7, 0.5]);
    const sivri = egriAltiSahe([0.2, 0.25, 0.3, 0.76, 0.3, 0.2]);
    expect(sivri).toBeLessThan(dolu);
    // Sivri əyrinin zirvəsi daha yüksəkdir — buna baxmayaraq balı aşağıdır
    expect(0.76).toBeGreaterThan(0.75);
    expect(egriAltiSahe([0.5, 0.5])).toBeNull();
  });
});

// ═══ 1. MƏLUMAT KEYFİYYƏTİ QAPISI ═══════════════════════════════════

describe("məlumat keyfiyyəti qapısı", () => {
  it("1 mövsüm — bal və bant verilmir", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: tarixce([0.75]) });
    expect(netice.hal).toBe("kifayetsiz");
    expect(netice.bal).toBeNull();
    expect(netice.bant).toBeNull();
    expect(netice.etibar).toBeNull();
    expect(netice.keyfiyyet.olculebilenMovsum).toBe(1);
  });

  it("2 mövsüm — hələ də bal verilmir", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: tarixce([0.75, 0.78]) });
    expect(netice.hal).toBe("kifayetsiz");
    expect(netice.bal).toBeNull();
    expect(netice.bant).toBeNull();
  });

  // Köhnə davranışın həqiqi qüsuru: bir mövsümdən "94 / Yüksək" çıxırdı
  it("bir güclü mövsüm yüksək bant yarada bilmir", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: [{ il: 2025, zirve: 0.85, etrafMedyan: 0.5 }],
      cari: { ndvi: 0.85, etrafMedyan: 0.5 },
    });
    expect(netice.bal).toBeNull();
    expect(netice.bant).toBeNull();
  });

  it("3 mövsüm — bal verilir, etibar 'ilkin'", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.71, 0.72], 0.6) });
    expect(netice.hal).toBe("hazir");
    expect(netice.bal).toBeGreaterThan(0);
    expect(netice.etibar).toBe("ilkin");
  });

  it("5–7 mövsüm — etibar 'orta'", () => {
    expect(mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7, 0.7, 0.7], 0.6) }).etibar).toBe(
      "orta",
    );
    expect(
      mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7], 0.6) }).etibar,
    ).toBe("orta");
  });

  it("8+ mövsüm — etibar 'yuksek'", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71, 0.73, 0.74, 0.75, 0.76, 0.77], 0.6),
    });
    expect(netice.etibar).toBe("yuksek");
  });

  // Etibar BALDAN AYRIDIR: az mövsüm cəza deyil, "az bilirik" xəbərdarlığıdır
  it("etibar bala xal əlavə etmir və çıxmır", () => {
    const uc = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7], 0.6) });
    const sekkiz = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7], 0.6),
    });
    expect(uc.etibar).not.toBe(sekkiz.etibar);
    // Eyni göstəricilər → eyni bal; fərq yalnız etibardadır
    expect(uc.bal).toBe(sekkiz.bal);
  });

  it("keyfiyyət hesabatı bütün ölçüləri sadalayır", () => {
    const keyfiyyet = melumatKeyfiyyeti({
      movsumler: [
        { il: 2023, zirve: 0.7, etrafMedyan: 0.6, olcmeSayi: 6 },
        { il: 2024, zirve: 0.1, olcmeSayi: 5 },
        { il: 2025, zirve: 0.72, etrafMedyan: 0.6, olcmeSayi: 7 },
      ],
      cari: { ndvi: 0.7, etrafMedyan: 0.6 },
    });
    expect(keyfiyyet).toMatchObject({
      olculebilenMovsum: 3,
      ekilmisMovsum: 2,
      muqayiseliMovsum: 2,
      muqayiseVar: true,
      cariVar: true,
      temizOlcme: 6,
      kifayet: true,
      etibar: "ilkin",
    });
  });

  it("ölçmə sayı bilinmirsə uydurulmur", () => {
    expect(melumatKeyfiyyeti({ movsumler: tarixce([0.7, 0.7, 0.7]) }).temizOlcme).toBeNull();
  });

  it("ölçülə bilən mövsüm yoxdursa null qaytarır", () => {
    expect(mehsuldarliqIndeksi({ movsumler: [] })).toBeNull();
    expect(mehsuldarliqIndeksi({})).toBeNull();
    expect(mehsuldarliqIndeksi({ movsumler: [{ il: 2025, zirve: null }] })).toBeNull();
  });
});

// ═══ 2. NATAMAM MƏLUMAT 100-Ə MİQYASLANMIR ══════════════════════════

describe("natamam məlumat", () => {
  // ƏSAS QÜSUR: köhnə cədvəl ölçülməyən amili məxrəcdən çıxarıb qalanı
  // 100-ə miqyaslayırdı — mənfi məlumatın olmaması balı qaldırırdı
  it("ölçülməyən amillər süni yüksək bal yarada bilmir", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: etrafsiz([0.8, 0.82, 0.81, 0.83]) });
    // Ətraf yoxdur → nisbi performans (30) və cari (10) ölçülmür
    expect(xal(netice, "nisbiPerformans")).toBeNull();
    expect(xal(netice, "cariVeziyyet")).toBeNull();
    expect(netice.elcatanXal).toBe(60);
    expect(netice.bal).toBeLessThanOrEqual(60);
    expect(netice.natamam).toBe(true);
  });

  it("kritik məlumat yoxdursa bant göstərilmir", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: etrafsiz([0.8, 0.82, 0.81, 0.83]) });
    expect(netice.bant).toBeNull();
    expect(netice.bantYoxdurSebebi).toBe("muqayiseYoxdur");
    // Bal yenə hesablanır — sadəcə ona ad verilmir
    expect(netice.bal).toBeGreaterThan(0);
  });

  it("tam məlumatlı sahə natamam kimi işarələnmir", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71, 0.73], 0.6),
      cari: { ndvi: 0.74, etrafMedyan: 0.6 },
    });
    expect(netice.elcatanXal).toBe(100);
    expect(netice.natamam).toBe(false);
    expect(netice.bant).not.toBeNull();
  });

  it("hansı amillərin ölçülmədiyini açıq göstərir", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: etrafsiz([0.8, 0.82, 0.81]) });
    const olculmeyen = netice.setirler.filter((s) => !s.olculub).map((s) => s.id);
    expect(olculmeyen).toContain("nisbiPerformans");
    expect(olculmeyen).toContain("cariVeziyyet");
    for (const s of netice.setirler) {
      expect(typeof s.olculub).toBe("boolean");
      expect(s.maxXal).toBeGreaterThan(0);
    }
  });

  it("məlumatı seyrək sahə tam məlumatlı güclü sahədən yüksək ola bilmir", () => {
    const seyrek = mehsuldarliqIndeksi({ movsumler: etrafsiz([0.85, 0.86, 0.87, 0.88]) });
    const tam = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71, 0.73], 0.6),
      cari: { ndvi: 0.74, etrafMedyan: 0.6 },
    });
    expect(seyrek.bal).toBeLessThan(tam.bal);
  });
});

// ═══ 3. AMİLLƏR ═════════════════════════════════════════════════════

describe("F1 — əkin davamlılığı", () => {
  it("əkilmiş mövsümlərin payını verir", () => {
    const a = amillerCixar(tarixce([0.7, 0.72, 0.1, 0.71]));
    expect(a.davamliliq.deger).toBe(0.75);
    expect(a.movsumSayi).toBe(4);
  });

  it("daha çox həqiqi əkin davamlılıq xalını azalda bilmir", () => {
    const xallar = [
      [0.1, 0.1, 0.1, 0.7, 0.7],
      [0.1, 0.1, 0.7, 0.7, 0.7],
      [0.1, 0.7, 0.7, 0.7, 0.7],
      [0.7, 0.7, 0.7, 0.7, 0.7],
    ].map((z) => xal(mehsuldarliqIndeksi({ movsumler: tarixce(z, 0.6) }), "davamliliq"));

    for (let i = 1; i < xallar.length; i += 1) {
      expect(xallar[i], `${i}`).toBeGreaterThanOrEqual(xallar[i - 1]);
    }
    expect(xallar[xallar.length - 1]).toBe(15);
  });

  it("ümumi bal da davamlılıqla azalmır", () => {
    const ballar = [
      [0.1, 0.1, 0.1, 0.7, 0.7],
      [0.1, 0.1, 0.7, 0.7, 0.7],
      [0.1, 0.7, 0.7, 0.7, 0.7],
      [0.7, 0.7, 0.7, 0.7, 0.7],
    ].map((z) => mehsuldarliqIndeksi({ movsumler: tarixce(z, 0.6) }).bal);
    for (let i = 1; i < ballar.length; i += 1) {
      expect(ballar[i], `${i}`).toBeGreaterThanOrEqual(ballar[i - 1]);
    }
  });
});

describe("F2 — nisbi aqronomik performans", () => {
  it("ətrafdan yuxarı mövsümlərin payını verir", () => {
    const movsumler = [
      { il: 2023, zirve: 0.7, etrafMedyan: 0.6 },
      { il: 2024, zirve: 0.5, etrafMedyan: 0.6 },
      { il: 2025, zirve: 0.72, etrafMedyan: 0.6 },
      { il: 2026, zirve: 0.68, etrafMedyan: 0.6 },
    ];
    expect(amillerCixar(movsumler).nisbiPerformans.deger).toBe(0.75);
  });

  it("daha güclü nisbi performans xalı azalda bilmir", () => {
    const xallar = [0.9, 0.75, 0.6, 0.45].map((etraf) =>
      xal(mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7, 0.7], etraf) }), "nisbiPerformans"),
    );
    for (let i = 1; i < xallar.length; i += 1) {
      expect(xallar[i]).toBeGreaterThanOrEqual(xallar[i - 1]);
    }
  });

  it("proxy olduğu açıq işarələnir — həmyaş qrupu iddiası yoxdur", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7], 0.6) });
    expect(setir(netice, "nisbiPerformans").metodologiya).toBe("proxy-yerli-etraf");
  });

  it("ölçülməyibsə sıfır yox, null verir", () => {
    expect(amillerCixar(etrafsiz([0.7, 0.7, 0.7])).nisbiPerformans.deger).toBeNull();
  });
});

describe("F3 — mövsümi vegetasiya keyfiyyəti", () => {
  it("aylıq seriya yoxdursa zirvə proxy-si işlədilir və işarələnir", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.72, 0.71], 0.6) });
    expect(setir(netice, "vegetasiya").metodologiya).toBe("zirveProxy");
  });

  it("aylıq seriya varsa həqiqi AUC-yə keçir", () => {
    const aylarla = [0, 1, 2].map((i) => ({
      il: 2023 + i,
      zirve: 0.75,
      etrafMedyan: 0.6,
      aylar: [0.2, 0.35, 0.55, 0.75, 0.7, 0.5],
    }));
    const netice = mehsuldarliqIndeksi({ movsumler: aylarla });
    expect(setir(netice, "vegetasiya").metodologiya).toBe("auc");
  });

  // Bu amilin varlıq səbəbi: eyni zirvə, fərqli mövsüm keyfiyyəti
  it("uzun vegetasiya dövrü sivri zirvədən yüksək xal alır", () => {
    const qur = (aylar, zirve) =>
      [0, 1, 2].map((i) => ({ il: 2023 + i, zirve, etrafMedyan: 0.6, aylar }));

    const dolu = mehsuldarliqIndeksi({
      movsumler: qur([0.2, 0.35, 0.55, 0.75, 0.7, 0.5], 0.75),
    });
    const sivri = mehsuldarliqIndeksi({
      movsumler: qur([0.2, 0.25, 0.3, 0.76, 0.3, 0.2], 0.76),
    });
    expect(xal(dolu, "vegetasiya")).toBeGreaterThan(xal(sivri, "vegetasiya"));
  });

  it("güclü vegetasiya xalı azalda bilmir", () => {
    const xallar = [0.4, 0.5, 0.6, 0.7, 0.8].map((z) =>
      xal(mehsuldarliqIndeksi({ movsumler: tarixce([z, z, z], 0.3) }), "vegetasiya"),
    );
    for (let i = 1; i < xallar.length; i += 1) {
      expect(xallar[i]).toBeGreaterThanOrEqual(xallar[i - 1]);
    }
  });
});

describe("F4 — performans sabitliyi", () => {
  it("davamlı güclü nisbi performans qeyri-sabitdən yüksək xal alır", () => {
    const sabit = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.71, 0.7, 0.71, 0.7], 0.6),
    });
    const dalgali = mehsuldarliqIndeksi({
      movsumler: tarixce([0.62, 0.85, 0.63, 0.86, 0.62], 0.6),
    });
    // Hər ikisi ətrafdan yuxarıdır — fərq YALNIZ sabitlikdədir
    expect(xal(sabit, "nisbiPerformans")).toBe(xal(dalgali, "nisbiPerformans"));
    expect(xal(sabit, "sabitlik")).toBeGreaterThan(xal(dalgali, "sabitlik"));
  });

  it("nisbi tarixçə varsa xam NDVI-yə baxmır", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7, 0.7], 0.6) });
    expect(setir(netice, "sabitlik").metodologiya).toBe("nisbi");
  });

  // Növbəli əkin xam NDVI-ni təbii dəyişir: bunu "qeyri-sabitlik" saymaq
  // səhvdir. Nisbi mövqe sabit qalırsa sahə sabitdir.
  it("bitki növbəsi nisbi mövqe sabit qalanda cəzalandırılmır", () => {
    // Buğda → pambıq → buğda: zirvə dəyişir, amma ətraf da eyni cür dəyişir
    const novbeli = mehsuldarliqIndeksi({
      movsumler: [
        { il: 2022, zirve: 0.8, etrafMedyan: 0.7 },
        { il: 2023, zirve: 0.55, etrafMedyan: 0.45 },
        { il: 2024, zirve: 0.8, etrafMedyan: 0.7 },
        { il: 2025, zirve: 0.56, etrafMedyan: 0.46 },
      ],
    });
    expect(xal(novbeli, "sabitlik")).toBe(SCORE_CONFIG.sabitlik.maxXal);
  });

  it("nisbi tarixçə yoxdursa fallback açıq işarələnir", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: etrafsiz([0.7, 0.72, 0.71]) });
    expect(setir(netice, "sabitlik").metodologiya).toBe("xamFallback");
  });
});

describe("F5 — son dövrün meyli", () => {
  const meylXali = (zirveler) =>
    xal(mehsuldarliqIndeksi({ movsumler: tarixce(zirveler, 0.6) }), "sonMeyl");

  it("son dövr pisləşməsi sabit və yaxşılaşandan aşağı xal alır", () => {
    const pisleshen = meylXali([0.75, 0.72, 0.68, 0.62, 0.55]);
    const sabit = meylXali([0.7, 0.7, 0.7, 0.7, 0.7]);
    const yaxsilashan = meylXali([0.55, 0.62, 0.68, 0.72, 0.78]);

    expect(pisleshen).toBeLessThan(sabit);
    expect(sabit).toBeLessThanOrEqual(yaxsilashan);
    expect(yaxsilashan).toBe(10);
  });

  // ƏSAS DƏYİŞİKLİK: 2017-dən çəkilən düz xətt ARTIQ İŞLƏDİLMİR
  it("çox köhnə yaxşı nəticə açıq son pisləşməni ört-basdır edə bilmir", () => {
    const kohneYaxsi = meylXali([0.85, 0.86, 0.85, 0.75, 0.72, 0.68, 0.62, 0.55]);
    const hamisiPis = meylXali([0.75, 0.72, 0.68, 0.62, 0.55]);
    // Köhnə güclü illər pəncərəyə düşmür — nəticə eynidir
    expect(kohneYaxsi).toBe(hamisiPis);
    expect(kohneYaxsi).toBe(0);
  });

  it("statistik mənasız kiçik müsbət meyl 'yaxşılaşır' sayılmır", () => {
    // Mövsümdə +0.002 — ölü zolağın içində
    const cuzi = meylXali([0.7, 0.702, 0.704, 0.706, 0.708]);
    expect(cuzi).toBeLessThan(10);
    expect(cuzi).toBe(7);
  });

  it("pəncərə uzunluğu konfiqurasiyadadır", () => {
    expect(SCORE_CONFIG.sonMeyl.pencere).toBe(5);
    expect(SCORE_CONFIG.sonMeyl.minMovsum).toBe(3);
  });
});

describe("F6 — cari mövsümün vəziyyəti", () => {
  it("daha yaxşı cari nisbi vəziyyət aşağı xal ala bilmir", () => {
    const xallar = [-0.25, -0.05, 0.05, 0.2].map(
      (ferq) =>
        xal(
          mehsuldarliqIndeksi({
            movsumler: tarixce([0.7, 0.7, 0.7], 0.6),
            cari: { ndvi: 0.6 + ferq, etrafMedyan: 0.6 },
          }),
          "cariVeziyyet",
        ),
    );
    for (let i = 1; i < xallar.length; i += 1) {
      expect(xallar[i]).toBeGreaterThanOrEqual(xallar[i - 1]);
    }
  });

  // 0.7 − 0.6 üzən nöqtədə 0.09999… verir (icmalda tapılan həqiqi xəta)
  it("0,10 fərqini üzən nöqtə xətasına görə itirmir", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.7, 0.7], 0.6),
      cari: { ndvi: 0.7, etrafMedyan: 0.6 },
    });
    expect(xal(netice, "cariVeziyyet")).toBe(10);
  });

  // ═══ İSTEHSALDA GÖRÜNƏN HAL ══════════════════════════════════════
  // Ətraf medianı YALNIZ bitki örtüyü olan piksellərdən çıxarılır, sahənin
  // öz ölçməsi isə çılpaq torpağı da sayır. Avqustda biçilmiş taxıl sahəsi
  // ~0.20, ətrafın yaşıl pikselləri ~0.65 verirdi — fərq −0.45, HƏR sahə
  // sıfır. Bu, pis becərmə deyil, fərqli əkin təqvimidir.
  it("biçilmiş sahə sıfır yox, ÖLÇÜLMƏYİB alır", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71], 0.6),
      cari: { ndvi: 0.2, etrafMedyan: 0.65 },
    });
    const s = setir(netice, "cariVeziyyet");
    expect(s.xal).toBeNull();
    expect(s.olculub).toBe(false);
    // Səbəb açıq deyilir — "hələ ölçülməyib" ilə qarışmasın
    expect(s.sebeb).toBe("cari.ekinYox");
    // Ölçülməyən amil məxrəcdən çıxmır, sadəcə xal qazanmır
    expect(netice.elcatanXal).toBe(90);
    expect(netice.natamam).toBe(true);
  });

  it("əkin altında olan sahə normal ölçülür", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71], 0.6),
      cari: { ndvi: 0.72, etrafMedyan: 0.65 },
    });
    // 0.72 − 0.65 = 0.07 → "ətraf səviyyəsindədir" bandı
    expect(xal(netice, "cariVeziyyet")).toBe(7);
    expect(netice.elcatanXal).toBe(100);
  });

  // Sərhəd: əkin həddinin özü hələ müqayisə olunandır
  it("əkin həddində müqayisə hələ aparılır", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71], 0.6),
      cari: { ndvi: EKIN_HEDDI, etrafMedyan: 0.65 },
    });
    expect(setir(netice, "cariVeziyyet").olculub).toBe(true);
  });

  it("çəkisi 10-dur — fenologiya olmadan daha çox çəki müdafiə edilə bilməz", () => {
    expect(SCORE_CONFIG.cariVeziyyet.maxXal).toBe(10);
  });
});

// ═══ 4. İKİQAT SAYMA ════════════════════════════════════════════════

describe("ikiqat sayma", () => {
  // Boş mövsüm davamlılıqda ARTIQ cəzalandırılıb; onu dəyişkənliyə də
  // salsaq eyni fakta görə ikinci cəza verilir
  it("boş mövsüm sabitliyə düşmür", () => {
    const bosla = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.72, 0.05, 0.71, 0.7], 0.6) });
    const bossuz = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.72, 0.71, 0.7], 0.6) });
    expect(xal(bosla, "sabitlik")).toBe(xal(bossuz, "sabitlik"));
  });

  it("boş mövsüm nisbi performansa və vegetasiyaya düşmür", () => {
    const bosla = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.72, 0.05, 0.71, 0.7], 0.6) });
    const bossuz = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.72, 0.71, 0.7], 0.6) });
    expect(xal(bosla, "nisbiPerformans")).toBe(xal(bossuz, "nisbiPerformans"));
    expect(xal(bosla, "vegetasiya")).toBe(xal(bossuz, "vegetasiya"));
  });

  it("boş mövsüm son meylə düşmür", () => {
    const bosla = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.05, 0.7, 0.7], 0.6) });
    const bossuz = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7, 0.7], 0.6) });
    expect(xal(bosla, "sonMeyl")).toBe(xal(bossuz, "sonMeyl"));
  });

  it("boş mövsüm YALNIZ davamlılıqda görünür", () => {
    const bosla = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.05, 0.7, 0.7], 0.6) });
    const bossuz = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7, 0.7], 0.6) });
    const ferq = bossuz.bal - bosla.bal;
    expect(ferq).toBe(xal(bossuz, "davamliliq") - xal(bosla, "davamliliq"));
  });

  // Yanvar-may arasında cari ilin zirvəsi hələ qabaqdadır: onu "əkilməyib"
  // saymaq hər fermeri qışda cəzalandırır
  it("cari il hələ zirvəyə çatmayıbsa tarixçəyə salınmır", () => {
    const SON_IL = 2030;
    const kecmis = tarixce([0.7, 0.7, 0.7, 0.7]);
    const yarimciq = amillerCixar([...kecmis, { il: SON_IL, zirve: 0.18, etrafMedyan: 0.6 }], null, SON_IL);
    expect(yarimciq.davamliliq.deger).toBe(1);
    expect(yarimciq.movsumSayi).toBe(4);

    const yetkin = amillerCixar([...kecmis, { il: SON_IL, zirve: 0.7, etrafMedyan: 0.6 }], null, SON_IL);
    expect(yetkin.movsumSayi).toBe(5);

    // Keçmiş ildəki aşağı zirvə isə həqiqi boş mövsümdür — sayılır
    const kohneBos = amillerCixar([...kecmis, { il: SON_IL - 1, zirve: 0.18, etrafMedyan: 0.6 }], null, SON_IL);
    expect(kohneBos.davamliliq.deger).toBe(0.8);
  });
});

// ═══ 5. BALIN SƏRHƏDLƏRİ ════════════════════════════════════════════

describe("balın sərhədləri", () => {
  it("bal həmişə 0–100 aralığındadır", () => {
    const hallar = [
      tarixce([0.9, 0.92, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99], 0.2),
      tarixce([0.05, 0.04, 0.03, 0.02, 0.36], 0.9),
      tarixce([0.7, 0.1, 0.8, 0.05, 0.75, 0.2], 0.5),
      etrafsiz([0.5, 0.5, 0.5]),
    ];
    for (const movsumler of hallar) {
      for (const cari of [null, { ndvi: 0.9, etrafMedyan: 0.1 }, { ndvi: 0.1, etrafMedyan: 0.9 }]) {
        const netice = mehsuldarliqIndeksi({ movsumler, cari });
        if (!netice || netice.hal !== "hazir") continue;
        expect(netice.bal).toBeGreaterThanOrEqual(0);
        expect(netice.bal).toBeLessThanOrEqual(100);
        expect(Number.isInteger(netice.bal)).toBe(true);
      }
    }
  });

  it("mümkün maksimum tam 100-dür", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.92, 0.95], 0.4),
      cari: { ndvi: 0.95, etrafMedyan: 0.4 },
    });
    expect(netice.elcatanXal).toBe(100);
    expect(netice.setirler.reduce((c, s) => c + s.maxXal, 0)).toBe(100);
    expect(netice.bal).toBeLessThanOrEqual(100);
  });

  it("güclü sahə yüksək, zəif sahə aşağı bant alır", () => {
    const guclu = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71, 0.73, 0.74, 0.75, 0.76, 0.77], 0.6),
      cari: { ndvi: 0.75, etrafMedyan: 0.6 },
    });
    expect(guclu.bant).toBe("yuksek");

    const zeif = mehsuldarliqIndeksi({
      movsumler: tarixce([0.1, 0.62, 0.08, 0.4, 0.09], 0.65),
      cari: { ndvi: 0.3, etrafMedyan: 0.65 },
    });
    expect(zeif.bant).toBe("zeif");
  });
});

// ═══ 6. İZAH EDİLƏBİLƏNLİK ══════════════════════════════════════════

describe("izah edilə bilənlik", () => {
  it("hər sətir tam strukturlu qaytarılır", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71, 0.73], 0.6),
      cari: { ndvi: 0.74, etrafMedyan: 0.6 },
    });
    expect(netice.setirler).toHaveLength(CEDVEL.length);
    for (const s of netice.setirler) {
      expect(s).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          maxXal: expect.any(Number),
          olculub: expect.any(Boolean),
        }),
      );
      expect(Object.keys(s).sort()).toEqual(
        // `detal` yalnız izah üçündür (bal vermir), amma HƏR sətirdə olmalıdır:
        // bəzi sətirdə olub bəzisində olmamaq UI-də səssiz undefined yaradır
        ["detal", "id", "key", "maxXal", "metodologiya", "olculub", "rawValue", "sebeb", "xal"].sort(),
      );
    }
  });

  it("xal həmişə xam göstərici ilə birlikdə gəlir", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.72, 0.71], 0.6) });
    const nisbi = setir(netice, "nisbiPerformans");
    expect(nisbi.rawValue).toBe(1);
    expect(nisbi.xal).toBe(30);
  });

  it("səbəb kodları qaytarır", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71, 0.73], 0.9),
      cari: { ndvi: 0.6, etrafMedyan: 0.9 },
    });
    expect(netice.sebebler.yaxsi).toContain("davamliliq.tam");
    expect(netice.sebebler.pis.length).toBeGreaterThan(0);
  });

  it("əkin həddi sənədləşdirilmiş dəyərdədir", () => {
    // Çılpaq torpaq NDVI-si ~0.15–0.25; 0.35 əkinlə boş sahəni ayırır
    expect(EKIN_HEDDI).toBeGreaterThan(0.25);
    expect(EKIN_HEDDI).toBeLessThan(0.5);
    expect(MIN_MOVSUM).toBe(3);
  });
});

// ══ CARİ MÖVSÜM QATI ═══════════════════════════════════════════════════
// Qat BALI DƏYİŞMİR — yalnız onu necə oxumaq lazım olduğunu deyir.
describe("cari mövsüm qatı", () => {
  const gucluTarixce = tarixce([0.72, 0.73, 0.74, 0.75, 0.76, 0.78], 0.6);

  it("bala TOXUNMUR: qat olsa da olmasa da rəqəm eynidir", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: gucluTarixce,
      cari: { ndvi: 0.39, etrafMedyan: 0.55 },
    });
    // Cari amil 0 alır, amma qalan 5 amil toxunulmaz qalır
    expect(xal(netice, "cariVeziyyet")).toBe(0);
    expect(netice.bal).toBe(
      netice.setirler.reduce((c, s) => c + (s.xal ?? 0), 0),
    );
    // Qat funksiyası balı oxuyur, dəyişmir
    const evvel = netice.bal;
    cariVeziyyetHali(netice);
    expect(netice.bal).toBe(evvel);
  });

  it("güclü tarixçə + zəif cari mövsüm: bant yüksək qalır, risk qalxır", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: gucluTarixce,
      cari: { ndvi: 0.39, etrafMedyan: 0.55 },
    });
    expect(netice.bant).toBe("yuksek");

    const qat = cariVeziyyetHali(netice);
    expect(qat.risk).toBe(true);
    expect(qat.hal).toBe("zeif");
    expect(qat.ferq).toBeCloseTo(-0.16, 3);
  });

  it("sahə ətrafdan yuxarıdırsa risk qalxmır", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: gucluTarixce,
      cari: { ndvi: 0.72, etrafMedyan: 0.55 },
    });
    expect(cariVeziyyetHali(netice)).toMatchObject({ risk: false, hal: "yaxsi" });
  });

  // BİÇİLMİŞ SAHƏ PİS BECƏRİLMİŞ SAHƏ DEYİL: amil ölçülmür, risk də yoxdur
  it("biçilmiş sahədə risk qalxmır — amil ölçülmür", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: gucluTarixce,
      cari: { ndvi: 0.2, etrafMedyan: 0.55 },
    });
    expect(cariVeziyyetHali(netice)).toMatchObject({
      risk: false,
      hal: "olculmeyib",
      sebeb: "cari.ekinYox",
    });
  });

  it("hər iki şərt tələb olunur — cədvəl dəyişsə də qayda açıq qalır", () => {
    // Fərq həddin bəri tərəfindədir (−0.05): xal 3, risk yoxdur
    const yumsaq = mehsuldarliqIndeksi({
      movsumler: gucluTarixce,
      cari: { ndvi: 0.5, etrafMedyan: 0.55 },
    });
    expect(xal(yumsaq, "cariVeziyyet")).toBeGreaterThan(CARI_RISK.xalHeddi);
    expect(cariVeziyyetHali(yumsaq).risk).toBe(false);
  });

  it("indeks yoxdursa qat sınmır", () => {
    expect(cariVeziyyetHali(null)).toMatchObject({ risk: false, hal: "olculmeyib" });
    expect(cariVeziyyetHali({ setirler: [] })).toMatchObject({ risk: false });
  });
});

// ══ F2-NİN MƏLUM ZƏİFLİKLƏRİ ═══════════════════════════════════════════
// Bunlar XƏTA DEYİL, ölçünün sərhədidir. Testlər onları SƏNƏDLƏŞDİRİR ki,
// həmyaş qrupuna keçəndə nəyin dəyişdiyi görünsün.
describe("nisbi performans — ölçünün sərhədləri", () => {
  it("səs sayıdır, fərqin böyüklüyü deyil: 0.005 də, 0.25 də 30/30 verir", () => {
    const cuzi = mehsuldarliqIndeksi({ movsumler: tarixce([0.605, 0.605, 0.605, 0.605], 0.6) });
    const boyuk = mehsuldarliqIndeksi({ movsumler: tarixce([0.85, 0.85, 0.85, 0.85], 0.6) });
    expect(xal(cuzi, "nisbiPerformans")).toBe(30);
    expect(xal(boyuk, "nisbiPerformans")).toBe(30);
  });

  // Ona görə say və median fərq ayrıca verilir: ekranda "30/30" tək qalmır
  it("izah üçün mövsüm sayını və median fərqi qaytarır", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.4, 0.7], 0.6) });
    expect(setir(netice, "nisbiPerformans").detal).toEqual({
      ustde: 3,
      hamisi: 4,
      medyanFerq: expect.closeTo(0.1, 3),
    });
  });

  it("ölçülməyən amilin detalı boşdur", () => {
    const netice = mehsuldarliqIndeksi({ movsumler: etrafsiz([0.7, 0.7, 0.7, 0.7]) });
    expect(setir(netice, "nisbiPerformans").detal).toBeNull();
  });
});
