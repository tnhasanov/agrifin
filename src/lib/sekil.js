// Telefon şəkillərinin hazırlanması.
//
// Müasir telefon 3–8 MB şəkil çəkir. Onu olduğu kimi göndərmək kənd
// internetində dəqiqələr çəkər və modelə də lazım deyil: yarpaqdaki ləkəni
// görmək üçün 1024 piksel kifayətdir. Ona görə brauzerdə kiçildirik.

export const MAX_OLCU = 1024;
export const KEYFIYYET = 0.82;
// Serverin qəbul etdiyi hədd ilə eyni olmalıdır
export const MAX_BAYT = 1_400_000;

export const QEBUL_OLUNAN = ["image/jpeg", "image/png", "image/webp"];

/** Fayl növü qəbul edilirmi */
export function novDuzgun(tip) {
  return QEBUL_OLUNAN.includes(String(tip).toLowerCase());
}

/**
 * Kiçiltmə əmsalı: uzun tərəf MAX_OLCU-dan böyükdürsə azaldırıq,
 * kiçikdirsə OLDUĞU KİMİ saxlayırıq — kiçik şəkli böyütmək detal əlavə
 * etmir, yalnız faylı şişirdir.
 */
export function miqyasHesabla(en, hundurluk, maxOlcu = MAX_OLCU) {
  const boyuk = Math.max(en, hundurluk);
  if (!Number.isFinite(boyuk) || boyuk <= 0) return 1;
  return boyuk > maxOlcu ? maxOlcu / boyuk : 1;
}

/** "data:image/jpeg;base64,XXX" → {mediaType, data} */
export function dataUrlAyir(dataUrl) {
  const uygunluq = /^data:([\w/+.-]+);base64,(.+)$/.exec(String(dataUrl ?? ""));
  if (!uygunluq) return null;
  return { mediaType: uygunluq[1], data: uygunluq[2] };
}

/** base64 sətrinin təxmini bayt ölçüsü */
export function baytOlcusu(base64) {
  const uzunluq = String(base64 ?? "").length;
  return Math.ceil((uzunluq * 3) / 4);
}

/**
 * Faylı kiçildib base64-ə çevirir.
 *
 * Şəffaflıq lazım olmadığı üçün nəticə həmişə JPEG-dir — eyni keyfiyyətdə
 * PNG-dən qat-qat kiçikdir və yarpaq şəkli üçün fərq görünmür.
 */
export async function sekliHazirla(fayl) {
  if (!fayl || !novDuzgun(fayl.type)) {
    const xeta = new Error("şəkil növü qəbul edilmir");
    xeta.kod = "nov";
    throw xeta;
  }

  const bitmap = await createImageBitmap(fayl);
  try {
    const miqyas = miqyasHesabla(bitmap.width, bitmap.height);
    const en = Math.max(1, Math.round(bitmap.width * miqyas));
    const hundurluk = Math.max(1, Math.round(bitmap.height * miqyas));

    const canvas = document.createElement("canvas");
    canvas.width = en;
    canvas.height = hundurluk;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, en, hundurluk);

    const dataUrl = canvas.toDataURL("image/jpeg", KEYFIYYET);
    const ayrilmis = dataUrlAyir(dataUrl);
    if (!ayrilmis) {
      const xeta = new Error("şəkil oxunmadı");
      xeta.kod = "oxunmadi";
      throw xeta;
    }

    if (baytOlcusu(ayrilmis.data) > MAX_BAYT) {
      const xeta = new Error("şəkil çox böyükdür");
      xeta.kod = "boyuk";
      throw xeta;
    }

    return { ...ayrilmis, dataUrl, en, hundurluk };
  } finally {
    bitmap.close?.();
  }
}
