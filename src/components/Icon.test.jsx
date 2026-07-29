import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { hasIcon } from "./icons.js";
import { ROUTES } from "../routes.js";
import { RECOMMENDATIONS } from "../services/advisor.js";
import { iconForCode } from "../services/weather.js";

// Ikon adları sətir kimi ötürülür, ona görə çatışmayan ad kompilyasiya
// zamanı görünmür — istifadəçi sadəcə nöqtə görür. Bu testlər siyahının
// tam olduğunu yoxlayır.
function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(entry.name) && !entry.name.includes(".test.") ? [path] : [];
  });
}

const PATTERNS = [
  /\bicon:\s*"([A-Z][A-Za-z0-9]*)"/g, // məlumat obyektləri
  /\bicon="([A-Z][A-Za-z0-9]*)"/g, // <Chip icon="..." />
  /<Icon\s+name="([A-Z][A-Za-z0-9]*)"/g, // birbaşa JSX
];

function referencedNames() {
  const names = new Set();
  for (const file of sourceFiles(join(import.meta.dirname, ".."))) {
    const source = readFileSync(file, "utf8");
    for (const pattern of PATTERNS) {
      for (const match of source.matchAll(pattern)) names.add(match[1]);
    }
  }
  return [...names].sort();
}

describe("Icon siyahısı", () => {
  it("mənbədə istinad edilən bütün adları tanıyır", () => {
    const missing = referencedNames().filter((name) => !hasIcon(name));
    expect(missing).toEqual([]);
  });

  it("naviqasiya ikonlarını tanıyır", () => {
    expect(ROUTES.filter((route) => !hasIcon(route.icon))).toEqual([]);
  });

  it("tövsiyə ikonlarını tanıyır", () => {
    expect(RECOMMENDATIONS.filter((rec) => !hasIcon(rec.icon))).toEqual([]);
  });

  it("bütün WMO hava kodları üçün ikon var", () => {
    const missing = [];
    for (let code = 0; code <= 99; code += 1) {
      if (!hasIcon(iconForCode(code).name)) missing.push(code);
    }
    expect(missing).toEqual([]);
  });

  it("naməlum ad üçün yalnız ehtiyat nöqtə qaytarır", () => {
    expect(hasIcon("BeleIkonYoxdur")).toBe(false);
  });
});
