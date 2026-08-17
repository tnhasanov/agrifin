/**
 * MƏHSULDARLIQ İNDEKSİ — ekspert bal cədvəli (scorecard).
 *
 * ═══ BU NƏDİR VƏ NƏ DEYİL ═════════════════════════════════════════════
 * BUDUR:  sahənin peyk tarixçəsindən çıxarılan AQRONOMİK göstərici —
 *         "bu sahə nə dərəcədə yaxşı becərilir".
 * BU DEYİL: kredit balı. Ödəniş tarixçəsi məlumatımız yoxdur, ona görə
 *         "bu fermer krediti qaytaracaqmı" sualına çəki verə bilmərik.
 *         Aqronom "sahə yaxşı becərilirmi" sualına çəki verə bilər —
 *         bu, onun sahəsidir. Kredit qərarını bank özü verir; biz yalnız
 *         onun başqa yerdən ala bilmədiyi sübutu təqdim edirik.
 *
 * ═══ NİYƏ EKSPERT ÇƏKİSİ ══════════════════════════════════════════════
 * Empirik model üçün defolt (ödənişsizlik) məlumatı lazımdır — bizdə yoxdur.
 * Banklar da bu vəziyyətdə ekspert cədvəli ilə başlayır, sonra nəticələr
 * yığılanda çəkiləri yenidən hesablayır. Şərt budur: cədvəl ŞƏFFAF olsun,
 * hər sətir ayrıca müzakirə edilə bilsin və müvəqqəti sayılsın.
 *
 * ═══ KALİBRLƏMƏ VƏZİYYƏTİ ═════════════════════════════════════════════
 * Çəkilər: MÜƏLLİF TƏKLİFİ — aqronom və kredit mütəxəssisi tərəfindən
 * TƏSDİQLƏNMƏYİB. `TESDIQ` obyektinə baxın. Təsdiqdən əvvəl indeks
 * ekranda "ilkin" kimi işarələnməlidir.
 *
 * ═══ QAYDALAR ═════════════════════════════════════════════════════════
 * 1. Heç bir amil ümumi balın 25%-dən çoxunu təşkil etmir.
 * 2. Monotonluq: göstərici yaxşılaşanda bal ASLA azalmır (test edilir).
 * 3. Ölçülməyən amil nə mükafat, nə cəza alır — cədvəldən çıxarılır və
 *    qalan amillər 100-ə yenidən miqyaslanır. Məlumatın olmaması yaxşı
 *    xəbər deyil, amma pis xəbər də deyil.
 * 4. Səbəb kodları məcburidir: fermer balı gördüsə, NİYƏ olduğunu da
 *    görməlidir — həm etibar üçün, həm də düzəltmək üçün.
 */

export const TESDIQ = {
  aqronom: false,
  kreditMutexessisi: false,
  tarix: null,
  qeyd: "Çəkilər müəllif təklifidir; sahədə yoxlanılmayıb.",
};

/** Bu NDVI zirvəsindən aşağı mövsümdə sahə əkilməmiş sayılır */
export const EKIN_HEDDI = 0.35;

/** İndeksin etibarlı sayılması üçün minimum mövsüm sayı */
export const MIN_MOVSUM = 3;

/**
 * Amillər və bal bantları.
 *
 * Hər bant `{ hedd, xal, sebeb }`: göstərici `hedd`-dən böyük və ya
 * bərabərdirsə o bant tətbiq olunur (bantlar azalan sırada yoxlanılır).
 */
