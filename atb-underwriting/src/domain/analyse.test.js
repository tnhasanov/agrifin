import { describe, it, expect } from "vitest";
import { analyse, summary } from "./analyse.js";
import { seedCases } from "./seed.js";
import { spreadAll } from "./financials.js";

const cases = seedCases();
const byId = (id) => cases.find((c) => c.id === id);

describe("nümunə portfel", () => {
  it("bütün nümunə balansları bağlanır", () => {
    for (const c of cases) {
      for (const s of spreadAll(c.periods)) {
        expect(`${c.id} ${s.label}: ${s.imbalance}`).toBe(`${c.id} ${s.label}: 0`);
      }
    }
  });

  it("hər iş ən azı iki dövrlə gəlir", () => {
    for (const c of cases) expect(c.periods.length).toBeGreaterThanOrEqual(2);
  });

  it("nümunə məlumat hər çağırışda təzədir", () => {
    const a = seedCases();
    a[0].borrower.name = "dəyişdirildi";
    expect(seedCases()[0].borrower.name).not.toBe("dəyişdirildi");
  });
});

describe("analyse", () => {
  it("sağlam işi keçirir: DSCR hədəfdən yuxarı, dayandırıcı yoxdur", () => {
    const a = analyse(byId("ATB-2026-0119"));
    expect(a.capacity.dscr).toBeGreaterThan(1.3);
    expect(a.policy.stopCount).toBe(0);
    expect(a.score.grade).toBeLessThanOrEqual(4);
  });

  it("problemli işi dayandırır və səbəbini adlandırır", () => {
    const a = analyse(byId("ATB-2026-0167"));
    const codes = a.findings.map((f) => f.code);
    expect(a.policy.stopCount).toBeGreaterThan(0);
    expect(codes).toContain("currentArrears");
    expect(codes).toContain("revenueDeclining");
    expect(a.score.grade).toBeGreaterThanOrEqual(8);
  });

  it("aqro işində güzəşt dövrü ödəniş cədvəlində görünür", () => {
    const a = analyse(byId("ATB-2026-0141"));
    expect(a.capacity.schedule.slice(0, 6).every((r) => r.grace)).toBe(true);
    expect(a.capacity.schedule).toHaveLength(24);
  });

  it("uçotsuz dövriyyə düzəlişi EBITDA-nı artırır", () => {
    const base = byId("ATB-2026-0141");
    const withoutAdjustment = {
      ...base,
      periods: base.periods.map((p) => ({ ...p, adjustments: { unrecordedRevenue: 0, ownerAddBacks: 0, nonRecurring: 0 } })),
    };
    expect(analyse(base).capacity.cashflow).toBeGreaterThan(
      analyse(withoutAdjustment).capacity.cashflow,
    );
  });

  it("girov dəyəri limitin bağlayıcı amili ola bilir", () => {
    const base = byId("ATB-2026-0141");
    const thin = { ...base, collateral: [{ ...base.collateral[0], marketValue: 50_000 }] };
    const a = analyse(thin);
    expect(a.capacity.binding).toBe("collateral");
  });

  it("təhlil boş işdə də çökmür", () => {
    const a = analyse({ id: "x", borrower: {}, request: {}, periods: [] });
    expect(a.latest).toBe(null);
    expect(a.score.total).toBe(0);
    expect(Array.isArray(a.findings)).toBe(true);
  });

  it("qiymət təklifi riskə uyğun gəlir", () => {
    const good = analyse(byId("ATB-2026-0158"));
    const bad = analyse(byId("ATB-2026-0167"));
    expect(bad.pricing.suggested).toBeGreaterThan(good.pricing.suggested);
  });
});

describe("summary", () => {
  it("boru xətti üçün açar sahələri verir", () => {
    const s = summary(byId("ATB-2026-0158"));
    expect(s.name).toBe("Bakı Tekstil İstehsalat MMC");
    expect(s.amount).toBe(900_000);
    expect(s.stage).toBe("committee");
    expect(typeof s.grade).toBe("number");
  });
});
