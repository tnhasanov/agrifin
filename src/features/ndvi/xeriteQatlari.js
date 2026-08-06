/**
 * Xəritə qatları və leyendləri — həm kartda, həm tam ekranda eyni siyahı.
 * Ayrıca fayldadır ki, tam ekran komponenti kartı import etməsin (dövrə).
 */
export const QATLAR = [
  { id: "bitki", ikon: "Sprout", etiket: "ndvi.layer.bitki" },
  { id: "nemlik", ikon: "Droplets", etiket: "ndvi.layer.nemlik" },
];

export const LEYENDLER = {
  bitki: [
    { reng: "#8C6642", acar: "ndvi.legend.bare" },
    { reng: "#E8D959", acar: "ndvi.legend.sparse" },
    { reng: "#9ECC54", acar: "ndvi.legend.medium" },
    { reng: "#17662B", acar: "ndvi.legend.dense" },
  ],
  nemlik: [
    { reng: "#A9714B", acar: "ndvi.moist.veryDry" },
    { reng: "#E8D973", acar: "ndvi.moist.dry" },
    { reng: "#8CC7CA", acar: "ndvi.moist.ok" },
    { reng: "#1F5FA8", acar: "ndvi.moist.wet" },
  ],
};
