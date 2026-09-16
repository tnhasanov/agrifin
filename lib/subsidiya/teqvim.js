import { MENBELER } from "./menbeler.js";

/**
 * İŞ GÜNÜ TƏQVİMİ — "ayın son iş günü" hesabı üçün.
 *
 * Köhnə model yalnız şənbə/bazarı atlayırdı və 31 dekabrı iş günü
 * sayırdı. 31 dekabr Dünya Azərbaycanlılarının Həmrəyliyi Günüdür —
 * Əmək Məcəlləsinin 105-ci maddəsi ilə qeyri-iş günüdür. Ona görə 2026-da
 * payızlıq müraciətin son günü 31 deyil, 30 dekabrdır (çərşənbə).
 *
 * ═══ NƏ BİLİNİR, NƏ BİLİNMİR ═══════════════════════════════════════════
 * `sabit`: Əmək Məcəlləsi m.105-in hər il eyni tarixə düşən bayramları.
 * `deyisen`: Ramazan və Qurban bayramları (hər il fərqli, 2 gün) — 2026
 *   tarixləri istehsalat təqvimindən (sosial.gov.az) götürülməlidir;
 *   səhifə bu mühitdən açılmadığı üçün `null` — UYDURULMUR.
 * `kocurulmus`: Nazirlər Kabinetinin köçürdüyü iş/istirahət günləri — eyni
 *   səbəbdən `null`.
 * `hefteSonuKocurmesi`: bayram şənbə/bazara düşəndə növbəti iş günü
 *   istirahət sayılır (m.105) — tətbiq olunur.
 *
 * Dəyişən günlər dekabr ayına düşmür, ona görə 30 dekabr nəticəsi onlardan
 * asılı deyil; digər aylar üçün `natamam: true` bayrağı nəticədə daşınır.
 */
export const TEQVIM_2026 = {
  il: 2026,
  menbeler: [MENBELER.emekMecellesi105.id, MENBELER.sosialTeqvim2026.id],
  /** MM-DD — Əmək Məcəlləsi m.105 */
  sabit: [
    "01-01", "01-02", // Yeni il
    "01-20", // Ümumxalq Hüzn Günü
    "03-08", // Qadınlar Günü
    "03-20", "03-21", "03-22", "03-23", "03-24", // Novruz
    "05-09", // Faşizm üzərində Qələbə Günü
    "05-28", // Müstəqillik Günü
    "06-15", // Milli Qurtuluş Günü
    "06-26", // Silahlı Qüvvələr Günü
    "11-08", // Zəfər Günü
    "12-31", // Dünya Azərbaycanlılarının Həmrəyliyi Günü
  ],
  /** Ramazan / Qurban 2026 — istehsalat təqvimi yüklənməyib */
  deyisen: null,
  /** Nazirlər Kabinetinin köçürdüyü günlər — istehsalat təqvimi yüklənməyib */
  kocurulmus: null,
  hefteSonuKocurmesi: true,
  verifiedAt: null,
};

const mmdd = (d) => `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
const hefteSonu = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/** Təqvimin tanıdığı bayram günlərinin tam siyahısı (MM-DD) */
function bayramlar(teqvim) {
  return new Set([...(teqvim.sabit ?? []), ...(teqvim.deyisen ?? []), ...(teqvim.kocurulmus?.istirahet ?? [])]);
}

/** Verilən gün iş günüdürmü (UTC tarix) */
export function isGunudur(tarix, teqvim = TEQVIM_2026) {
  const d = new Date(tarix);
  const kod = mmdd(d);
  const isGunuKocurulub = teqvim.kocurulmus?.is?.includes(kod);
  if (isGunuKocurulub) return true;
  if (hefteSonu(d)) return false;
  const set = bayramlar(teqvim);
  if (set.has(kod)) return false;
  // Bayram həftə sonuna düşəndə növbəti iş günü istirahətdir (m.105)
  if (teqvim.hefteSonuKocurmesi) {
    for (const geri of [1, 2]) {
      const evvel = new Date(d.getTime() - geri * 86_400_000);
      // yalnız dərhal əvvəlki həftə sonunda olan bayramlar köçürülür
      if (!hefteSonu(evvel)) break;
      if (set.has(mmdd(evvel))) return false;
    }
  }
  return true;
}

/** Ayın son iş günü (UTC). `ay` 1–12. */
export function sonIsGunu(il, ay, teqvim = TEQVIM_2026) {
  const d = new Date(Date.UTC(il, ay, 0)); // ayın son günü
  while (!isGunudur(d, teqvim)) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/** Təqvim tam yüklənibmi (dəyişən və köçürülmüş günlər daxil)? */
export function teqvimTamdir(teqvim = TEQVIM_2026) {
  return Array.isArray(teqvim.deyisen) && teqvim.kocurulmus != null;
}
