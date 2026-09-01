// Hava proqnozu modelinin dəqiqliyi ~9 km-dir, ona görə rayon mərkəzi kifayətdir.
// Sahə sərhədi (NDVI, sahə təsdiqi) üçün sonra GPS/poliqon istifadə olunacaq.
// Rayon adları xüsusi isimdir — tərcümə olunmur, məlumat kimi saxlanılır.
//
// KOD vs AD: `kod` sabit kimlikdir və saxlanılır; `name` yalnız ekranda
// görünür. Əvvəl seçim göstərilən mətnlə saxlanılırdı — adın yazılışı
// dəyişən kimi (məsələn "Bərdə (GPS)") eyni rayon iki fərqli dəyər olurdu.
// Kodlar ASCII-dir ki, URL, analitika və server sorğusunda təhrif olunmasın.
export const DISTRICTS = [
  { kod: "agcabedi", name: "Ağcabədi", lat: 40.053, lon: 47.4597 },
  { kod: "agdam", name: "Ağdam", lat: 39.9931, lon: 46.9303 },
  { kod: "agdas", name: "Ağdaş", lat: 40.6503, lon: 47.4708 },
  { kod: "astara", name: "Astara", lat: 38.4561, lon: 48.8725 },
  { kod: "balaken", name: "Balakən", lat: 41.7269, lon: 46.4053 },
  { kod: "beyleqan", name: "Beyləqan", lat: 39.7722, lon: 47.6156 },
  { kod: "berde", name: "Bərdə", lat: 40.3705, lon: 47.1265 },
  { kod: "bilesuvar", name: "Biləsuvar", lat: 39.4592, lon: 48.5497 },
  { kod: "celilabad", name: "Cəlilabad", lat: 39.2094, lon: 48.4939 },
  { kod: "gence", name: "Gəncə", lat: 40.6828, lon: 46.3606 },
  { kod: "goranboy", name: "Goranboy", lat: 40.6103, lon: 46.7889 },
  { kod: "goycay", name: "Göyçay", lat: 40.6531, lon: 47.7406 },
  { kod: "haciqabul", name: "Hacıqabul", lat: 40.0347, lon: 48.92 },
  { kod: "xacmaz", name: "Xaçmaz", lat: 41.4644, lon: 48.8022 },
  { kod: "imisli", name: "İmişli", lat: 39.8694, lon: 48.0619 },
  { kod: "ismayilli", name: "İsmayıllı", lat: 40.7872, lon: 48.1519 },
  { kod: "kurdemir", name: "Kürdəmir", lat: 40.3494, lon: 48.1644 },
  { kod: "qax", name: "Qax", lat: 41.4206, lon: 46.9219 },
  { kod: "qazax", name: "Qazax", lat: 41.0928, lon: 45.3661 },
  { kod: "qebele", name: "Qəbələ", lat: 40.9819, lon: 47.8494 },
  { kod: "quba", name: "Quba", lat: 41.3608, lon: 48.5133 },
  { kod: "qusar", name: "Qusar", lat: 41.4272, lon: 48.43 },
  { kod: "lerik", name: "Lerik", lat: 38.7744, lon: 48.4153 },
  { kod: "lenkeran", name: "Lənkəran", lat: 38.7536, lon: 48.8511 },
  { kod: "masalli", name: "Masallı", lat: 39.0339, lon: 48.6653 },
  { kod: "mingecevir", name: "Mingəçevir", lat: 40.77, lon: 47.0489 },
  { kod: "naxcivan", name: "Naxçıvan", lat: 39.2089, lon: 45.4122 },
  { kod: "neftcala", name: "Neftçala", lat: 39.3781, lon: 49.2469 },
  { kod: "oguz", name: "Oğuz", lat: 41.0725, lon: 47.4633 },
  { kod: "ordubad", name: "Ordubad", lat: 38.9089, lon: 46.0239 },
  { kod: "saatli", name: "Saatlı", lat: 39.9106, lon: 48.3597 },
  { kod: "sabirabad", name: "Sabirabad", lat: 40.0106, lon: 48.4728 },
  { kod: "salyan", name: "Salyan", lat: 39.5958, lon: 48.98 },
  { kod: "samux", name: "Samux", lat: 40.7639, lon: 46.4083 },
  { kod: "siyezen", name: "Siyəzən", lat: 41.0781, lon: 49.1108 },
  { kod: "sabran", name: "Şabran", lat: 41.2225, lon: 48.9931 },
  { kod: "samaxi", name: "Şamaxı", lat: 40.6311, lon: 48.6414 },
  { kod: "seki", name: "Şəki", lat: 41.1919, lon: 47.1706 },
  { kod: "semkir", name: "Şəmkir", lat: 40.8297, lon: 46.0186 },
  { kod: "serur", name: "Şərur", lat: 39.5539, lon: 44.9847 },
  { kod: "sirvan", name: "Şirvan", lat: 39.9331, lon: 48.9264 },
  { kod: "tovuz", name: "Tovuz", lat: 40.9925, lon: 45.6303 },
  { kod: "ucar", name: "Ucar", lat: 40.515, lon: 47.65 },
  { kod: "yardimli", name: "Yardımlı", lat: 38.9083, lon: 48.2408 },
  { kod: "yevlax", name: "Yevlax", lat: 40.6172, lon: 47.15 },
  { kod: "zaqatala", name: "Zaqatala", lat: 41.6317, lon: 46.6444 },
  { kod: "zerdab", name: "Zərdab", lat: 40.2181, lon: 47.71 },
];

