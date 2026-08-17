import { describe, expect, it } from "vitest";
import {
  CEDVEL,
  EKIN_HEDDI,
  TESDIQ,
  amillerCixar,
  deyiskenlik,
  mehsuldarliqIndeksi,
  meylEmsali,
} from "./mehsuldarliq.js";

/** n mövsümlük tarixçə: hər il eyni zirvə və ətraf medianı */
const tarixce = (zirveler, etraf = 0.55) =>
  zirveler.map((zirve, i) => ({ il: 2018 + i, zirve, etrafMedyan: etraf }));

describe("cədvəlin quruluşu", () => {
  // Bir amil balı təkbaşına idarə edərsə cədvəl şəffaflığını itirir
  it("heç bir amil balın 25%-dən çoxunu tutmur", () => {
    const cem = CEDVEL.reduce((c, a) => c + a.maxXal, 0);
    expect(cem).toBe(100);
    for (const amil of CEDVEL) {
      expect(amil.maxXal, amil.key).toBeLessThanOrEqual(25);
    }
  });

  it("hər bantın səbəb kodu var — fermer NİYƏ olduğunu görməlidir", () => {
    for (const amil of CEDVEL) {
      for (const bant of amil.bantlar) {
        expect(bant.sebeb, `${amil.key}`).toBeTruthy();
      }
    }
  });

  // Çəkilər aqronom təsdiqindən keçməyib — ekran bunu deməlidir
  it("təsdiq vəziyyəti açıq saxlanılır", () => {
    expect(TESDIQ.aqronom).toBe(false);
    expect(TESDIQ.kreditMutexessisi).toBe(false);
  });
});

describe("statistik köməkçilər", () => {
  it("dəyişkənliyi nisbi hesablayır", () => {
    expect(deyiskenlik([0.7, 0.7, 0.7])).toBeCloseTo(0, 10);
    expect(deyiskenlik([0.4, 0.8])).toBeCloseTo(0.333, 2);
    expect(deyiskenlik([0.7])).toBeNull();
  });

  it("meyli mövsüm başına verir", () => {
    expect(meylEmsali([0.5, 0.6, 0.7])).toBeCloseTo(0.1, 5);
    expect(meylEmsali([0.7, 0.6, 0.5])).toBeCloseTo(-0.1, 5);
    expect(meylEmsali([0.6, 0.6])).toBeNull();
  });
});

describe("amillərin çıxarılması", () => {
  it("əkilməmiş mövsümü davamlılıqda sayır", () => {
    const a = amillerCixar(tarixce([0.7, 0.72, 0.1, 0.71]));
    expect(a.davamliliq).toBe(0.75);
    expect(a.movsumSayi).toBe(4);
  });

  // ƏSAS: boş qalan il artıq davamlılıqda cəzalandırılıb. Zirvəsi sıfıra
  // yaxın olan ili dəyişkənliyə də salsaq, eyni fakta görə iki dəfə cəza
  // verilir və sahə "qeyri-sabit" görünür.
  it("boş mövsüm dəyişkənliyə düşmür", () => {
    const bosla = amillerCixar(tarixce([0.7, 0.72, 0.05, 0.71]));
    const bossuz = amillerCixar(tarixce([0.7, 0.72, 0.71]));
    expect(bosla.sabitlik).toBeCloseTo(bossuz.sabitlik, 6);
  });

  it("ətraf müqayisəsini mövsüm payı kimi verir", () => {
    const movsumler = [
      { il: 2023, zirve: 0.7, etrafMedyan: 0.6 },
      { il: 2024, zirve: 0.5, etrafMedyan: 0.6 },
      { il: 2025, zirve: 0.72, etrafMedyan: 0.6 },
      { il: 2026, zirve: 0.68, etrafMedyan: 0.6 },
    ];
    expect(amillerCixar(movsumler).etraf).toBe(0.75);
  });

  it("ətraf ölçülməyibsə null qaytarır — sıfır yox", () => {
    const a = amillerCixar([{ il: 2025, zirve: 0.7 }]);
    expect(a.etraf).toBeNull();
  });
});

