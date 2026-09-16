/**
 * FARMSCORE V3 — KLİENT BAYRAĞI.
 *
 * İstehsal ekranı defolt olaraq v2-ni göstərir (serverdəki qərar da v2-dir,
 * bax: lib/kredit.js → farmScoreRejimi). v3 yalnız QA/ekran görüntüsü və
 * daxili müqayisə üçün açılır:
 *   • ?farmscore=v3 sorğu parametri (bir sessiyalıq — sessionStorage);
 *   • VITE_FARMSCORE_V3=on mühit dəyişəni (build vaxtı).
 * Bayraq heç bir kredit rəqəmini dəyişmir — yalnız kartın hansı bal
 * versiyasını göstərdiyini.
 */
const ACAR = "agrifin:farmscore";

export function farmScoreRejimi() {
  try {
    const sorgu = new URLSearchParams(window.location.search).get("farmscore");
    if (sorgu === "v3" || sorgu === "v2") {
      window.sessionStorage.setItem(ACAR, sorgu);
      return sorgu;
    }
    const saxlanan = window.sessionStorage.getItem(ACAR);
    if (saxlanan === "v3" || saxlanan === "v2") return saxlanan;
  } catch {
    // sessionStorage əlçatmaz ola bilər — defolta düşürük
  }
  const env = import.meta.env?.VITE_FARMSCORE_V3;
  return env === "on" || env === "v3" ? "v3" : "v2";
}
