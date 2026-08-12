import { describe, it, expect } from "vitest";
import {
  availableTransitions,
  canTransition,
  unmetRequirements,
  TRANSITIONS,
  STAGES,
  OPEN_STAGES,
  CLOSED_STAGES,
} from "./workflow.js";
import { seedCases } from "./seed.js";

const complete = seedCases().find((c) => c.id === "ATB-2026-0141");

describe("keçidlər", () => {
  it("hər keçidin mərhələləri tanınmış siyahıdadır", () => {
    for (const t of TRANSITIONS) {
      expect(STAGES).toContain(t.from);
      expect(STAGES).toContain(t.to);
    }
  });

  it("açıq və bağlı mərhələlər üst-üstə düşmür", () => {
    expect(OPEN_STAGES.filter((s) => CLOSED_STAGES.includes(s))).toEqual([]);
    expect([...OPEN_STAGES, ...CLOSED_STAGES].sort()).toEqual([...STAGES].sort());
  });

  it("rol öz mərhələsindən kənarda hərəkət edə bilmir", () => {
    expect(availableTransitions("committee", "officer")).toHaveLength(0);
    expect(availableTransitions("committee", "committee").length).toBeGreaterThan(0);
  });

  it("kredit mütəxəssisi qərar verə bilmir", () => {
    const check = canTransition({ ...complete, stage: "committee" }, "approved", "officer");
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("notPermitted");
  });

  it("komitə qərar verə bilir", () => {
    expect(canTransition({ ...complete, stage: "committee" }, "approved", "committee").allowed).toBe(true);
  });
});

describe("şərtlər", () => {
  it("tam iş risk baxışına keçir", () => {
    const check = canTransition({ ...complete, stage: "analysis" }, "riskReview", "officer");
    expect(check.allowed).toBe(true);
  });

  it("maliyyə hesabatı olmayan iş keçmir və səbəbi göstərilir", () => {
    const check = canTransition({ ...complete, stage: "analysis", periods: [] }, "riskReview", "officer");
    expect(check.allowed).toBe(false);
    expect(check.missing).toContain("financials");
  });

  it("girovsuz iş keçmir", () => {
    const check = canTransition({ ...complete, stage: "analysis", collateral: [] }, "riskReview", "officer");
    expect(check.missing).toContain("collateral");
  });

  it("keyfiyyət göstəriciləri natamamdırsa keçmir", () => {
    const check = canTransition(
      { ...complete, stage: "analysis", qualitative: { creditHistory: "clean3y" } },
      "riskReview",
      "officer",
    );
    expect(check.missing).toContain("qualitative");
  });

  it("komitəyə çıxmaq üçün tövsiyə və təsdiqlənmiş reytinq lazımdır", () => {
    const withoutMemo = canTransition(
      { ...complete, stage: "riskReview", memo: { recommendation: "" } },
      "committee",
      "analyst",
    );
    expect(withoutMemo.missing).toContain("memo");

    const withoutRating = canTransition(
      { ...complete, stage: "riskReview", ratingConfirmed: false },
      "committee",
      "analyst",
    );
    expect(withoutRating.missing).toContain("rating");
  });

  it("geri qaytarmaq şərt tələb etmir", () => {
    const back = canTransition({ ...complete, stage: "riskReview", periods: [] }, "analysis", "analyst");
    expect(back.allowed).toBe(true);
  });

  it("adı yazılmayan müştəri qaralamadan çıxmır", () => {
    const missing = unmetRequirements(
      TRANSITIONS.find((t) => t.from === "draft" && t.to === "analysis"),
      { ...complete, borrower: { name: "   " } },
    );
    expect(missing).toContain("borrower");
  });
});
