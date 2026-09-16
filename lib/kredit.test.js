import { describe, expect, it } from "vitest";
import {
  ACIQ_HALLAR,
  anderraytinq,
  HESAB_VERSIYASI,
  HESAB_VERSIYASI_V3,
  VERSIYA_GIRISLERI_V3,
  farmScoreRejimi,
  snapshotVersiyasi,
  kecidMumkun,
  KREDIT_KECIDLERI,
  MURACIET_KECIDLERI,
  murecietGirisi,
  muddetTeyin,
  TEKLIF_KECIDLERI,
  kanonik,
  versiyaHesabla,
  VERSIYA_GIRISLERI,
} from "./kredit.js";
import { KREDIT_SERTLERI, kreditTavani } from "./kreditSertler.js";

const SAHE = { hektar: 10, bitki: "pomidor" };

/** Yaxşı becərilmiş sahənin peyk tarixçəsi */
function movsumler(sayi = 6, il = new Date().getFullYear()) {
  return Array.from({ length: sayi }, (_, i) => ({
    il: il - sayi + 1 + i,
    zirve: 0.72,
    zirveAyi: `${il - sayi + 1 + i}-05`,
    etrafMedyan: 0.6,
    olcmeSayi: 6,
  }));
}

describe("giriş yoxlaması — klientdən yalnız məbləğ alınır", () => {
  it("düzgün giriş qəbul olunur və yuvarlanır", () => {
    expect(murecietGirisi({ mebleg: 2000.4, muddetAy: 12 })).toEqual({
      ok: true,
      mebleg: 2000,
      muddetAy: 12,
    });
  });

  it("yararsız məbləğ rədd olunur", () => {
    for (const mebleg of [0, -1, NaN, "abc", null, undefined, Infinity, 10_000_000]) {
      expect(murecietGirisi({ mebleg, muddetAy: 12 }).ok, String(mebleg)).toBe(false);
    }
  });

  it("minimumdan aşağı məbləğ ayrıca səbəblə rədd olunur", () => {
    const netice = murecietGirisi({ mebleg: KREDIT_SERTLERI.minKredit - 1, muddetAy: 12 });
    expect(netice).toEqual({ ok: false, sebeb: "meblegAzdir" });
  });

  it("yararsız müddət rədd olunur", () => {
    // 25 baza CHECK-indən yuxarıdır, 1.5 tam ay deyil
    for (const ay of [0, -3, 25, 1.5, null, undefined, "abc"]) {
      expect(murecietGirisi({ mebleg: 2000, muddetAy: ay }).ok, String(ay)).toBe(false);
    }
  });

  // Müddət klientdən DEYİL, serverdən gəlir (muddetTeyin) — rəqəm mətni
  // qəbul edilir, çünki bu, tip çevirməsidir, etibar qərarı deyil
  it("rəqəm mətni ədədə çevrilir", () => {
    expect(murecietGirisi({ mebleg: "2000", muddetAy: "12" })).toEqual({
      ok: true,
      mebleg: 2000,
      muddetAy: 12,
    });
  });
});

describe("vəziyyət maşını", () => {
  it("müraciət yalnız icazəli keçidləri qəbul edir", () => {
    expect(kecidMumkun(MURACIET_KECIDLERI, "submitted", "reviewing")).toBe(true);
    expect(kecidMumkun(MURACIET_KECIDLERI, "reviewing", "approved")).toBe(true);
    expect(kecidMumkun(MURACIET_KECIDLERI, "approved", "offer_issued")).toBe(true);
    expect(kecidMumkun(MURACIET_KECIDLERI, "offer_issued", "accepted")).toBe(true);
    // Qadağan: birbaşa təsdiq, geri qayıtma, bağlanmışdan çıxış
    expect(kecidMumkun(MURACIET_KECIDLERI, "submitted", "approved")).toBe(false);
    expect(kecidMumkun(MURACIET_KECIDLERI, "submitted", "offer_issued")).toBe(false);
    expect(kecidMumkun(MURACIET_KECIDLERI, "rejected", "approved")).toBe(false);
    expect(kecidMumkun(MURACIET_KECIDLERI, "accepted", "offer_issued")).toBe(false);
    expect(kecidMumkun(MURACIET_KECIDLERI, "uydurma", "approved")).toBe(false);
  });

  it("təklif bağlanandan sonra açılmır", () => {
    expect(kecidMumkun(TEKLIF_KECIDLERI, "issued", "accepted")).toBe(true);
    expect(kecidMumkun(TEKLIF_KECIDLERI, "accepted", "issued")).toBe(false);
    expect(kecidMumkun(TEKLIF_KECIDLERI, "rejected", "accepted")).toBe(false);
    expect(kecidMumkun(TEKLIF_KECIDLERI, "expired", "accepted")).toBe(false);
  });

  it("kredit yalnız irəli gedir", () => {
    expect(kecidMumkun(KREDIT_KECIDLERI, "active", "repaid")).toBe(true);
    expect(kecidMumkun(KREDIT_KECIDLERI, "repaid", "active")).toBe(false);
    expect(kecidMumkun(KREDIT_KECIDLERI, "closed", "active")).toBe(false);
  });

  it("açıq hallar bazadakı unikal indekslə eynidir", () => {
    // db/migrations/002_kredit.sql → credit_app_bir_aciq_idx
    expect(ACIQ_HALLAR).toEqual(["submitted", "reviewing", "approved", "offer_issued"]);
  });
});

