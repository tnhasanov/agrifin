// Qeydiyyat qıfını ölçmək üçün ən sadə vasitə.
//
// Niyə indi: hansı addımda fermerin əlini çəkdiyini görmədən qıfı düzəltmək
// mümkün deyil, sonradan əlavə etmək isə hər ekrana toxunmaq deməkdir.
// Hazırda heç yerə göndərilmir — hadisələr yaddaşda saxlanılır. Analitika
// xidməti seçiləndə yalnız `gonder` yazılacaq.

const HEDD = 200;
const hadiseler = [];

export function track(ad, xususiyyetler = {}) {
  const hadise = { ad, ...xususiyyetler };
  hadiseler.push(hadise);
  if (hadiseler.length > HEDD) hadiseler.shift();
  if (import.meta.env?.DEV) console.debug("[analitika]", ad, xususiyyetler);
  return hadise;
}

/** Yığılmış hadisələr — test və gələcək göndərmə üçün */
export function hadiseleriOxu() {
  return [...hadiseler];
}

export function hadiseleriTemizle() {
  hadiseler.length = 0;
}
