/**
 * BAZARIN ALT-YOLLARI — `/bazar/...` ekranın içində oxunur.
 *
 * Tətbiqin marşrutlayıcısı (lib/router.jsx) yalnız yolu saxlayır; bazar
 * prefiks marşrutdur (routes.js → prefiks:true), alt-səhifəni bu modul
 * çıxarır. Sorğu sətri (?q=) İŞLƏDİLMİR: axtarış mətni və süzgəc ekran
 * vəziyyətindədir — geri düyməsi onları itirmir, çünki BazarScreen tab
 * dəyişməyənə qədər yenidən qurulmur.
 */
export const BAZAR_KOK = "/bazar";

export const bazarYolu = {
  ev: () => BAZAR_KOK,
  kateqoriya: (kod) => `${BAZAR_KOK}/kateqoriya/${kod}`,
  axtar: () => `${BAZAR_KOK}/axtar`,
  mehsul: (kod) => `${BAZAR_KOK}/mehsul/${kod}`,
  tedarukcu: (kod) => `${BAZAR_KOK}/tedarukcu/${kod}`,
  sebet: () => `${BAZAR_KOK}/sebet`,
  sifaris: () => `${BAZAR_KOK}/sifaris`,
  sifarisler: () => `${BAZAR_KOK}/sifarisler`,
  sifarisDetal: (id) => `${BAZAR_KOK}/sifarisler/${id}`,
  tovsiye: () => `${BAZAR_KOK}/tovsiye`,
};

/**
 * @returns {{ekran: string, param: string|null, derinlik: number}}
 *   ekran: ev | kateqoriya | axtar | mehsul | tedarukcu | sebet | sifaris |
 *          sifarisler | sifarisDetal | tovsiye
 */
export function altYolOxu(path) {
  const qalan = path.startsWith(BAZAR_KOK) ? path.slice(BAZAR_KOK.length) : "";
  const hisseler = qalan.split("/").filter(Boolean).map((h) => decodeURIComponent(h));
  const [birinci, ikinci] = hisseler;

  if (!birinci) return { ekran: "ev", param: null, derinlik: 0 };
  if (birinci === "kateqoriya" && ikinci) return { ekran: "kateqoriya", param: ikinci, derinlik: 1 };
  if (birinci === "axtar") return { ekran: "axtar", param: null, derinlik: 1 };
  if (birinci === "mehsul" && ikinci) return { ekran: "mehsul", param: ikinci, derinlik: 2 };
  if (birinci === "tedarukcu" && ikinci) return { ekran: "tedarukcu", param: ikinci, derinlik: 2 };
  if (birinci === "sebet") return { ekran: "sebet", param: null, derinlik: 1 };
  if (birinci === "sifaris") return { ekran: "sifaris", param: null, derinlik: 2 };
  if (birinci === "sifarisler" && ikinci) return { ekran: "sifarisDetal", param: ikinci, derinlik: 2 };
  if (birinci === "sifarisler") return { ekran: "sifarisler", param: null, derinlik: 1 };
  if (birinci === "tovsiye") return { ekran: "tovsiye", param: null, derinlik: 1 };
  // Naməlum alt-yol ana səhifəyə düşür — 404 ekranı yoxdur, itmək də yoxdur
  return { ekran: "ev", param: null, derinlik: 0 };
}

/** "Geri" oxunun determinist hədəfi — brauzer tarixçəsindən asılı deyil */
export function valideynYolu(alt, { kateqoriya = null } = {}) {
  switch (alt.ekran) {
    case "mehsul":
      return kateqoriya ? bazarYolu.kateqoriya(kateqoriya) : bazarYolu.ev();
    case "tedarukcu":
      return bazarYolu.ev();
    case "sifaris":
      return bazarYolu.sebet();
    case "sifarisDetal":
      return bazarYolu.sifarisler();
    default:
      return bazarYolu.ev();
  }
}