describe("anderraytinq", () => {
  it("yaxşı sahə təsdiq alır və girişlər tam saxlanılır", () => {
    const n = anderraytinq({ mebleg: 2000, muddetAy: 12, sahe: SAHE, movsumler: movsumler() });

    expect(n.qerar).toBe("approved");
    expect(n.mebleg).toBe(2000);
    expect(n.versiya).toBe(HESAB_VERSIYASI);
    // Ümumi ≠ xalis: ikisi ayrıca saxlanılır
    const p = n.girisler.gelir.ssenariler.find((s) => s.ad === "pessimist");
    expect(p.ummumiGelir).toBeGreaterThan(p.xalisGelir);
    expect(p.xalisGelir).toBe(p.ummumiGelir - p.xerc);
    // Ehtiyat və DSTI DƏYƏR kimi yazılır (istinad yox)
    expect(n.girisler.odenis.ehtiyatPayi).toBe(0.25);
    expect(n.girisler.odenis.dstiTavani).toBe(0.4);
    expect(n.girisler.indeks.bal).toBeGreaterThan(0);
  });

  it("təsdiq məbləği tavandan ÇOX ola bilmir", () => {
    const n = anderraytinq({ mebleg: 500_000, muddetAy: 12, sahe: SAHE, movsumler: movsumler() });
    expect(n.qerar).toBe("approved");
    expect(n.mebleg).toBe(n.girisler.limit.tavan);
    expect(n.mebleg).toBeLessThan(500_000);
    expect(n.sebebler).toContain("limitAsagiSalinib");
  });

  it("bitki seçilməyibsə qərar verilmir", () => {
    const n = anderraytinq({ mebleg: 2000, muddetAy: 12, sahe: { hektar: 10, bitki: null } });
    expect(n.qerar).toBe("rejected");
    expect(n.mebleg).toBe(0);
    expect(n.sebebler).toContain("bitkiSecilmeyib");
  });

  it("sahə yoxdursa qərar verilmir", () => {
    const n = anderraytinq({ mebleg: 2000, muddetAy: 12, sahe: { hektar: null, bitki: "pomidor" } });
    expect(n.qerar).toBe("rejected");
    expect(n.sebebler).toContain("saheYoxdur");
  });

  it("kiçik sahədə aşağı marjalı bitki rədd olunur", () => {
    const n = anderraytinq({ mebleg: 2000, muddetAy: 12, sahe: { hektar: 0.5, bitki: "bugda" } });
    expect(n.qerar).toBe("rejected");
    expect(n.sebebler).toContain("qabiliyyetAzdir");
  });

  it("peyk tarixçəsi olmadan da qərar verilir, amma səbəbdə qeyd olunur", () => {
    const n = anderraytinq({ mebleg: 2000, muddetAy: 12, sahe: SAHE });
    expect(n.sebebler).toContain("peykTarixcesiYoxdur");
    expect(n.girisler.peyk).toMatchObject({ movsumSayi: 0, cariVar: false, menbe: "yoxdur" });
    expect(n.girisler.peyk.movsumler).toEqual([]);
    expect(n.girisler.indeks).toBeNull();
  });

  it("yaxşı aqro indeks limiti artırır — bal qərara TƏSİR EDİR", () => {
    const zeif = anderraytinq({
      mebleg: 500_000,
      muddetAy: 12,
      sahe: SAHE,
      movsumler: movsumler().map((m) => ({ ...m, zirve: 0.3, etrafMedyan: 0.62 })),
    });
    const yaxsi = anderraytinq({
      mebleg: 500_000,
      muddetAy: 12,
      sahe: SAHE,
      movsumler: movsumler(),
    });
    expect(yaxsi.girisler.limit.tavan).toBeGreaterThan(zeif.girisler.limit.tavan);
  });

  it("eyni giriş eyni nəticəni verir — qərar təkrarlana bilir", () => {
    const giris = { mebleg: 2000, muddetAy: 12, sahe: SAHE, movsumler: movsumler() };
    const a = anderraytinq({ ...giris, indi: new Date("2026-08-26T00:00:00Z") });
    const b = anderraytinq({ ...giris, indi: new Date("2026-08-26T00:00:00Z") });
    expect(a.mebleg).toBe(b.mebleg);
    expect(a.girisler).toEqual(b.girisler);
  });

  it("hesablama versiyası konfiqurasiyadan çıxarılır və deterministikdir", () => {
    expect(HESAB_VERSIYASI).toMatch(/^v2-[0-9a-f]{12}$/);
    expect(versiyaHesabla(VERSIYA_GIRISLERI)).toBe(HESAB_VERSIYASI);
    // Kanonik forma açar sırasından asılı deyil
    expect(kanonik({ a: 1, b: [2, { d: 4, c: 3 }] })).toBe(kanonik({ b: [2, { c: 3, d: 4 }], a: 1 }));
  });

  // Köhnə v1 yalnız maxXal-ları görürdü: bant HƏDDİ dəyişəndə versiya eyni
  // qalırdı və köhnə qərar "eyni qaydalarla verilib" deyə yalan danışırdı
  it("maxXal-a toxunmayan hədd dəyişikliyi də versiyanı dəyişir", () => {
    const baza = versiyaHesabla(VERSIYA_GIRISLERI);

    // 1. Bal bantının həddi (80 → 85) — maxXal-lar toxunulmaz qalır
    const bantDeyisik = structuredClone(VERSIYA_GIRISLERI);
    bantDeyisik.bantlar = bantDeyisik.bantlar.map((b) =>
      b.ad === "yuksek" ? { ...b, hedd: 85 } : b,
    );
    expect(versiyaHesabla(bantDeyisik)).not.toBe(baza);

    // 2. Amil daxilindəki bant həddi
    const amilDeyisik = structuredClone(VERSIYA_GIRISLERI);
    amilDeyisik.bal.davamliliq.bantlar[0].hedd = 0.95;
    expect(versiyaHesabla(amilDeyisik)).not.toBe(baza);

    // 3. Gəlir ssenari əmsalı
    const gelirDeyisik = structuredClone(VERSIYA_GIRISLERI);
    gelirDeyisik.gelir.ssenari.pessimist.mehsul = 0.65;
    expect(versiyaHesabla(gelirDeyisik)).not.toBe(baza);

    // 4. DSTI tavanı
    const odenisDeyisik = structuredClone(VERSIYA_GIRISLERI);
    odenisDeyisik.odenis.dstiTavani = 0.35;
    expect(versiyaHesabla(odenisDeyisik)).not.toBe(baza);

    // Dəyişməyən surət isə EYNİ versiyanı verir
    expect(versiyaHesabla(structuredClone(VERSIYA_GIRISLERI))).toBe(baza);
  });
});

