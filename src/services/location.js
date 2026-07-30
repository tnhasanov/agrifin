// Hava proqnozu modelinin dəqiqliyi ~9 km-dir, ona görə rayon mərkəzi kifayətdir.
// Sahə sərhədi (NDVI, sahə təsdiqi) üçün sonra GPS/poliqon istifadə olunacaq.
// Rayon adları xüsusi isimdir — tərcümə olunmur, məlumat kimi saxlanılır.
export const DISTRICTS = [
  { name: "Ağcabədi", lat: 40.053, lon: 47.4597 },
  { name: "Ağdam", lat: 39.9931, lon: 46.9303 },
  { name: "Ağdaş", lat: 40.6503, lon: 47.4708 },
  { name: "Astara", lat: 38.4561, lon: 48.8725 },
  { name: "Balakən", lat: 41.7269, lon: 46.4053 },
  { name: "Beyləqan", lat: 39.7722, lon: 47.6156 },
  { name: "Bərdə", lat: 40.3705, lon: 47.1265 },
  { name: "Biləsuvar", lat: 39.4592, lon: 48.5497 },
  { name: "Cəlilabad", lat: 39.2094, lon: 48.4939 },
  { name: "Gəncə", lat: 40.6828, lon: 46.3606 },
  { name: "Goranboy", lat: 40.6103, lon: 46.7889 },
  { name: "Göyçay", lat: 40.6531, lon: 47.7406 },
  { name: "Hacıqabul", lat: 40.0347, lon: 48.92 },
  { name: "Xaçmaz", lat: 41.4644, lon: 48.8022 },
  { name: "İmişli", lat: 39.8694, lon: 48.0619 },
  { name: "İsmayıllı", lat: 40.7872, lon: 48.1519 },
  { name: "Kürdəmir", lat: 40.3494, lon: 48.1644 },
  { name: "Qax", lat: 41.4206, lon: 46.9219 },
  { name: "Qazax", lat: 41.0928, lon: 45.3661 },
  { name: "Qəbələ", lat: 40.9819, lon: 47.8494 },
  { name: "Quba", lat: 41.3608, lon: 48.5133 },
  { name: "Qusar", lat: 41.4272, lon: 48.43 },
  { name: "Lerik", lat: 38.7744, lon: 48.4153 },
  { name: "Lənkəran", lat: 38.7536, lon: 48.8511 },
  { name: "Masallı", lat: 39.0339, lon: 48.6653 },
  { name: "Mingəçevir", lat: 40.77, lon: 47.0489 },
  { name: "Naxçıvan", lat: 39.2089, lon: 45.4122 },
  { name: "Neftçala", lat: 39.3781, lon: 49.2469 },
  { name: "Oğuz", lat: 41.0725, lon: 47.4633 },
  { name: "Ordubad", lat: 38.9089, lon: 46.0239 },
  { name: "Saatlı", lat: 39.9106, lon: 48.3597 },
  { name: "Sabirabad", lat: 40.0106, lon: 48.4728 },
  { name: "Salyan", lat: 39.5958, lon: 48.98 },
  { name: "Samux", lat: 40.7639, lon: 46.4083 },
  { name: "Siyəzən", lat: 41.0781, lon: 49.1108 },
  { name: "Şabran", lat: 41.2225, lon: 48.9931 },
  { name: "Şamaxı", lat: 40.6311, lon: 48.6414 },
  { name: "Şəki", lat: 41.1919, lon: 47.1706 },
  { name: "Şəmkir", lat: 40.8297, lon: 46.0186 },
  { name: "Şərur", lat: 39.5539, lon: 44.9847 },
  { name: "Şirvan", lat: 39.9331, lon: 48.9264 },
  { name: "Tovuz", lat: 40.9925, lon: 45.6303 },
  { name: "Ucar", lat: 40.515, lon: 47.65 },
  { name: "Yardımlı", lat: 38.9083, lon: 48.2408 },
  { name: "Yevlax", lat: 40.6172, lon: 47.15 },
  { name: "Zaqatala", lat: 41.6317, lon: 46.6444 },
  { name: "Zərdab", lat: 40.2181, lon: 47.71 },
];

export const DEFAULT_LOCATION = { name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false };

/** GPS koordinatına ən yaxın rayonu tapır — ad vermək üçün, əlavə API olmadan. */
export function nearestDistrict(lat, lon) {
  let closest = DISTRICTS[0];
  let smallest = Infinity;

  for (const district of DISTRICTS) {
    // Bu enliklərdə uzunluq dərəcəsi daha qısadır — kosinusla düzəliş edirik
    const dx = (district.lon - lon) * Math.cos((lat * Math.PI) / 180);
    const dy = district.lat - lat;
    const distance = dx * dx + dy * dy;
    if (distance < smallest) {
      smallest = distance;
      closest = district;
    }
  }

  return closest;
}

export function isValidLocation(value) {
  return Boolean(value) && typeof value.lat === "number" && typeof value.lon === "number";
}

/** Axtarış sahəsi üçün süzgəc — azərbaycan hərflərinə uyğun kiçiltmə ilə */
export function searchDistricts(query) {
  const needle = String(query ?? "")
    .trim()
    .toLocaleLowerCase("az");
  if (!needle) return DISTRICTS;
  return DISTRICTS.filter((district) => district.name.toLocaleLowerCase("az").includes(needle));
}

// Prototipin əvvəlki versiyası yeri "agrifin.yer" açarında saxlayırdı. Onu bir
// dəfə oxuyuruq ki, mövcud istifadəçidən yer yenidən soruşulmasın.
const LEGACY_KEY = "agrifin.yer";

export function readLegacyLocation() {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!isValidLocation(saved)) return null;
    return {
      name: saved.ad ?? saved.name ?? DEFAULT_LOCATION.name,
      lat: saved.lat,
      lon: saved.lon,
      gps: Boolean(saved.gps),
    };
  } catch {
    return null;
  }
}
