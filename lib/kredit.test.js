import { describe, expect, it } from "vitest";
import {
  ACIQ_HALLAR,
  anderraytinq,
  HESAB_VERSIYASI,
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