describe("kredit tavanı", () => {
  it("konservativdir: əsas + faiz qabiliyyətə sığır", () => {
    const tavan = kreditTavani(2306, 12);
    const faizle = tavan * (1 + KREDIT_SERTLERI.illikFaiz / 100);
    expect(faizle).toBeLessThanOrEqual(2306);
    expect(tavan % KREDIT_SERTLERI.addim).toBe(0);
  });

  it("uzun müddət tavanı azaldır", () => {
    expect(kreditTavani(5000, 12)).toBeLessThan(kreditTavani(5000, 3));
  });

  it("qabiliyyət yoxdursa tavan sıfırdır", () => {
    expect(kreditTavani(0, 12)).toBe(0);
    expect(kreditTavani(-100, 12)).toBe(0);
    expect(kreditTavani(5000, 0)).toBe(0);
    expect(kreditTavani(NaN, 12)).toBe(0);
  });
});

describe("müddət", () => {
  it("biçinə qalan aydan çıxır", () => {
    // Buğdanın biçini iyundur: martda 3 ay qalır
    expect(muddetTeyin("bugda", new Date(2026, 2, 10))).toBe(3);
  });

  it("naməlum bitkidə maksimum müddətə düşür", () => {
    expect(muddetTeyin("banan")).toBe(KREDIT_SERTLERI.maxMuddetAy);
  });
});

