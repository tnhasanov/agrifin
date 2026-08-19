/**
 * AQRONOMİK PERFORMANS İNDEKSİ — ekspert bal cədvəli (scorecard).
 *
 * ═══ BU NƏDİR VƏ NƏ DEYİL ═════════════════════════════════════════════
 * BUDUR:  sahənin peyk tarixçəsindən çıxarılan AQRONOMİK göstərici —
 *         "bu sahə nə dərəcədə yaxşı becərilir".
 * BU DEYİL: kredit balı, PD (defolt ehtimalı), gözlənilən itki, kredit
 *         limiti, faiz və ya avtomatik qərar. Ödəniş tarixçəsi məlumatımız
 *         yoxdur — belə suala çəki verə bilmərik. İndeks anderraytinq üçün
 *         BİR GİRİŞDİR, qərar deyil. Kredit qərarını bank özü verir.
 *
 * ═══ NİYƏ EKSPERT ÇƏKİSİ ══════════════════════════════════════════════
 * Empirik model üçün defolt məlumatı lazımdır — bizdə yoxdur. Banklar da bu
 * vəziyyətdə ekspert cədvəli ilə başlayır, sonra nəticələr yığılanda çəkiləri
 * yenidən hesablayır. Şərt budur: cədvəl ŞƏFFAF olsun, hər sətir ayrıca
 * müzakirə edilə bilsin və MÜVƏQQƏTİ sayılsın.
 *
 * ═══ KALİBRLƏMƏ VƏZİYYƏTİ ═════════════════════════════════════════════
 * Bütün hədlər: EKSPERT TƏKLİFİ — MÜVƏQQƏTİ və TƏSDİQLƏNMƏMİŞ.
 * Statistik kalibrlənməyib. `TESDIQ` obyektinə baxın.
 *
 * ═══ QAYDALAR ═════════════════════════════════════════════════════════
 * 1. Heç bir amil ümumi balın 30%-dən çoxunu təşkil etmir.
 * 2. Monotonluq: göstərici yaxşılaşanda bal ASLA azalmır (test edilir).
 * 3. MƏLUMAT KEYFİYYƏTİ QAPISI baldan ƏVVƏL işləyir: 3 ölçülə bilən
 *    mövsümdən az tarixçə ilə NƏ BAL, NƏ BANT göstərilir.
 * 4. Ölçülməyən amil 100-ə YENİDƏN MİQYASLANMIR. Miqyaslama seyrək
 *    məlumatlı sahəni süni yaxşı göstərirdi: mənfi məlumatın olmaması
 *    yaxşı xəbər deyil. İndi məxrəc həmişə 100-dür, ölçülməyən amil xal
 *    qazanmır, nəticə isə "natamam" kimi işarələnir.
 * 5. Etibar BALDAN AYRIDIR. Etibar aşağı olduğu üçün xal əlavə/çıxılmır.
 * 6. Səbəb kodları məcburidir: bal görünürsə, NİYƏ olduğu da görünməlidir.
 * 7. Eyni fakta görə iki dəfə cəza yoxdur: boş mövsüm yalnız davamlılıqda
 *    cəzalandırılır, digər amillərin hesablanmasından çıxarılır.
 */

export const TESDIQ = {
  aqronom: false,
  kreditMutexessisi: false,
  tarix: null,
  qeyd: "Hədlər ekspert təklifidir — müvəqqəti, sahədə yoxlanılmayıb, statistik kalibrlənməyib.",
};

/** Bu NDVI zirvəsindən aşağı mövsümdə sahə əkilməmiş sayılır */
export const EKIN_HEDDI = 0.35;

/** Baldan əvvəlki qapı: bundan az ölçülə bilən mövsümdə indeks verilmir */
export const MIN_MOVSUM = 3;

/** Etibar pillələri — mövsüm sayından gəlir, BALA TƏSİR ETMİR */
export const ETIBAR_PILLELERI = [
  { hedd: 8, ad: "yuksek" },
  { hedd: 5, ad: "orta" },
  { hedd: MIN_MOVSUM, ad: "ilkin" },
];

