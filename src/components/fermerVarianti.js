/**
 * Bitki → fermer renderinin variantı. İstehsalçı 6 render göndərib (nar
 * CROP_KEYS-də olmadığından buraxılıb): arpa vizual olaraq buğdaya QƏSDƏN
 * bağlanır (hər ikisi sünbüldür), qalan bitkilər ümumi cücərti variantına
 * düşür — yeni renderlər gələndə yalnız bu xəritə genişlənir.
 *
 * Ayrı faylda ona görədir ki, komponent faylı yalnız komponent ixrac etsin
 * (react-refresh qaydası).
 */
export const BITKI_VARIANTI = {
  bugda: "bugda",
  arpa: "bugda",
  qargidali: "qargidali",
  pambiq: "pambiq",
  kartof: "yarpaq",
  pomidor: "pomidor",
  sogan: "yarpaq",
  uzum: "uzum",
  alma: "yarpaq",
  findiq: "yarpaq",
};
