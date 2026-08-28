/**
 * KREDİT MÜHASİBATI — faizin hesablanması, ödənişin bölüşdürülməsi, gecikmə.
 *
 * ═══ NİYƏ AYRICA MODUL ════════════════════════════════════════════════
 * `lib/kreditOdenis.js` məhsulun QAYDASINI bir cümlə ilə deyir (faiz aylıq,
 * qalan əsas borca). Bu modul isə həmin qaydanın MÜHASİBATIDIR: hansı gün
 * nə qədər faiz yığılır, ödəniş nəyə düşür, borc nə vaxtdan gecikib.
 * Hamısı saf funksiyalardır — baza da, vaxt da kənardan verilir, ona görə
 * hər qayda ayrıca test oluna bilir.
 *
 * ═══ QƏBUL EDİLMİŞ QAYDALAR ═══════════════════════════════════════════
 *   1. FAİZ GÜNDƏLİK YIĞILIR (act/365), AYLIQ YAZILIR.
 *      Faiz dövr ərzində HƏR GÜNÜN qalıq əsas borcuna görə hesablanır:
 *        faiz = Σ (həmin günün qalığı × illikFaiz/100 × 1/365)
 *      Dövrün sonunda bir "interest_charge" hadisəsi yazılır.
 *      Niyə gündəlik: fermer əsas borcu ayın ortasında azaldırsa, faiz elə
 *      həmin gündən azalmalıdır. "Dövrün sonundakı qalığa görə" hesablamaq
 *      son gün ödəyəni mükafatlandırıb bütün ay borclu qalanla eyni tutardı.
 *
 *   2. ÖDƏNİŞ ƏVVƏL FAİZƏ, SONRA ƏSAS BORCA.
 *      Bank praktikasının standartı; həm də fermer üçün şəffafdır: faiz
 *      borcu yığılıb gizlicə böyüyə bilmir.
 *
 *   3. KOMPAUNDİNQ YOXDUR. Ödənilməmiş faizə faiz yazılmır — faizin bazası
 *      HƏMİŞƏ yalnız əsas borcdur. Gecikmə cəriməsi də hələ YOXDUR: məhsul
 *      onu təsdiqləməyib, ona görə uydurulmur (dəyişəndə burada olacaq).
 *
 *   4. VAXT KƏNARDAN GƏLİR. Heç bir funksiya `new Date()` çağırmır — server
 *      `now()`-u ötürür. Testlər zamanı sürüşdürə bilir, hesablama isə
 *      təkrarlana bilən qalır.
 *
 * Pul dəyərləri qəpik dəqiqliyində yuvarlaqlaşır (baza NUMERIC(12,2)).
 */

/** Faiz ili: act/365 — sadə, geniş yayılmış, izahı asan konvensiya */
export const GUN_BAZASI = 365;
const GUN_MS = 86_400_000;
/** Hesablama qoruyucusu: sonsuz dövr sayğacı olmasın (20 il) */
const MAX_DOVR = 240;

/** Qəpiyə yuvarlaqlaşdırma — NUMERIC(12,2) ilə eyni dəqiqlik */
export function qepik(deyer) {
  const say = Number(deyer);
  if (!Number.isFinite(say)) return 0;
  return Math.round((say + Number.EPSILON) * 100) / 100;
}

const tarixe = (deyer) => (deyer instanceof Date ? deyer : new Date(deyer));

/**
 * Başlanğıcdan n ay sonrakı an — ayın sonu düzgün sıxılır.
 * 31 yanvarda verilən kreditin 1-ci dövrü 28/29 fevralda bitir, sonrakı
 * dövrlər yenə ayın sonuna qayıdır (baza tarix dəyişmir).
 */
export function dovrSonu(baslangic, n) {
  const b = tarixe(baslangic);
  const gun = b.getUTCDate();
  const hedef = new Date(
    Date.UTC(
      b.getUTCFullYear(),
      b.getUTCMonth() + n,
      1,
      b.getUTCHours(),
      b.getUTCMinutes(),
      b.getUTCSeconds(),
      b.getUTCMilliseconds(),
    ),
  );
  // Hədəf ayın son günü — 31-dən qısa aylarda tarix növbəti aya sürüşməsin
  const ayinSonu = new Date(Date.UTC(hedef.getUTCFullYear(), hedef.getUTCMonth() + 1, 0)).getUTCDate();
  hedef.setUTCDate(Math.min(gun, ayinSonu));
  return hedef;
}

/** n-ci dövrün [başlanğıc, son) aralığı */
export function dovrAraligi(verilme, no) {
  return { baslangic: dovrSonu(verilme, no - 1), son: dovrSonu(verilme, no) };
}

/**
 * Bitmiş, amma hələ jurnala yazılmamış dövrlər.
 *
 * Müddət bitəndən sonra da faiz yığılmaqda davam edir: borc qalıbsa onun
 * xərci var. Cərimə dərəcəsi tətbiq olunmur (bax: yuxarıdakı 3-cü qayda).
 */
export function hesablanacaqDovrler({ verilme, indi, hesablanmisDovr = 0 }) {
  if (!verilme) return [];
  const son = tarixe(indi);
  const netice = [];
  for (let no = hesablanmisDovr + 1; no <= MAX_DOVR; no += 1) {
    const araliq = dovrAraligi(verilme, no);
    if (araliq.son > son) break;
    netice.push({ no, ...araliq });
  }
  return netice;
}

/**
 * Hadisə jurnalından əsas borcun zaman xətti.
 * Yalnız qalığı DƏYİŞƏN hadisələr sayılır (`principal_after` doludur):
 * verilmə, əsas borc ödənişi, düzəliş.
 */
