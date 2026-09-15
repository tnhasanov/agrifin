import { describe, expect, it } from "vitest";
import { KATEQORIYALAR, mehsulTap } from "./kataloq.js";
import { MAX_MEHSUL, MAX_QRUP, SIQNAL_XERITESI, siqnalTeklifi, siqnalTeklifleri } from "./siqnalTovsiye.js";

const siqnal = (nov, ciddilik = "diqqet") => ({ id: `${nov}:1`, nov, ciddilik, basliqKey: `siqnal.${nov}.basliq`, icon: "Bug" });

describe("siqnal → bazar xəritəsi", () => {
  it("hər məhsul kodu kataloqda, hər kateqoriya siyahıda var", () => {
    const kateqoriyalar = new Set(KATEQORIYALAR.map((k) => k.kod));
    for (const [nov, x] of Object.entries(SIQNAL_XERITESI)) {
      expect(kateqoriyalar.has(x.kateqoriya), nov).toBe(true);
      expect(x.izahKey, nov).toMatch(/^bazar\.siqnal\./);
      for (const kod of x.mehsullar) expect(mehsulTap(kod), `${nov} → ${kod}`).toBeTruthy();
    }
  });

  it("alış tələb etməyən siqnallar xəritədə yoxdur", () => {
    for (const nov of ["yagis", "suvarmaDayan", "suGolu", "olcmeKohne"]) expect(siqnalTeklifi(nov)).toBeNull();
    expect(siqnalTeklifi("xesteliyRiski")?.kateqoriya).toBe("muhafize");
  });
});

describe("siqnalTeklifleri", () => {
  it("siqnal yoxdursa boşdur; tanınmayan növ atılır", () => {
    expect(siqnalTeklifleri([])).toEqual([]);
    expect(siqnalTeklifleri([siqnal("yagis"), siqnal("olcmeKohne")])).toEqual([]);
  });

  it("təcili siqnal əvvəl gəlir, eyni növdən bir qrup, məhsul təkrarlanmır", () => {
    const qruplar = siqnalTeklifleri([
      siqnal("suvar", "diqqet"),
      siqnal("isti", "tecili"),
      siqnal("isti", "diqqet"),
    ]);
    expect(qruplar.map((q) => q.siqnal.nov)).toEqual(["isti", "suvar"]);
    // damcı lenti hər iki xəritədədir — yalnız istidə (ilk qrup) görünür
    const kodlar = qruplar.flatMap((q) => q.mehsullar.map((m) => m.kod));
    expect(new Set(kodlar).size).toBe(kodlar.length);
    expect(qruplar[0].mehsullar.map((m) => m.kod)).toContain("damci-lenti-16mm-500m");
    expect(qruplar[1].mehsullar.map((m) => m.kod)).not.toContain("damci-lenti-16mm-500m");
  });

  it("qrup və məhsul sayı məhduddur", () => {
    const qruplar = siqnalTeklifleri(
      ["bitkiZeifleyir", "xesteliyRiski", "dermanlama", "suvar", "qonsu"].map((n) => siqnal(n)),
    );
    expect(qruplar.length).toBe(MAX_QRUP);
    for (const q of qruplar) expect(q.mehsullar.length).toBeLessThanOrEqual(MAX_MEHSUL);
  });

  it("bitkiyə uyğun olmayan məhsul atılır, ümumi məhsul qalır", () => {
    // herbisid-taxil yalnız taxıl üçündür — xəritədə yoxdur, amma qayda
    // ümumi olaraq yoxlanır: pomidor əkənə bitki siyahısı boş olan
    // məhsullar (xidmətlər, avadanlıq) verilir
    const qruplar = siqnalTeklifleri([siqnal("xesteliyRiski")], { bitki: "pomidor" });
    expect(qruplar).toHaveLength(1);
    for (const m of qruplar[0].mehsullar) {
      expect(!Array.isArray(m.bitkiler) || m.bitkiler.length === 0 || m.bitkiler.includes("pomidor")).toBe(true);
    }
  });
});
