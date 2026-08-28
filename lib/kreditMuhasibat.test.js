import { describe, expect, it } from "vitest";
import {
  araliqFaizi,
  bolusdur,
  dovrAraligi,
  dovrSonu,
  esasXetti,
  gecikme,
  hesablanacaqDovrler,
  novbetiOdenis,
  qepik,
} from "./kreditMuhasibat.js";

/** Test rahatlığı: ISO mətnindən UTC tarix */
const t = (metn) => new Date(metn);

describe("dövr sərhədləri", () => {
  it("aylıq dövr eyni günə düşür", () => {
    expect(dovrSonu(t("2026-03-10T09:00:00Z"), 1).toISOString()).toBe("2026-04-10T09:00:00.000Z");
    expect(dovrSonu(t("2026-03-10T09:00:00Z"), 3).toISOString()).toBe("2026-06-10T09:00:00.000Z");
  });

  it("ayın sonu qısa aya sıxılır, sonra geri açılır", () => {
    // 31 yanvar → 28 fevral (2026 uzun il deyil) → 31 mart
    expect(dovrSonu(t("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(dovrSonu(t("2026-01-31T00:00:00Z"), 2).toISOString().slice(0, 10)).toBe("2026-03-31");
  });

  it("dövr aralığı bitişikdir: birinin sonu digərinin başlanğıcıdır", () => {
    const bir = dovrAraligi(t("2026-03-10T00:00:00Z"), 1);
    const iki = dovrAraligi(t("2026-03-10T00:00:00Z"), 2);
    expect(bir.son.getTime()).toBe(iki.baslangic.getTime());
  });
});

describe("hesablanacaq dövrlər", () => {
  const verilme = t("2026-03-10T00:00:00Z");

  it("dövr bitməyibsə heç nə hesablanmır", () => {
    expect(hesablanacaqDovrler({ verilme, indi: t("2026-04-09T23:00:00Z") })).toHaveLength(0);
  });

  it("bitmiş dövrləri sıra ilə verir", () => {
    const dovrler = hesablanacaqDovrler({ verilme, indi: t("2026-06-11T00:00:00Z") });
    expect(dovrler.map((d) => d.no)).toEqual([1, 2, 3]);
  });

  it("artıq hesablanmış dövrləri təkrarlamır", () => {
    const dovrler = hesablanacaqDovrler({
      verilme,
      indi: t("2026-06-11T00:00:00Z"),
      hesablanmisDovr: 2,
    });
    expect(dovrler.map((d) => d.no)).toEqual([3]);
  });

  it("müddət bitəndən sonra da faiz yığılır (borc qalıbsa xərci var)", () => {
    const dovrler = hesablanacaqDovrler({ verilme, indi: t("2027-04-11T00:00:00Z") });
    expect(dovrler.length).toBe(13);
  });
});

describe("aralıq faizi — gündəlik, act/365", () => {
  const xett = esasXetti([
    { event_type: "disbursement", principal_after: 12_000, created_at: "2026-03-10T00:00:00Z" },
  ]);

  it("bir ayın faizi illik dərəcənin təxminən 1/12-sidir", () => {
    const faiz = araliqFaizi({
      xett,
      baslangic: t("2026-03-10T00:00:00Z"),
      son: t("2026-04-10T00:00:00Z"),
      illikFaiz: 11.5,
    });
    // 12.000 × 11,5% × 31/365 = 117,21 ₼ (aylıq təxmin 115 ₼-ə yaxındır)
    expect(faiz).toBeCloseTo(117.21, 2);
  });

  it("ay ortasındakı ödəniş həmin gündən faizi azaldır", () => {
    const yarimda = esasXetti([
      { event_type: "disbursement", principal_after: 12_000, created_at: "2026-03-10T00:00:00Z" },
      { event_type: "principal_repayment", principal_after: 6_000, created_at: "2026-03-25T00:00:00Z" },
    ]);
    const tam = araliqFaizi({
      xett,
      baslangic: t("2026-03-10T00:00:00Z"),
      son: t("2026-04-10T00:00:00Z"),
      illikFaiz: 11.5,
    });
    const azalmis = araliqFaizi({
      xett: yarimda,
      baslangic: t("2026-03-10T00:00:00Z"),
      son: t("2026-04-10T00:00:00Z"),
      illikFaiz: 11.5,
    });
    expect(azalmis).toBeLessThan(tam);
    // 15 gün 12.000, 16 gün 6.000 → 56,71 + 30,25
    expect(azalmis).toBeCloseTo(86.96, 1);
  });

  it("əsas borc sıfırdırsa faiz yığılmır", () => {
    const bagli = esasXetti([
      { event_type: "disbursement", principal_after: 5_000, created_at: "2026-03-10T00:00:00Z" },
      { event_type: "principal_repayment", principal_after: 0, created_at: "2026-03-12T00:00:00Z" },
    ]);
    const faiz = araliqFaizi({
      xett: bagli,
      baslangic: t("2026-03-12T00:00:00Z"),
      son: t("2026-04-12T00:00:00Z"),
      illikFaiz: 11.5,
    });
    expect(faiz).toBe(0);
  });

  it("boş aralıq və mənfi dərəcə sıfır verir", () => {
    expect(araliqFaizi({ xett, baslangic: t("2026-03-10Z"), son: t("2026-03-10Z"), illikFaiz: 11.5 })).toBe(0);
    expect(
      araliqFaizi({
        xett,
        baslangic: t("2026-03-10T00:00:00Z"),
        son: t("2026-04-10T00:00:00Z"),
        illikFaiz: 0,
      }),
    ).toBe(0);
  });
});

describe("ödənişin bölüşdürülməsi", () => {
  it("əvvəl faiz, sonra əsas borc", () => {
    expect(bolusdur({ mebleg: 500, faizBorc: 120, esasBorc: 8_000 })).toEqual({
      faiz: 120,
      esas: 380,
      artiq: 0,
    });
  });

  it("faizdən azdırsa hamısı faizə gedir", () => {
    expect(bolusdur({ mebleg: 50, faizBorc: 120, esasBorc: 8_000 })).toEqual({
      faiz: 50,
      esas: 0,
      artiq: 0,
    });
  });

  it("borcdan çoxu qəbul edilmir — artığı ayrıca qalır", () => {
    expect(bolusdur({ mebleg: 9_000, faizBorc: 120, esasBorc: 8_000 })).toEqual({
      faiz: 120,
      esas: 8_000,
      artiq: 880,
    });
  });

  it("yanlış məbləğ heç nəyə düşmür", () => {
    expect(bolusdur({ mebleg: -5, faizBorc: 120, esasBorc: 800 })).toEqual({
      faiz: 0,
      esas: 0,
      artiq: 0,
    });
  });
});

describe("gecikmə (DPD)", () => {
  const borcHadisesi = (mebleg, sonTarix) => ({
    event_type: "interest_charge",
    amount: mebleg,
    due_on: sonTarix,
  });

  it("borc ödənilibsə gecikmə yoxdur", () => {
    const gec = gecikme({
      hadiseler: [borcHadisesi(115, "2026-04-10"), { event_type: "interest_payment", amount: 115 }],
      indi: t("2026-05-01T00:00:00Z"),
    });
    expect(gec).toEqual({ gunler: 0, tarix: null });
  });

  it("ödənilməmiş ən köhnə borcdan sayılır", () => {
    const gec = gecikme({
      hadiseler: [borcHadisesi(115, "2026-04-10"), borcHadisesi(110, "2026-05-10")],
      indi: t("2026-05-01T00:00:00Z"),
    });
    expect(gec.gunler).toBe(21);
    expect(gec.tarix.toISOString().slice(0, 10)).toBe("2026-04-10");
  });

  it("qismən ödəniş köhnə borcu bağlayır, gecikmə növbətiyə keçir", () => {
    const gec = gecikme({
      hadiseler: [
        borcHadisesi(115, "2026-04-10"),
        borcHadisesi(110, "2026-05-10"),
        { event_type: "interest_payment", amount: 115 },
      ],
      indi: t("2026-05-20T00:00:00Z"),
    });
    expect(gec.gunler).toBe(10);
  });

  it("son tarixi gəlməmiş borc gecikmə deyil", () => {
    const gec = gecikme({
      hadiseler: [borcHadisesi(115, "2026-06-10")],
      indi: t("2026-05-20T00:00:00Z"),
    });
    expect(gec).toEqual({ gunler: 0, tarix: null });
  });
});

describe("növbəti ödəniş", () => {
  const xett = esasXetti([
    { event_type: "disbursement", principal_after: 12_000, created_at: "2026-03-10T00:00:00Z" },
  ]);

  it("adi ayda yalnız faiz gözlənilir", () => {
    const novbeti = novbetiOdenis({
      verilme: t("2026-03-10T00:00:00Z"),
      hesablanmisDovr: 0,
      faizBorc: 0,
      esasBorc: 12_000,
      illikFaiz: 11.5,
      sonTarix: "2026-09-30",
      xett,
    });
    expect(novbeti.tarix.toISOString().slice(0, 10)).toBe("2026-04-10");
    expect(novbeti.esasDaxil).toBe(false);
    expect(novbeti.mebleg).toBeCloseTo(117.21, 1);
  });

  it("ödənilməmiş faiz borcu növbəti ödənişə əlavə olunur", () => {
    const novbeti = novbetiOdenis({
      verilme: t("2026-03-10T00:00:00Z"),
      hesablanmisDovr: 1,
      faizBorc: 117.21,
      esasBorc: 12_000,
      illikFaiz: 11.5,
      sonTarix: "2026-09-30",
      xett,
    });
    expect(novbeti.mebleg).toBeGreaterThan(117.21);
  });

  it("son dövrdə əsas borc da daxil olur", () => {
    const novbeti = novbetiOdenis({
      verilme: t("2026-03-10T00:00:00Z"),
      hesablanmisDovr: 5,
      faizBorc: 0,
      esasBorc: 12_000,
      illikFaiz: 11.5,
      sonTarix: "2026-08-31",
      xett,
    });
    expect(novbeti.esasDaxil).toBe(true);
    expect(novbeti.tarix.toISOString().slice(0, 10)).toBe("2026-08-31");
    expect(novbeti.mebleg).toBeGreaterThan(12_000);
  });

  it("borc yoxdursa növbəti ödəniş də yoxdur", () => {
    expect(
      novbetiOdenis({
        verilme: t("2026-03-10T00:00:00Z"),
        faizBorc: 0,
        esasBorc: 0,
        illikFaiz: 11.5,
        xett,
      }),
    ).toBeNull();
  });
});

describe("qəpik", () => {
  it("iki onluğa yuvarlaqlaşdırır", () => {
    expect(qepik(117.2054)).toBe(117.21);
    expect(qepik(0.005)).toBe(0.01);
    expect(qepik("12.344")).toBe(12.34);
    expect(qepik(Number.NaN)).toBe(0);
  });
});
