import { merkez } from "./geo.js";

/**
 * Hava və peyk sorğuları üçün ən dəqiq koordinat.
 *
 * Fermer sahəsini çəkibsə onun öz mərkəzini işlədirik. Rayon mərkəzi
 * böyük rayonda sahədən 10–20 km uzaq ola bilər, yağış isə Azərbaycanda
 * çox yerlidir — suvarma və çiləmə qərarı bu fərqdən asılıdır.
 *
 * `deqiq` bayrağı istifadəçiyə də, modelə də hansı dəqiqlikdə danışdığını
 * bildirir: uydurma dəqiqlik iddia etmirik.
 */
export function havaNoqtesi({ location, sahe }) {
  const orta = sahe?.noqteler?.length >= 3 ? merkez(sahe.noqteler) : null;
  if (orta) {
    return { lat: orta[0], lon: orta[1], deqiq: true };
  }
  return { lat: location?.lat, lon: location?.lon, deqiq: false };
}
