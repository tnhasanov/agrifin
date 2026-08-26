import { describe, expect, it } from "vitest";
import { MOVSUM, bicinTarixi, bicineQalanAy, movsumGedisi } from "./movsum.js";
import { CROP_KEYS } from "./crops.js";
import { BITKILER } from "../../lib/knowledge.js";

describe("mövsüm xəritəsi", () => {
  // Xəritə bilik bazasının surətidir (bazanın özü müştəriyə göndərilmir) —
  // baza dəyişəndə xəritə səssizcə köhnəlməsin deyə uyğunluq yoxlanılır
  it("bilik bazasındakı mərhələlərlə üst-üstə düşür", () => {
    for (const bitki of CROP_KEYS) {
      const merheleler = BITKILER[bitki].merhaleler;
      const ilkAy = merheleler[0].ay[0];
      const sonMerhele = merheleler[merheleler.length - 1];
      const sonAy = sonMerhele.ay[sonMerhele.ay.length - 1];
      expect(MOVSUM[bitki], bitki).toEqual({ basla: ilkAy, bicin: sonAy });
    }
  });

  it("hər bitki üçün sərhəd var, artıq açar yoxdur", () => {
    expect(Object.keys(MOVSUM).sort()).toEqual([...CROP_KEYS].sort());
  });
});

describe("biçinə qalan ay", () => {
  // Buğdanın biçini iyundur (6)
  it("biçindən əvvəl qalan ayı sayır", () => {
    expect(bicineQalanAy("bugda", new Date(2026, 2, 10))).toBe(3); // mart → iyun
    expect(bicineQalanAy("bugda", new Date(2026, 4, 1))).toBe(1); // may → iyun
  });

  it("ili keçən hesab düzgündür", () => {
    expect(bicineQalanAy("bugda", new Date(2026, 9, 5))).toBe(8); // oktyabr → iyun
  });

  // Biçin ayında götürülən kredit GƏLƏN mövsüm üçündür: bu ayın satışına
  // bağlamaq fermerə bir həftəlik borc verərdi
  it("biçin ayında növbəti ilin biçini sayılır", () => {
    expect(bicineQalanAy("bugda", new Date(2026, 5, 15))).toBe(12);
  });

  it("naməlum bitki null qaytarır", () => {
    expect(bicineQalanAy("banan")).toBeNull();
    expect(bicinTarixi("banan")).toBeNull();
  });

  it("tarix həmin biçin ayına düşür", () => {
    const t = bicinTarixi("bugda", new Date(2026, 9, 5));
    expect(t.getMonth() + 1).toBe(6);
    expect(t.getFullYear()).toBe(2027);
  });
});

describe("mövsümün gedişi", () => {
  it("başlanğıcda 0, biçində 1", () => {
    expect(movsumGedisi("bugda", new Date(2026, 9, 1))).toBe(0); // oktyabr
    expect(movsumGedisi("bugda", new Date(2027, 5, 10))).toBe(1); // iyun
  });

  it("ili keçən mövsümdə aralıq dəyər düzgündür", () => {
    // Oktyabr → iyun 8 aydır; fevral 4-cü aydır → 0.5
    expect(movsumGedisi("bugda", new Date(2027, 1, 10))).toBe(0.5);
  });

  // Biçindən sonra, səpindən əvvəl — mövsüm bağlıdır, uydurma faiz yoxdur
  it("mövsümdən kənarda null qaytarır", () => {
    expect(movsumGedisi("bugda", new Date(2026, 7, 10))).toBeNull(); // avqust
  });
});
