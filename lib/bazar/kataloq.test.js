import { describe, expect, it } from "vitest";
import {
  KATALOQ_VERSIYA,
  KATEQORIYALAR,
  MEHSULLAR,
  NUMUNE,
  TEDARUKCULER,
  kateqoriyaTap,
  mehsulTap,
  pulsuzCatdirilma,
  rayonaCatdirilir,
  tedarukcuTap,
} from "./kataloq.js";
import { CROP_KEYS } from "../../src/services/crops.js";
import { rayonKoduDuzgun } from "../rayonlar.js";
import { hasIcon } from "../../src/components/icons.js";

/**
 * Kataloq MƏLUMATDIR, kod deyil — amma server qiyməti buradan oxuyur, ona
 * görə formasının pozulması maliyyə xətasıdır. Bu testlər məlumatın
 * BÜTÖVLÜYÜNÜ yoxlayır: hər istinad mövcud olmalı, hər rəqəm mənalı olmalı.
 */
describe("bazar kataloqu — bütövlük", () => {
  it("nümunə kimi işarələnib və versiyalıdır", () => {
    expect(NUMUNE).toBe(true);
    expect(KATALOQ_VERSIYA).toMatch(/^numune-/);
  });

  it("məhsul kodları unikaldır və URL-ə yarayır", () => {
    const kodlar = MEHSULLAR.map((m) => m.kod);
    expect(new Set(kodlar).size).toBe(kodlar.length);
    for (const kod of kodlar) expect(kod).toMatch(/^[a-z0-9-]+$/);
  });

  it("hər məhsul mövcud kateqoriya və tədarükçüyə istinad edir", () => {
    for (const m of MEHSULLAR) {
      expect(kateqoriyaTap(m.kateqoriya), m.kod).not.toBeNull();
      expect(tedarukcuTap(m.tedarukcu), m.kod).not.toBeNull();
    }
  });

  it("qiymət, say sərhədləri və stok halı mənalıdır", () => {
    for (const m of MEHSULLAR) {
      expect(m.qiymet, m.kod).toBeGreaterThan(0);
      // Qəpikdən xırda qiymət yoxdur — NUMERIC(12,2) ilə eyni dəqiqlik
      expect(Math.round(m.qiymet * 100) / 100, m.kod).toBe(m.qiymet);
      expect(Number.isInteger(m.minSay) && m.minSay >= 1, m.kod).toBe(true);
      expect(m.maxSay, m.kod).toBeGreaterThanOrEqual(m.minSay);
      expect(["var", "az", "yoxdur"], m.kod).toContain(m.stok);
      expect(m.elaveTarixi, m.kod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("bazar qiymətinin mənbə və yoxlanma tarixi var", () => {
    const bazarQiymetleri = MEHSULLAR.filter((m) => m.qiymetNovu === "bazar");
    expect(bazarQiymetleri.length).toBeGreaterThanOrEqual(6);
    for (const m of bazarQiymetleri) {
      expect(m.qiymetMenbe?.ad, m.kod).toBeTruthy();
      expect(m.qiymetMenbe?.url, m.kod).toMatch(/^https:\/\//);
      expect(m.qiymetMenbe?.yoxlanib, m.kod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("bitki istinadları kanonik kodlardır; foto yalnız mövcud bitkiyə bağlanır", () => {
    for (const m of MEHSULLAR) {
      for (const b of m.bitkiler) expect(CROP_KEYS, `${m.kod} → ${b}`).toContain(b);
      if (m.sekil.nov === "bitki") expect(CROP_KEYS, m.kod).toContain(m.sekil.kod);
    }
  });

  it("rayon əhatələri yalnız mövcud rayon kodlarından ibarətdir", () => {
    const yoxla = (siyahi, kim) => {
      if (siyahi === "*") return;
      for (const kod of siyahi) expect(rayonKoduDuzgun(kod), `${kim} → ${kod}`).toBe(true);
    };
    for (const m of MEHSULLAR) yoxla(m.rayonlar, m.kod);
    for (const s of TEDARUKCULER) yoxla(s.rayonlar, s.kod);
  });

  it("kateqoriya ikonları Icon siyahısındadır və hər kateqoriyada məhsul var", () => {
    for (const k of KATEQORIYALAR) {
      expect(hasIcon(k.ikon), k.kod).toBe(true);
      expect(MEHSULLAR.some((m) => m.kateqoriya === k.kod), k.kod).toBe(true);
    }
  });

  it("bitki mühafizəsi məhsullarında doza yazılışı yoxdur (layihə qaydası)", () => {
    // "2 ml/l", "300 q/ha" kimi normalar məhsul mətnində olmamalıdır —
    // norma etiketə və AQTA reyestrinə görədir (bax: README)
    const doza = /\d+(?:[.,]\d+)?\s*(?:ml|q|g|kq|l)\s*\/\s*(?:ha|l|hektar)/i;
    for (const m of MEHSULLAR.filter((m) => m.kateqoriya === "muhafize")) {
      expect(doza.test(`${m.tesvir} ${m.tetbiq}`), m.kod).toBe(false);
    }
  });
});

describe("kataloq köməkçiləri", () => {
  it("naməlum kod üçün null qaytarır", () => {
    expect(mehsulTap("yoxdur")).toBeNull();
    expect(tedarukcuTap("yoxdur")).toBeNull();
    expect(kateqoriyaTap("yoxdur")).toBeNull();
  });

  it("rayona çatdırılma məhsul VƏ tədarükçü əhatəsini birlikdə yoxlayır", () => {
    const pambiq = mehsulTap("pambiq-toxumu-25kq"); // yalnız aran
    expect(rayonaCatdirilir(pambiq, "berde")).toBe(true);
    expect(rayonaCatdirilir(pambiq, "quba")).toBe(false);
    const yem = mehsulTap("qarisiq-yem-40kq"); // tədarükçü: aran
    expect(rayonaCatdirilir(yem, "seki")).toBe(false);
    // Rayon məlum deyilsə məhdudlaşdırmırıq
    expect(rayonaCatdirilir(pambiq, null)).toBe(true);
  });

  it("pulsuz çatdırılma tədarükçü haqqından çıxır", () => {
    expect(pulsuzCatdirilma(mehsulTap("bugda-toxumu-qobustan"))).toBe(true);
    expect(pulsuzCatdirilma(mehsulTap("karbamid-46-50kq"))).toBe(false);
  });
});
