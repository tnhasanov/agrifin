// Hesab qatı: telefon + OTP + sessiya. Saf məntiq buradadır, HTTP api/-dədir.
//
// Təhlükəsizlik qərarları:
//   • OTP və sessiya tokeni bazada YALNIZ hash kimi yaşayır — baza sızsa
//     belə nə kod, nə giriş ələ keçmir. Hash-a SESSION_SECRET qatılır
//     (pepper): cədvəlin özü lüğət hücumuna da vermir.
//   • OTP 6 rəqəm, 5 dəqiqə, 5 cəhd, birdəfəlik. Hədlər sabitlərdədir.
//   • Sürət həddi BAZADADIR — serverless instanslar arası paylaşılır.
//     (Əvvəlki instans-daxili limitlərdən fərqli olaraq bu, həqiqidir.)
//   • Sessiya 90 gün: fermer tətbiqi hər gün açmır; kənd şəraitində tez-tez
//     yenidən giriş = itirilmiş istifadəçi. Uzunluq bilərəkdən seçilib.

import { createHash, randomInt, randomBytes } from "node:crypto";
import { sorgu } from "./db.js";

export const OTP_MUDDET_DEQ = 5;
export const OTP_MAX_CEHD = 5;
export const OTP_PENCERE_DEQ = 10;
export const OTP_PENCEREDE_MAX = 3; // telefon başına
export const OTP_IP_MAX = 10; // IP başına
export const SESSIYA_GUN = 90;

export function hesabQurulub() {
  return Boolean(process.env.SESSION_SECRET);
}

function hashla(deyer) {
  return createHash("sha256")
    .update(`${deyer}|${process.env.SESSION_SECRET ?? ""}`)
    .digest("hex");
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

/**
 * OTP yaradır və bazaya yazır.
 * @returns {{kod: string}|{xeta: "hedd"}} kod göndərmə üçün qaytarılır —
 *   ONU HEÇ YERDƏ SAXLAMAYIN, yalnız SMS-ə ötürün
 */
export async function otpYarat({ telefon, ip }) {
  // Sürət həddi: pəncərədə telefon başına N, IP başına M kod
  const [teleSay] = await sorgu(
    `SELECT count(*)::int AS say FROM otp_kodlar
     WHERE telefon=$1 AND yaradilib > now() - interval '${OTP_PENCERE_DEQ} minutes'`,
    [telefon],
  );
  if (teleSay.say >= OTP_PENCEREDE_MAX) return { xeta: "hedd" };
  if (ip) {
    const [ipSay] = await sorgu(
      `SELECT count(*)::int AS say FROM otp_kodlar
       WHERE ip=$1 AND yaradilib > now() - interval '${OTP_PENCERE_DEQ} minutes'`,
      [ip],
    );
    if (ipSay.say >= OTP_IP_MAX) return { xeta: "hedd" };
  }

  const kod = String(randomInt(100000, 1000000));
  await sorgu(
    `INSERT INTO otp_kodlar (telefon, kod_hash, ip, bitir)
     VALUES ($1, $2, $3, now() + interval '${OTP_MUDDET_DEQ} minutes')`,
    [telefon, hashla(`${telefon}|${kod}`), ip ?? null],
  );
  return { kod };
}

/**
 * Kodu yoxlayır; düzgündürsə istifadəçini yaradır/tapır və sessiya açır.
 * @returns {{token, telefon}|{xeta: "yanlis"|"bitib"}}
 */
export async function otpTesdiqle({ telefon, kod }) {
  const [setir] = await sorgu(
    `SELECT id, kod_hash, cehd, istifade_olunub, bitir < now() AS bitib
     FROM otp_kodlar WHERE telefon=$1 ORDER BY yaradilib DESC LIMIT 1`,
    [telefon],
  );
  if (!setir || setir.istifade_olunub || setir.bitib) return { xeta: "bitib" };
  if (setir.cehd >= OTP_MAX_CEHD) return { xeta: "bitib" };

  if (setir.kod_hash !== hashla(`${telefon}|${kod}`)) {
    await sorgu("UPDATE otp_kodlar SET cehd = cehd + 1 WHERE id=$1", [setir.id]);
    return { xeta: "yanlis" };
  }

  await sorgu("UPDATE otp_kodlar SET istifade_olunub=true WHERE id=$1", [setir.id]);

  // İstifadəçi: varsa tap, yoxdursa yarat (telefon UNIQUE)
  await sorgu(
    "INSERT INTO istifadeciler (telefon) VALUES ($1) ON CONFLICT (telefon) DO NOTHING",
    [telefon],
  );
  const [istifadeci] = await sorgu("SELECT id FROM istifadeciler WHERE telefon=$1", [telefon]);

  const token = randomBytes(32).toString("hex");
  await sorgu(
    `INSERT INTO sessiyalar (token_hash, istifadeci_id, bitir)
     VALUES ($1, $2, now() + interval '${SESSIYA_GUN} days')`,
    [hashla(token), istifadeci.id],
  );
  return { token, telefon };
}

/** Tokenlə istifadəçini tapır. @returns {{id, telefon}|null} */
export async function sessiyaOxu(token) {
  if (!token) return null;
  const [setir] = await sorgu(
    `SELECT i.id, i.telefon FROM sessiyalar s
     JOIN istifadeciler i ON i.id = s.istifadeci_id
     WHERE s.token_hash=$1 AND s.bitir > now()`,
    [hashla(token)],
  );
  return setir ?? null;
}

export async function sessiyaBagla(token) {
  if (!token) return;
  await sorgu("DELETE FROM sessiyalar WHERE token_hash=$1", [hashla(token)]);
}

// ── HTTP köməkçiləri: cookie oxu/yaz ────────────────────────────────────
// api/hesab.js və api/sahe.js eyni cookie ilə işləyir — bir yerdə dursun.

export const COOKIE_AD = "agrifin_sessiya";

export function cookieToken(req) {
  const basliq = req.headers?.cookie ?? "";
  for (const hisse of basliq.split(";")) {
    const [ad, ...qalan] = hisse.trim().split("=");
    if (ad === COOKIE_AD) return qalan.join("=") || null;
  }
  return null;
}

/**
 * Sessiya cookie-si: httpOnly (JS oxuya bilmir — XSS token oğurlaya bilmir),
 * SameSite=Lax (yad saytdan POST gəlmir), Secure yalnız https-də (yerli
 * preview http-dir). Silmək üçün Max-Age=0.
 */
export function cookieYaz(res, req, token, { sil = false } = {}) {
  const https = (req.headers?.["x-forwarded-proto"] ?? "") === "https";
  const hisseler = [
    `${COOKIE_AD}=${sil ? "" : token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${sil ? 0 : SESSIYA_GUN * 24 * 60 * 60}`,
  ];
  if (https) hisseler.push("Secure");
  res.setHeader("Set-Cookie", hisseler.join("; "));
}
