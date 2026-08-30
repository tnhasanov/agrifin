/**
 * Tarix formatı — "15 Sentyabr".
 *
 * Intl işlədilmir: `az` lokalı bəzi mobil brauzerlərdə yoxdur və oradakı
 * ay adları tərcümə lüğətimizlə uyğun gəlmir. Ay adları `ay.N` açarlarından
 * gəlir, ona görə üç dildə də düzgün oxunur.
 *
 * Server tarixləri ISO-dur (`YYYY-MM-DD`) — İSTİFADƏÇİYƏ ISO GÖSTƏRİLMİR.
 */
export function gunAdi(t, deyer) {
  if (!deyer) return "";
  const tarix = new Date(deyer);
  if (Number.isNaN(tarix.getTime())) return "";
  return `${tarix.getUTCDate()} ${t(`ay.${tarix.getUTCMonth() + 1}`)}`;
}
