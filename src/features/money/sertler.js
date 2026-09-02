/**
 * MALİYYƏ ŞƏRT ZƏNCİRİ — "növbəti əskik addım" həlledicisi.
 *
 * Niyə var: əvvəl Maliyyə ekranı hər halda kredit panelini açırdı, panel isə
 * içəridə "əvvəl sahənizi xəritədə çəkin" deyirdi. Bu, dalandır: fermer
 * düyməyə basır, panel qalxır, panel onu geri qaytarır. Ekranın ÖZÜ növbəti
 * əskik şərti bilməli və düyməni ona görə adlandırmalıdır.
 *
 * Sıra brief-dədir və determinsitdir: sahə → bitki → hesab → təklif.
 * Saf funksiyadır (React yoxdur, şəbəkə yoxdur) — hər pillə ayrıca test olunur.
 *
 * HESAB ŞƏRTİNİ SERVER DEYİR, BRAUZER YOX: `state.hesab.telefon` yalnız
 * görüntü keşidir (sessiya httpOnly cookie-dədir). GET /api/kredit sessiyasız
 * 401 qaytarır — "girisYox" məhz bu deməkdir. Yerli telefona baxsaydıq,
 * sessiya sağ ikən keş hələ gəlməmiş fermerə boş yerə "Hesab yarat" deyərdik.
 *
 * @param {object}  arg
 * @param {object}  arg.sahe      Fermerin çəkdiyi sahə (yoxdursa null)
 * @param {string}  arg.bitki     Seçilmiş bitki açarı (yoxdursa null)
 * @param {string}  arg.serverHal useKreditVeziyyeti-nin halı
 * @returns {{tip: string, basliqKey: string, ctaKey: string, hereket: string}}
 */
export function novbetiSert({ sahe = null, bitki = null, serverHal = "hazir" } = {}) {
  // Kartın BAŞLIĞI da hala görədir: şərt qalıbsa fermerə hələ vəsait
  // təklif etmirik, imkanın necə hesablanacağını deyirik
  if (!sahe) {
    return {
      tip: "sahe",
      kartBasliqKey: "maliyye.sert.kartBasliq",
      basliqKey: "maliyye.sert.sahe",
      ctaKey: "maliyye.sert.saheCta",
      hereket: "saheCek",
      ikon: "MapPin",
    };
  }

  if (!bitki) {
    return {
      tip: "bitki",
      kartBasliqKey: "maliyye.sert.kartBasliq",
      basliqKey: "maliyye.sert.bitki",
      ctaKey: "maliyye.sert.bitkiCta",
      hereket: "bitkiSec",
      ikon: "Leaf",
    };
  }

  if (serverHal === "girisYox") {
    return {
      tip: "hesab",
      kartBasliqKey: "maliyye.sert.kartBasliq",
      basliqKey: "maliyye.sert.hesab",
      ctaKey: "maliyye.sert.hesabCta",
      hereket: "hesab",
      ikon: "ShieldCheck",
    };
  }

  return {
    tip: "hazir",
    kartBasliqKey: "maliyye.elaveVesait",
    basliqKey: "maliyye.sert.hazir",
    ctaKey: "maliyye.sert.hazirCta",
    hereket: "teklif",
    ikon: "Wallet",
  };
}
