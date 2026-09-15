import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/render.jsx";
import { SiqnalTeklifleri } from "./SiqnalTeklifleri.jsx";

const siqnal = (nov, ciddilik = "diqqet") => ({
  id: `${nov}:1`,
  nov,
  ciddilik,
  icon: "Bug",
  basliqKey: `siqnal.${nov}.basliq`,
  metnKey: `siqnal.${nov}.metn`,
  vars: {},
});

describe("SiqnalTeklifleri — sahə siqnalından bazar təklifi", () => {
  it("siqnal yoxdursa bölmə yoxdur (reklam bloku deyil)", () => {
    renderApp(<SiqnalTeklifleri siqnallar={[]} get={{}} />);
    expect(screen.queryByText("Sahənizin bu həftəki ehtiyacı")).not.toBeInTheDocument();
  });

  it("xəstəlik riski → izah + məhsullar + kateqoriya keçidi, dolu düymə yoxdur", async () => {
    const get = { mehsul: vi.fn(), kateqoriya: vi.fn() };
    renderApp(<SiqnalTeklifleri siqnallar={[siqnal("xesteliyRiski"), siqnal("yagis")]} bitki="pomidor" get={get} />);

    expect(screen.getByText("Sahənizin bu həftəki ehtiyacı")).toBeInTheDocument();
    expect(screen.getByText("Xəstəlik üçün əlverişli şərait")).toBeInTheDocument();
    expect(screen.getByText(/Uzun rütubət göbələk xəstəliyi riskidir/)).toBeInTheDocument();
    // "yağış" siqnalı alış tələb etmir — qrup yaranmır
    expect(screen.queryByText("Yağış gəlir")).not.toBeInTheDocument();

    // Ekranda dolu (primary) düymə yoxdur: yalnız ghost keçid
    expect(document.querySelectorAll(".btn--primary")).toHaveLength(0);
    screen.getByRole("button", { name: /Bitki mühafizəsi kateqoriyasına bax/ }).click();
    expect(get.kateqoriya).toHaveBeenCalledWith("muhafize");
  });
});
