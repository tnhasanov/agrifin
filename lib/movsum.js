/**
 * Bitkinin mövsüm sərhədləri: başlanğıc ayı və biçin ayı.
 *
 * Kredit müddəti və "mövsüm pulu" qövsü bunlardan çıxır: kənd təsərrüfatının
 * öz "maaş günü" var — biçin. Ödəniş tarixini fermerin pulu OLACAĞI aya
 * bağlamaq Monzo-nun "maaşa qədər" dövrünün buradakı qarşılığıdır.
 *
 * Aylar bilik bazasındakı mərhələlərdən götürülüb (lib/knowledge.js):
 * başlanğıc = ilk mərhələnin ilk ayı, biçin = son mərhələnin son ayı.
 * movsum.test.js bu uyğunluğu yoxlayır — bilik bazası dəyişəndə bura da
 * dəyişməlidir, test xatırladır. Bilik bazasının özü müştəriyə GÖNDƏRİLMİR
 * (23 kB aqronomik mətn), ona görə xəritə burada təkrarlanır.
 *
 * ⚠ Aran zonası üçündür — dağətəyi rayonlarda 1-3 həftə sürüşür
 * (bax: lib/teqvim.js, kalibrləmə xəbərdarlığı).
 */
export const MOVSUM = {
  bugda: { basla: 10, bicin: 6 },
  arpa: { basla: 10, bicin: 6 },
  qargidali: { basla: 4, bicin: 10 },
  pambiq: { basla: 4, bicin: 10 },
  kartof: { basla: 3, bicin: 9 },
  pomidor: { basla: 2, bicin: 8 },
  sogan: { basla: 10, bicin: 7 },
  uzum: { basla: 2, bicin: 10 },
  alma: { basla: 1, bicin: 10 },
  findiq: { basla: 1, bicin: 9 },
};

/**
 * Növbəti biçinə qalan ay sayı: 1..12.
 *
 * İndiki ay biçin ayıdırsa NÖVBƏTİ İLİN biçini sayılır (12 ay): biçin
 * gedərkən götürülən kredit artıq bu məhsul üçün deyil, gələn mövsüm
 * üçündür — onu bu ayın satışına bağlamaq fermerə bir həftəlik borc verir.
 */
export function bicineQalanAy(bitki, indi = new Date()) {
  const m = MOVSUM[bitki];
  if (!m) return null;
  const buAy = indi.getMonth() + 1;
  return ((m.bicin - buAy + 11) % 12) + 1;
}

/** Növbəti biçin ayının tarixi (ayın 1-i — ay dəqiqliyi kifayətdir) */
export function bicinTarixi(bitki, indi = new Date()) {
  const qalan = bicineQalanAy(bitki, indi);
  if (qalan == null) return null;
  return new Date(indi.getFullYear(), indi.getMonth() + qalan, 1);
}

/**
 * Mövsümün gedişi: 0 (başlanğıc) .. 1 (biçin).
 *
 * Payızlıq bitkilər ili keçir (oktyabr → iyun), ona görə hesab modul 12
 * ilə aparılır. Mövsümdən kənar ay (biçindən sonra, səpindən əvvəl)
 * null qaytarır — qövs o vaxt "mövsüm bağlıdır" göstərir.
 */
export function movsumGedisi(bitki, indi = new Date()) {
  const m = MOVSUM[bitki];
  if (!m) return null;
  const uzunluq = ((m.bicin - m.basla + 12) % 12) || 12;
  const kecen = (indi.getMonth() + 1 - m.basla + 12) % 12;
  if (kecen > uzunluq) return null;
  return kecen / uzunluq;
}