describe("məhsuldarlıq indeksi", () => {
  it("yaxşı idarə olunan sahəyə yüksək bal verir", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71, 0.73, 0.74, 0.75, 0.76, 0.77], 0.6),
      cari: { ndvi: 0.75, etrafMedyan: 0.6 },
    });
    expect(netice.bal).toBeGreaterThanOrEqual(80);
    expect(netice.bant).toBe("yuksek");
    expect(netice.etibar).toBe("tam");
  });

  it("boş qalan və zəif sahəyə aşağı bal verir", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.1, 0.62, 0.08, 0.4, 0.09], 0.65),
      cari: { ndvi: 0.3, etrafMedyan: 0.65 },
    });
    expect(netice.bal).toBeLessThan(40);
    expect(netice.bant).toBe("zeif");
  });

  // MONOTONLUQ: göstərici yaxşılaşanda bal azalmamalıdır. Ekspert cədvəlinin
  // ən vacib struktur şərti budur — pozulsa cədvəl izah oluna bilməz.
  it("davamlılıq artdıqca bal azalmır", () => {
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

  it("ətrafla müqayisə yaxşılaşdıqca bal azalmır", () => {
    const ballar = [0.9, 0.75, 0.6, 0.45].map((etraf) =>
      mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7, 0.7], etraf) }).bal,
    );
    for (let i = 1; i < ballar.length; i += 1) {
      expect(ballar[i]).toBeGreaterThanOrEqual(ballar[i - 1]);
    }
  });

  // Məlumatın olmaması nə mükafat, nə cəza olmalıdır
  it("ölçülməyən amil balı süni azaltmır", () => {
    const etrafsiz = mehsuldarliqIndeksi({
      movsumler: [0.7, 0.72, 0.71, 0.73].map((zirve, i) => ({ il: 2023 + i, zirve })),
    });
    const etrafli = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71, 0.73], 0.6),
    });
    // Ətraf sətri "ölçülməyib" kimi qeyd olunur, bal isə qalanlardan çıxır
    expect(etrafsiz.setirler.find((s) => s.key === "etraf").xal).toBeNull();
    expect(etrafsiz.bal).toBeGreaterThan(60);
    expect(etrafli.bal).toBeGreaterThan(etrafsiz.bal - 25);
  });

  it("mövsüm sayına görə etibarı bildirir", () => {
    const az = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7]) });
    expect(az.etibar).toBe("az");
    expect(az.movsumSayi).toBe(2);

    const orta = mehsuldarliqIndeksi({ movsumler: tarixce([0.7, 0.7, 0.7, 0.7]) });
    expect(orta.etibar).toBe("orta");
  });

  it("səbəb kodları qaytarır", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.72, 0.71, 0.73], 0.9),
      cari: { ndvi: 0.6, etrafMedyan: 0.9 },
    });
    // Davamlılıq güclüdür, ətrafla müqayisə zəifdir
    expect(netice.sebebler.yaxsi).toContain("davamliliq.tam");
    expect(netice.sebebler.pis.length).toBeGreaterThan(0);
  });

  // 0.7 − 0.6 üzən nöqtədə 0.09999… verir; yuvarlaqlanmasa fermer düz
  // sərhəddə 4 xal itirirdi (icmalda tapılan həqiqi xəta)
  it("0,10 fərqini üzən nöqtə xətasına görə itirmir", () => {
    const netice = mehsuldarliqIndeksi({
      movsumler: tarixce([0.7, 0.7, 0.7, 0.7]),
      cari: { ndvi: 0.7, etrafMedyan: 0.6 },
    });
    expect(netice.setirler.find((s) => s.key === "cari").xal).toBe(15);
  });

  // Yanvar-may arasında cari ilin zirvəsi hələ qabaqdadır: onu "əkilməyib"
  // saymaq hər fermeri qışda cəzalandırır. Cari mövsümü öz amili təmsil edir.
  it("cari il hələ zirvəyə çatmayıbsa tarixçəyə salınmır", () => {
    const SON_IL = 2030;
    const kecmis = tarixce([0.7, 0.7, 0.7, 0.7]);
    const yarimciq = [...kecmis, { il: SON_IL, zirve: 0.18, etrafMedyan: 0.6 }];
    const a = amillerCixar(yarimciq, null, SON_IL);
    expect(a.davamliliq).toBe(1);
    expect(a.movsumSayi).toBe(4);

    // Zirvə həddi keçən kimi il tarixçəyə normal daxil olur
    const yetkin = [...kecmis, { il: SON_IL, zirve: 0.7, etrafMedyan: 0.6 }];
    expect(amillerCixar(yetkin, null, SON_IL).movsumSayi).toBe(5);

    // Keçmiş ildəki aşağı zirvə isə həqiqi boş mövsümdür — sayılır
    const kohneBos = [...kecmis, { il: SON_IL - 1, zirve: 0.18, etrafMedyan: 0.6 }];
    expect(amillerCixar(kohneBos, null, SON_IL).davamliliq).toBe(0.8);
  });

  it("tarixçə yoxdursa null qaytarır", () => {
    expect(mehsuldarliqIndeksi({ movsumler: [] })).toBeNull();
    expect(mehsuldarliqIndeksi({})).toBeNull();
    expect(mehsuldarliqIndeksi({ movsumler: [{ il: 2025, zirve: null }] })).toBeNull();
  });

  it("əkin həddi sənədləşdirilmiş dəyərdədir", () => {
    // Çılpaq torpaq NDVI-si ~0.15–0.25; 0.35 əkinlə boş sahəni ayırır
    expect(EKIN_HEDDI).toBeGreaterThan(0.25);
    expect(EKIN_HEDDI).toBeLessThan(0.5);
  });
});
