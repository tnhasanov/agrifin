import { describe, expect, it } from "vitest";
import { DOZA_REGEX, dozaQoruyucusuYarat } from "./dozaQoruyucu.js";

/** Mətni verilmiş ölçüdə parçalara bölür */
function parcala(metn, olcu) {
  const parcalar = [];
  for (let i = 0; i < metn.length; i += olcu) parcalar.push(metn.slice(i, i + olcu));
  return parcalar;
}

/** Qoruyucunu parçalarla işlədir və çıxan mətni toplayır */
function axinIsleded(metn, olcu) {
  const qoruyucu = dozaQoruyucusuYarat();
  let cixis = "";
  for (const parca of parcala(metn, olcu)) {
    const netice = qoruyucu.elaveEt(parca);
    if (netice.bloklandi) return { bloklandi: true, cixis };
    cixis += netice.metn;
  }
  const son = qoruyucu.bosalt();
  if (son.bloklandi) return { bloklandi: true, cixis };
  return { bloklandi: false, cixis: cixis + son.metn };
}

const TEHLUKESIZ =
  "Ehtimal olunan problem: sarı pas. Yarpaqlarda cərgə şəklində sarı-narıncı " +
  "toz ləkələri var. Sahənin bir neçə yerində yarpaqları yoxlayın və yayılma " +
  "sürətini izləyin. Dəqiq preparat üçün yerli dilerlə təsdiqləyin.";

describe("doza qoruyucusu", () => {
  it("təhlükəsiz mətni tam və dəyişməz buraxır", () => {
    for (const olcu of [1, 3, 7, 40, 500]) {
      const { bloklandi, cixis } = axinIsleded(TEHLUKESIZ, olcu);
      expect(bloklandi, `parça ölçüsü ${olcu}`).toBe(false);
      expect(cixis, `parça ölçüsü ${olcu}`).toBe(TEHLUKESIZ);
    }
  });

  // Əsas təhlükəsizlik xassəsi: doza parçalara necə bölünsə də ekrana düşməməlidir
  it.each([
    "Sahəyə 2 l/ha vurun.",
    "Norma 1.5 litr/hektar olmalıdır.",
    "Hər sahəyə 250 qram/ha verin.",
    "Tövsiyə: 40 ml/litr qarışıq hazırlayın.",
    "İstifadə 3 kq/hektar həddindədir.",
    TEHLUKESIZ + " Sonra 2 l/ha əlavə edin.",
  ])("dozanı bloklayır və heç bir parça ölçüsündə sızdırmır: %s", (metn) => {
    // 1-dən mətnin tam uzunluğuna qədər BÜTÜN parça ölçüləri
    for (let olcu = 1; olcu <= metn.length; olcu += 1) {
      const { bloklandi, cixis } = axinIsleded(metn, olcu);
      expect(bloklandi, `parça ölçüsü ${olcu}`).toBe(true);
      // Çıxmış mətndə doza forması olmamalıdır
      expect(DOZA_REGEX.test(cixis), `parça ölçüsü ${olcu} sızdırdı: ${cixis}`).toBe(false);
    }
  });

  it("simvol-simvol axında da dozanı tutur (ən çətin hal)", () => {
    const qoruyucu = dozaQoruyucusuYarat();
    let cixis = "";
    let bloklandi = false;
    for (const herf of "Sahəyə 2 l/ha vurun.") {
      const netice = qoruyucu.elaveEt(herf);
      if (netice.bloklandi) {
        bloklandi = true;
        break;
      }
      cixis += netice.metn;
    }
    expect(bloklandi).toBe(true);
    expect(cixis).not.toContain("l/ha");
  });

  it("gecikdirmə buferi son simvolları saxlayır, sonda buraxır", () => {
    const qoruyucu = dozaQoruyucusuYarat({ gecikdirme: 10 });
    const ilk = qoruyucu.elaveEt("0123456789ABCDEFGHIJ"); // 20 simvol
    expect(ilk.metn).toBe("0123456789"); // son 10 saxlanıldı
    expect(qoruyucu.bosalt().metn).toBe("ABCDEFGHIJ");
  });

  it("tamMetn bütün qəbul edilmiş mətni saxlayır", () => {
    const qoruyucu = dozaQoruyucusuYarat();
    qoruyucu.elaveEt("Salam ");
    qoruyucu.elaveEt("dünya");
    expect(qoruyucu.tamMetn).toBe("Salam dünya");
  });

  it("boş axında çökmür", () => {
    const qoruyucu = dozaQoruyucusuYarat();
    expect(qoruyucu.bosalt()).toEqual({ bloklandi: false, metn: "" });
  });

  it("adi rəqəmləri və ölçüləri səhvən bloklamır", () => {
    const adi =
      "NDVI 0.72-dir. Sahə 6.5 ha-dır. Temperatur 34°C. 3 gün ərzində 12 mm yağış " +
      "gözlənilir. Suvarma 2 dəfə lazımdır.";
    const { bloklandi, cixis } = axinIsleded(adi, 5);
    expect(bloklandi).toBe(false);
    expect(cixis).toBe(adi);
  });
});
