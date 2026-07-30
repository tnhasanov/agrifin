// Doza qoruyucusu — axın rejimi üçün.
//
// PROBLEM: axın olmayanda bütün cavabı görüb yoxlamaq olurdu. Axında mətn
// yazıldıqca fermerin ekranına düşür, yəni doza görünüb sonra silinə bilər.
//
// HƏLL: "gecikdirmə buferi". Mətnin son GECIKDIRME simvolu heç vaxt dərhal
// göndərilmir — orada hələ yarımçıq doza forması ola bilər. Tam uyğunluq
// yaranan kimi hamısı bloklanır və heç nə çıxmır, çünki uyğunluq həmişə
// saxlanılan quyruğun içindədir.

export const DOZA_REGEX =
  /\b\d+([.,]\d+)?\s?(ml|l|litr|q|qr|qram|kq|gr|g)\s?\/\s?(ha|hektar|litr|l|sot)\b/i;

// Ən uzun mümkün uyğunluq ("12.5 qram/hektar") ~16 simvoldur; 48 geniş ehtiyatdır.
export const GECIKDIRME = 48;

/**
 * Axın parçalarını qəbul edir, göndərilməsi təhlükəsiz olan hissəni qaytarır.
 * `bloklandi` true olanda çağıran tərəf axını dayandırmalı və indiyə qədər
 * göstərilən mətni ləğv etməlidir.
 */
export function dozaQoruyucusuYarat({ gecikdirme = GECIKDIRME } = {}) {
  let hamisi = "";
  let gonderilen = 0;

  const yoxla = () => DOZA_REGEX.test(hamisi);

  return {
    /** Yeni parça əlavə edir və çıxarıla bilən mətni qaytarır */
    elaveEt(parca) {
      hamisi += parca;
      if (yoxla()) return { bloklandi: true, metn: "" };

      const təhlükəsizSon = Math.max(gonderilen, hamisi.length - gecikdirme);
      const metn = hamisi.slice(gonderilen, təhlükəsizSon);
      gonderilen = təhlükəsizSon;
      return { bloklandi: false, metn };
    },

    /** Axın bitəndə saxlanılan quyruğu buraxır */
    bosalt() {
      if (yoxla()) return { bloklandi: true, metn: "" };
      const metn = hamisi.slice(gonderilen);
      gonderilen = hamisi.length;
      return { bloklandi: false, metn };
    },

    /** İndiyə qədər toplanan tam mətn — sonda yönləndirmə qərarı üçün */
    get tamMetn() {
      return hamisi;
    },
  };
}
