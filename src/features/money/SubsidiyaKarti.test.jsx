import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/render.jsx";
import { SubsidiyaKarti } from "./SubsidiyaKarti.jsx";

const INDI = new Date("2026-10-10T00:00:00Z");

describe("SubsidiyaKarti — təxmini əkin subsidiyası", () => {
  it("sahə və ya bitki yoxdursa heç nə göstərmir", () => {
    renderApp(<SubsidiyaKarti bitki="bugda" hektar={null} />);
    renderApp(<SubsidiyaKarti bitki={null} hektar={10} />);
    expect(screen.queryByText("Təxmini əkin subsidiyası")).not.toBeInTheDocument();
  });

  it("Bərdə, 10,02 ha buğda, suvarma bilinmir: tək rəqəm YOX, 2.004–2.905,80 aralığı + sual", () => {
    const onSuvarma = vi.fn();
    renderApp(<SubsidiyaKarti bitki="bugda" hektar={10.02} suvarma={null} onSuvarma={onSuvarma} indi={INDI} />);
    expect(screen.getByText("Təxmini əkin subsidiyası")).toBeInTheDocument();
    expect(screen.getByText("Təxmini")).toBeInTheDocument();
    expect(screen.getByText("~2.004 ₼")).toBeInTheDocument();
    expect(screen.getByText("2.905,80 ₼")).toBeInTheDocument();
    expect(screen.queryByText("~2.505 ₼")).not.toBeInTheDocument();
    expect(screen.getByText(/Sahəniz necə suvarılır\?/)).toBeInTheDocument();
    // Kredit limitində nəzərə alınan məbləğ AYRICA və 0-dır
    expect(screen.getByText("Kredit limitində nəzərə alınıb")).toBeInTheDocument();
    expect(screen.getByText("0 ₼")).toBeInTheDocument();
    expect(screen.queryByText(/Kredit tavanı hesablanarkən nəzərə alınıb/)).not.toBeInTheDocument();
    // Mənbə: 2026 kampaniyası, hələ tutuşdurulmayıb; "nümunə" sözü yoxdur
    expect(screen.getByText(/2026 kampaniyası/)).toBeInTheDocument();
    expect(screen.getByText(/hələ tutuşdurulmayıb/)).toBeInTheDocument();
    expect(screen.queryByText(/nümunə/i)).not.toBeInTheDocument();

    screen.getByRole("button", { name: "Müasir suvarma" }).click();
    expect(onSuvarma).toHaveBeenCalledWith("muasir");
    expect(document.querySelectorAll(".btn--primary")).toHaveLength(0);
  });

  it("müasir suvarma seçilib: tək rəqəm, əsas, dövr, mənbə tutuşdurulub", () => {
    renderApp(<SubsidiyaKarti bitki="bugda" hektar={10.02} suvarma="muasir" indi={INDI} />);
    expect(screen.getByText("~2.905,80 ₼")).toBeInTheDocument();
    expect(screen.getByText("10,02 ha × 200 ₼ × 1,45")).toBeInTheDocument();
    expect(screen.getByText(/1 sentyabr – dekabrın son iş günü · açıqdır/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Müasir suvarma" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/rəsmi mənbə ilə tutuşdurulub/)).toBeInTheDocument();
    // Mənbə tutuşdurulsa da uyğunluq təsdiqlənməyib → limitdə yenə 0
    expect(screen.getByText("0 ₼")).toBeInTheDocument();
  });

  it("pambıq: məhsul subsidiyası ayrıca sətirdir", () => {
    renderApp(<SubsidiyaKarti bitki="pambiq" hektar={10.02} suvarma="muasir" indi={new Date("2026-04-01T00:00:00Z")} />);
    expect(screen.getByText("Məhsul subsidiyası")).toBeInTheDocument();
    expect(screen.getByText(/100 ₼\/ton/)).toBeInTheDocument();
  });

  it("bağ (alma): rəqəm uydurulmur, səbəb yazılır", () => {
    renderApp(<SubsidiyaKarti bitki="alma" hektar={10.02} indi={INDI} />);
    expect(screen.getByText("Təxmini əkin subsidiyası")).toBeInTheDocument();
    expect(screen.getByText(/Bağlar üçün dərəcə/)).toBeInTheDocument();
    expect(screen.queryByText(/₼/)).not.toBeInTheDocument();
  });
});
