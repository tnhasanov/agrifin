// Hava proqnozu modelinin dəqiqliyi ~9 km-dir, ona görə rayon mərkəzi kifayətdir.
// Sahə sərhədi (NDVI, sahə təsdiqi) üçün sonra GPS/poliqon istifadə olunacaq.
// Rayon adları xüsusi isimdir — tərcümə olunmur, məlumat kimi saxlanılır.
//
// KOD vs AD: `kod` sabit kimlikdir və saxlanılır; `name` yalnız ekranda
// görünür. Əvvəl seçim göstərilən mətnlə saxlanılırdı — adın yazılışı
// dəyişən kimi (məsələn "Bərdə (GPS)") eyni rayon iki fərqli dəyər olurdu.
// Kodlar ASCII-dir ki, URL, analitika və server sorğusunda təhrif olunmasın.
//
// SİYAHININ ÖZÜ `lib/rayonlar.js`-DƏDİR: bazar sifarişinin çatdırılma rayonu
// serverdə də yoxlanılır, ona görə məlumat server-klient ortaq fayldadır.
// Qatlama da eyni səbəbdən `lib/metn.js`-ə köçüb; hər ikisi buradan
// olduğu kimi ixrac olunur ki, mövcud importlar sınmasın.
import { RAYONLAR } from "../../lib/rayonlar.js";
import { normalizeAz } from "../../lib/metn.js";

export { normalizeAz };

export const DISTRICTS = RAYONLAR;

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
