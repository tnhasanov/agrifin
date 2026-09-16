import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/render.jsx";
import { SubsidiyaKarti } from "./SubsidiyaKarti.jsx";

const INDI = new Date("2026-10-10T00:00:00Z");
const YAZ = new Date("2026-04-01T00:00:00Z");

describe("SubsidiyaKarti — təxmini əkin subsidiyası (2026 tarif matrisi)", () => {
  it("sahə və ya bitki yoxdursa heç nə göstərmir", () => {
    renderApp(<SubsidiyaKarti bitki="bugda" hektar={null} />);
    renderApp(<SubsidiyaKarti bitki={null} hektar={10} />);
    expect(screen.queryByText("Təxmini əkin subsidiyası")).not.toBeInTheDocument();
  });

  it("Bərdə, 10,02 ha buğda, suvarma bilinmir: tək rəqəm YOX, 2.004–2.905,80 aralığı + sual + çatışmayanlar", () => {
    const onSuvarma = vi.fn();
    renderApp(<SubsidiyaKarti bitki="bugda" hektar={10.02} suvarma={null} onSuvarma={onSuvarma} indi={INDI} />);
    expect(screen.getByText("Təxmini əkin subsidiyası")).toBeInTheDocument();
    expect(screen.getByText("İlkin təxmin")).toBeInTheDocument();
    expect(screen.getByText("~2.004 ₼")).toBeInTheDocument();
    expect(screen.getByText("2.905,80 ₼")).toBeInTheDocument();
    expect(screen.queryByText("~2.505 ₼")).not.toBeInTheDocument();
    expect(screen.getByText(/Sahəniz necə suvarılır\?/)).toBeInTheDocument();
    // Buğdanın üç real tarifi var → üç çip
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(3);
    // Kredit hesablamasına daxil edilən məbləğ AYRICA və 0-dır
    expect(screen.getByText("Kredit hesablamasına daxil edilən məbləğ")).toBeInTheDocument();
    expect(screen.getByText("0 ₼")).toBeInTheDocument();
    // Çatışmayan məlumatlar ayrıca sadalanır
    expect(screen.getByText("Çatışmayan məlumatlar")).toBeInTheDocument();
    expect(screen.getByText(/suvarma üsulu, uyğunluğun təsdiqi, sertifikatlı toxum qaydası, tarifin rəsmi səhifə ilə yoxlanması/)).toBeInTheDocument();
    // Mənbə: link kliklənir, "rəsmi təsdiqlənib" YOXDUR, "nümunə" sözü yoxdur
    const link = screen.getByRole("link", { name: /Mənbə: .*2026/ });
    expect(link).toHaveAttribute("href", "https://agro.gov.az/az/news/010920254");
    expect(link.textContent).toMatch(/hələ tutuşdurulmayıb/);
    expect(screen.queryByText(/rəsmi təsdiqlənib/)).not.toBeInTheDocument();
    expect(screen.queryByText(/nümunə/i)).not.toBeInTheDocument();

    screen.getByRole("button", { name: "Müasir suvarma" }).click();
    expect(onSuvarma).toHaveBeenCalledWith("muasir");
    expect(document.querySelectorAll(".btn--primary")).toHaveLength(0);
  });

  it("müasir suvarma seçilib: tək rəqəm 2.905,80, əsas '10,02 ha × 290 ₼/ha', dövr 30 dekabra qədər açıq", () => {
    renderApp(<SubsidiyaKarti bitki="bugda" hektar={10.02} suvarma="muasir" indi={INDI} />);
    expect(screen.getByText("~2.905,80 ₼")).toBeInTheDocument();
    expect(screen.getByText("10,02 ha × 290 ₼/ha")).toBeInTheDocument();
    expect(screen.getByText(/1 sentyabr – dekabrın son iş günü · açıqdır/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Müasir suvarma" })).toHaveAttribute("aria-pressed", "true");
    // Tarif səhifədən tutuşdurulmayıb → hələ də təsdiqsiz, limitdə 0
    expect(screen.getByText(/hələ tutuşdurulmayıb/)).toBeInTheDocument();
    expect(screen.getByText("0 ₼")).toBeInTheDocument();
    expect(screen.queryByText(/suvarma üsulu,/)).not.toBeInTheDocument();
  });

  it("qarğıdalı: yalnız iki çip (dəmyə tarifi yoxdur), aralıq 1.002–1.603,20", () => {
    renderApp(<SubsidiyaKarti bitki="qargidali" hektar={10.02} suvarma={null} indi={YAZ} />);
    expect(screen.getByRole("button", { name: "Müasir suvarma" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Qeyri-müasir suvarma" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dəmyə" })).not.toBeInTheDocument();
    expect(screen.getByText("~1.002 ₼")).toBeInTheDocument();
    expect(screen.getByText("1.603,20 ₼")).toBeInTheDocument();
  });

  it("pambıq: hektar rəqəmi YOX, məhsul subsidiyası 215–200 ₼/ton, şərtlər təsdiqlənməyib", () => {
    renderApp(<SubsidiyaKarti bitki="pambiq" hektar={10.02} suvarma="muasir" indi={YAZ} />);
    expect(screen.getByText("Məhsul subsidiyası")).toBeInTheDocument();
    expect(screen.getByText(/215 ₼–200 ₼\/ton · şərtlər təsdiqlənməyib/)).toBeInTheDocument();
    expect(screen.queryByText(/2\.905,80/)).not.toBeInTheDocument();
    expect(screen.queryByText(/100 ₼\/ton/)).not.toBeInTheDocument();
    expect(screen.getByText("0 ₼")).toBeInTheDocument();
  });

  it("bağ (alma): rəqəm uydurulmur, səbəb yazılır", () => {
    renderApp(<SubsidiyaKarti bitki="alma" hektar={10.02} indi={INDI} />);
    expect(screen.getByText("Təxmini əkin subsidiyası")).toBeInTheDocument();
    expect(screen.getByText(/Bağlar üçün dərəcə/)).toBeInTheDocument();
    expect(screen.queryByText(/~/)).not.toBeInTheDocument();
  });
});
