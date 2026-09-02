import { describe, expect, it } from "vitest";
import { bloklaraBol, vurguParcalari } from "./cavabMetni.js";

describe("cavab mətninin bölünməsi", () => {
  it("hər sətir ayrı abzasdır, boş sətirlər atılır", () => {
    expect(bloklaraBol("Birinci sətir.\n\n\nİkinci sətir.")).toEqual([
      { nov: "abzas", metn: "Birinci sətir." },
      { nov: "abzas", metn: "İkinci sətir." },
    ]);
  });

  it("tire ilə başlayan sətir maddə olur", () => {
    expect(bloklaraBol("- Suvarmanı saxlayın\n• Yarpağa baxın")).toEqual([
      { nov: "madde", nisan: "•", metn: "Suvarmanı saxlayın" },
      { nov: "madde", nisan: "•", metn: "Yarpağa baxın" },
    ]);
  });

  it("nömrəli addım öz nömrəsini saxlayır", () => {
    expect(bloklaraBol("1) Birinci\n2. İkinci")).toEqual([
      { nov: "madde", nisan: "1", metn: "Birinci" },
      { nov: "madde", nisan: "2", metn: "İkinci" },
    ]);
  });

  it("vurğu ilə başlayan sətir maddə sayılmır", () => {
    expect(bloklaraBol("**Sarı pas** ola bilər.")).toEqual([
      { nov: "abzas", metn: "**Sarı pas** ola bilər." },
    ]);
  });

  it("boş və dəyərsiz giriş boş siyahı verir", () => {
    expect(bloklaraBol("")).toEqual([]);
    expect(bloklaraBol(null)).toEqual([]);
    expect(bloklaraBol(undefined)).toEqual([]);
  });
});

describe("vurğu parçaları", () => {
  it("ikiqat ulduz arasını vurğulayır, işarələri atır", () => {
    expect(vurguParcalari("Bu, **sarı pas** ola bilər.")).toEqual([
      { metn: "Bu, ", vurgu: false },
      { metn: "sarı pas", vurgu: true },
      { metn: " ola bilər.", vurgu: false },
    ]);
  });

  it("bir sətirdə bir neçə vurğu işləyir", () => {
    expect(vurguParcalari("**bu həftə** və **gübrə**")).toEqual([
      { metn: "bu həftə", vurgu: true },
      { metn: " və ", vurgu: false },
      { metn: "gübrə", vurgu: true },
    ]);
  });

  it("axın zamanı bağlanmamış cüt vurğu sayılır — çılpaq ulduz görünmür", () => {
    expect(vurguParcalari("Bu, **sarı pa")).toEqual([
      { metn: "Bu, ", vurgu: false },
      { metn: "sarı pa", vurgu: true },
    ]);
  });

  it("ulduzsuz mətn olduğu kimi qalır", () => {
    expect(vurguParcalari("Adi cümlə")).toEqual([{ metn: "Adi cümlə", vurgu: false }]);
  });
});