export const CEDVEL = [
  {
    key: "davamliliq",
    maxXal: 25,
    // Ən güclü və ən mübahisəsiz göstərici: sahə əkilirmi? Boş qalan
    // mövsüm nə hava ilə, nə sortla izah olunur — bu, idarəetmə faktıdır.
    bantlar: [
      { hedd: 1, xal: 25, sebeb: "davamliliq.tam" },
      { hedd: 0.85, xal: 20, sebeb: "davamliliq.yuksek" },
      { hedd: 0.7, xal: 14, sebeb: "davamliliq.orta" },
      { hedd: 0.5, xal: 7, sebeb: "davamliliq.asagi" },
      { hedd: 0, xal: 0, sebeb: "davamliliq.zeif" },
    ],
  },
  {
    key: "etraf",
    maxXal: 25,
    // ƏSAS FİKİR: mütləq NDVI əsasən havadır. Quraq ildə hamı zəifdir.
    // Ətrafla müqayisə havanı bölür — 5 km-də iqlim eynidir, ona görə
    // fərq idarəetmədən gəlir. Kredit üçün ən mənalı göstərici budur.
    bantlar: [
      { hedd: 0.8, xal: 25, sebeb: "etraf.ust" },
      { hedd: 0.6, xal: 19, sebeb: "etraf.yaxsi" },
      { hedd: 0.4, xal: 13, sebeb: "etraf.orta" },
      { hedd: 0.2, xal: 7, sebeb: "etraf.asagi" },
      { hedd: 0, xal: 2, sebeb: "etraf.zeif" },
    ],
  },
  {
    key: "sabitlik",
    maxXal: 20,
    // Dəyişkənlik riskdir: hər il 0.75 verən sahə, 0.4 ilə 0.8 arasında
    // atılan sahədən fərqli borcalandır. Göstərici tərs çevrilir (aşağı
    // dəyişkənlik = yüksək bal), ona görə bantlar da tərsdir.
    tersdir: true,
    bantlar: [
      { hedd: 0.08, xal: 20, sebeb: "sabitlik.yuksek" },
      { hedd: 0.15, xal: 15, sebeb: "sabitlik.yaxsi" },
      { hedd: 0.25, xal: 9, sebeb: "sabitlik.orta" },
      { hedd: Infinity, xal: 3, sebeb: "sabitlik.asagi" },
    ],
  },
  {
    key: "meyl",
    maxXal: 15,
    // Torpaq yaxşılaşır, yoxsa yorulur — çoxillik meyl bunu göstərir
    bantlar: [
      { hedd: 0.01, xal: 15, sebeb: "meyl.artir" },
      { hedd: -0.005, xal: 11, sebeb: "meyl.sabit" },
      { hedd: -0.02, xal: 6, sebeb: "meyl.azalir" },
      { hedd: -Infinity, xal: 0, sebeb: "meyl.pisdir" },
    ],
  },
  {
    key: "cari",
    maxXal: 15,
    // Tarixçə keçmişdir; bank bu mövsümün vəziyyətini də bilməlidir
    bantlar: [
      { hedd: 0.1, xal: 15, sebeb: "cari.yaxsi" },
      { hedd: 0, xal: 11, sebeb: "cari.normal" },
      { hedd: -0.1, xal: 6, sebeb: "cari.asagi" },
      { hedd: -Infinity, xal: 2, sebeb: "cari.zeif" },
    ],
  },
];

export const BANTLAR = [
  { hedd: 80, ad: "yuksek" },
  { hedd: 60, ad: "yaxsi" },
  { hedd: 40, ad: "orta" },
  { hedd: 0, ad: "zeif" },
];

const ortalama = (deyerler) => deyerler.reduce((c, d) => c + d, 0) / deyerler.length;

/** Nisbi standart kənarlaşma (CV) — miqyasdan asılı olmayan dəyişkənlik */
export function deyiskenlik(deyerler) {
  if (!Array.isArray(deyerler) || deyerler.length < 2) return null;
  const orta = ortalama(deyerler);
  if (orta <= 0) return null;
  const varyans = ortalama(deyerler.map((d) => (d - orta) ** 2));
  return Math.sqrt(varyans) / orta;
}

/** Ən kiçik kvadratlar meyli: mövsüm başına dəyişmə */
export function meylEmsali(deyerler) {
  if (!Array.isArray(deyerler) || deyerler.length < 3) return null;
  const n = deyerler.length;
  const xOrta = (n - 1) / 2;
  const yOrta = ortalama(deyerler);
  let ust = 0;
  let alt = 0;
  for (let i = 0; i < n; i += 1) {
    ust += (i - xOrta) * (deyerler[i] - yOrta);
    alt += (i - xOrta) ** 2;
  }
  return alt === 0 ? null : ust / alt;
}

/**
 * Mövsüm siyahısından amilləri çıxarır.
 *
 * @param {Array} movsumler `{il, zirve, etrafMedyan}` — köhnədən yeniyə
 * @param {object} cari     Bu mövsümün vəziyyəti `{ndvi, etrafMedyan}`
 * @returns {object} amil adı → göstərici (ölçülməyibsə null)
 */
