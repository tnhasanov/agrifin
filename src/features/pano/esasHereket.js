/**
 * ƏSAS HƏRƏKƏT HƏLLEDİCİSİ — "Bu gün nə etməli?" kartının beyni.
 *
 * Panodakı kartlar müstəqildir və eyni anda mövcud ola bilər (aktiv kredit +
 * sahə xəbərdarlığı + təklif). Amma FERMERƏ BİR nömrəli iş deyilməlidir —
 * onu bu saf funksiya DETERMİNİST prioritetlə seçir:
 *
 *   1. Gecikmiş ödəniş (hərəkət tələb edir)
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
 * Saf funksiyadır: vaxt (`indi`) kənardan gəlir, heç nə fetch olunmur —
 * hər pillə ayrıca test olunur (bax: esasHereket.test.js).
 */

const GUN_MS = 86_400_000;
/** "Yaxın ödəniş" pəncərəsi — son tarixə qalan gün */
export const YAXIN_ODENIS_GUN = 7;

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

  // 1 — gecikmiş ödəniş: server hesablayıb (DPD jurnal + due_on-dan çıxır)
  if (aktiv && aktiv.gecikmeGun > 0) {
    return {
      tip: "gecikme",
      prioritet: 1,
      basliqKey: "hereket.gecikme.basliq",
      metnKey: "hereket.gecikme.metn",
      vars: { mebleg: { money: aktiv.gecikmisMebleg }, gun: aktiv.gecikmeGun },
      ctaKey: "hereket.gecikme.cta",
      hereket: "odenis",
    };
  }

  // 2 — təcili sahə siqnalı: kart siqnalın öz mətnini göstərir.
  // Sahə yoxdursa siqnal pilləri işləmir: hava siqnalları rayon üzrədir,
  // amma "Sahəyə bax" CTA-sı sahəsiz fermeri boşluğa aparır — onlar zəngdə
  // qalır, pano isə hal A-da BİR dəvət göstərir (bax: qərar cədvəli, hal A).
  const tecili = sahe ? siqnallar.find((s) => s.ciddilik === "tecili") : null;
  if (tecili) {
    return {
      tip: "siqnal",
      prioritet: 2,
      siqnal: tecili,
      ctaKey: "hereket.siqnal.cta",
      hereket: "sahe",
    };
  }

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

  // 5 — yaxın ödəniş: server proqnozudur (~), 7 gün pəncərəsində
  if (aktiv?.novbetiTarix) {
    const qalan = (new Date(aktiv.novbetiTarix) - indi) / GUN_MS;
    if (qalan >= 0 && qalan <= YAXIN_ODENIS_GUN) {
      return {
        tip: "odenisYaxin",
        prioritet: 5,
        basliqKey: "hereket.odenis.basliq",
        metnKey: "hereket.odenis.metn",
        vars: { mebleg: { money: aktiv.novbetiMebleg }, tarix: aktiv.novbetiTarix },
        ctaKey: "hereket.odenis.cta",
        hereket: "odenis",
      };
    }
  }

  // 6 — adi sahə tövsiyəsi: mühərrikin sıraladığı ən vacib açıq siqnal
  if (sahe && siqnallar.length > 0) {
    return {
      tip: "siqnal",
      prioritet: 6,
      siqnal: siqnallar[0],
      ctaKey: "hereket.siqnal.cta",
      hereket: "sahe",
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