/**
 * BÜTÜN HƏDLƏR BURADADIR — kodun içinə səpələnmir.
 *
 * Hər `bantlar` sırası: göstərici `hedd`-dən böyük/bərabərdirsə (tərs
 * amillərdə: kiçik/bərabərdirsə) həmin bant tətbiq olunur.
 *
 * ⚠ HAMISI: ekspert / müvəqqəti / təsdiqlənməmiş.
 */
export const SCORE_CONFIG = {
  // ── F1 · Əkin davamlılığı — 15 ────────────────────────────────────
  // Təkrar əkilməmək əhəmiyyətlidir. AMMA 100% əkin avtomatik olaraq ən
  // yaxşı aqronomiya DEYİL: herik (fallow) bəzi növbələrdə düzgün qərardır.
  // Ona görə çəki 25-dən 15-ə endirilib və izahlar faktdır, tərif deyil.
  davamliliq: {
    maxXal: 15,
    minMovsum: 1,
    bantlar: [
      { hedd: 0.9, xal: 15, sebeb: "davamliliq.tam" },
      { hedd: 0.75, xal: 12, sebeb: "davamliliq.yuksek" },
      { hedd: 0.6, xal: 8, sebeb: "davamliliq.orta" },
      { hedd: 0.4, xal: 4, sebeb: "davamliliq.asagi" },
      { hedd: 0, xal: 0, sebeb: "davamliliq.zeif" },
    ],
  },

  // ── F2 · Nisbi aqronomik performans — 30 (ƏN AĞIR, KRİTİK) ────────
  // Mütləq NDVI əsasən havadır: quraq ildə hamı zəifdir. Müqayisə havanı
  // bölür. HƏQİQİ metodologiya: eyni bitki, oxşar vegetasiya dövrü, oxşar
  // suvarma rejimi olan HƏMYAŞ sahələrlə (peer group) faiz mövqeyi.
  //
  // BİZDƏ HƏLƏ ONLAR YOXDUR. Yerli 5 km ətraf medianı PROXY kimi işlədilir
  // və bu, `metodologiya` sahəsində açıq bildirilir. 5 km-lik zolağın torpaq,
  // suvarma və becərmə şəraiti EYNİ DEYİL — fərqin səbəbi yalnız idarəetmə
  // sayıla bilməz. Bant funksiyası dəyəri 0–1 nisbət kimi qəbul edir, ona
  // görə həmyaş faiz mövqeyi gələndə mühərriki yenidən yazmaq lazım deyil.
  nisbiPerformans: {
    maxXal: 30,
    kritik: true,
    minMovsum: 2,
    metodologiya: "proxy-yerli-etraf",
    bantlar: [
      { hedd: 0.8, xal: 30, sebeb: "nisbi.ust" },
      { hedd: 0.65, xal: 24, sebeb: "nisbi.yuksek" },
      { hedd: 0.5, xal: 18, sebeb: "nisbi.orta" },
      { hedd: 0.35, xal: 11, sebeb: "nisbi.asagi" },
      { hedd: 0.2, xal: 5, sebeb: "nisbi.zeif" },
      { hedd: -Infinity, xal: 0, sebeb: "nisbi.coxZeif" },
    ],
  },

  // ── F3 · Mövsümi vegetasiya keyfiyyəti — 20 ───────────────────────
  // Zirvə tək başına vegetasiya dövrünün keyfiyyətini demir: bir ay parlayıb
  // sönən sahə ilə bütün mövsüm örtüklü qalan sahənin zirvəsi eyni ola bilər.
  // Düzgün ölçü — NDVI əyrisinin altındakı sahə (AUC).
  //
  // İki bant cədvəli var, çünki İKİ FƏRQLİ ölçü ola bilər: aylıq seriya
  // gələndə həqiqi AUC (mövsümün orta NDVI-si), gəlmədikdə zirvə proxy-si.
  // Eyni cədvəllə ölçmək iki fərqli şeyi eyni adlandırmaq olardı.
  vegetasiya: {
    maxXal: 20,
    minMovsum: 1,
    bantlar: {
      // Aylıq seriyadan normallaşdırılmış AUC (mövsümün orta NDVI-si)
      auc: [
        { hedd: 0.55, xal: 20, sebeb: "vegetasiya.guclu" },
        { hedd: 0.47, xal: 16, sebeb: "vegetasiya.yaxsi" },
        { hedd: 0.4, xal: 12, sebeb: "vegetasiya.orta" },
        { hedd: 0.32, xal: 7, sebeb: "vegetasiya.asagi" },
        { hedd: 0.25, xal: 3, sebeb: "vegetasiya.zeif" },
        { hedd: -Infinity, xal: 0, sebeb: "vegetasiya.coxZeif" },
      ],
      // Yalnız mövsüm zirvəsi mövcuddur — natamam ölçü, açıq işarələnir
      zirveProxy: [
        { hedd: 0.75, xal: 20, sebeb: "vegetasiya.guclu" },
        { hedd: 0.65, xal: 16, sebeb: "vegetasiya.yaxsi" },
        { hedd: 0.55, xal: 12, sebeb: "vegetasiya.orta" },
        { hedd: 0.45, xal: 7, sebeb: "vegetasiya.asagi" },
        { hedd: 0.35, xal: 3, sebeb: "vegetasiya.zeif" },
        { hedd: -Infinity, xal: 0, sebeb: "vegetasiya.coxZeif" },
      ],
    },
  },

  // ── F4 · Performans sabitliyi — 15 ────────────────────────────────
  // XAM NDVI-nin dəyişkənliyi ARTIQ ÖLÇÜLMÜR: növbəli əkində buğdadan
  // pambığa keçmək zirvəni təbii dəyişir və sahə "qeyri-sabit" görünürdü.
  // İndi NİSBİ mövqeyin sabitliyi ölçülür: sahə ətrafa görə hər mövsüm
  // eyni yerdə dayanırmı. Bitki dəyişsə də nisbi mövqe müqayisə olunandır.
  //
  // Səviyyə (güclü/zəif) BURADA ölçülmür — o, F2-nin işidir. Əks halda eyni
  // fakt iki amildə təkrarlanardı (bax: qayda 7).
  sabitlik: {
    maxXal: 15,
    tersdir: true, // aşağı dəyişkənlik = yüksək bal
    minMovsum: 3,
    bantlar: {
      // Nisbi mövqenin (zirvə − ətraf medianı) standart kənarlaşması
      nisbi: [
        { hedd: 0.04, xal: 15, sebeb: "sabitlik.yuksek" },
        { hedd: 0.08, xal: 11, sebeb: "sabitlik.yaxsi" },
        { hedd: 0.15, xal: 6, sebeb: "sabitlik.orta" },
        { hedd: Infinity, xal: 0, sebeb: "sabitlik.asagi" },
      ],
      // FALLBACK: nisbi tarixçə qurula bilmir — xam NDVI-nin CV-si.
      // Növbəli əkin bunu şişirdir; nəticə `metodologiya` ilə işarələnir.
      xamFallback: [
        { hedd: 0.08, xal: 15, sebeb: "sabitlik.yuksek" },
        { hedd: 0.15, xal: 11, sebeb: "sabitlik.yaxsi" },
        { hedd: 0.25, xal: 6, sebeb: "sabitlik.orta" },
        { hedd: Infinity, xal: 0, sebeb: "sabitlik.asagi" },
      ],
    },
  },

  // ── F5 · Son dövrün meyli — 10 ────────────────────────────────────
  // 2017-dən bəri çəkilən düz xətt ARTIQ İŞLƏDİLMİR: sahəni indiki fermer
  // bütün dövr ərzində becərməyə bilər, növbəli əkin meyli əyir, 8 il əvvəlki
  // müşahidə bugünkü idarəetmə haqqında az şey deyir. Yalnız son mövsümlər.
  //
  // Ölü zolaq (`sabitZolaq`) qəsdəndir: statistik mənasız kiçik müsbət meyl
  // "yaxşılaşır" kimi mükafatlandırılmamalıdır.
  sonMeyl: {
    maxXal: 10,
    pencere: 5, // ən son neçə mövsüm nəzərə alınır
    minMovsum: 3,
    sabitZolaq: 0.01, // |meyl| bundan kiçikdirsə "sabit" sayılır
    bantlar: [
      { hedd: 0.02, xal: 10, sebeb: "meyl.artir" },
      { hedd: -0.01, xal: 7, sebeb: "meyl.sabit" },
      { hedd: -0.03, xal: 3, sebeb: "meyl.zeifleyir" },
      { hedd: -Infinity, xal: 0, sebeb: "meyl.pisdir" },
    ],
  },

  // ── F6 · Cari mövsümün vəziyyəti — 10 ─────────────────────────────
  // DÜZGÜN metodologiya: cari NDVI-ni həmin bitkinin HAZIRKI FENOLOJİ
  // MƏRHƏLƏSİ üçün gözlənilən NDVI ilə müqayisə etmək. Bitki növü, əkin
  // tarixi və fenologiya məlumatımız YOXDUR — uydurulmur.
  // Müvəqqəti proxy yenə yerli müqayisədir; qonşuda başqa bitki və ya başqa
  // əkin təqvimi varsa bu ölçü təhrif olunur. Çəki ona görə 15-dən 10-a düşüb.
  cariVeziyyet: {
    maxXal: 10,
    metodologiya: "proxy-yerli-etraf",
    bantlar: [
      { hedd: 0.1, xal: 10, sebeb: "cari.yaxsi" },
      { hedd: 0, xal: 7, sebeb: "cari.normal" },
      { hedd: -0.1, xal: 3, sebeb: "cari.asagi" },
      { hedd: -Infinity, xal: 0, sebeb: "cari.zeif" },
    ],
  },
};

