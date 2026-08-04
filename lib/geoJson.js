// Sahə konturunu GeoJSON-a çevirmə.
//
// DİQQƏT — iki səssiz səhv mənbəyi:
//
// 1) SIRA. Leaflet və bizim store [en, uzunluq] işlədir; GeoJSON isə
//    [uzunluq, en]. Səhv salsaq Bərdə sahəsi Hind okeanına düşür və
//    Copernicus "məlumat yoxdur" qaytarır — xəta mesajı olmadan, sadəcə
//    boş nəticə. Ona görə çevirmə ayrıca funksiyadır və testlə qorunur.
//
// 2) QAPANMA. GeoJSON halqasının ilk və son nöqtəsi eyni olmalıdır.
//    Olmasa API 400 qaytarır.

/** Nöqtə düzgün en/uzunluq cütüdürmü */
function noqteDuzgun(p) {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    Math.abs(p[0]) <= 90 &&
    Math.abs(p[1]) <= 180
  );
}

export const MIN_NOQTE = 3;
export const MAX_NOQTE = 200;

/**
 * [[en, uzunluq], ...] → GeoJSON Polygon ([uzunluq, en], qapalı halqa).
 * Yararsız girişdə null qaytarır — çağıran tərəf 400 verməlidir.
 */
export function polygonaCevir(noqteler) {
  if (!Array.isArray(noqteler)) return null;
  if (noqteler.length < MIN_NOQTE || noqteler.length > MAX_NOQTE) return null;
  if (!noqteler.every(noqteDuzgun)) return null;

  // [en, uzunluq] → [uzunluq, en]
  const halqa = noqteler.map(([en, uz]) => [uz, en]);

  // Halqanı qapadırıq (ilk nöqtə sonda təkrarlanır)
  const ilk = halqa[0];
  const son = halqa[halqa.length - 1];
  if (ilk[0] !== son[0] || ilk[1] !== son[1]) halqa.push([...ilk]);

  return { type: "Polygon", coordinates: [halqa] };
}

export const QONSU_RADIUS_KM = 5;
const KM_DERECE = 111.32;

/**
 * Sahənin ətrafındakı kvadrat — qonşu müqayisəsi üçün.
 *
 * GeoJSON bbox sırası: [uzunluqMin, enMin, uzunluqMax, enMax] — yəni yenə
 * uzunluq ƏVVƏL gəlir (bax: yuxarıdakı 1-ci qeyd).
 *
 * Uzunluq dərəcəsi ekvatordan uzaqlaşdıqca qısalır; kosinusla düzəliş
 * etməsək Azərbaycan enində (~40°) qərb-şərq radiusu 30% böyük çıxar.
 */
export function qonsuCercevesi(noqteler, radiusKm = QONSU_RADIUS_KM) {
  if (!Array.isArray(noqteler) || noqteler.length < MIN_NOQTE) return null;
  if (!noqteler.every(noqteDuzgun)) return null;
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 50) return null;

  const enler = noqteler.map((p) => p[0]);
  const uzler = noqteler.map((p) => p[1]);
  const enOrta = (Math.max(...enler) + Math.min(...enler)) / 2;
  const uzOrta = (Math.max(...uzler) + Math.min(...uzler)) / 2;

  const enDelta = radiusKm / KM_DERECE;
  const kosinus = Math.cos((enOrta * Math.PI) / 180);
  // Qütbə yaxın kosinus sıfıra gedir və bölmə sonsuzluq verir
  if (!Number.isFinite(kosinus) || Math.abs(kosinus) < 0.01) return null;
  const uzDelta = radiusKm / (KM_DERECE * kosinus);

  return [
    Math.max(-180, uzOrta - uzDelta),
    Math.max(-90, enOrta - enDelta),
    Math.min(180, uzOrta + uzDelta),
    Math.min(90, enOrta + enDelta),
  ];
}

/**
 * Sahəni dörd kvadranta bölür: şimal-qərb, şimal-şərq, cənub-qərb,
 * cənub-şərq. Hər kvadrant sahənin ÖZ konturu ilə kəsilir — düzbucaqlı
 * göndərsək sahədən kənar piksellər (yol, qonşu tarla) ölçməyə düşərdi.
 *
 * Sutherland–Hodgman: kəsici sahə düzbucaqlıdır (qabarıqdır), ona görə
 * alqoritm istənilən formalı sahə üçün düzgün işləyir.
 */
