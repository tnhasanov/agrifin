import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/render.jsx";
import Pipeline from "./Pipeline.jsx";

describe("Portfel ekranı", () => {
  it("nümunə işləri sətir kimi göstərir", () => {
    renderApp(<Pipeline navigate={() => {}} />);
    expect(screen.getByText("Şirvan Aqro MMC")).toBeInTheDocument();
    expect(screen.getByText("Bakı Tekstil İstehsalat MMC")).toBeInTheDocument();
  });

  it("axtarış siyahını daraldır", async () => {
    const user = userEvent.setup();
    renderApp(<Pipeline navigate={() => {}} />);
    await user.type(screen.getByRole("searchbox"), "Tekstil");
    expect(screen.getByText("Bakı Tekstil İstehsalat MMC")).toBeInTheDocument();
    expect(screen.queryByText("Şirvan Aqro MMC")).not.toBeInTheDocument();
  });

  it("VÖEN ilə də tapılır", async () => {
    const user = userEvent.setup();
    renderApp(<Pipeline navigate={() => {}} />);
    await user.type(screen.getByRole("searchbox"), "1704562781");
    expect(screen.getByText("Şirvan Aqro MMC")).toBeInTheDocument();
    expect(screen.queryByText("Gəncə Logistik MMC")).not.toBeInTheDocument();
  });

  it("uyğun iş yoxdursa boş mesaj çıxır", async () => {
    const user = userEvent.setup();
    renderApp(<Pipeline navigate={() => {}} />);
    await user.type(screen.getByRole("searchbox"), "belə şirkət yoxdur");
    expect(screen.getByText("Uyğun müraciət tapılmadı.")).toBeInTheDocument();
  });

  it("müştəriyə klik iş faylını açır", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    renderApp(<Pipeline navigate={navigate} />);
    await user.click(screen.getByText("Şirvan Aqro MMC"));
    expect(navigate).toHaveBeenCalledWith({ name: "case", id: "ATB-2026-0141", tab: "profile" });
  });

  it("siyasət pozuntusu olan işlərin sayını göstərir", () => {
    renderApp(<Pipeline navigate={() => {}} />);
    // Ay-Ulduz Tikinti dayandırıcı ilə gəlir — göstərici sıfır olmamalıdır.
    const tile = screen.getByText("Siyasət pozuntusu").parentElement;
    expect(Number(tile.querySelector(".tnum").textContent)).toBeGreaterThan(0);
  });

  it("mərhələ kartı süzgəc kimi işləyir", async () => {
    const user = userEvent.setup();
    renderApp(<Pipeline navigate={() => {}} />);
    // "Qaralama" mərhələsində yalnız Xəzər Ticarət var.
    await user.click(screen.getByRole("button", { name: /Qaralama/ }));
    expect(screen.getByText("Xəzər Ticarət Evi MMC")).toBeInTheDocument();
    expect(screen.queryByText("Şirvan Aqro MMC")).not.toBeInTheDocument();
  });
});