/** Cədvəlin göstərilmə sırası. `key` köhnə adla uyğunluq üçün saxlanılır. */
export const CEDVEL = [
  "davamliliq",
  "nisbiPerformans",
  "vegetasiya",
  "sabitlik",
  "sonMeyl",
  "cariVeziyyet",
].map((id) => ({ id, key: id, ...SCORE_CONFIG[id] }));

export const BANTLAR = [
  { hedd: 80, ad: "yuksek" },
  { hedd: 60, ad: "yaxsi" },
  { hedd: 40, ad: "orta" },
  { hedd: 0, ad: "zeif" },
];

// ── Statistik köməkçilər ────────────────────────────────────────────

const ortalama = (d) => d.reduce((c, x) => c + x, 0) / d.length;

/** Median — kənar mövsümlərə davamlıdır */
export function medyan(deyerler) {
  if (!Array.isArray(deyerler) || deyerler.length === 0) return null;
  const sirali = [...deyerler].sort((a, b) => a - b);
  const orta = Math.floor(sirali.length / 2);
  return sirali.length % 2 ? sirali[orta] : (sirali[orta - 1] + sirali[orta]) / 2;
}

/** Nisbi standart kənarlaşma (CV) — miqyasdan asılı olmayan dəyişkənlik */
export function deyiskenlik(deyerler) {
  if (!Array.isArray(deyerler) || deyerler.length < 2) return null;
  const orta = ortalama(deyerler);
  if (orta <= 0) return null;
  return Math.sqrt(ortalama(deyerler.map((d) => (d - orta) ** 2))) / orta;
}

