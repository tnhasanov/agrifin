import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../test/render.jsx";
import { SubsidiyaKarti } from "./SubsidiyaKarti.jsx";

describe("SubsidiyaKarti — gözlənilən subsidiya", () => {
  it("sahə və ya bitki yoxdursa heç nə göstərmir", () => {
    renderApp(<SubsidiyaKarti bitki="bugda" hektar={null} />);
    expect(screen.queryByText("Gözlənilən subsidiya")).not.toBeInTheDocument();
    renderApp(<SubsidiyaKarti bitki={null} hektar={10} />);
    expect(screen.queryByText("Gözlənilən subsidiya")).not.toBeInTheDocument();
  });

  it("buğda 10,02 ha: məbləğ təxmini (~), əsas, pəncərə, ilkin nişanı və mənbə", () => {
    renderApp(<SubsidiyaKarti bitki="bugda" hektar={10.02} indi={new Date("2026-11-15")} />);
    expect(screen.getByText("Gözlənilən subsidiya")).toBeInTheDocument();
    expect(screen.getByText("İlkin")).toBeInTheDocument();
    // Amount: oxunan mətn tək düyündür, "~" təxmin işarəsi ilə
    expect(screen.getByText("~2.505 ₼")).toBeInTheDocument();
    expect(screen.getByText("10,02 ha × 250 ₼/ha")).toBeInTheDocument();
    expect(screen.getByText(/Oktyabr–Dekabr · açıqdır/)).toBeInTheDocument();
    expect(screen.getByText(/İlkin cədvəl · ilkin-2026-01/)).toBeInTheDocument();
    // Kredit rəqəmlərinin yanında "nümunə/demo" sözü olmur (Pano.test qaydası)
    expect(screen.queryByText(/nümunə/i)).not.toBeInTheDocument();
    // Vəd yoxdur: "rəsmi məbləğ" ifadəsi yalnız qərara istinadla
    expect(screen.queryByText(/təsdiqlənmiş məbləğ/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll(".btn--primary")).toHaveLength(0);
  });

  it("dərəcəsi olmayan bitkidə bölmə göstərilmir — məbləğ də, rədd də uydurulmur", () => {
    renderApp(<SubsidiyaKarti bitki="pomidor" hektar={10.02} />);
    expect(screen.queryByText("Gözlənilən subsidiya")).not.toBeInTheDocument();
  });
});
