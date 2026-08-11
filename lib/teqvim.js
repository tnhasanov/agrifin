// lib/teqvim.js — bitki təqvimi və su tələbatı əmsalları.
//
// Bilik bazasındakı mərhələləri (bax: knowledge.js) fermerə göstərilə bilən
// formaya çevirir və suvarma miqdarını hesablamaq üçün FAO-56 əmsallarını
// verir.
//
// ═══ KALİBRLƏMƏ XƏBƏRDARLIĞI ═══════════════════════════════════════════
// Buradakı heç bir rəqəm Azərbaycan şəraiti üçün ölçülməyib:
//
//   1) Mərhələ ayları Aran zonası üçün yazılıb. Şəki–Zaqatala və dağətəyi
//      rayonlarda yaz 1–3 həftə gec başlayır — mərhələ də sürüşür.
//   2) Kc əmsalları FAO-56 (Cədvəl 12) beynəlxalq normativləridir. Sort,
//      torpaq növü, suvarma üsulu və əkin sıxlığı onları ±20% dəyişir.
//   3) Mərhələnin hansı Kc fazasına düşdüyü sıraya görə TƏXMİN edilir
//      (birinci üçdə bir = başlanğıc, sonuncu üçdə bir = yetişmə). Həqiqi
//      faza günlərlə ölçülür, mərhələ sayı ilə yox.
//
// Fermerə göstərilən hər kartda bu qeyd yazılır. Aqronom kalibrləməsindən
// sonra bu blok yenilənməlidir.
// ═══════════════════════════════════════════════════════════════════════
import { BITKILER } from "./knowledge.js";

/**
 * FAO-56 tək bitki əmsalları: başlanğıc / orta (maksimum) / yetişmə.
 * Kc × ET0 = bitkinin su tələbatı (mm/gün).
 */
export const KC = {
  bugda: { ini: 0.3, orta: 1.15, son: 0.25 },
  arpa: { ini: 0.3, orta: 1.15, son: 0.25 },
  qargidali: { ini: 0.3, orta: 1.2, son: 0.35 },
  pambiq: { ini: 0.35, orta: 1.15, son: 0.5 },
  kartof: { ini: 0.5, orta: 1.15, son: 0.75 },
  pomidor: { ini: 0.6, orta: 1.15, son: 0.8 },
  sogan: { ini: 0.7, orta: 1.05, son: 0.75 },
  uzum: { ini: 0.3, orta: 0.85, son: 0.45 },
  alma: { ini: 0.45, orta: 0.95, son: 0.7 },
  findiq: { ini: 0.3, orta: 1.1, son: 0.55 },
};

/** Növbəti ay (dekabrdan sonra yanvar) */
export const novbetiAy = (ay) => (ay === 12 ? 1 : ay + 1);

/**
 * Mərhələnin Kc fazası. Mərhələlər xronoloji sıradadır, ona görə sıra
 * nömrəsi fazanın kobud göstəricisidir — bax: yuxarıdakı 3-cü qeyd.
 */
export function faza(indeks, sayi) {
  if (!Number.isFinite(indeks) || !Number.isFinite(sayi) || sayi <= 0) return "orta";
  if (indeks < sayi / 3) return "ini";
  if (indeks >= (sayi * 2) / 3) return "son";
  return "orta";
}

/** Verilmiş ay üçün Kc — bir neçə mərhələ üst-üstə düşürsə ən böyüyü */
export function kcTap(bitkiKey, ay) {
  const bitki = BITKILER[bitkiKey];
  const cedvel = KC[bitkiKey];
  if (!bitki || !cedvel) return null;

  const deyerler = bitki.merhaleler
    .map((m, i) => (m.ay.includes(ay) ? cedvel[faza(i, bitki.merhaleler.length)] : null))
    .filter((deyer) => deyer != null);

  // Mərhələ tapılmasa bitki ya sükunətdədir, ya da sahə boşdur
  if (deyerler.length === 0) return null;
  return Math.max(...deyerler);
}

