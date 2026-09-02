import { saheSiqnalidir } from "./saheSiqnallari.js";

/**
 * ƏSAS HƏRƏKƏT HƏLLEDİCİSİ — "Bu gün nə etməli?" kartının beyni.
 *
 * Panodakı kartlar müstəqildir və eyni anda mövcud ola bilər (aktiv kredit +
 * sahə xəbərdarlığı + təklif). Amma FERMERƏ BİR nömrəli iş deyilməlidir —
 * onu bu saf funksiya DETERMİNİST prioritetlə seçir:
 *
 *   1. Gecikmiş / vaxtı çatmış ödəniş (hərəkət tələb edir)
 *   2. Yüksək prioritetli sahə xəbərdarlığı (təcili siqnal)
 *   3. Müraciəti bloklayan məcburi addım (hazırda: hesaba giriş)
 *   4. Baxılmamış etibarlı təklif
 *   5. 7 gün içində gözlənilən kredit ödənişi
 *   6. Adi sahə tövsiyəsi (ən vacib açıq siqnal)
 *   7. Kömək / ilkin quraşdırma
 *
 * SİQNAL CİDDİLİYİ YENİDƏN TƏYİN OLUNMUR: mühərrikdə (services/siqnal.js)
 * "tecili" nə deməkdirsə, burada "yüksək prioritet" də odur. Vegetasiya
 * zəifləməsi kimi "diqqet" siqnalları qəsdən 6-cı pillədədir — mühərrik
 * onları təcili saymır, pano da saymır.
 *
 * SERVER MƏLUMATI GƏLMƏYİBSƏ "HƏR ŞEY QAYDASINDADIR" DEYİLMİR: kredit
 * vəziyyəti yüklənir və ya xəta veribsə, gecikmə olub-olmadığını BİLMİRİK —
 * o halda kart yüklənmə/xəta halını göstərir (bax: hal 7-dən əvvəlki blok).
 * Uydurma sakitlik gecikmiş borcalanı yanıldardı.
 *
 * Saf funksiyadır: vaxt (`indi`) kənardan gəlir, heç nə fetch olunmur —
 * hər pillə ayrıca test olunur (bax: esasHereket.test.js).
 */

const GUN_MS = 86_400_000;
/** "Yaxın ödəniş" pəncərəsi — son tarixə qalan gün */
export const YAXIN_ODENIS_GUN = 7;

/**
 * Son tarixə neçə gün qalıb. Server tarixi GÜN dəqiqliyindədir (`YYYY-MM-DD`),
 * ona görə günorta (12:00Z) bağlanır — saat qurşağı fərqi bütün gün ərzində
 * nəticəni sıçratmasın (eyni üsul: services/ndvi.js necheGunEvvel).
 */
