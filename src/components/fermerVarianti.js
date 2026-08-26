/**
 * Bitki → fermer renderinin variantı. İstehsalçı 10 render göndərib (nar
 * CROP_KEYS-də olmadığından buraxılıb): yalnız arpa vizual olaraq buğdaya
 * QƏSDƏN bağlanır — hər ikisi sünbüldür və istehsalçı arpa üçün ayrıca
 * render göndərməyib. Naməlum bitki ümumi cücərti variantına düşür.
 *
 * Ayrı faylda ona görədir ki, komponent faylı yalnız komponent ixrac etsin
 * (react-refresh qaydası).
 */
export const BITKI_VARIANTI = {
  bugda: "bugda",
  arpa: "bugda",
  qargidali: "qargidali",
  pambiq: "pambiq",
  kartof: "kartof",
  pomidor: "pomidor",
  sogan: "sogan",
  uzum: "uzum",
  alma: "alma",
  findiq: "findiq",
};