export function amillerCixar(movsumler = [], cari = null) {
  const olculen = movsumler.filter((m) => Number.isFinite(m?.zirve));

  // Əkilmiş mövsümlərin payı
  const davamliliq = olculen.length
    ? olculen.filter((m) => m.zirve >= EKIN_HEDDI).length / olculen.length
    : null;

  // Ətrafın medianından yuxarı olan mövsümlərin payı
  const muqayiseli = olculen.filter((m) => Number.isFinite(m.etrafMedyan));
  const etraf = muqayiseli.length
    ? muqayiseli.filter((m) => m.zirve > m.etrafMedyan).length / muqayiseli.length
    : null;

  // Dəyişkənlik və meyl YALNIZ əkilmiş mövsümlərdən: boş qalan il zirvəni
  // sıfıra endirir və sahəni "dəyişkən" göstərir, halbuki bu, ayrıca
  // ölçülən (davamlılıq) faktdır — iki dəfə cəzalandırmaq olmaz
  const ekilmis = olculen.filter((m) => m.zirve >= EKIN_HEDDI).map((m) => m.zirve);

  return {
    davamliliq,
    etraf,
    sabitlik: deyiskenlik(ekilmis),
    meyl: meylEmsali(ekilmis),
    cari:
      Number.isFinite(cari?.ndvi) && Number.isFinite(cari?.etrafMedyan)
        ? cari.ndvi - cari.etrafMedyan
        : null,
    movsumSayi: olculen.length,
  };
}

function bantSec(amil, deyer) {
  const bantlar = amil.tersdir ? amil.bantlar : [...amil.bantlar];
  for (const bant of bantlar) {
    if (amil.tersdir ? deyer <= bant.hedd : deyer >= bant.hedd) return bant;
  }
  return bantlar[bantlar.length - 1];
}

/**
 * Bal cədvəlini tətbiq edir.
 *
 * @returns {null | {bal, bant, etibar, movsumSayi, setirler, sebebler}}
 *   setirler — hər amil üçün {key, xal, maxXal, sebeb}
 *   sebebler — {yaxsi: [...], pis: [...]} ən güclü iki müsbət və mənfi
 */
export function mehsuldarliqIndeksi({ movsumler = [], cari = null } = {}) {
  const amiller = amillerCixar(movsumler, cari);
  if (!amiller.movsumSayi) return null;

  const setirler = [];
  let toplam = 0;
  let mumkun = 0;

  for (const amil of CEDVEL) {
    const deyer = amiller[amil.key];
    // Ölçülməyən amil cədvəldən ÇIXARILIR — nə mükafat, nə cəza
    if (!Number.isFinite(deyer)) {
      setirler.push({ key: amil.key, xal: null, maxXal: amil.maxXal, sebeb: null });
      continue;
    }
    const bant = bantSec(amil, deyer);
    setirler.push({ key: amil.key, xal: bant.xal, maxXal: amil.maxXal, sebeb: bant.sebeb });
    toplam += bant.xal;
    mumkun += amil.maxXal;
  }

  if (mumkun === 0) return null;

  // Qalan amillər 100-ə miqyaslanır ki, natamam məlumat balı süni azaltmasın
  const bal = Math.round((toplam / mumkun) * 100);
  const bant = BANTLAR.find((b) => bal >= b.hedd) ?? BANTLAR[BANTLAR.length - 1];

  // Səbəb kodları: hansı amillər balı ən çox qaldırır və ən çox aşağı salır
  const olculenler = setirler.filter((s) => s.xal != null);
  const nisbet = (s) => s.xal / s.maxXal;
  const sirali = [...olculenler].sort((a, b) => nisbet(b) - nisbet(a));

  return {
    bal,
    bant: bant.ad,
    movsumSayi: amiller.movsumSayi,
    // Etibar mövsüm sayından gəlir: 3 mövsüm indeks üçün minimumdur,
    // 8 mövsümdə tam sayılır
    etibar: amiller.movsumSayi >= 8 ? "tam" : amiller.movsumSayi >= MIN_MOVSUM ? "orta" : "az",
    setirler,
    sebebler: {
      yaxsi: sirali.filter((s) => nisbet(s) >= 0.75).slice(0, 2).map((s) => s.sebeb),
      pis: sirali.filter((s) => nisbet(s) < 0.5).slice(-2).map((s) => s.sebeb),
    },
  };
}