function kenardanKes(halqa, iceridedirmi, kesisme) {
  const netice = [];
  for (let i = 0; i < halqa.length; i += 1) {
    const cari = halqa[i];
    const evvel = halqa[(i + halqa.length - 1) % halqa.length];
    const cariIcedir = iceridedirmi(cari);
    const evvelIcedir = iceridedirmi(evvel);

    if (cariIcedir) {
      if (!evvelIcedir) netice.push(kesisme(evvel, cari));
      netice.push(cari);
    } else if (evvelIcedir) {
      netice.push(kesisme(evvel, cari));
    }
  }
  return netice;
}

/** Düzbucaqlı ilə kəsmə. Halqa [[en, uzunluq], ...] formasındadır. */
export function duzbucaqlaKes(noqteler, { enMin, enMax, uzMin, uzMax }) {
  let halqa = noqteler.map(([en, uz]) => [en, uz]);

  const kenarlar = [
    [(p) => p[0] >= enMin, (a, b) => [enMin, a[1] + ((b[1] - a[1]) * (enMin - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= enMax, (a, b) => [enMax, a[1] + ((b[1] - a[1]) * (enMax - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= uzMin, (a, b) => [a[0] + ((b[0] - a[0]) * (uzMin - a[1])) / (b[1] - a[1]), uzMin]],
    [(p) => p[1] <= uzMax, (a, b) => [a[0] + ((b[0] - a[0]) * (uzMax - a[1])) / (b[1] - a[1]), uzMax]],
  ];

  for (const [iceridedirmi, kesisme] of kenarlar) {
    if (halqa.length === 0) return [];
    halqa = kenardanKes(halqa, iceridedirmi, kesisme);
  }
  return halqa;
}

/** Kvadrantların adları — fermer "şimal-şərq küncü" kimi düşünür */
export const KVADRANTLAR = ["simalQerb", "simalSerq", "cenubQerb", "cenubSerq"];

/**
 * @returns {null | Array<{ad, polygon}>} Boş çıxan kvadrantlar atılır:
 *          uzunsov sahədə iki künc heç bir piksel tutmaya bilər.
 */
export function kvadrantlar(noqteler) {
  if (!Array.isArray(noqteler) || noqteler.length < MIN_NOQTE) return null;
  if (!noqteler.every(noqteDuzgun)) return null;

  const enler = noqteler.map((p) => p[0]);
  const uzler = noqteler.map((p) => p[1]);
  const enMin = Math.min(...enler);
  const enMax = Math.max(...enler);
  const uzMin = Math.min(...uzler);
  const uzMax = Math.max(...uzler);
  const enOrta = (enMin + enMax) / 2;
  const uzOrta = (uzMin + uzMax) / 2;

  const cerceveler = {
    simalQerb: { enMin: enOrta, enMax, uzMin, uzMax: uzOrta },
    simalSerq: { enMin: enOrta, enMax, uzMin: uzOrta, uzMax },
    cenubQerb: { enMin, enMax: enOrta, uzMin, uzMax: uzOrta },
    cenubSerq: { enMin, enMax: enOrta, uzMin: uzOrta, uzMax },
  };

  const netice = [];
  for (const ad of KVADRANTLAR) {
    const kesilmis = duzbucaqlaKes(noqteler, cerceveler[ad]);
    // Üç nöqtədən az qalıbsa sahə yoxdur
    if (kesilmis.length < MIN_NOQTE) continue;
    const polygon = polygonaCevir(kesilmis);
    if (polygon) netice.push({ ad, polygon });
  }
  return netice.length >= 2 ? netice : null;
}

/** Sahənin əhatə çərçivəsi — çox böyük sahəni erkən rədd etmək üçün */
export function cerceve(noqteler) {
  const enler = noqteler.map((p) => p[0]);
  const uzler = noqteler.map((p) => p[1]);
  return {
    enFerq: Math.max(...enler) - Math.min(...enler),
    uzFerq: Math.max(...uzler) - Math.min(...uzler),
  };
}
