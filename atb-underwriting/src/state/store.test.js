import { describe, it, expect } from "vitest";
import { reducer, nextCaseId, draftCase } from "./store.jsx";
import { seedCases } from "../domain/seed.js";

const state = () => ({ cases: seedCases(), user: { name: "Test", role: "officer" } });
const first = (s) => s.cases[0];

describe("reducer", () => {
  it("müştəri məlumatını dəyişir və yenilənmə vaxtını yazır", () => {
    const s0 = state();
    const before = first(s0).updatedAt;
    const s1 = reducer(s0, {
      type: "patchBorrower",
      id: first(s0).id,
      patch: { name: "Yeni ad" },
    });
    expect(first(s1).borrower.name).toBe("Yeni ad");
    expect(first(s1).updatedAt).not.toBe(before);
    // Digər işlərə toxunmur.
    expect(s1.cases[1]).toBe(s0.cases[1]);
  });

  it("dövr əlavə edir və silir", () => {
    const s0 = state();
    const id = first(s0).id;
    const count = first(s0).periods.length;
    const s1 = reducer(s0, { type: "addPeriod", id, period: { label: "2026", months: 12, balance: {}, income: {}, adjustments: {} } });
    expect(first(s1).periods).toHaveLength(count + 1);
    const s2 = reducer(s1, { type: "removePeriod", id, index: count });
    expect(first(s2).periods).toHaveLength(count);
  });

  it("dövrün bir maddəsini dəyişir, qalanını saxlayır", () => {
    const s0 = state();
    const id = first(s0).id;
    const s1 = reducer(s0, {
      type: "patchPeriod",
      id,
      index: 0,
      group: "balance",
      patch: { cash: 999 },
    });
    expect(first(s1).periods[0].balance.cash).toBe(999);
    expect(first(s1).periods[0].balance.inventory).toBe(first(s0).periods[0].balance.inventory);
  });

  it("girov əlavə edir, dəyişir, silir", () => {
    const s0 = state();
    const id = first(s0).id;
    const item = { id: "cx", type: "deposit", marketValue: 1000, insured: true, firstRank: true };
    const s1 = reducer(s0, { type: "addCollateral", id, item });
    expect(first(s1).collateral.at(-1).id).toBe("cx");
    const s2 = reducer(s1, { type: "patchCollateral", id, itemId: "cx", patch: { marketValue: 2000 } });
    expect(first(s2).collateral.at(-1).marketValue).toBe(2000);
    const s3 = reducer(s2, { type: "removeCollateral", id, itemId: "cx" });
    expect(first(s3).collateral.find((c) => c.id === "cx")).toBeUndefined();
  });

  it("şərti seçir və seçimi geri alır", () => {
    const s0 = state();
    const id = first(s0).id;
    const had = first(s0).conditions.includes("noNewDebt");
    const s1 = reducer(s0, { type: "toggleCondition", id, condition: "noNewDebt" });
    expect(first(s1).conditions.includes("noNewDebt")).toBe(!had);
    const s2 = reducer(s1, { type: "toggleCondition", id, condition: "noNewDebt" });
    expect(first(s2).conditions.includes("noNewDebt")).toBe(had);
  });

  it("mərhələ dəyişikliyini jurnala yazır", () => {
    const s0 = state();
    const id = first(s0).id;
    const from = first(s0).stage;
    const s1 = reducer(s0, {
      type: "moveStage",
      id,
      to: "committee",
      actor: "L. Rəhimli",
      role: "analyst",
      note: "Komitəyə çıxarılır",
    });
    const entry = first(s1).log.at(-1);
    expect(first(s1).stage).toBe("committee");
    expect(entry.from).toBe(from);
    expect(entry.to).toBe("committee");
    expect(entry.actor).toBe("L. Rəhimli");
    expect(entry.note).toBe("Komitəyə çıxarılır");
  });

  it("reytinq düzəlişi də jurnala düşür", () => {
    const s0 = state();
    const id = first(s0).id;
    const s1 = reducer(s0, {
      type: "setRatingOverride",
      id,
      actor: "L. Rəhimli",
      role: "analyst",
      override: { grade: 6, reason: "Sahə riski" },
    });
    expect(first(s1).ratingOverride.grade).toBe(6);
    expect(first(s1).log.at(-1).kind).toBe("rating");
  });

  it("yeni iş siyahının başına düşür", () => {
    const s0 = state();
    const caseFile = draftCase({ id: "ATB-2026-9999", officer: "Test", branch: "Test" });
    const s1 = reducer(s0, { type: "createCase", caseFile });
    expect(s1.cases[0].id).toBe("ATB-2026-9999");
    expect(s1.cases).toHaveLength(s0.cases.length + 1);
  });

  it("bərpa nümunə portfeli qaytarır, istifadəçini saxlayır", () => {
    const s0 = reducer(state(), { type: "patchBorrower", id: seedCases()[0].id, patch: { name: "x" } });
    const s1 = reducer(s0, { type: "reset" });
    expect(s1.cases[0].borrower.name).not.toBe("x");
    expect(s1.user).toEqual(s0.user);
  });

  it("tanınmayan hərəkət vəziyyəti dəyişmir", () => {
    const s0 = state();
    expect(reducer(s0, { type: "yoxdur" })).toBe(s0);
  });
});

describe("nextCaseId", () => {
  it("mövcud nömrələrdən sonrakını verir", () => {
    const now = new Date("2026-08-12");
    expect(nextCaseId(seedCases(), now)).toBe("ATB-2026-0172");
  });

  it("boş portfeldə ilk nömrəni verir", () => {
    expect(nextCaseId([], new Date("2027-01-05"))).toBe("ATB-2027-0001");
  });
});

describe("draftCase", () => {
  it("boş, amma tam quruluşlu iş yaradır", () => {
    const c = draftCase({ id: "x", officer: "o", branch: "b" });
    expect(c.stage).toBe("draft");
    expect(c.periods).toEqual([]);
    expect(c.memo).toBeTruthy();
    expect(c.request.currency).toBe("AZN");
  });
});