/**
 * Səpin üçün minimum torpaq temperaturu (6 sm dərinlikdə, °C).
 *
 * Səpin qərarı HAVANIN yox, TORPAĞIN temperaturundan asılıdır: toxum soyuq
 * torpaqda cücərmir, çürüyür. Fermer bunu adətən əli ilə yoxlayır və ya
 * təqvimə baxır; proqnoz isə rəqəmi əvvəlcədən verə bilər.
 *
 * KALİBRLƏMƏ LAZIMDIR: bunlar ümumi cücərmə hədləridir, Azərbaycan sortları
 * və torpaqları üçün aqronom təsdiqindən keçməyib. Sortlar arasında fərq
 * 2–3 dərəcəyə çata bilər.
 */
export const SEPIN_TORPAQ = {
  bugda: 8,
  arpa: 6,
  qargidali: 12,
  pambiq: 14,
  kartof: 8,
  pomidor: 15,
  sogan: 7,
};

/**
 * İstilik toplanması üçün baza temperaturu (°C).
 *
 * Bitki bu temperaturdan aşağıda praktik olaraq inkişaf etmir; ondan yuxarı
 * hər dərəcə-gün toplanır. Mərhələlərin nə vaxt gələcəyini TƏQVİM yox, məhz
 * bu toplam müəyyən edir — isti il məhsulu tez, sərin il gec yetişdirir.
 *
 * KALİBRLƏMƏ LAZIMDIR: bunlar beynəlxalq ədəbiyyatın standart dəyərləridir,
 * yerli sortlar üçün yoxlanılmayıb.
 */
export const BAZA_TEMP = {
  bugda: 0,
  arpa: 0,
  qargidali: 10,
  pambiq: 15,
  kartof: 7,
  pomidor: 10,
  sogan: 4,
  uzum: 10,
  alma: 5,
  findiq: 7,
};

/** Mərhələnin adı səpindirsə true — ad bilik bazasında yazılır */
const sepinMi = (merhele) => String(merhele?.ad ?? "").startsWith("Səpin");

/**
 * Fermerə göstəriləcək təqvim: bu ayın işləri + növbəti ayın xəbərdarlığı.
 * @returns {null | {ad, yoxlanildi, cari: [{ad, isler}], novbeti: [...], kc}}
 */
export function teqvimQur(bitkiKey, ay) {
  const bitki = BITKILER[bitkiKey];
  if (!bitki || !Number.isInteger(ay) || ay < 1 || ay > 12) return null;

  const sec = (hedefAy) =>
    bitki.merhaleler
      .filter((m) => m.ay.includes(hedefAy))
      .map((m) => ({ ad: m.ad, isler: m.isler }));

  const cari = sec(ay);

  return {
    ad: bitki.ad,
    // Aqronom yoxlaması: bütün bitkilərdə hələ false (bax: knowledge.js)
    yoxlanildi: Boolean(bitki.yoxlanildi),
    cari,
    novbeti: sec(novbetiAy(ay)),
    kc: kcTap(bitkiKey, ay),
    // Səpin ayıdırsa torpaq temperaturu qərar verir. Həddi bilmiriksə
    // (bitki siyahıda yoxdursa) heç nə iddia etmirik.
    sepin: {
      aktiv: cari.some(sepinMi),
      torpaqMin: SEPIN_TORPAQ[bitkiKey] ?? null,
      // İstilik toplanması bu aydan sayılır. Çoxillik bitkilərdə (üzüm, alma)
      // səpin yoxdur — ilk mərhələnin ayı götürülür, yəni oyanma.
      ay: (bitki.merhaleler.find(sepinMi) ?? bitki.merhaleler[0])?.ay?.[0] ?? null,
    },
    bazaTemp: BAZA_TEMP[bitkiKey] ?? null,
  };
}
