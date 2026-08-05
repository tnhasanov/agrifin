/**
 * Sahə hesabatını telefonun öz paylaşma vərəqi ilə göndərir.
 *
 * Niyə lazımdır: Azərbaycanda fermerin aqronomu, oğlu və alıcısı ilə əlaqəsi
 * WhatsApp-dadır. Ölçmə tətbiqin içində qalırsa, fermer onu telefonunu
 * göstərərək danışır. Hesabat mətn kimi çıxanda isə həm aqronoma çatır, həm
 * də mətnin altındakı keçid tətbiqi tanıdır — reklamsız yayılma budur.
 *
 * Niyə "WhatsApp düyməsi" deyil, PAYLAŞ düyməsi: navigator.share telefonun öz
 * vərəqini açır — orada WhatsApp da var, Telegram da, SMS də. Rəqib tətbiq
 * ekranın küncündə üzən WhatsApp düyməsi saxlayır; biz məzmunun üstünü
 * bağlamırıq. Vərəq yoxdursa (masaüstü brauzer) wa.me açılır, o da alınmasa
 * mətn buferə kopyalanır — hər halda fermerin əlində qalır.
 *
 * Bu modulda tərcümə YOXDUR: hansı sətirlərin olacağını burada qərar veririk,
 * mətni isə komponent t() ilə qurur. Beləliklə hesabat fermerin dilində gedir.
 */

export const WA_UNVAN = "https://wa.me/?text=";

/**
 * Hesabatın sətirləri — tərcümə açarı və dəyişənləri.
 * Ölçmə yoxdursa sətir ümumiyyətlə qoyulmur: "—" yazmaq aqronomu çaşdırır.
 *
 * @returns {Array<{key: string, vars?: object}>}
 */
export function hesabatSetirleri({ hektar, bitkiKey, faiz, medyanFaiz, suSeviyyesi, gun, siqnalKey } = {}) {
  const setirler = [];

  if (Number.isFinite(hektar)) {
    setirler.push(
      bitkiKey
        ? { key: "paylas.saheBitki", vars: { hektar: { number: hektar }, bitki: { key: bitkiKey } } }
        : { key: "paylas.sahe", vars: { hektar: { number: hektar } } },
    );
  }

  if (Number.isFinite(faiz)) {
    setirler.push(
      Number.isFinite(medyanFaiz)
        ? { key: "paylas.ortukQonsu", vars: { faiz, medyan: medyanFaiz } }
        : { key: "paylas.ortuk", vars: { faiz } },
    );
  }

  if (suSeviyyesi) setirler.push({ key: `ndvi.water.${suSeviyyesi}` });

  // Siqnal varsa aqronomun ilk baxacağı sətir odur — ona görə ölçmədən sonra
  if (siqnalKey) setirler.push({ key: "paylas.siqnal", vars: { basliq: { key: siqnalKey } } });

  if (Number.isFinite(gun)) setirler.push({ key: "paylas.olcme", vars: { gun } });

  return setirler;
}

/**
 * Mətni paylaşır. Üç pillə: telefonun vərəqi → wa.me → bufer.
 *
 * @returns {Promise<"paylasildi"|"legv"|"whatsapp"|"kopyalandi"|"olmadi">}
 */
export async function paylas({ metn, basliq, nav, pencere } = {}) {
  const naviqator = nav ?? globalThis.navigator;
  const pen = pencere ?? globalThis.window;
  if (!metn) return "olmadi";

  if (typeof naviqator?.share === "function") {
    try {
      await naviqator.share({ title: basliq, text: metn });
      return "paylasildi";
    } catch (xeta) {
      // Fermer vərəqi bağladısa bu xəta deyil — wa.me-ni zorla açmaq olmaz
      if (xeta?.name === "AbortError") return "legv";
    }
  }

  try {
    const pencerə = pen?.open?.(`${WA_UNVAN}${encodeURIComponent(metn)}`, "_blank", "noopener");
    if (pencerə !== null && pencerə !== undefined) return "whatsapp";
  } catch {
    // Pəncərə blokdadırsa aşağıdakı bufer variantı qalır
  }

  if (typeof naviqator?.clipboard?.writeText !== "function") return "olmadi";
  try {
    await naviqator.clipboard.writeText(metn);
    return "kopyalandi";
  } catch {
    return "olmadi";
  }
}