export function esasXetti(hadiseler = []) {
  return hadiseler
    .filter((h) => h?.principal_after != null)
    .map((h) => ({ vaxt: tarixe(h.created_at), qaliq: Number(h.principal_after) }))
    .sort((a, b) => a.vaxt - b.vaxt);
}

/**
 * [başlanğıc, son) aralığında yığılan faiz — gündəlik, act/365.
 *
 * @param {{xett: {vaxt: Date, qaliq: number}[], baslangic: Date|string,
 *          son: Date|string, illikFaiz: number}} arqument
 * @returns {number} faiz (₼, qəpik dəqiqliyi)
 */
export function araliqFaizi({ xett = [], baslangic, son, illikFaiz }) {
  const b = tarixe(baslangic);
  const s = tarixe(son);
  if (!(s > b) || !Number.isFinite(illikFaiz) || illikFaiz <= 0) return 0;

  // Aralığın əvvəlindəki qalıq: b-dən əvvəlki (və ya elə b anındakı) son dəyər
  let qaliq = 0;
  for (const noqte of xett) {
    if (noqte.vaxt <= b) qaliq = noqte.qaliq;
  }

  const deyisimler = xett.filter((n) => n.vaxt > b && n.vaxt < s);
  let vaxt = b;
  let faiz = 0;
  for (const noqte of [...deyisimler, { vaxt: s, qaliq: null }]) {
    const gun = (noqte.vaxt - vaxt) / GUN_MS;
    if (gun > 0 && qaliq > 0) faiz += qaliq * (illikFaiz / 100) * (gun / GUN_BAZASI);
    if (noqte.qaliq != null) qaliq = noqte.qaliq;
    vaxt = noqte.vaxt;
  }
  return qepik(faiz);
}

/**
 * Ödənişin bölüşdürülməsi: ƏVVƏL FAİZ, SONRA ƏSAS BORC.
 * Artıq qalan hissə (`artiq`) heç yerə yazılmır — çağıran onu qaytarır və
 * ya rədd edir; mühasibat borcdan çoxunu qəbul etmir.
 */
export function bolusdur({ mebleg, faizBorc = 0, esasBorc = 0 }) {
  const say = Number(mebleg);
  const hamisi = Number.isFinite(say) && say > 0 ? say : 0;
  const faiz = qepik(Math.min(hamisi, Math.max(0, Number(faizBorc) || 0)));
  const esas = qepik(Math.min(hamisi - faiz, Math.max(0, Number(esasBorc) || 0)));
  return { faiz, esas, artiq: qepik(hamisi - faiz - esas) };
}

/**
 * Gecikmə (DPD) — ödənilməmiş ən KÖHNƏ faiz borcunun yaşı.
 *
 * Ayrıca sütun saxlanılmır: ödənişlər köhnədən yenilərə doğru hesablanır və
 * ilk örtülməmiş faiz hadisəsinin son tarixi gecikmənin başlanğıcıdır.
 * Belə olanda jurnal həqiqət mənbəyi olaraq qalır və sütun onunla
 * uyğunsuzlaşa bilmir.
 */
export function gecikme({ hadiseler = [], indi }) {
  const now = tarixe(indi);
  const borclar = hadiseler
    .filter((h) => h?.event_type === "interest_charge")
    .map((h) => ({
      tarix: tarixe(h.due_on ?? h.created_at),
      mebleg: Number(h.amount) || 0,
    }))
    .sort((a, b) => a.tarix - b.tarix);

  let odenen = hadiseler
    .filter((h) => h?.event_type === "interest_payment")
    .reduce((cem, h) => cem + (Number(h.amount) || 0), 0);

  for (const borc of borclar) {
    const ortulen = Math.min(odenen, borc.mebleg);
    odenen -= ortulen;
    // Yarım qəpiklik qalıq gecikmə sayılmır (yuvarlaqlaşma səs-küyü)
    if (borc.mebleg - ortulen > 0.004) {
      if (borc.tarix > now) return { gunler: 0, tarix: null };
      return { gunler: Math.floor((now - borc.tarix) / GUN_MS), tarix: borc.tarix };
    }
  }
  return { gunler: 0, tarix: null };
}

/**
 * Növbəti ödəniş: tarix və məbləğ.
 *
 * Məbləğ = ödənilməmiş faiz borcu
 *        + cari dövrün proqnoz faizi (qalıq dəyişməsə)
 *        + son tarixdirsə əsas borcun qalığı.
 *
 * Bu, PROQNOZDUR: fermer əsas borcu azaldarsa faiz hissəsi də azalacaq.
 * Ona görə UI-da "təxmini" kimi göstərilir.
 */
export function novbetiOdenis({
  verilme,
  hesablanmisDovr = 0,
  faizBorc = 0,
  esasBorc = 0,
  illikFaiz,
  sonTarix = null,
  xett = [],
}) {
  if (!verilme) return null;
  if (esasBorc <= 0 && faizBorc <= 0) return null;

  const { baslangic, son } = dovrAraligi(verilme, hesablanmisDovr + 1);
  const yetkinlik = sonTarix ? tarixe(sonTarix) : null;
  // Son tarix bu dövrün içindədirsə (və ya keçibsə) ödəniş sonuncudur:
  // əsas borc da həmin gün bağlanmalıdır
  const sonuncu = Boolean(yetkinlik && yetkinlik <= son);
  const tarix = sonuncu ? yetkinlik : son;
  const projeksiya = araliqFaizi({ xett, baslangic, son: tarix, illikFaiz });

  return {
    tarix,
    mebleg: qepik(Number(faizBorc) + projeksiya + (sonuncu ? Number(esasBorc) : 0)),
    esasDaxil: sonuncu,
  };
}
