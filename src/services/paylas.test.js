import { describe, expect, it, vi } from "vitest";
import { WA_UNVAN, hesabatSetirleri, paylas } from "./paylas.js";

const acarlar = (setirler) => setirler.map((s) => s.key);

describe("hesabatSetirleri", () => {
  const tam = {
    hektar: 5.21,
    bitkiKey: "kbcrop.bugda",
    faiz: 68,
    medyanFaiz: 58,
    suSeviyyesi: "kafi",
    gun: 2,
    siqnalKey: "siqnal.suvar.basliq",
  };

  it("bütün məlumat olanda sahə, örtük, su, siqnal və tarixi yazır", () => {
    expect(acarlar(hesabatSetirleri(tam))).toEqual([
      "paylas.saheBitki",
      "paylas.ortukQonsu",
      "ndvi.water.kafi",
      "paylas.siqnal",
      "paylas.olcme",
    ]);
  });

  // Aqronom ilk olaraq problemi axtarır — siqnal ölçmə tarixindən əvvəl gəlir
  it("siqnalı tarixdən əvvəl qoyur", () => {
    const s = acarlar(hesabatSetirleri(tam));
    expect(s.indexOf("paylas.siqnal")).toBeLessThan(s.indexOf("paylas.olcme"));
  });

  it("bitki seçilməyibsə sadə sahə sətri yazır", () => {
    const s = hesabatSetirleri({ ...tam, bitkiKey: null });
    expect(acarlar(s)).toContain("paylas.sahe");
    expect(acarlar(s)).not.toContain("paylas.saheBitki");
  });

  it("qonşu ölçməsi yoxdursa medianı iddia etmir", () => {
    const s = hesabatSetirleri({ ...tam, medyanFaiz: null });
    expect(acarlar(s)).toContain("paylas.ortuk");
    expect(acarlar(s)).not.toContain("paylas.ortukQonsu");
  });

  // Boş hesabat aqronomu çaşdırır: olmayan sətir "—" kimi getməməlidir
  it("olmayan ölçmələri buraxır", () => {
    expect(hesabatSetirleri({})).toEqual([]);
    expect(acarlar(hesabatSetirleri({ faiz: 68 }))).toEqual(["paylas.ortuk"]);
  });
});

describe("paylas", () => {
  const pencere = () => ({ open: vi.fn(() => ({})) });

  it("telefonun paylaşma vərəqini açır", async () => {
    const nav = { share: vi.fn(async () => {}) };
    const pen = pencere();
    expect(await paylas({ metn: "salam", basliq: "AgriFin", nav, pencere: pen })).toBe("paylasildi");
    expect(nav.share).toHaveBeenCalledWith({ title: "AgriFin", text: "salam" });
    // Vərəq açıldısa wa.me AYRICA açılmamalıdır
    expect(pen.open).not.toHaveBeenCalled();
  });

  // Fermer vərəqi bağlayıbsa fikrini dəyişib — üstünə WhatsApp açmaq olmaz
  it("fermer imtina edəndə heç nə açmır", async () => {
    const xeta = new Error("bağlandı");
    xeta.name = "AbortError";
    const nav = { share: vi.fn(async () => { throw xeta; }) };
    const pen = pencere();
    expect(await paylas({ metn: "salam", nav, pencere: pen })).toBe("legv");
    expect(pen.open).not.toHaveBeenCalled();
  });

  it("vərəq yoxdursa WhatsApp-ı açır və mətni kodlayır", async () => {
    const pen = pencere();
    expect(await paylas({ metn: "örtük 68%", nav: {}, pencere: pen })).toBe("whatsapp");
    const [url] = pen.open.mock.calls[0];
    expect(url.startsWith(WA_UNVAN)).toBe(true);
    expect(decodeURIComponent(url.slice(WA_UNVAN.length))).toBe("örtük 68%");
  });

  it("vərəq xəta verəndə WhatsApp-a keçir", async () => {
    const nav = { share: vi.fn(async () => { throw new Error("dəstəklənmir"); }) };
    const pen = pencere();
    expect(await paylas({ metn: "salam", nav, pencere: pen })).toBe("whatsapp");
  });

  // Masaüstü brauzer pəncərəni bloklaya bilər — mətn heç olmasa buferə düşsün
  it("pəncərə açılmasa mətni buferə kopyalayır", async () => {
    const nav = { clipboard: { writeText: vi.fn(async () => {}) } };
    const pen = { open: vi.fn(() => null) };
    expect(await paylas({ metn: "salam", nav, pencere: pen })).toBe("kopyalandi");
    expect(nav.clipboard.writeText).toHaveBeenCalledWith("salam");
  });

  it("heç bir yol işləmirsə açıq şəkildə uğursuz olur", async () => {
    expect(await paylas({ metn: "salam", nav: {}, pencere: { open: () => null } })).toBe("olmadi");
    expect(await paylas({ metn: "", nav: {}, pencere: pencere() })).toBe("olmadi");
  });
});
