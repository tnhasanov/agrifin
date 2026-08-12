import { describe, it, expect } from "vitest";
import { parseHash, formatRoute, DEFAULT_TAB } from "./router.js";

describe("parseHash", () => {
  it("boş ünvan portfeli açır", () => {
    expect(parseHash("")).toEqual({ name: "pipeline" });
    expect(parseHash("#/")).toEqual({ name: "pipeline" });
  });

  it("iş ünvanını oxuyur", () => {
    expect(parseHash("#/case/ATB-2026-0141/financials")).toEqual({
      name: "case",
      id: "ATB-2026-0141",
      tab: "financials",
    });
  });

  it("bölmə göstərilməyibsə ilk bölməni açır", () => {
    expect(parseHash("#/case/ATB-2026-0141").tab).toBe(DEFAULT_TAB);
  });

  it("yeni müraciət ünvanını tanıyır", () => {
    expect(parseHash("#/new")).toEqual({ name: "new" });
  });

  it("tanınmayan ünvanda portfelə qayıdır", () => {
    expect(parseHash("#/yoxdur/belə")).toEqual({ name: "pipeline" });
  });
});

describe("formatRoute", () => {
  it("gedər-gəlməz çevirmə: ünvan → yol → ünvan", () => {
    const route = { name: "case", id: "ATB-2026-0141", tab: "memo" };
    expect(parseHash(formatRoute(route))).toEqual(route);
  });

  it("nömrədəki xüsusi simvolları qoruyur", () => {
    const route = { name: "case", id: "ATB/2026 0141", tab: "profile" };
    expect(parseHash(formatRoute(route))).toEqual(route);
  });
});
