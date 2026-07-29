// ---------- Yer seçimi: rayon mərkəzləri + yaddaş ----------
// Hava proqnozu modelinin dəqiqliyi ~9 km-dir, ona görə rayon mərkəzi kifayətdir.
// Sahə sərhədi (NDVI, sahə təsdiqi) üçün sonra GPS/poliqon istifadə olunacaq.

export const RAYONLAR = [
  { ad: "Ağcabədi", lat: 40.0530, lon: 47.4597 },
  { ad: "Ağdam", lat: 39.9931, lon: 46.9303 },
  { ad: "Ağdaş", lat: 40.6503, lon: 47.4708 },
  { ad: "Astara", lat: 38.4561, lon: 48.8725 },
  { ad: "Balakən", lat: 41.7269, lon: 46.4053 },
  { ad: "Beyləqan", lat: 39.7722, lon: 47.6156 },
  { ad: "Biləsuvar", lat: 39.4592, lon: 48.5497 },
  { ad: "Bərdə", lat: 40.3705, lon: 47.1265 },
  { ad: "Cəlilabad", lat: 39.2094, lon: 48.4939 },
  { ad: "Gəncə", lat: 40.6828, lon: 46.3606 },
  { ad: "Goranboy", lat: 40.6103, lon: 46.7889 },
  { ad: "Göyçay", lat: 40.6531, lon: 47.7406 },
  { ad: "Hacıqabul", lat: 40.0347, lon: 48.9200 },
  { ad: "İmişli", lat: 39.8694, lon: 48.0619 },
  { ad: "İsmayıllı", lat: 40.7872, lon: 48.1519 },
  { ad: "Kürdəmir", lat: 40.3494, lon: 48.1644 },
  { ad: "Lerik", lat: 38.7744, lon: 48.4153 },
  { ad: "Lənkəran", lat: 38.7536, lon: 48.8511 },
  { ad: "Masallı", lat: 39.0339, lon: 48.6653 },
  { ad: "Mingəçevir", lat: 40.7700, lon: 47.0489 },
  { ad: "Naxçıvan", lat: 39.2089, lon: 45.4122 },
  { ad: "Neftçala", lat: 39.3781, lon: 49.2469 },
  { ad: "Oğuz", lat: 41.0725, lon: 47.4633 },
  { ad: "Ordubad", lat: 38.9089, lon: 46.0239 },
  { ad: "Qax", lat: 41.4206, lon: 46.9219 },
  { ad: "Qazax", lat: 41.0928, lon: 45.3661 },
  { ad: "Quba", lat: 41.3608, lon: 48.5133 },
  { ad: "Qusar", lat: 41.4272, lon: 48.4300 },
  { ad: "Qəbələ", lat: 40.9819, lon: 47.8494 },
  { ad: "Saatlı", lat: 39.9106, lon: 48.3597 },
  { ad: "Sabirabad", lat: 40.0106, lon: 48.4728 },
  { ad: "Salyan", lat: 39.5958, lon: 48.9800 },
  { ad: "Samux", lat: 40.7639, lon: 46.4083 },
  { ad: "Siyəzən", lat: 41.0781, lon: 49.1108 },
  { ad: "Şabran", lat: 41.2225, lon: 48.9931 },
  { ad: "Şamaxı", lat: 40.6311, lon: 48.6414 },
  { ad: "Şirvan", lat: 39.9331, lon: 48.9264 },
  { ad: "Şəki", lat: 41.1919, lon: 47.1706 },
  { ad: "Şəmkir", lat: 40.8297, lon: 46.0186 },
  { ad: "Şərur", lat: 39.5539, lon: 44.9847 },
  { ad: "Tovuz", lat: 40.9925, lon: 45.6303 },
  { ad: "Ucar", lat: 40.5150, lon: 47.6500 },
  { ad: "Xaçmaz", lat: 41.4644, lon: 48.8022 },
  { ad: "Yardımlı", lat: 38.9083, lon: 48.2408 },
  { ad: "Yevlax", lat: 40.6172, lon: 47.1500 },
  { ad: "Zaqatala", lat: 41.6317, lon: 46.6444 },
  { ad: "Zərdab", lat: 40.2181, lon: 47.7100 },
];

export const DEFAULT_YER = { ad: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false };

const KEY = "agrifin.yer";

export function yerOxu() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    if (x && typeof x.lat === "number" && typeof x.lon === "number") return x;
  } catch {
    /* yaddaş əlçatan deyil — default qaytarılır */
  }
  return null;
}

export function yerYaz(yer) {
  try {
    localStorage.setItem(KEY, JSON.stringify(yer));
  } catch {
    /* yaddaş yazıla bilmədi — sessiya üçün yenə işləyir */
  }
}

// GPS koordinatına ən yaxın rayonu tapır — ad vermək üçün, əlavə API olmadan.
export function enYaxinRayon(lat, lon) {
  let ən = RAYONLAR[0];
  let minMesafe = Infinity;
  for (const r of RAYONLAR) {
    const dx = (r.lon - lon) * Math.cos((lat * Math.PI) / 180);
    const dy = r.lat - lat;
    const mesafe = dx * dx + dy * dy;
    if (mesafe < minMesafe) {
      minMesafe = mesafe;
      ən = r;
    }
  }
  return ən;
}