function qalanGun(tarix, indi) {
  const hedef = Date.parse(`${String(tarix).slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(hedef)) return null;
  return Math.round((hedef - indi.getTime()) / GUN_MS) || 0;
}

export function esasHereket({
  kredit = null,
  teklif = null,
  muraciet = null,
  serverHal = "yuklenir",
  siqnallar = [],
  sahe = null,
  indi = new Date(),
} = {}) {
  const aktiv = kredit && kredit.hal === "active" ? kredit : null;
  // Server cavabı gəlibmi? "qurulmayib" (501) da bitmiş cavabdır: kredit
  // modulu yoxdursa gözləniləsi borc da yoxdur. "girisYox" (401) da cavabdır
  // — sahəsi olan fermer üçün 3-cü pillə onu onsuz da tutur; sahəsizə isə
  // birinci iş sahə çəkməkdir, gözləmə kartı deyil.
  const kreditBilinir = ["hazir", "qurulmayib", "girisYox"].includes(serverHal);

  // 1 — gecikmiş və ya bu gün vaxtı çatmış ödəniş. Server hesablayır: DPD
  // jurnaldan, məbləğ ödənilməmiş faiz borclarından çıxır. Son tarix günü
  // DPD hələ 0-dır, amma məbləğ artıq ödənilməlidir — o gün də buraya düşür.
  if (aktiv && (aktiv.gecikmeGun > 0 || aktiv.gecikmisMebleg > 0)) {
    const gecikib = aktiv.gecikmeGun > 0;
    return {
      tip: "gecikme",
      prioritet: 1,
      basliqKey: gecikib ? "hereket.gecikme.basliq" : "hereket.gecikme.basliqBuGun",
      metnKey: gecikib ? "hereket.gecikme.metn" : "hereket.gecikme.metnBuGun",
      vars: { mebleg: { money: aktiv.gecikmisMebleg }, gun: aktiv.gecikmeGun },
      ctaKey: "hereket.gecikme.cta",
      hereket: "odenis",
    };
  }

  // 2 — təcili siqnal: kart siqnalın öz mətnini göstərir.
  // Sahə yoxdursa siqnal pilləri işləmir: hava siqnalları rayon üzrədir,
  // amma sahəsiz fermeri sahə ekranına göndərmək mənasızdır — onlar zəngdə
  // qalır, pano isə hal A-da BİR dəvət göstərir (bax: qərar cədvəli, hal A).
  const tecili = sahe ? siqnallar.find((s) => s.ciddilik === "tecili") : null;
  if (tecili) return siqnalHereketi(tecili, 2);

  // 3 — bloklayan məcburi addım. Hazırda yeganə belə addım hesaba girişdir:
  // sahəsi olan fermer kredit əməliyyatı üçün mütləq daxil olmalıdır.
  // (KYC/sənəd axını gələndə bura tapşırıq siyahısı kimi genişlənəcək.)
  if (serverHal === "girisYox" && sahe) {
    return {
      tip: "giris",
      prioritet: 3,
      basliqKey: "hereket.giris.basliq",
      metnKey: "hereket.giris.metn",
      vars: null,
      ctaKey: "hereket.giris.cta",
      hereket: "giris",
    };
  }

  // 4 — etibarlı, baxılmamış təklif (server buraxıb, hələ qəbul olunmayıb)
  if (muraciet?.hal === "offer_issued" && teklif?.hal === "issued") {
    return {
      tip: "teklif",
      prioritet: 4,
      basliqKey: "hereket.teklif.basliq",
      metnKey: "hereket.teklif.metn",
      vars: { mebleg: { money: teklif.mebleg } },
      ctaKey: "hereket.teklif.cta",
      hereket: "teklif",
    };
  }

  // 5 — yaxın ödəniş: server proqnozudur (~), 7 gün pəncərəsində.
  // Tarix İSTİFADƏÇİ FORMATINDA gedir (kart `gunAdi` ilə yazır) — ISO yox.
  if (aktiv?.novbetiTarix) {
    const qalan = qalanGun(aktiv.novbetiTarix, indi);
    if (qalan != null && qalan >= 0 && qalan <= YAXIN_ODENIS_GUN) {
      return {
        tip: "odenisYaxin",
        prioritet: 5,
        basliqKey: "hereket.odenis.basliq",
        metnKey: "hereket.odenis.metn",
        vars: { mebleg: { money: aktiv.novbetiMebleg } },
        tarix: aktiv.novbetiTarix,
        ctaKey: "hereket.odenis.cta",
        hereket: "odenis",
      };
    }
  }

  // 6 — adi sahə tövsiyəsi: mühərrikin sıraladığı ən vacib açıq siqnal.
  // "melumat" səviyyəsi bir nömrəli iş deyil (ölçmə köhnəlib, dərmanlama
  // pəncərəsi) — onlar zəngdə və Kömək ekranında qalır.
  const tovsiye = sahe ? siqnallar.find((s) => s.ciddilik !== "melumat") : null;
  if (tovsiye) return siqnalHereketi(tovsiye, 6);

  // 7-dən əvvəl — kredit vəziyyəti hələ bilinmir: sakitlik VƏD EDİLMİR
  if (!kreditBilinir) {
    if (serverHal === "xeta") {
      return {
        tip: "xeta",
        prioritet: 7,
        basliqKey: "hereket.xeta.basliq",
        metnKey: "hereket.xeta.metn",
        vars: null,
        ctaKey: "hereket.xeta.cta",
        hereket: "yenile",
      };
    }
    return {
      tip: "yuklenir",
      prioritet: 7,
      basliqKey: "hereket.yuklenir.basliq",
      metnKey: "hereket.yuklenir.metn",
      vars: null,
      ctaKey: null,
      hereket: null,
    };
  }

  // 7 — quraşdırma / kömək
  if (!sahe) {
    return {
      tip: "saheCek",
      prioritet: 7,
      basliqKey: "hereket.sahe.basliq",
      metnKey: "hereket.sahe.metn",
      vars: null,
      ctaKey: "hereket.sahe.cta",
      hereket: "saheCek",
    };
  }
  return {
    tip: "komek",
    prioritet: 7,
    basliqKey: "hereket.komek.basliq",
    metnKey: "hereket.komek.metn",
    vars: null,
    ctaKey: "hereket.komek.cta",
    hereket: "komek",
  };
}

/**
 * Siqnal hərəkəti. CTA siqnalın HARADA göründüyünə görə seçilir: sahə
 * siqnalı Sahələr ekranındadır, hava siqnalı isə orada YOXDUR — onu
 * "Sahəyə bax" ilə göstərmək fermeri boş ekrana aparardı (bax:
 * saheSiqnallari.js).
 */
function siqnalHereketi(siqnal, prioritet) {
  const sahede = saheSiqnalidir(siqnal);
  return {
    tip: "siqnal",
    prioritet,
    siqnal,
    ctaKey: sahede ? "hereket.siqnal.cta" : "hereket.siqnal.ctaSiyahi",
    hereket: sahede ? "sahe" : "siqnalSiyahi",
  };
}
