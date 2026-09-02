import { merkez, sahəHektar } from "../../services/geo.js";
import { necheGunEvvel, ortukFaizi } from "../../services/ndvi.js";
import { EKIN_HEDDI, cariVeziyyetHali } from "../../../lib/mehsuldarliq.js";
import { MOVSUM, bicineQalanAy, movsumGedisi } from "../../../lib/movsum.js";

/**
 * SAHƏ PASPORTUNUN MƏLUMATI — saf yığım, çəkiliş yoxdur.
 *
 * PDF-in özü (pdfQur.js) yalnız çəkir; nəyin göstərilib-göstərilməyəcəyi
 * burada qərarlaşır və burada test olunur. Beləliklə "sənəddə uydurma rəqəm
 * var idi" sualı bir faylda cavablanır.
 *
 * ƏSAS QAYDA: ÖLÇÜLƏN və HESABLANAN ayrı sahələrdədir.
 *   • olculen — peykdən gələn (NDVI, rütubət, müqayisə, mövsüm zirvələri);
 *   • hesablanan — modeldən çıxan (gəlir ssenariləri, kredit tavanı).
 * Hesablanan hər blok `model` sahəsi ilə gəlir: adı, versiyası, kalibrlənmə
 * halı. PDF onu görünən qeydə çevirir — bank sənədində "bu rəqəm haradandır"
 * sualı cavabsız qalmamalıdır.
 */

/** Kontur mərkəzi — sənəddə sahənin ünvanı kimi göstərilir */
export function koordinatMetni(noqteler) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) return null;
  const [lat, lon] = merkez(noqteler);
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

/**
 * Mövsüm sətirləri: yalnız ölçülmüş illər. Ölçülməyən il cədvəldən çıxarılır,
 * "0" kimi göstərilmir — boş il ilə ölçülməmiş il eyni şey deyil.
 */
export function movsumSetirleri(movsumler = [], cariIl = new Date().getFullYear()) {
  return movsumler
    .filter((m) => Number.isFinite(m.zirve))
    .map((m) => ({
      il: m.il,
      zirve: m.zirve,
      faiz: ortukFaizi(m.zirve),
      etrafMedyan: Number.isFinite(m.etrafMedyan) ? m.etrafMedyan : null,
      // Cari il hələ bitməyib: aşağı zirvə "boş qalıb" demək deyil
      bos: m.zirve < EKIN_HEDDI && m.il !== cariIl,
      davamEdir: m.zirve < EKIN_HEDDI && m.il === cariIl,
      olcmeSayi: m.olcmeSayi ?? null,
    }));
}

/**
 * @param {object} arg
 * @param {object} arg.sahe        {noqteler, hektar}
 * @param {string} arg.bitkiKey
 * @param {object} arg.location    {name}
 * @param {object} arg.hesab       {telefon}
 * @param {string} arg.fermerAdi
 * @param {object} arg.peyk        useNdvi nəticəsi {xulase, seriya, hal}
 * @param {object} arg.qonsu       {muqayise}
 * @param {object} arg.indeksHali  {indeks, movsumler, hal}
 * @param {object} arg.kredit      kreditImkani() nəticəsi
 * @param {object} arg.kreditHali  server kredit vəziyyəti
 * @param {string} arg.sekil       sahənin peyk şəkli (data URL) və ya null
 */
