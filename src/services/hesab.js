// Hesab API-sinin müştəri tərəfi — nazik fetch örtükləri.
//
// Sessiya httpOnly cookie-dədir: JS tokeni görmür, sorğular onu özü daşıyır.
// Ona görə burada heç bir token saxlanmır — "daxil olub?" sualının cavabı
// yalnız serverdən gəlir (hesabVeziyyeti).
//
// Xəta müqaviləsi: server cavabları {error: "<açar>"} formasındadır; örtüklər
// bu açarı Error.acar kimi atır ki, UI düz i18n mesajını göstərsin.

async function sorguGonder(unvan, { method = "GET", govde, signal } = {}) {
  const cavab = await fetch(unvan, {
    method,
    signal,
    headers: govde ? { "Content-Type": "application/json" } : undefined,
    body: govde ? JSON.stringify(govde) : undefined,
  });
  const melumat = await cavab.json().catch(() => ({}));
  if (!cavab.ok) {
    const xeta = new Error(`${unvan} ${cavab.status}`);
    xeta.status = cavab.status;
    xeta.acar = melumat.error;
    throw xeta;
  }
  return melumat;
}

/**
 * Hesab sisteminin vəziyyəti + (varsa) daxil olmuş telefon.
 * Şəbəkə xətasında null — açılışda tətbiqi yıxmamalıdır.
 */
export async function hesabVeziyyeti({ signal } = {}) {
  try {
    return await sorguGonder("/api/hesab", { signal });
  } catch {
    return null;
  }
}

/** OTP istəyir. @returns {{gonderildi, rejim: "api"|"log"}} */
export function kodIste(telefon) {
  return sorguGonder("/api/hesab", { method: "POST", govde: { emel: "kod-iste", telefon } });
}

/** Kodu təsdiqləyir — server cookie qoyur. @returns {{telefon}} */
export function kodTesdiqle(telefon, kod) {
  return sorguGonder("/api/hesab", { method: "POST", govde: { emel: "kod-tesdiq", telefon, kod } });
}

export function hesabdanCix() {
  return sorguGonder("/api/hesab", { method: "POST", govde: { emel: "cix" } });
}

/**
 * Serverdəki sahə + snapshotlar. Daxil olunmayıbsa/qurulmayıbsa null —
 * çağıran üçün bu, "serverdə heç nə yoxdur" deməkdir.
 */
export async function saheYukle({ signal } = {}) {
  try {
    return await sorguGonder("/api/sahe", { signal });
  } catch {
    return null;
  }
}

export function saheGonder({ noqteler, hektar, bitki }) {
  return sorguGonder("/api/sahe", { method: "PUT", govde: { noqteler, hektar, bitki } });
}

export function snapshotGonder(nov, mezmun) {
  return sorguGonder("/api/sahe", { method: "POST", govde: { emel: "snapshot", nov, mezmun } });
}

export function balGonder({ bal, bant, etibar, amiller }) {
  return sorguGonder("/api/sahe", {
    method: "POST",
    govde: { emel: "bal", bal, bant, etibar, amiller },
  });
}
