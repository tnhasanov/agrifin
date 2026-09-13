/**
 * MƏTN KÖMƏKÇİLƏRİ — server və klient üçün ORTAQ, asılılıqsız.
 *
 * Burada yalnız saf funksiyalar var (nə DOM, nə baza, nə node modulu):
 * `api/` də, `src/` də eyni faylı gətirir. Əvvəl qatlama
 * `src/services/location.js`-də, telefon normallaşdırması isə
 * `lib/hesab.js`-də idi — bazar axtarışı və sifariş yoxlaması hər ikisini
 * istəyəndə ya kod təkrarlanacaqdı, ya da klient `node:crypto` gətirən
 * modulu yükləyəcəkdi. Hər iki modul indi buradan RE-EXPORT edir — köhnə
 * import yolları sınmır.
 */

/**
 * AZ hərflərini ASCII-yə qatlayır: "Gəncə" → "gence", "Şəki" → "seki".
 *
 * NİYƏ: fermerin klaviaturasında ə/ş/ğ/ı hərfi olmaya bilər, ya da tələsib
 * aksentsiz yazır. Qatlama HƏR İKİ tərəfə tətbiq olunur, ona görə "Gence"
 * yazanda "Gəncə" tapılır — və əksinə. Uzunluq QORUNUR (hər hərf bir
 * hərfə keçir), ona görə tapılan parçanın indeksləri orijinal mətndə də
 * keçərlidir (bax: vurğulama).
 */
const QATLAMA = {
  ə: "e",
  ş: "s",
  ç: "c",
  ğ: "g",
  ı: "i",
  i: "i",
  ö: "o",
  ü: "u",
  İ: "i",
  I: "i",
};

export function normalizeAz(text) {
  return String(text ?? "")
    .trim()
    .toLocaleLowerCase("az")
    .replace(/[əşçğıiöüİI]/gu, (herf) => QATLAMA[herf] ?? herf);
}

/**
 * Telefonu +994XXXXXXXXX formasına salır.
 * Qəbul edilən yazılışlar: +994501234567, 994501234567, 0501234567, 501234567.
 * @returns {string|null} yararsızdırsa null
 */
export function telefonNormallasdir(giris) {
  const reqemler = String(giris ?? "").replace(/[^\d+]/g, "");
  let quyruq = null;
  if (/^\+994\d{9}$/.test(reqemler)) quyruq = reqemler.slice(4);
  else if (/^994\d{9}$/.test(reqemler)) quyruq = reqemler.slice(3);
  else if (/^0\d{9}$/.test(reqemler)) quyruq = reqemler.slice(1);
  else if (/^\d{9}$/.test(reqemler)) quyruq = reqemler;
  if (!quyruq) return null;
  return `+994${quyruq}`;
}