export function hesabatMelumati({
  sahe = null,
  bitkiKey = null,
  location = null,
  hesab = null,
  fermerAdi = null,
  peyk = null,
  qonsu = null,
  indeksHali = null,
  kredit = null,
  kreditHali = null,
  sekil = null,
  indi = new Date(),
} = {}) {
  const xulase = peyk?.xulase ?? null;
  const indeks = indeksHali?.indeks ?? null;
  const muqayise = qonsu?.muqayise ?? null;
  const gelir = kredit?.gelir?.hal === "hazir" ? kredit.gelir : null;

  // Hektar: çəkilmiş konturdan yenidən hesablanır. Saxlanmış dəyər köhnə
  // versiyadan qalmış ola bilər; sənəddəki rəqəm konturun özündən çıxmalıdır.
  const hektar =
    Array.isArray(sahe?.noqteler) && sahe.noqteler.length >= 3
      ? sahəHektar(sahe.noqteler)
      : (sahe?.hektar ?? null);

  const seriya = Array.isArray(peyk?.seriya) ? peyk.seriya : [];
  const movsumler = movsumSetirleri(indeksHali?.movsumler ?? [], indi.getFullYear());

  return {
    yaradilib: indi.toISOString(),

    // ── Kimlik ───────────────────────────────────────────────────────
    fermer: {
      ad: fermerAdi ?? null,
      telefon: hesab?.telefon ?? null,
      rayon: location?.name?.replace(" (GPS)", "") ?? null,
      koordinat: koordinatMetni(sahe?.noqteler),
    },

    sahe: {
      hektar: Number.isFinite(hektar) ? hektar : null,
      bitkiKey,
      noqteSayi: sahe?.noqteler?.length ?? 0,
      sekil,
    },

    // ── ÖLÇÜLƏN ──────────────────────────────────────────────────────
    olculen: {
      ndvi: Number.isFinite(xulase?.ndvi) ? xulase.ndvi : null,
      faiz: ortukFaizi(xulase?.ndvi),
      istiqamet: xulase?.istiqamet ?? null,
      suSeviyyesi: xulase?.suSeviyyesi ?? null,
      nemlik: Number.isFinite(xulase?.nemlik) ? xulase.nemlik : null,
      ortulu: Number.isFinite(xulase?.ortulu) ? xulase.ortulu : null,
      tarix: xulase?.tarix ?? null,
      gunEvvel: xulase?.tarix ? necheGunEvvel(xulase.tarix) : null,
      olcmeSayi: seriya.length,
      seriya: seriya.map((s) => ({ son: s.son, ndvi: s.ndvi })),
      movsumler,
    },

    muqayise: muqayise
      ? {
          medyan: muqayise.medyan ?? null,
          medyanFaiz: ortukFaizi(muqayise.medyan),
          ferq: Number.isFinite(muqayise.ferq) ? muqayise.ferq : null,
          radiusKm: muqayise.radiusKm ?? 5,
          piksel: muqayise.piksel ?? null,
        }
      : null,

    // ── HESABLANAN ───────────────────────────────────────────────────
    // FarmScore: bal ölçülmüş mövsümlərdən hesablanır, ona görə burada
    // amillərin xalı da gedir — bank hansı sətirlə razılaşmadığını deyə bilsin
    bal: indeks
      ? {
          bal: indeks.bal,
          bant: indeks.bant,
          etibar: indeks.etibar,
          movsumSayi: indeks.movsumSayi ?? movsumler.length,
          natamam: Boolean(indeks.natamam),
          elcatanXal: indeks.elcatanXal ?? 100,
          cariRisk: cariVeziyyetHali(indeks).risk,
          setirler: (indeks.setirler ?? []).map((s) => ({
            id: s.id,
            xal: s.xal,
            maxXal: s.maxXal,
            metodologiya: s.metodologiya ?? null,
          })),
        }
      : null,

    // Gəlir: ARALIQ, tək rəqəm deyil. `model` sahəsi sənəddə görünən qeydə
    // çevrilir — kalibrlənməmiş model olduğu gizlədilmir.
    gelir: gelir
      ? {
          pessimist: gelir.pessimist?.xalisGelir ?? null,
          baza: gelir.baza?.xalisGelir ?? null,
          optimist: gelir.optimist?.xalisGelir ?? null,
          xerc: gelir.baza?.xerc ?? null,
          mehsuldarliq: gelir.ferziyyeler?.find((f) => f.acar === "mehsuldarliq") ?? null,
          qiymet: gelir.ferziyyeler?.find((f) => f.acar === "qiymet") ?? null,
          ferziyyeler: gelir.ferziyyeler ?? [],
          model: { kalibrlenib: Boolean(gelir.yoxlanilib), tesdiq: gelir.tesdiq ?? null },
        }
      : null,

    movsum: bitkiKey && MOVSUM[bitkiKey]
      ? {
          basla: MOVSUM[bitkiKey].basla,
          bicin: MOVSUM[bitkiKey].bicin,
          gedis: movsumGedisi(bitkiKey, indi),
          qalanAy: bicineQalanAy(bitkiKey, indi),
        }
      : null,

    // Kredit yalnız SERVERDƏN gəlir — sənəddə təxmin edilmiş borc olmaz
    kredit: kreditHali?.kredit?.hal === "active"
      ? {
          qaliqBorc: kreditHali.kredit.qaliqBorc,
          esasBorc: kreditHali.kredit.esasBorc,
          illikFaiz: kreditHali.kredit.illikFaiz,
          novbetiTarix: kreditHali.kredit.novbetiTarix,
          novbetiMebleg: kreditHali.kredit.novbetiMebleg,
          gecikmeGun: kreditHali.kredit.gecikmeGun ?? 0,
        }
      : null,
  };
}
