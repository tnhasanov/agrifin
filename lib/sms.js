// SMS göndərici — dəyişdirilə bilən arxa.
//
// Azərbaycanda SMS çatdırılması yerli şlüz müqaviləsi tələb edir (LSIM və
// oxşarları); Twilio kimi qlobal xidmətlər AZ nömrələrini etibarlı örtmür.
// Ona görə göndərmə ARXAYA ÇIXARILIB:
//
//   SMS_URL qurulubsa   → POST {telefon, metn} həmin ünvana (Bearer: SMS_ACAR)
//   qurulmayıbsa        → kod funksiya loguna yazılır ("log" rejimi)
//
// Log rejimi İNKİŞAF ÜÇÜNDÜR: kodu yalnız Vercel funksiya loglarını görən
// adam oxuya bilər — yəni sistemin sahibi. UI-da kod HEÇ VAXT göstərilmir.
//
// Şlüz müqaviləsi bağlananda yalnız iki env dəyişəni əlavə olunur, kod
// dəyişmir.

export function smsRejimi() {
  return process.env.SMS_URL ? "api" : "log";
}

/** @returns {Promise<{gonderildi: boolean, rejim: string}>} */
export async function smsGonder({ telefon, metn }) {
  if (!process.env.SMS_URL) {
    // Kodun özü logda görünür — bu bilərəkdəndir (bax: fayl başlığı)
    console.log(`[sms:log] ${telefon}: ${metn}`);
    return { gonderildi: true, rejim: "log" };
  }

  const cavab = await fetch(process.env.SMS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SMS_ACAR ? { Authorization: `Bearer ${process.env.SMS_ACAR}` } : {}),
    },
    body: JSON.stringify({ telefon, metn }),
  });

  if (!cavab.ok) {
    console.error(`[sms:api] ${cavab.status} — göndərilmədi`);
    return { gonderildi: false, rejim: "api" };
  }
  return { gonderildi: true, rejim: "api" };
}
