/**
 * V2 vs V3 MÜQAYİSƏ NÜMUNƏLƏRİ — hesabat cədvəli və test üçün ortaq fixture.
 * Hər nümunə: ad, mövsümlər, cari, bitki. Tarixlər 2025-ə bağlıdır ki,
 * nəticə bugünkü tarixdən asılı olmasın.
 */
const SON_IL = 2025;
const seriya = (say, ferq, etraf = 0.6) =>
  Array.from({ length: say }, (_, i) => ({ il: SON_IL - say + 1 + i, zirve: etraf + ferq, etrafMedyan: etraf }));
const seriyaFerqli = (ferqler, etraf = 0.6) =>
  ferqler.map((ferq, i) => ({ il: SON_IL - ferqler.length + 1 + i, zirve: etraf + ferq, etrafMedyan: etraf }));
const etrafsiz = (say, zirve = 0.72) => Array.from({ length: say }, (_, i) => ({ il: SON_IL - say + 1 + i, zirve }));

export const NUMUNE_INDI = new Date("2025-05-10T00:00:00Z");
export const NUMUNE_SON_IL = SON_IL;

export const NUMUNELER = [
  { ad: "3 mövsüm, +0.005 (brifdəki hal)", movsumler: seriya(3, 0.005, 0.7), cari: { ndvi: 0.75, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "3 mövsüm, +0.20 güclü", movsumler: seriya(3, 0.2), cari: { ndvi: 0.85, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "4 mövsüm, +0.12", movsumler: seriya(4, 0.12), cari: { ndvi: 0.75, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "5 mövsüm, +0.12", movsumler: seriya(5, 0.12), cari: { ndvi: 0.75, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "7 mövsüm, +0.20 güclü", movsumler: seriya(7, 0.2), cari: { ndvi: 0.85, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "9 mövsüm, +0.005 cüzi", movsumler: seriya(9, 0.005, 0.7), cari: { ndvi: 0.75, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "9 mövsüm, +0.12 (istehsala yaxın)", movsumler: seriya(9, 0.12), cari: { ndvi: 0.72, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "9 mövsüm, +0.20 güclü", movsumler: seriya(9, 0.2), cari: { ndvi: 0.85, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "9 mövsüm, +0.20, cari risk (0.39/0.55)", movsumler: seriya(9, 0.2), cari: { ndvi: 0.39, etrafMedyan: 0.55 }, bitki: "bugda" },
  { ad: "9 mövsüm, +0.20, cari aşağı, fenologiya bilinmir", movsumler: seriya(9, 0.2), cari: { ndvi: 0.2, etrafMedyan: 0.6 }, bitki: null },
  { ad: "9 mövsüm, +0.20, cari aşağı, avqust (mövsüm xarici)", movsumler: seriya(9, 0.2), cari: { ndvi: 0.2, etrafMedyan: 0.6 }, bitki: "bugda", indi: new Date("2025-08-10T00:00:00Z") },
  { ad: "8 mövsüm, qarışıq (6/8 qalib, median +0.06)", movsumler: seriyaFerqli([0.06, -0.02, 0.08, 0.05, 0.1, -0.03, 0.06, 0.07]), cari: { ndvi: 0.7, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "6 mövsüm, zəif (−0.10)", movsumler: seriya(6, -0.1, 0.7), cari: { ndvi: 0.55, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "6 mövsüm, 2 boş il", movsumler: seriyaFerqli([0.1, -0.5, 0.1, -0.5, 0.1, 0.1]), cari: { ndvi: 0.7, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "9 mövsüm, ətraf müqayisəsi yoxdur", movsumler: etrafsiz(9), cari: null, bitki: "bugda" },
  { ad: "2 mövsüm (tarixçə az)", movsumler: seriya(2, 0.2), cari: { ndvi: 0.85, etrafMedyan: 0.6 }, bitki: "bugda" },
  { ad: "tarixçəsiz", movsumler: [], cari: null, bitki: "bugda" },
];
