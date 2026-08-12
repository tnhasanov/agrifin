import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render.jsx";
import CaseView from "./CaseView.jsx";

const open = (id, tab) => renderApp(<CaseView route={{ name: "case", id, tab }} navigate={() => {}} />);

describe("İş faylı", () => {
  it("başlıqda mərhələ, reytinq və DSCR göstərilir", () => {
    open("ATB-2026-0141", "profile");
    expect(screen.getByRole("heading", { name: "Şirvan Aqro MMC" })).toBeInTheDocument();
    expect(screen.getByText("Risk baxışı")).toBeInTheDocument();
    expect(screen.getByText(/DSCR/)).toBeInTheDocument();
  });

  it("maliyyə bölməsində balans yoxlanışı keçir", () => {
    open("ATB-2026-0141", "financials");
    expect(screen.getByText("Balans tutur")).toBeInTheDocument();
    // Nümunə balanslar bağlanır — hər dövr üçün ✓.
    expect(screen.getAllByText("✓")).toHaveLength(3);
  });

  it("balans pozulanda fərq dərhal görünür", async () => {
    const user = userEvent.setup();
    open("ATB-2026-0141", "financials");
    const cashInput = screen.getByLabelText("Pul vəsaitləri 2025");
    await user.clear(cashInput);
    await user.type(cashInput, "1");
    expect(screen.getAllByText("✓")).toHaveLength(2);
  });

  it("təhlil bölməsi əmsalları düsturu ilə göstərir", () => {
    open("ATB-2026-0141", "analysis");
    expect(screen.getByText("Cari likvidlik")).toBeInTheDocument();
    expect(screen.getByText("cari aktivlər / cari öhdəliklər")).toBeInTheDocument();
  });

  it("reytinq bölməsində keyfiyyət cavabı balı dəyişir", async () => {
    const user = userEvent.setup();
    open("ATB-2026-0141", "score");
    // Ekranda bal azərbaycan formatındadır: "81,5".
    const score = () =>
      Number(screen.getByText("Ümumi bal").nextSibling.textContent.replace(/\s/g, "").replace(",", "."));
    const before = score();
    expect(before).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText("İdarəetmə"), "strong");
    expect(score()).toBeGreaterThan(before);
  });

  it("əsaslandırma yazılmayana qədər reytinq düzəlişi mümkün deyil", async () => {
    const user = userEvent.setup();
    open("ATB-2026-0141", "score");
    const apply = screen.getByRole("button", { name: "Düzəlişi tətbiq et" });
    expect(apply).toBeDisabled();
    await user.type(screen.getByLabelText("Əsaslandırma"), "Sahə üzrə əlavə risk");
    expect(apply).toBeEnabled();
  });

  it("girov bölməsində bazar dəyəri dəyişəndə örtük yenilənir", async () => {
    const user = userEvent.setup();
    open("ATB-2026-0141", "collateral");
    const coverageTile = screen.getByText("Girov örtüyü").parentElement;
    const before = coverageTile.querySelector(".tnum").textContent;
    const inputs = screen.getAllByLabelText("Bazar dəyəri");
    await user.clear(inputs[0]);
    await user.type(inputs[0], "900000");
    expect(coverageTile.querySelector(".tnum").textContent).not.toBe(before);
  });

  it("struktur bölməsi bağlayıcı məhdudiyyəti adlandırır", () => {
    open("ATB-2026-0141", "structure");
    expect(screen.getByText("Tövsiyə olunan limit")).toBeInTheDocument();
    expect(screen.getAllByText("Bağlayıcı amil").length).toBeGreaterThan(0);
  });

  it("problemli işdə dayandırıcı tapıntı qərar bölməsində görünür", () => {
    open("ATB-2026-0167", "decision");
    expect(screen.getByText("Təsdiq yalnız istisna qərarı ilə mümkündür.")).toBeInTheDocument();
    expect(screen.getByText("Kredit bürosunda cari gecikmə qeyd olunub.")).toBeInTheDocument();
  });

  it("kredit mütəxəssisi komitə mərhələsində qərar verə bilmir", () => {
    open("ATB-2026-0158", "decision");
    expect(screen.getByText("Bu rol üçün bu mərhələdə mümkün hərəkət yoxdur.")).toBeInTheDocument();
  });

  it("memorandumda əsas rəqəmlər təhlildən gəlir", () => {
    open("ATB-2026-0119", "memo");
    const figures = screen.getByText("Əsas göstəricilər").parentElement;
    expect(within(figures).getByText("DSCR")).toBeInTheDocument();
    expect(within(figures).getByText("Reytinq sinfi")).toBeInTheDocument();
  });

  it("tanınmayan iş nömrəsində geri qayıtmaq təklif olunur", () => {
    open("YOXDUR", "profile");
    expect(screen.getByRole("button", { name: /Portfel/ })).toBeInTheDocument();
  });
});