// ═══ FARMSCORE V3 — KÖLGƏ REJİMİ ═══════════════════════════════════════
describe("FarmScore v3 kölgə rejimi", () => {
  // 3 mövsüm, ətrafı cüzi ötür: v2 → Yüksək (1.25×), v3 → Orta (0.90×)
  const cuzi = () => movsumler(3).map((m) => ({ ...m, zirve: 0.705, etrafMedyan: 0.7 }));
  const giris = { mebleg: 500_000, muddetAy: 12, sahe: SAHE, indi: new Date("2026-05-10T00:00:00Z") };

  it("defolt rejim shadow-dur: qərar v2 ilə verilir, v3 yalnız qeyd olunur", () => {
    expect(farmScoreRejimi({})).toBe("shadow");
    expect(farmScoreRejimi({ FARMSCORE_V3: "on" })).toBe("v3");
    expect(farmScoreRejimi({ FARMSCORE_V3: "off" })).toBe("v2");

    const kolge = anderraytinq({ ...giris, movsumler: cuzi(), rejim: "shadow" });
    const v2 = anderraytinq({ ...giris, movsumler: cuzi(), rejim: "v2" });
    expect(kolge.mebleg).toBe(v2.mebleg);
    expect(kolge.versiya).toBe(HESAB_VERSIYASI);
    expect(kolge.girisler.indeks.scoreVersion).toBe("v2");
    expect(kolge.girisler.farmScore.qerarVersiyasi).toBe("v2");
    expect(kolge.girisler.farmScore.v2).toMatchObject({ bant: "yuksek", emsal: 1.25 });
    expect(kolge.girisler.farmScore.v3).toMatchObject({ adjustedBand: "orta", underwritingMultiplier: 0.9, confidence: "ilkin" });
    expect(kolge.girisler.farmScore.ferq).toEqual({ emsal: -0.35, bantDeyisir: true });
    expect(kolge.sebebler).not.toContain("manualBaxis");
  });

  it("v3 rejimi (FARMSCORE_V3=on): multiplikator gəlirə gedir, versiya v3-dür", () => {
    const v2 = anderraytinq({ ...giris, movsumler: cuzi(), rejim: "shadow" });
    const v3 = anderraytinq({ ...giris, movsumler: cuzi(), rejim: "v3" });
    expect(v3.versiya).toBe(HESAB_VERSIYASI_V3);
    expect(v3.versiya).toMatch(/^v3-[0-9a-f]{12}$/);
    expect(v3.girisler.farmScore.qerarVersiyasi).toBe("v3-conservative");
    expect(v3.girisler.gelir.ferziyyeler.find((f) => f.acar === "indeks")).toEqual({ acar: "indeks", deyer: 0.9, vahid: "×", menbe: "farmScoreV3" });
    expect(v3.girisler.limit.tavan).toBeLessThan(v2.girisler.limit.tavan);
  });

  it("v3 rejimində tarixçəsiz sahə 1.00 deyil, 0.85 alır və əl ilə baxışa düşür", () => {
    const n = anderraytinq({ ...giris, movsumler: [], rejim: "v3" });
    expect(n.girisler.farmScore.v3.underwritingMultiplier).toBe(0.85);
    expect(n.sebebler).toContain("manualBaxis");
    expect(n.girisler.gelir.ferziyyeler.find((f) => f.acar === "indeks").deyer).toBe(0.85);
  });

  it("cari riskli sahə v3-də müsbət multiplikator almır", () => {
    const n = anderraytinq({
      ...giris,
      movsumler: movsumler(9),
      cari: { ndvi: 0.39, etrafMedyan: 0.55 },
      rejim: "v3",
    });
    // Cari mövsüm 0/10 alır → 83, Yaxşı; risk isə multiplikatoru 1.00-da saxlayır
    expect(["yaxsi", "yuksek"]).toContain(n.girisler.farmScore.v3.adjustedBand);
    expect(n.girisler.farmScore.v3.underwritingMultiplier).toBeLessThanOrEqual(1);
    expect(n.girisler.farmScore.v3.manualReview.sebebler).toContain("cariRisk");
    expect(n.girisler.farmScore.v3.currentRisk.risk).toBe(true);
  });

  it("köhnə qərar snapshot-ları (scoreVersion-suz) v2 kimi oxunur və dəyişmir", () => {
    const kohne = { bal: 86, bant: "yuksek", etibar: "ilkin", setirler: [] };
    expect(snapshotVersiyasi(kohne)).toBe("v2");
    expect(snapshotVersiyasi(null)).toBe("v2");
    expect(kohne).toEqual({ bal: 86, bant: "yuksek", etibar: "ilkin", setirler: [] });
    const yeni = anderraytinq({ ...giris, movsumler: cuzi() }).girisler.indeks;
    expect(snapshotVersiyasi(yeni)).toBe("v2");
  });

  it("v3 konfiqurasiyası dəyişəndə yalnız v3 versiyası dəyişir", () => {
    const deyisik = structuredClone(VERSIYA_GIRISLERI_V3);
    deyisik.balV3.multiplikator.yuksek = 1.1;
    expect(versiyaHesabla(deyisik, "v3")).not.toBe(HESAB_VERSIYASI_V3);
    expect(versiyaHesabla(VERSIYA_GIRISLERI)).toBe(HESAB_VERSIYASI);
  });
});
