import { MOVSUM } from "../../lib/movsum.js";
import { CROP_KEYS } from "./crops.js";

/**
 * Bitkinin GÖRÜNÜŞÜ — ikon və sıralama. Aqronomik iddia daşımır.
 *
 * İkon yalnız tanınma sürəti üçündür: fermer on ağ düyməni oxumaqdansa
 * formaya baxıb tapır. Dəqiq şəkil tapılmayan bitkilər üçün ümumi cücərti
 * ikonu qalır — yanlış şəkil qoymaqdansa neytral qalmaq düzgündür.
 */
const IKONLAR = {
  bugda: "Wheat",
  arpa: "Wheat",
  qargidali: "Wheat",
  pambiq: "Flower2",
  uzum: "Grape",
  alma: "Apple",
  findiq: "Nut",
};

export function bitkiIkonu(acar) {
  return IKONLAR[acar] ?? "Sprout";
}

/**
 * Mövsümdə olan bitkilər ƏVVƏLƏ keçir.
 *
 * Sıra UYDURULMUR: mövsüm cədvəli məhsulun öz məlumatıdır (lib/movsum.js —
 * səpin və biçin ayları). "Bu rayonda ən çox əkilən" kimi bir sıra
 * qurmaq üçün əlimizdə məlumat yoxdur, ona görə onu uydurmuruq.
 *
 * Qrup daxilində kanonik sıra saxlanılır (bilik bazası ilə eynidir).
 */
export function movsumdedir(acar, indi = new Date()) {
  const movsum = MOVSUM[acar];
  if (!movsum) return false;
  const ay = indi.getMonth() + 1;
  const { basla, bicin } = movsum;
  // Qışdan yaza keçən mövsüm (məs. buğda: 10 → 6) ilin sonunu aşır
  return basla <= bicin ? ay >= basla && ay <= bicin : ay >= basla || ay <= bicin;
}

export function bitkileriSirala(indi = new Date()) {
  const icinde = CROP_KEYS.filter((acar) => movsumdedir(acar, indi));
  const kenarda = CROP_KEYS.filter((acar) => !movsumdedir(acar, indi));
  return [...icinde, ...kenarda];
}
