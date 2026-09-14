import { describe, expect, it } from "vitest";
import {
  BOS_SUZGEC,
  kateqoriyalariAxtar,
  mehsullariAxtar,
  sirala,
  suzgecSayi,
  suzgecTetbiq,
  tovsiyeBali,
} from "./axtaris.js";
import { MEHSULLAR, mehsulTap } from "./kataloq.js";

describe("mehsullariAxtar", () => {
  it("aksentsiz və hərf ölçüsündən asılı olmadan tapır", () => {
    const kodlar = mehsullariAxtar("GUBRE").map((m) => m.kod);
    expect(kodlar).toContain("karbamid-46-50kq");
    expect(kodlar).toContain("npk-15-15-15-50kq");
    expect(kodlar).not.toContain("pomidor-toxumu-f1");
  });

  it("məhsul adı, brend, tədarükçü və kateqoriya sözü ilə axtarır", () => {
    expect(mehsullariAxtar("karbamid").map((m) => m.kod)).toEqual(["karbamid-46-50kq"]);
    expect(mehsullariAxtar("aqualine").every((m) => m.brend === "AquaLine")).toBe(true);
    expect(mehsullariAxtar("agrosupply").every((m) => m.tedarukcu === "agrosupply")).toBe(true);
    expect(mehsullariAxtar("toxum").length).toBeGreaterThan(5);
  });

  it("bir neçə söz VƏ ilə birləşir", () => {
    // "npk" kateqoriya sözüdür (bütün gübrələr), "16" yalnız real NPK 16-16-16 elanında var
    expect(mehsullariAxtar("npk 16").map((m) => m.kod)).toEqual(["npk-15-15-15-50kq"]);
    expect(mehsullariAxtar("npk traktor")).toEqual([]);
  });

  it("iki hərfdən qısa sorğu süzmür", () => {
    expect(mehsullariAxtar("k")).toHaveLength(MEHSULLAR.length);
    expect(mehsullariAxtar("")).toHaveLength(MEHSULLAR.length);
  });

  it("kateqoriya çipləri sorğuya görə seçilir", () => {
    expect(kateqoriyalariAxtar("suvar").map((k) => k.kod)).toEqual(["suvarma"]);
    expect(kateqoriyalariAxtar("x")).toEqual([]);
  });
});

describe("suzgecTetbiq", () => {
  it("boş süzgəc heç nəyi atmır", () => {
    expect(suzgecTetbiq(MEHSULLAR, BOS_SUZGEC)).toHaveLength(MEHSULLAR.length);
    expect(suzgecSayi(BOS_SUZGEC)).toBe(0);
  });

  it("kateqoriya, qiymət aralığı, maliyyə və təsdiqli satıcı", () => {
    const gubre = suzgecTetbiq(MEHSULLAR, { ...BOS_SUZGEC, kateqoriya: "gubre" });
    expect(gubre.every((m) => m.kateqoriya === "gubre")).toBe(true);

    const ucuz = suzgecTetbiq(MEHSULLAR, { ...BOS_SUZGEC, qiymet: "0-50" });
    expect(ucuz.every((m) => m.qiymet < 50)).toBe(true);
    expect(ucuz.some((m) => m.kod === "karbamid-46-50kq")).toBe(true);

    const baha = suzgecTetbiq(MEHSULLAR, { ...BOS_SUZGEC, qiymet: "1000+" });
    expect(baha.map((m) => m.kod)).toContain("mini-traktor-25");
    expect(baha.every((m) => m.qiymet >= 1000)).toBe(true);

    expect(suzgecTetbiq(MEHSULLAR, { ...BOS_SUZGEC, maliyye: true }).every((m) => m.maliyye)).toBe(true);
    const tesdiqli = suzgecTetbiq(MEHSULLAR, { ...BOS_SUZGEC, tesdiqli: true });
    expect(tesdiqli.some((m) => m.tedarukcu === "ferma-market")).toBe(false);
  });

  it("rayon süzgəci çatdırılmayanları atır", () => {
    const quba = suzgecTetbiq(MEHSULLAR, { ...BOS_SUZGEC, rayonKod: "quba" });
    expect(quba.some((m) => m.kod === "pambiq-toxumu-25kq")).toBe(false);
    expect(quba.some((m) => m.kod === "karbamid-46-50kq")).toBe(true);
  });

  it("aktiv süzgəc sayı düzgün sayılır", () => {
    expect(suzgecSayi({ ...BOS_SUZGEC, kateqoriya: "gubre", maliyye: true, qiymet: "0-50" })).toBe(3);
  });
});

describe("sirala", () => {
  it("qiymətə görə artan/azalan", () => {
    const artan = sirala(MEHSULLAR, "qiymetArtan").map((m) => m.qiymet);
    expect(artan).toEqual([...artan].sort((a, b) => a - b));
    const azalan = sirala(MEHSULLAR, "qiymetAzalan").map((m) => m.qiymet);
    expect(azalan[0]).toBe(18500);
  });

  it("yeni məhsullar tarixə görə, ən yenisi əvvəldə", () => {
    const yeni = sirala(MEHSULLAR, "yeni").map((m) => m.elaveTarixi);
    for (let i = 1; i < yeni.length; i += 1) expect(yeni[i - 1] >= yeni[i]).toBe(true);
  });

  it("tövsiyə: fermerin bitkisinə uyğun məhsul əvvəldə, stoksuz sonda", () => {
    const pomidor = sirala(MEHSULLAR, "tovsiye", { bitki: "pomidor" });
    expect(pomidor[0].bitkiler).toContain("pomidor");
    // Bitkiyə uyğunluq populyarlığı üstələyir
    expect(tovsiyeBali(mehsulTap("pomidor-toxumu-f1"), { bitki: "pomidor" })).toBeGreaterThan(
      tovsiyeBali(mehsulTap("bugda-toxumu-qobustan"), { bitki: "pomidor" }),
    );
    // Giriş massivi dəyişmir
    const kopya = [...MEHSULLAR];
    sirala(MEHSULLAR, "qiymetAzalan");
    expect(MEHSULLAR).toEqual(kopya);
  });
});