export const DEFAULT_LOCATION = { kod: "berde", name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false };

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

export function districtByKod(kod) {
  return DISTRICTS.find((district) => district.kod === kod) ?? null;
}

/** Adla tapır — köhnə yaddaşdan gələn "Bərdə (GPS)" kimi dəyərlər üçün */
export function districtByName(name) {
  const acar = normalizeAz(String(name ?? "").replace(/\s*\(GPS\)\s*$/i, ""));
  if (!acar) return null;
  return DISTRICTS.find((district) => normalizeAz(district.name) === acar) ?? null;
}

/**
 * AZ hərflərini ASCII-yə qatlayır: "Gəncə" → "gence", "Şəki" → "seki".
 *
 * NİYƏ: fermerin klaviaturasında ə/ş/ğ/ı hərfi olmaya bilər, ya da tələsib
 * aksentsiz yazır. Qatlama HƏR İKİ tərəfə tətbiq olunur, ona görə "Gence"
 * yazanda "Gəncə" tapılır — və əksinə. Seçim yenə də rayonun ÖZ yazılışı
 * ilə qalır; axtarış üsulu göstərilən adı dəyişmir.
 */
const QATLAMA = {
  ə: "e",
  ş: "s",
  ç: "c",
  ğ: "g",
  ı: "i",
  i: "i",
  ö: "o",
  ü: "u",
  İ: "i",
  I: "i",
};

export function normalizeAz(text) {
  return String(text ?? "")
    .trim()
    .toLocaleLowerCase("az")
    .replace(/[əşçğıiöüİI]/gu, (herf) => QATLAMA[herf] ?? herf);
}

/**
 * Əlavə yazılışlar — qatlamanın tuta bilmədiyi hallar.
 *
 * Yalnız İNSANLARIN REAL yazdığı formalar: ingilis/rus transliterasiyası
 * və geniş yayılmış qısaltma. Uydurma ad qoyulmur; siyahı rayonun kodunu
 * göstərir, ikinci rayon siyahısı yaratmır.
 */
const ALIASLAR = {
  ganja: "gence",
  gyandzha: "gence",
  ganca: "gence",
  nakhchivan: "naxcivan",
  nachivan: "naxcivan",
  sheki: "seki",
  shaki: "seki",
  nukha: "seki",
  lankaran: "lenkeran",
  lenkoran: "lenkeran",
  barda: "berde",
  khachmaz: "xacmaz",
  shamakhi: "samaxi",
  shirvan: "sirvan",
  gabala: "qebele",
  guba: "quba",
  qusary: "qusar",
  zagatala: "zaqatala",
  mingachevir: "mingecevir",
  yevlakh: "yevlax",
  goychay: "goycay",
  agjabadi: "agcabedi",
  shamkir: "semkir",
};

/** Axtarışın işə düşməsi üçün minimum hərf sayı */
export const AXTARIS_HEDDI = 2;

/**
 * Axtarış: aksentsiz və böyük/kiçik hərfə həssas deyil.
 *
 * Sıra "başlayır" → "içində" şəklindədir: "ba" yazan fermer əvvəlcə
 * Balakən-i görür, Sabirabad-ı yox. İki hərfdən az yazılıbsa süzgəc
 * işləmir — bir hərf onsuz da yarım siyahı qaytarır.
 */
export function searchDistricts(query) {
  const needle = normalizeAz(query);
  if (needle.length < AXTARIS_HEDDI) return DISTRICTS;

  const alias = ALIASLAR[needle];
  const basalayanlar = [];
  const icindekiler = [];

  for (const district of DISTRICTS) {
    const acar = normalizeAz(district.name);
    if (alias && district.kod === alias) basalayanlar.unshift(district);
    else if (acar.startsWith(needle)) basalayanlar.push(district);
    else if (acar.includes(needle)) icindekiler.push(district);
  }

  return [...basalayanlar, ...icindekiler];
}

/** Uyğun gələn hissəni vurğulamaq üçün: [əvvəl, uyğun, sonra] */
export function vurguParcasi(name, query) {
  const needle = normalizeAz(query);
  if (needle.length < AXTARIS_HEDDI) return [name, "", ""];
  const yer = normalizeAz(name).indexOf(needle);
  if (yer < 0) return [name, "", ""];
  // Qatlama hərf sayını dəyişmir, ona görə indekslər adın özündə də keçərlidir
  return [name.slice(0, yer), name.slice(yer, yer + needle.length), name.slice(yer + needle.length)];
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
    const ad = saved.ad ?? saved.name ?? DEFAULT_LOCATION.name;
    return {
      kod: saved.kod ?? districtByName(ad)?.kod ?? nearestDistrict(saved.lat, saved.lon).kod,
      name: ad,
      lat: saved.lat,
      lon: saved.lon,
      gps: Boolean(saved.gps),
    };
  } catch {
    return null;
  }
}
