import { describe, expect, it } from "vitest";
import { bitkiSekli, sekilliBitkiler } from "./bitkiSekilleri.js";
import { CROP_KEYS } from "./crops.js";

/**
 * Bu testlər ŞƏKİLLƏRİN VARLIĞINI tələb etmir: assetlər ayrıca göndərilir və
 * qovluq boş olanda da onboarding işləməlidir. Yoxlanılan şey MÜQAVİLƏDİR —
 * naməlum bitki üçün heç vaxt şəkil qaytarılmır, mövcud kod üçün isə qaytarılan
 * obyektin forması sabitdir.
 */
describe("bitki şəkil xəritəsi", () => {
  it("naməlum kod üçün şəkil qaytarmır — yanlış şəkil boş yuvadan pisdir", () => {
    expect(bitkiSekli("yoxdur")).toBeNull();
    expect(bitkiSekli(null)).toBeNull();
    expect(bitkiSekli("")).toBeNull();
  });

  it("şəkli olan hər bitki üçün ən azı bir format verir", () => {
    for (const kod of sekilliBitkiler()) {
      const sekil = bitkiSekli(kod);
      expect(sekil).not.toBeNull();
      expect(sekil.avif || sekil.webp).toBeTruthy();
    }
  });

  it("yalnız kanonik bitki kodları üçün şəkil olur", () => {
    for (const kod of sekilliBitkiler()) expect(CROP_KEYS).toContain(kod);
  });

  it("şəkil olmayan bitki NULL verir, uydurma yol yox", () => {
    const sekilsiz = CROP_KEYS.filter((kod) => !sekilliBitkiler().includes(kod));
    for (const kod of sekilsiz) expect(bitkiSekli(kod)).toBeNull();
  });
});
