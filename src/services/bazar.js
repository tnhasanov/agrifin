// Bazar API-sinin müştəri tərəfi — nazik fetch örtükləri.
//
// Sifarişlər localStorage-da DEYİL: sahib, tarix, məbləğ və vəziyyət
// serverdədir (bax: api/bazar.js). Səbət isə yerlidir (store.jsx), amma
// yalnız {kod, say} — rəqəmlər kataloqdan hesablanır.
//
// Xəta müqaviləsi services/kredit.js ilə eynidir: {error: "<açar>"} → Error.acar.

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
    xeta.melumat = melumat;
    throw xeta;
  }
  return melumat;
}

/** Bütün sifarişlər: {sifarisler}. 401 → giriş lazımdır. */
export function sifarisleriYukle({ signal } = {}) {
  return sorguGonder("/api/bazar", { signal });
}

/** Bir sifariş, hadisə izi ilə: {sifaris} */
export function sifarisYukle(sifarisId, { signal } = {}) {
  return sorguGonder(`/api/bazar?sifaris=${encodeURIComponent(sifarisId)}`, { signal });
}

/** Yekunlar serverdən — sessiya tələb etmir: {hesab, numune} */
export function sebetHesabla(setirler, { rayonKod = null, signal } = {}) {
  return sorguGonder("/api/bazar", { method: "POST", signal, govde: { emel: "sebet-hesabla", setirler, rayonKod } });
}

/** Oxu-yalnız uyğunluq yoxlaması: {maliyye, hesab} */
export function maliyyeYoxla(setirler, { signal } = {}) {
  return sorguGonder("/api/bazar", { method: "POST", signal, govde: { emel: "maliyye-yoxla", setirler } });
}

/**
 * Sifariş. Serverə yalnız {kod, say}, çatdırılma forması və ödəniş üsulu
 * gedir — qiymət/yekun göndərilmir, server özü hesablayır.
 * `acar` idempotentlik üçündür: şəbəkə itsə təkrar sorğu ikinci sifariş yaratmır.
 */
export function sifarisYarat({ setirler, catdirilma, odenisUsulu, acar }) {
  return sorguGonder("/api/bazar", {
    method: "POST",
    govde: { emel: "sifaris-yarat", setirler, catdirilma, odenisUsulu, acar },
  });
}

export function sifarisLegv(sifarisId) {
  return sorguGonder("/api/bazar", { method: "POST", govde: { emel: "sifaris-legv", sifarisId } });
}

/** Sifarişi kredit müraciətinə bağlayır (hər ikisi istifadəçinindir) */
export function maliyyeBagla({ sifarisId, muracietId }) {
  return sorguGonder("/api/bazar", { method: "POST", govde: { emel: "maliyye-bagla", sifarisId, muracietId } });
}
