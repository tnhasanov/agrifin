/**
 * Tövsiyələr — planlaşdırılan iş, siqnal deyil.
 *
 * Fərq vacibdir: siqnal hadisədir ("sabah şaxta"), tövsiyə isə mövsümün bu
 * mərhələsində görülməli işdir ("bu ay ikinci azot"). Biri gəlib keçir,
 * o biri təqvimlə hərəkət edir.
 *
 * ═══ KALİBRLƏMƏ ═══════════════════════════════════════════════════════
 * Hesablamalar ümumi normativlərə əsaslanır və Azərbaycan şəraitində
 * ölçülməyib. Metodun təfərrüatı lib/teqvim.js-in başındadır — EKRANDA
 * DEYİL: hər kartın altında abzas boyu izahat olanda fermer heç birini
 * oxumur və həqiqətən vacib olan (suvarma miqdarı) görünməz qalır.
 * Ekranda bölmənin sonunda bir sətir var, mənbə isə hər kartda çipdədir.
 * ══════════════════════════════════════════════════════════════════════
 */

// Suvarma tövsiyəsi yalnız bu qədər kəsir varsa verilir — 5 mm ölçmə
// xətası həddindədir və fermeri traktora mindirməyə dəyməz
export const MIN_KESIR_MM = 10;

// 1 mm su 1 hektara = 10 m³
const MM_HEKTAR_M3 = 10;

const topla = (deyerler, say) =>
  (deyerler ?? []).slice(0, say).reduce((cem, deyer) => cem + (deyer || 0), 0);

/**
 * Həftəlik su kəsiri: bitkinin tələbatı (ET0 × Kc) minus gözlənilən yağış.
 * @returns {null | {mm, m3, telebat, yagis}}
 */
export function suKesiri({ daily, kc, hektar, gun = 7 }) {
  if (!Number.isFinite(kc) || !Number.isFinite(hektar)) return null;
  const buxar = topla(daily?.et0_fao_evapotranspiration, gun);
  if (!(buxar > 0)) return null;

  const yagis = topla(daily?.precipitation_sum, gun);
  const telebat = buxar * kc;
  const kesir = telebat - yagis;
  if (kesir < MIN_KESIR_MM) return null;

  // m³ GÖSTƏRİLƏN mm-dən çıxarılır, xam rəqəmdən yox: fermer 33 mm görüb
  // özü vurduqda nəticə ekrandakı ilə üst-üstə düşməlidir
  const mm = Math.round(kesir);
  return {
    mm,
    // Fermer "mm" ilə düşünmür, sisternlə düşünür
    m3: Math.round(mm * MM_HEKTAR_M3 * hektar),
    telebat: Math.round(telebat),
    yagis: Math.round(yagis),
  };
}

/**
 * Neçə yerdən baxmaq lazımdır. Aqronomik praktikada nümunə sayı sahə ilə
 * artır, amma xətti yox — 50 ha-da 25 nöqtə heç kim gəzmir.
 */
export function baxisNoqteleri(hektar) {
  if (!Number.isFinite(hektar) || hektar <= 0) return null;
  const say = Math.round(3 + Math.sqrt(hektar));
  return Math.max(3, Math.min(12, say));
}

/**
 * Ekranda göstəriləcək tövsiyə siyahısı.
 *
 * @param {object} arg
 * @param {object} arg.teqvim  /api/teqvim cavabı
 * @param {object} arg.daily   Open-Meteo günlük massivləri
 * @param {number} arg.hektar  Sahənin ölçüsü
 * @param {object} arg.zona    Zəif künc (bax: services/zona.js) — ola bilməz
 */
export function tovsiyeleriQur({ teqvim, daily, hektar, zona } = {}) {
  const tovsiyeler = [];

  // 1. Bu ayın işləri — bilik bazasından, bitkiyə və aya görə
  for (const merhele of teqvim?.cari ?? []) {
    tovsiyeler.push({
      id: `merhele:${merhele.ad}`,
      nov: "merhele",
      icon: "Sprout",
      basliq: merhele.ad,
      metn: merhele.isler,
      menbeKey: "tovsiye.menbe.teqvim",
    });
  }

  // 2. Suvarma miqdarı — "nə vaxt" deyil, "nə qədər"
  const kesir = suKesiri({ daily, kc: teqvim?.kc, hektar });
  if (kesir) {
    tovsiyeler.push({
      id: `su:${kesir.mm}`,
      nov: "su",
      icon: "Droplets",
      basliqKey: "tovsiye.su.basliq",
      metnKey: "tovsiye.su.metn",
      vars: {
        mm: kesir.mm,
        m3: { number: kesir.m3 },
        telebat: kesir.telebat,
        yagis: kesir.yagis,
      },
      menbeKey: "tovsiye.menbe.hesablama",
    });
  }

  // 3. Zəif künc — xəritəni cümləyə çevirir
  if (zona?.zeif) {
    tovsiyeler.push({
      id: `zona:${zona.zeif.ad}:${zona.tarix ?? ""}`,
      nov: "zona",
      icon: "MapPin",
      basliqKey: "tovsiye.zona.basliq",
      metnKey: "tovsiye.zona.metn",
      vars: {
        kunc: { key: `zona.${zona.zeif.ad}` },
        faiz: Math.abs(zona.zeif.ferq),
      },
      menbeKey: "tovsiye.menbe.peyk",
    });
  }

  // 4. Baxış planı — sahənin ölçüsündən çıxır, ən sadə və ən dəqiq tövsiyə
  const noqte = baxisNoqteleri(hektar);
  if (noqte) {
    tovsiyeler.push({
      id: `baxis:${noqte}`,
      nov: "baxis",
      icon: "Search",
      basliqKey: "tovsiye.baxis.basliq",
      metnKey: "tovsiye.baxis.metn",
      vars: { say: noqte, hektar: { number: hektar } },
      menbeKey: "tovsiye.menbe.sahe",
    });
  }

  // 5. Növbəti ay — hazırlıq üçün xəbərdarlıq
  const novbeti = teqvim?.novbeti ?? [];
  if (novbeti.length > 0) {
    tovsiyeler.push({
      id: `novbeti:${novbeti[0].ad}`,
      nov: "novbeti",
      icon: "Calendar",
      basliqKey: "tovsiye.novbeti.basliq",
      metnKey: "tovsiye.novbeti.metn",
      vars: { merhele: novbeti.map((m) => m.ad).join(", ") },
      menbeKey: "tovsiye.menbe.teqvim",
    });
  }

  return tovsiyeler;
}
