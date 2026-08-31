// Sahə həndəsəsi — KLİENT VƏ SERVER ÜÇÜN ORTAQ MƏNBƏ.
//
// Bu modul `src/`-dən `lib/`-ə köçürüldü, çünki hektar artıq SERVERDƏ
// hesablanır: klientin göndərdiyi rəqəm qəbul edilmir (bax: api/sahe.js).
// İki ayrı nüsxə olsaydı, düsturlar zamanla ayrılar və "server nə hesablayır,
// fermer nə görür" fərqi yaranardı — kredit limiti buna bağlıdır.
//
// Modul TAM SAFDIR: nə şəbəkə, nə node modulu (kontur heşi ayrıdır —
// bax: lib/konturHash.js, o, node:crypto işlətdiyi üçün yalnız serverdədir).
//
// DİQQƏT: en/uzunluq dərəcələrini düz müstəvi kimi saymaq OLMAZ. Azərbaycanın
// enində (≈40°N) bir dərəcə uzunluq bir dərəcə enin yalnız ~76%-i qədərdir.
// Bunu nəzərə almasaq 6.5 ha sahə 8.5 ha görünər — kredit limiti buna bağlı
// olduğu üçün bu, sadəcə qrafik xətası deyil.
//
// Ona görə sahə sferik düsturla hesablanır (turf.js və Google Maps ilə eyni).

// Yerin orta radiusu (IUGG), metr
const R = 6371008.8;

const rad = (deger) => (deger * Math.PI) / 180;

/** Nöqtə [en, uzunluq] formasındadır — Leaflet ilə eyni sıra */
const en = (p) => p[0];
const uz = (p) => p[1];

/**
 * Sferik çoxbucaqlının sahəsi (m²). İşarə fırlanma istiqamətindən asılıdır,
 * ona görə mütləq dəyər götürülür.
 */
export function sahəMetrKv(noqteler) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) return 0;

  let toplam = 0;
  for (let i = 0; i < noqteler.length; i += 1) {
    const evvel = noqteler[i];
    const sonra = noqteler[(i + 1) % noqteler.length];
    toplam += (rad(uz(sonra)) - rad(uz(evvel))) * (2 + Math.sin(rad(en(evvel))) + Math.sin(rad(en(sonra))));
  }
  return Math.abs((toplam * R * R) / 2);
}

/** Sahə hektarla, iki onluq dəqiqliklə */
export function sahəHektar(noqteler) {
  return Math.round(sahəMetrKv(noqteler) / 100) / 100;
}

/** İki nöqtə arası məsafə (metr) — haversine */
export function mesafeMetr(a, b) {
  const dEn = rad(en(b) - en(a));
  const dUz = rad(uz(b) - uz(a));
  const h =
    Math.sin(dEn / 2) ** 2 +
    Math.cos(rad(en(a))) * Math.cos(rad(en(b))) * Math.sin(dUz / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Sahənin perimetri (metr) — konturu qapalı sayır */
export function perimetrMetr(noqteler) {
  if (!Array.isArray(noqteler) || noqteler.length < 2) return 0;
  let toplam = 0;
  for (let i = 0; i < noqteler.length; i += 1) {
    toplam += mesafeMetr(noqteler[i], noqteler[(i + 1) % noqteler.length]);
  }
  return toplam;
}

/** Xəritəni mərkəzləmək üçün sadə orta nöqtə */
export function merkez(noqteler) {
  if (!Array.isArray(noqteler) || noqteler.length === 0) return null;
  const toplam = noqteler.reduce((acc, p) => [acc[0] + en(p), acc[1] + uz(p)], [0, 0]);
  return [toplam[0] / noqteler.length, toplam[1] / noqteler.length];
}

/** Üç nöqtənin fırlanma istiqaməti: 0 xətt üstündə */
function istiqamet(a, b, c) {
  const deger = (uz(b) - uz(a)) * (en(c) - en(a)) - (en(b) - en(a)) * (uz(c) - uz(a));
  if (Math.abs(deger) < 1e-12) return 0;
  return deger > 0 ? 1 : -1;
}

/** İki parça kəsişirmi (yalnız həqiqi kəsişmə — ucları bölüşmək saymır) */
function parcalarKesisir(p1, p2, p3, p4) {
  const d1 = istiqamet(p3, p4, p1);
  const d2 = istiqamet(p3, p4, p2);
  const d3 = istiqamet(p1, p2, p3);
  const d4 = istiqamet(p1, p2, p4);
  return d1 !== d2 && d3 !== d4;
}

/**
 * Kontur öz-özünü kəsirmi ("papyon" forması). Belə sahənin sahəsi mənasızdır,
 * ona görə saxlamağa buraxmırıq.
 */
export function ozunuKesir(noqteler) {
  if (!Array.isArray(noqteler) || noqteler.length < 4) return false;
  const n = noqteler.length;

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      // Qonşu parçalar ucu bölüşür — onları müqayisə etmirik
      const qonsu = j === i + 1 || (i === 0 && j === n - 1);
      if (qonsu) continue;
      if (
        parcalarKesisir(
          noqteler[i],
          noqteler[(i + 1) % n],
          noqteler[j],
          noqteler[(j + 1) % n],
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

// Ağlabatan hədlər. Aşağı hədd səhv toxunuşu tutur, yuxarı hədd isə
// yaxınlaşdırmanı unudub bütöv rayonu çevirməyi.
export const MIN_HEKTAR = 0.05;
export const MAX_HEKTAR = 1000;
// Bundan uzaqda çəkilən sahə çox güman başqa rayondadır — xəbərdarlıq, qadağa deyil
export const UZAQ_METR = 150_000;

/**
 * Saxlamazdan əvvəl yoxlama. `xetaAcari` varsa saxlamaq olmaz;
 * `xeberdarlıqAcari` isə yalnız fermerə göstərilir.
 */
export function sahəniYoxla(noqteler, { yer } = {}) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) {
    return { ok: false, xetaAcari: "field.errorTooFewPoints" };
  }
  if (ozunuKesir(noqteler)) {
    return { ok: false, xetaAcari: "field.errorSelfCrossing" };
  }

  const hektar = sahəHektar(noqteler);
  if (hektar < MIN_HEKTAR) {
    return { ok: false, xetaAcari: "field.errorTooSmall" };
  }
  if (hektar > MAX_HEKTAR) {
    return { ok: false, xetaAcari: "field.errorTooLarge" };
  }

  let xeberdarlıqAcari = null;
  if (yer && Number.isFinite(yer.lat) && Number.isFinite(yer.lon)) {
    const orta = merkez(noqteler);
    if (mesafeMetr(orta, [yer.lat, yer.lon]) > UZAQ_METR) {
      xeberdarlıqAcari = "field.warnFarFromDistrict";
    }
  }

  return { ok: true, hektar, xetaAcari: null, xeberdarlıqAcari };
}

/** Saxlanmış sahənin forması düzgündürmü — yüklənəndə yoxlanılır */
export function duzgunSahe(sahe) {
  return (
    Boolean(sahe) &&
    Array.isArray(sahe.noqteler) &&
    sahe.noqteler.length >= 3 &&
    sahe.noqteler.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        Number.isFinite(p[0]) &&
        Number.isFinite(p[1]) &&
        Math.abs(p[0]) <= 90 &&
        Math.abs(p[1]) <= 180,
    ) &&
    Number.isFinite(sahe.hektar)
  );
}