/**
 * Standart kənarlaşma (mütləq).
 * Nisbi fərqlər üçün CV yaramır: orta sıfıra yaxın olanda partlayır.
 */
export function kenarlasma(deyerler) {
  if (!Array.isArray(deyerler) || deyerler.length < 2) return null;
  const orta = ortalama(deyerler);
  return Math.sqrt(ortalama(deyerler.map((d) => (d - orta) ** 2)));
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
 * Mövsüm əyrisinin altındakı sahə, mövsüm uzunluğuna normallaşdırılmış
 * (yəni mövsümün ORTA NDVI-si). Trapesiya qaydası.
 *
 * 0.20→0.35→0.55→0.75→0.70→0.50  →  0.52  (uzun, dolu vegetasiya)
 * 0.20→0.25→0.30→0.76→0.30→0.20  →  0.33  (bir ay parlayıb sönüb)
 * Zirvəyə görə ikincisi daha yüksəkdir; əyri isə birincini üstün göstərir.
 */
export function egriAltiSahe(deyerler) {
  const temiz = (deyerler ?? []).filter(Number.isFinite);
  if (temiz.length < 3) return null;
  let cem = 0;
  for (let i = 1; i < temiz.length; i += 1) cem += (temiz[i - 1] + temiz[i]) / 2;
  return cem / (temiz.length - 1);
}

// ── Mövsümlərin hazırlanması ────────────────────────────────────────

/**
 * Mövsümləri təsnif edir.
 *
 * CARİ İL BİTMƏMİŞ MÖVSÜMDÜR: zirvəsi hələ qabaqdadırsa (həddin altında)
 * tarixçəyə salınmır — əks halda yanvar-may arasında HƏR sahə "bu il
 * əkilməyib" cəzası alırdı. Bu mövsümü `cariVeziyyet` amili təmsil edir.
 */
export function movsumleriHazirla(movsumler = [], sonIl = new Date().getFullYear()) {
  const sirali = [...movsumler]
    .filter((m) => Number.isFinite(m?.zirve))
    .sort((a, b) => (a.il ?? 0) - (b.il ?? 0));

  const olculen = sirali.filter((m) => !(m.il === sonIl && m.zirve < EKIN_HEDDI));
  // Boş mövsüm YALNIZ davamlılıqda cəzalandırılır (qayda 7) — qalan
  // amillərin hesablanmasından çıxarılır
  const ekilmis = olculen.filter((m) => m.zirve >= EKIN_HEDDI);
  const muqayiseli = ekilmis.filter((m) => Number.isFinite(m.etrafMedyan));

  return { olculen, ekilmis, muqayiseli };
}

// ── MƏLUMAT KEYFİYYƏTİ QAPISI (baldan ƏVVƏL) ────────────────────────

/**
 * Bal hesablanmazdan əvvəl məlumatın kifayət edib-etmədiyini qiymətləndirir.
 * Bu, BALIN BİR HİSSƏSİ DEYİL — ayrıca ölçüdür və bala xal əlavə etmir.
 */
export function melumatKeyfiyyeti({ movsumler = [], cari = null, sonIl } = {}) {
  const { olculen, ekilmis, muqayiseli } = movsumleriHazirla(movsumler, sonIl);

  // Təmiz peyk müşahidəsi: mövsüm başına neçə aydan məlumat gəlib.
  // Mənbə bunu verməyə bilər — o halda `null`, yəni "bilinmir" (uydurmuruq).
  const olcmeler = olculen.map((m) => m.olcmeSayi).filter(Number.isFinite);
  const temizOlcme = olcmeler.length ? medyan(olcmeler) : null;

  const say = olculen.length;
  const etibar = ETIBAR_PILLELERI.find((p) => say >= p.hedd)?.ad ?? null;

  const catismayan = [];
  if (say < MIN_MOVSUM) catismayan.push("movsum");
  if (muqayiseli.length < SCORE_CONFIG.nisbiPerformans.minMovsum) catismayan.push("muqayise");
  if (!Number.isFinite(cari?.ndvi) || !Number.isFinite(cari?.etrafMedyan)) catismayan.push("cari");
  if (say < SCORE_CONFIG.sonMeyl.minMovsum) catismayan.push("meyl");

  return {
    olculebilenMovsum: say,
    ekilmisMovsum: ekilmis.length,
    muqayiseliMovsum: muqayiseli.length,
    muqayiseVar: muqayiseli.length >= SCORE_CONFIG.nisbiPerformans.minMovsum,
    cariVar: Number.isFinite(cari?.ndvi) && Number.isFinite(cari?.etrafMedyan),
    temizOlcme,
    tarixceKifayet: say >= SCORE_CONFIG.sonMeyl.minMovsum,
    kifayet: say >= MIN_MOVSUM,
    etibar,
    catismayan,
  };
}

// ── Amillərin hesablanması ──────────────────────────────────────────

function bantTap(bantlar, deyer, tersdir = false) {
  for (const bant of bantlar) {
    if (tersdir ? deyer <= bant.hedd : deyer >= bant.hedd) return bant;
  }
  return bantlar[bantlar.length - 1];
}

const OLCULMEYIB = { deger: null, metodologiya: null };

/** F1 — əkilmiş mövsümlərin payı */
function amilDavamliliq({ olculen, ekilmis }) {
  if (!olculen.length) return OLCULMEYIB;
  return { deger: ekilmis.length / olculen.length, metodologiya: "movsum-payi" };
}

/**
 * F2 — nisbi performans.
 * Hazırda: ətraf medianından yuxarı mövsümlərin payı (0–1).
 * Sonra: həmyaş qrupunda faiz mövqeyi — eyni 0–1 miqyası, eyni bantlar.
 */
function amilNisbiPerformans({ muqayiseli }) {
  const { minMovsum, metodologiya } = SCORE_CONFIG.nisbiPerformans;
  if (muqayiseli.length < minMovsum) return OLCULMEYIB;
  const ustde = muqayiseli.filter((m) => m.zirve > m.etrafMedyan).length;
  return { deger: ustde / muqayiseli.length, metodologiya };
}

/**
 * F3 — mövsümi vegetasiya keyfiyyəti.
 *
 * Aylıq seriya (`movsum.aylar`) varsa həqiqi AUC hesablanır. Yoxdursa
 * zirvə proxy-si işlədilir və bu, açıq işarələnir.
 *
 * TODO(AUC): api/tarixce.js aylıq NDVI-ni onsuz da hesablayır (aylariCixar),
 * amma movsumlereBol yalnız zirvəni qaytarır. Hər mövsümə `aylar: number[]`
 * (vegetasiya dövrünün aylıq orta NDVI-si) əlavə edilsə bu funksiya heç
 * dəyişmədən həqiqi AUC-yə keçir. Bu tapşırıqda peyk boru xətti dəyişilmir.
 */
function amilVegetasiya({ ekilmis }) {
  if (!ekilmis.length) return OLCULMEYIB;

  // Aylıq seriya YALNIZ hamısında varsa işlədilir: yarısı AUC, yarısı zirvə
  // olan median iki fərqli ölçünün qarışığı olardı
  const hamisindaAylar = ekilmis.every((m) => egriAltiSahe(m.aylar) != null);
  if (hamisindaAylar) {
    return { deger: medyan(ekilmis.map((m) => egriAltiSahe(m.aylar))), metodologiya: "auc" };
  }
  return { deger: medyan(ekilmis.map((m) => m.zirve)), metodologiya: "zirveProxy" };
}

/**
 * F4 — nisbi mövqenin sabitliyi.
 * Əsas ölçü: (zirvə − ətraf medianı) fərqlərinin standart kənarlaşması.
 * Fallback: xam NDVI-nin CV-si (növbəli əkin bunu şişirdir — işarələnir).
 */
function amilSabitlik({ ekilmis, muqayiseli }) {
  const { minMovsum } = SCORE_CONFIG.sabitlik;
  if (muqayiseli.length >= minMovsum) {
    const ferqler = muqayiseli.map((m) => m.zirve - m.etrafMedyan);
    return { deger: kenarlasma(ferqler), metodologiya: "nisbi" };
  }
  if (ekilmis.length >= minMovsum) {
    return { deger: deyiskenlik(ekilmis.map((m) => m.zirve)), metodologiya: "xamFallback" };
  }
  return OLCULMEYIB;
}

/**
 * F5 — son dövrün meyli. Yalnız son `pencere` mövsüm.
 *
 * TODO(tenure): pəncərənin uzunluğu operator/mülkiyyət müddətindən gəlməlidir
 * — sahəni 2 il əvvəl götürən fermer ondan əvvəlki nəticəyə cavabdeh deyil.
 * Məlumat gələndə yalnız `pencere` mənbəyi dəyişir, məntiq yox.
 */
function amilSonMeyl({ ekilmis, muqayiseli }) {
  const { pencere, minMovsum } = SCORE_CONFIG.sonMeyl;
  const nisbiVar = muqayiseli.length >= minMovsum;
  const menbe = nisbiVar ? muqayiseli : ekilmis;
  if (menbe.length < minMovsum) return OLCULMEYIB;

  const son = menbe.slice(-pencere);
  const seriya = nisbiVar ? son.map((m) => m.zirve - m.etrafMedyan) : son.map((m) => m.zirve);
  const meyl = meylEmsali(seriya);
  if (meyl == null) return OLCULMEYIB;
  return { deger: meyl, metodologiya: nisbiVar ? "nisbi" : "xamFallback" };
}

/**
 * F6 — cari mövsüm ətrafa görə.
 *
 * ═══ MÜQAYİSƏ YALNIZ ƏKİN ALTINDA MƏNALIDIR ═══════════════════════════
 * Ətraf medianı YALNIZ bitki örtüyü olan piksellərdən (SCL 4) çıxarılır —
 * yol və çılpaq torpaq medianı süni aşağı salmasın deyə. Sahənin öz
 * ölçməsi isə buluddan başqa HƏR pikseli sayır, o cümlədən çılpaq torpağı.
 *
 * Nəticədə biçindən sonra müqayisə ölçüsünü itirir: avqustda taxıl sahəsi
 * ~0.20 (çılpaq), ətrafın YAŞIL pikselləri isə ~0.65 (pambıq, bağ) verir.
 * Fərq −0.45 çıxır və HƏR sahə sıfır alır — halbuki bu, pis becərmə deyil,
 * sadəcə fərqli əkin təqvimidir. İstehsalda məhz belə göründü.
 *
 * Ona görə: sahə hazırda əkin altında deyilsə amil ÖLÇÜLMÜR (sıfır yox).
 * Ölçülməyən amil nə mükafat, nə cəzadır — bax: qayda 4.
 *
 * F2 bu problemdən əziyyət çəkmir: orada müqayisə mövsümün ZİRVƏ ayında
 * aparılır və sahə tərifinə görə yaşıldır.
 *
 * TODO(fenologiya): düzgün ölçü cari NDVI-ni bitkinin HAZIRKI mərhələsi
 * üçün gözlənilən NDVI ilə müqayisə etməkdir. Bitki növü və əkin tarixi
 * gələndə bu qapı fenoloji gözləmə ilə əvəz olunur.
 */
function amilCari(_, cari) {
  if (!Number.isFinite(cari?.ndvi) || !Number.isFinite(cari?.etrafMedyan)) return OLCULMEYIB;
  if (cari.ndvi < EKIN_HEDDI) {
    return { deger: null, metodologiya: null, sebeb: "cari.ekinYox" };
  }
  // 0.7 − 0.6 üzən nöqtədə 0.09999… verir və ciddi >= müqayisəsi 0.10
  // bantını ötürürdü — fermer düz sərhəddə xal itirirdi
  return {
    deger: Math.round((cari.ndvi - cari.etrafMedyan) * 1000) / 1000,
    metodologiya: SCORE_CONFIG.cariVeziyyet.metodologiya,
  };
}

const HESABLAYICILAR = {
  davamliliq: amilDavamliliq,
  nisbiPerformans: amilNisbiPerformans,
  vegetasiya: amilVegetasiya,
  sabitlik: amilSabitlik,
  sonMeyl: amilSonMeyl,
  cariVeziyyet: amilCari,
};

/**
 * Bütün amilləri xam göstərici kimi çıxarır (bal vermədən).
 * @returns {object} id → {deger, metodologiya}
 */
export function amillerCixar(movsumler = [], cari = null, sonIl = new Date().getFullYear()) {
  const hazir = movsumleriHazirla(movsumler, sonIl);
  const netice = { movsumSayi: hazir.olculen.length };
  for (const amil of CEDVEL) {
    netice[amil.id] = HESABLAYICILAR[amil.id](hazir, cari);
  }
  return netice;
}

/** Amilin bant cədvəli: metodologiyaya görə seçilir */
function bantlariSec(amil, metodologiya) {
  if (Array.isArray(amil.bantlar)) return amil.bantlar;
  return amil.bantlar[metodologiya] ?? Object.values(amil.bantlar)[0];
}

/**
 * Aqronomik performans indeksi.
 *
 * @param {object}  p
 * @param {Array}   p.movsumler `{il, zirve, etrafMedyan, olcmeSayi?, aylar?}`
 * @param {object}  p.cari      Cari mövsüm `{ndvi, etrafMedyan}`
 * @param {number}  p.sonIl     Cari il (test üçün)
 *
 * @returns {null | object}
 *   null                → ölçülə bilən mövsüm ümumiyyətlə yoxdur
 *   {hal:"kifayetsiz"}  → tarixçə var, amma 3 mövsümdən azdır: BAL YOXDUR
 *   {hal:"hazir"}       → bal, bant (kritik amil varsa), etibar, sətirlər
 */
export function mehsuldarliqIndeksi({ movsumler = [], cari = null, sonIl } = {}) {
  const keyfiyyet = melumatKeyfiyyeti({ movsumler, cari, sonIl });

  // Heç bir ölçmə yoxdur — göstəriləcək bir şey də yoxdur
  if (keyfiyyet.olculebilenMovsum === 0) return null;

  // ── QAPI: 3 mövsümdən az tarixçə ilə nə bal, nə bant ──────────────
  // Bir mövsümdən "94 / Yüksək" çıxarmaq metodoloji olaraq müdafiə edilə
  // bilməz: bir yaxşı il təsadüf ola bilər, tarixçə isə ona söykənir.
  if (!keyfiyyet.kifayet) {
    return {
      hal: "kifayetsiz",
      bal: null,
      bant: null,
      bantYoxdurSebebi: "tarixceAz",
      etibar: null,
      movsumSayi: keyfiyyet.olculebilenMovsum,
      keyfiyyet,
      setirler: [],
      sebebler: { yaxsi: [], pis: [] },
    };
  }

  const hazir = movsumleriHazirla(movsumler, sonIl);
  const setirler = [];
  let toplam = 0;
  let elcatanXal = 0; // ölçülən amillərin maksimumu
  let kritikCatismir = false;

  for (const amil of CEDVEL) {
    const { deger, metodologiya, sebeb: olculmemeSebebi } = HESABLAYICILAR[amil.id](hazir, cari);

    if (!Number.isFinite(deger)) {
      // ÖLÇÜLMƏYƏN AMİL XAL QAZANMIR və məxrəc 100 olaraq QALIR.
      // Köhnə davranış (qalanları 100-ə miqyaslamaq) seyrək məlumatlı
      // sahəni süni yüksəldirdi — bax: qayda 4.
      if (amil.kritik) kritikCatismir = true;
      setirler.push({
        id: amil.id,
        key: amil.id,
        rawValue: null,
        xal: null,
        maxXal: amil.maxXal,
        // Ölçülməmənin SƏBƏBİ varsa göstərilir: "hələ ölçülməyib" ilə
        // "sahə hazırda əkin altında deyil" fermerə fərqli şeylər deyir
        sebeb: olculmemeSebebi ?? null,
        olculub: false,
        metodologiya: null,
      });
      continue;
    }

    const bant = bantTap(bantlariSec(amil, metodologiya), deger, amil.tersdir);
    setirler.push({
      id: amil.id,
      key: amil.id,
      rawValue: deger,
      xal: bant.xal,
      maxXal: amil.maxXal,
      sebeb: bant.sebeb,
      olculub: true,
      metodologiya,
    });
    toplam += bant.xal;
    elcatanXal += amil.maxXal;
  }

  const bal = Math.max(0, Math.min(100, Math.round(toplam)));

  // Kritik məlumat (həmyaş/ətraf müqayisəsi) yoxdursa BANT GÖSTƏRİLMİR:
  // müdafiə edilə bilməyən qiymətləndirməyə ad vermək onu həqiqi göstərir
  const bant = kritikCatismir
    ? null
    : (BANTLAR.find((b) => bal >= b.hedd) ?? BANTLAR[BANTLAR.length - 1]).ad;

  const olculenler = setirler.filter((s) => s.olculub);
  const nisbet = (s) => s.xal / s.maxXal;
  const sirali = [...olculenler].sort((a, b) => nisbet(b) - nisbet(a));

  return {
    hal: "hazir",
    bal,
    bant,
    bantYoxdurSebebi: kritikCatismir ? "muqayiseYoxdur" : null,
    // Etibar mövsüm sayından gəlir və BALA TƏSİR ETMİR (qayda 5)
    etibar: keyfiyyet.etibar,
    // Ölçülən amillərin maksimumu: 100-dən azdırsa nəticə natamamdır
    elcatanXal,
    natamam: elcatanXal < 100,
    movsumSayi: keyfiyyet.olculebilenMovsum,
    keyfiyyet,
    setirler,
    sebebler: {
      yaxsi: sirali.filter((s) => nisbet(s) >= 0.75).slice(0, 2).map((s) => s.sebeb),
      pis: sirali.filter((s) => nisbet(s) < 0.5).slice(-2).map((s) => s.sebeb),
    },
  };
}
