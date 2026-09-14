import { describe, expect, it } from "vitest";
import { konturHash } from "./konturHash.js";

const KONTUR = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];

describe("kontur heşi", () => {
  it("eyni kontur üçün eyni heş verir", () => {
    expect(konturHash(KONTUR)).toBe(konturHash(KONTUR.map((p) => [...p])));
  });

  // Float quyruğu GPS dəqiqliyindən incədir — eyni sahə fərqli heş verməməlidir
  it("6-cı onluqdan sonrakı fərqi saymır", () => {
    const cuzi = KONTUR.map(([en, uz]) => [en + 1e-9, uz - 1e-9]);
    expect(konturHash(cuzi)).toBe(konturHash(KONTUR));
  });

  // Bu, heşin ƏSAS İŞİDİR: başqa sahənin tarixçəsi bura yapışdırıla bilməsin
  it("kontur dəyişəndə heş dəyişir", () => {
    const basqa = [...KONTUR.slice(0, 3), [40.4, 47.2]];
    expect(konturHash(basqa)).not.toBe(konturHash(KONTUR));
  });

  it("nöqtə sırası dəyişəndə heş dəyişir", () => {
    const cevrilmis = [...KONTUR].reverse();
    expect(konturHash(cevrilmis)).not.toBe(konturHash(KONTUR));
  });

  it("naqis girişdə null qaytarır", () => {
    expect(konturHash(null)).toBeNull();
    expect(konturHash([[40, 47]])).toBeNull();
    expect(konturHash([[40, 47], [40.1, 47], [NaN, 47]])).toBeNull();
  });

  it("sha256 hex formatındadır", () => {
    expect(konturHash(KONTUR)).toMatch(/^[0-9a-f]{64}$/);
  });
});
