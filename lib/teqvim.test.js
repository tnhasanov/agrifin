import { describe, expect, it } from "vitest";
import { KC, faza, kcTap, novbetiAy, teqvimQur } from "./teqvim.js";
import { BITKILER } from "./knowledge.js";

describe("Kc cədvəli", () => {
  it("hər bitki üçün əmsal var", () => {
    for (const key of Object.keys(BITKILER)) {
      expect(KC[key], key).toBeTruthy();
    }
  });

  // Kc orta mərhələdə ən yüksəkdir — bitki tam örtük verəndə su ən çox lazımdır
  it("orta faza həmişə başlanğıcdan yüksəkdir", () => {
    for (const [key, deyer] of Object.entries(KC)) {
      expect(deyer.orta, key).toBeGreaterThan(deyer.ini);
      expect(deyer.orta, key).toBeGreaterThan(deyer.son);
    }
  });
});

describe("faza təxmini", () => {
  it("sıraya görə üçə bölür", () => {
    expect(faza(0, 6)).toBe("ini");
    expect(faza(1, 6)).toBe("ini");
    expect(faza(2, 6)).toBe("orta");
    expect(faza(3, 6)).toBe("orta");
    expect(faza(4, 6)).toBe("son");
    expect(faza(5, 6)).toBe("son");
  });

  it("yararsız girişdə ortaya düşür", () => {
    expect(faza(NaN, 6)).toBe("orta");
    expect(faza(0, 0)).toBe("orta");
  });
});

describe("ay hesabı", () => {
  it("dekabrdan sonra yanvara keçir", () => {
    expect(novbetiAy(12)).toBe(1);
    expect(novbetiAy(8)).toBe(9);
  });
});

describe("Kc tapma", () => {
  // Buğda aprelde sünbülləyir — su tələbatı ən yüksək dövr
  it("aktiv mərhələdə əmsal qaytarır", () => {
    expect(kcTap("bugda", 4)).toBeGreaterThan(0.5);
  });

  // Buğda avqustda biçilib, sahə boşdur — su tələbatı hesablanmamalıdır
  it("mərhələsi olmayan ayda null qaytarır", () => {
    expect(kcTap("bugda", 8)).toBeNull();
  });

  it("tanınmayan bitkidə null qaytarır", () => {
    expect(kcTap("banan", 5)).toBeNull();
  });
});

describe("təqvim", () => {
  it("bu ayın və növbəti ayın mərhələlərini verir", () => {
    const teqvim = teqvimQur("bugda", 3);
    expect(teqvim.ad).toBe("Payızlıq buğda");
    expect(teqvim.cari.length).toBeGreaterThan(0);
    expect(teqvim.cari[0]).toHaveProperty("isler");
    expect(teqvim.novbeti.length).toBeGreaterThan(0);
  });

  // Aqronom yoxlaması hələ yoxdur — ekran bunu göstərməlidir
  it("yoxlanma vəziyyətini olduğu kimi ötürür", () => {
    expect(teqvimQur("bugda", 3).yoxlanildi).toBe(false);
  });

  it("yararsız girişdə null qaytarır", () => {
    expect(teqvimQur("banan", 3)).toBeNull();
    expect(teqvimQur("bugda", 0)).toBeNull();
    expect(teqvimQur("bugda", 13)).toBeNull();
    expect(teqvimQur("bugda", 3.5)).toBeNull();
  });

  // Hər bitkinin ilin hansısa ayında işi olmalıdır — boş təqvim səhv deməkdir
  it("hər bitkinin ən azı bir aktiv ayı var", () => {
    for (const key of Object.keys(BITKILER)) {
      const aylar = [];
      for (let ay = 1; ay <= 12; ay += 1) {
        if (teqvimQur(key, ay).cari.length > 0) aylar.push(ay);
      }
      expect(aylar.length, key).toBeGreaterThan(2);
    }
  });
});
