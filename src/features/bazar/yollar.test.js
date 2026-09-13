import { describe, expect, it } from "vitest";
import { altYolOxu, bazarYolu, valideynYolu } from "./yollar.js";
import { routeForPath } from "../../routes.js";

describe("bazar alt-yolları", () => {
  it("hər alt-yol bazar marşrutuna düşür və düzgün ekrana açılır", () => {
    const hallar = [
      [bazarYolu.ev(), "ev", null],
      [bazarYolu.kateqoriya("gubre"), "kateqoriya", "gubre"],
      [bazarYolu.axtar(), "axtar", null],
      [bazarYolu.mehsul("karbamid-46-50kq"), "mehsul", "karbamid-46-50kq"],
      [bazarYolu.tedarukcu("agrosupply"), "tedarukcu", "agrosupply"],
      [bazarYolu.sebet(), "sebet", null],
      [bazarYolu.sifaris(), "sifaris", null],
      [bazarYolu.sifarisler(), "sifarisler", null],
      [bazarYolu.sifarisDetal(12), "sifarisDetal", "12"],
      [bazarYolu.tovsiye(), "tovsiye", null],
    ];
    for (const [yol, ekran, param] of hallar) {
      expect(routeForPath(yol).id, yol).toBe("bazar");
      expect(altYolOxu(yol), yol).toMatchObject({ ekran, param });
    }
  });

  it("naməlum alt-yol ana səhifəyə düşür, başqa marşrutlar toxunulmur", () => {
    expect(altYolOxu("/bazar/uydurma/x").ekran).toBe("ev");
    expect(altYolOxu("/bazar/kateqoriya").ekran).toBe("ev");
    expect(routeForPath("/bazarlar").id).toBe("home");
    expect(routeForPath("/market").id).toBe("market");
  });

  it("geri oxu determinist hədəfə aparır", () => {
    expect(valideynYolu(altYolOxu(bazarYolu.mehsul("x")), { kateqoriya: "gubre" })).toBe(bazarYolu.kateqoriya("gubre"));
    expect(valideynYolu(altYolOxu(bazarYolu.sifaris()))).toBe(bazarYolu.sebet());
    expect(valideynYolu(altYolOxu(bazarYolu.sifarisDetal(3)))).toBe(bazarYolu.sifarisler());
    expect(valideynYolu(altYolOxu(bazarYolu.sebet()))).toBe(bazarYolu.ev());
  });
});
