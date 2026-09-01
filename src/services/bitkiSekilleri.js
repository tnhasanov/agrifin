import { CROP_KEYS } from "./crops.js";

/**
 * BİTKİ ŞƏKİLLƏRİ — kod → asset xəritəsi.
 *
 * ═══ NİYƏ XƏRİTƏ, NİYƏ URL DEYİL ══════════════════════════════════════
 * Şəkillər `src/assets/bitki/` qovluğundadır və Vite-ın öz asset boru
 * xətti ilə yığılır: barmaq izli ad, uzunmüddətli keş, ölçüsü build
 * hesabatında görünür. İş vaxtı uzaq URL-dən şəkil çəkilmir — pilot
 * rayonlarda şəbəkə zəifdir və üçüncü tərəf sayt onboarding-i kilidləyə
 * bilməz.
 *
 * ═══ ASSET MÜQAVİLƏSİ ════════════════════════════════════════════════
 * Hər bitki üçün ad konvensiyası: `{kod}.avif` və `{kod}.webp`
 * (qovluğa düşən kimi avtomatik tapılır — siyahıya əl ilə əlavə etmək
 * lazım deyil). Tələblər:
 *   • master 1024×1024, məhsul 80% təhlükəsiz sahədə mərkəzdə;
 *   • yumşaq təbii işıq, bütün bitkilərdə eyni kontrast və ağ balansı;
 *   • fon: isti neytral və ya təbii sahə konteksti — hamısında eyni;
 *   • kadrda yalnız məhsul: əl, qablaşdırma, mətn, loqo, karikatura yox;
 *   • görünən ilk altısının cəmi ≤250 KB.
 * Mənbə və lisenziya `src/assets/bitki/MENBE.md` faylında yazılır.
 *
 * ═══ ŞƏKİL YOXDURSA ══════════════════════════════════════════════════
 * `bitkiSekli()` null qaytarır və kart NEYTRAL yuvaya düşür (bax:
 * BitkiSekli.jsx). Yanlış şəkil qoymaqdansa boş qalmaq düzgündür: fermer
 * pomidorun yerində başqa məhsul görsə seçiminə inanmır.
 */

const AVIF = import.meta.glob("../assets/bitki/*.avif", { eager: true, query: "?url", import: "default" });
const WEBP = import.meta.glob("../assets/bitki/*.webp", { eager: true, query: "?url", import: "default" });

function kodlariYigh(modullar, uzanti) {
  const xerite = {};
  for (const [yol, url] of Object.entries(modullar)) {
    const kod = yol.split("/").pop().replace(uzanti, "");
    xerite[kod] = url;
  }
  return xerite;
}

const AVIF_XERITESI = kodlariYigh(AVIF, ".avif");
const WEBP_XERITESI = kodlariYigh(WEBP, ".webp");

/**
 * @param {string} kod  CROP_KEYS-dən bitki kodu
 * @returns {{avif: string|null, webp: string|null} | null}
 *   Heç bir format yoxdursa null — çağıran neytral yuvaya keçir.
 */
export function bitkiSekli(kod) {
  if (!CROP_KEYS.includes(kod)) return null;
  const avif = AVIF_XERITESI[kod] ?? null;
  const webp = WEBP_XERITESI[kod] ?? null;
  if (!avif && !webp) return null;
  return { avif, webp };
}

/** Sənədləşmə/test üçün: şəkli olan bitkilər */
export function sekilliBitkiler() {
  return CROP_KEYS.filter((kod) => bitkiSekli(kod) !== null);
}
