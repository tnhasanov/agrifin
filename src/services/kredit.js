// Kredit API-sinin müştəri tərəfi — nazik fetch örtükləri.
//
// Maliyyə vəziyyəti ARTIQ localStorage-da saxlanmır: müraciət, qərar, təklif
// və kredit serverdədir (bax: api/kredit.js). Bu modul yalnız onları gətirir.
// Sessiya httpOnly cookie ilə gedir — token JS-də yoxdur.
//
// Xəta müqaviləsi services/hesab.js ilə eynidir: {error: "<açar>"} → Error.acar.

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

/** Cari vəziyyət: {muraciet, qerar, teklif, kredit}. 401 → giriş lazımdır. */
export function kreditVeziyyeti({ signal } = {}) {
  return sorguGonder("/api/kredit", { signal });
}

/** Müraciət göndərir — məbləğdən başqa heç nə ötürülmür (server hesablayır) */
export function muracietGonder({ mebleg, acar }) {
  return sorguGonder("/api/kredit", { method: "POST", govde: { emel: "muraciet", mebleg, acar } });
}

export function teklifQebul(teklifId, acar) {
  return sorguGonder("/api/kredit", {
    method: "POST",
    govde: { emel: "teklif-qebul", teklifId, acar },
  });
}

export function muracietLegv() {
  return sorguGonder("/api/kredit", { method: "POST", govde: { emel: "legv" } });
}

/**
 * Ödəniş. Serverdə əvvəl faiz borcu, sonra əsas borc bağlanır — klient
 * bölgünü təyin etmir, yalnız məbləği göndərir.
 * `acar` idempotentlik üçündür: şəbəkə itsə təkrar sorğu ikinci dəfə
 * tətbiq olunmur.
 */
export function odenisEt({ mebleg, acar, tam = false }) {
  // `tam: true` — ERKƏN TAM BAĞLANMA: məbləği SERVER hesablayır (yarımçıq
  // dövrün faizi daxil). Klientin göstərdiyi rəqəm həmişə köhnə olardı.
  return sorguGonder("/api/kredit", {
    method: "POST",
    govde: tam ? { emel: "odenis", tam: true, acar } : { emel: "odenis", mebleg, acar },
  });
}

export function tarixceYukle({ signal } = {}) {
  return sorguGonder("/api/kredit?tarixce=1", { signal });
}
