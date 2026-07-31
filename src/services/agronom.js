import { fetchForecast, summarizeForecast } from "./weather.js";
import { FARM } from "./farm.js";
import { havaNoqtesi } from "./saheYeri.js";

/**
 * Server NDJSON axını göndərir: hər sətir bir hadisə.
 *   {t:"delta",   v:"mətn parçası"}         — mövcud cavaba əlavə et
 *   {t:"replace", v:"mətn", aqronomTeklif}  — göstərilən hər şeyi ləğv et, bunu göstər
 *   {t:"done",    aqronomTeklif}            — cavab tamamlandı
 *   {t:"error"}                             — axın ortasında xəta
 *
 * `replace` doza qoruyucusu üçündür: qadağan olunmuş məzmun aşkarlananda
 * artıq göstərilmiş mətn ekrandan silinməlidir.
 */
function hadiseleriIsle(setir, vəziyyət, onDelta) {
  const xam = setir.trim();
  if (!xam) return;

  let hadise;
  try {
    hadise = JSON.parse(xam);
  } catch {
    return; // yarımçıq və ya zədələnmiş sətri buraxırıq
  }

  if (hadise.t === "delta") {
    vəziyyət.answer += hadise.v ?? "";
    onDelta?.(vəziyyət.answer);
  } else if (hadise.t === "replace") {
    vəziyyət.answer = hadise.v ?? "";
    vəziyyət.referral = Boolean(hadise.aqronomTeklif);
    vəziyyət.replaced = true;
    onDelta?.(vəziyyət.answer);
  } else if (hadise.t === "done") {
    vəziyyət.referral = Boolean(hadise.aqronomTeklif);
  } else if (hadise.t === "error") {
    vəziyyət.xeta = true;
  }
}

/**
 * Aqronom köməkçisinə sual göndərir və cavabı axınla oxuyur.
 * `onDelta(tamMetn)` hər yeni parçada çağırılır — ekranda dərhal göstərmək üçün.
 *
 * Hava xülasəsi keşdən götürülür; alınmasa sual havasız gedir.
 * Qeyd: /api/agronom yalnız Vercel-də mövcuddur, `npm run dev`-də deyil.
 */
export async function askAgronomist({
  messages,
  bitkiKey,
  location,
  sahe,
  lang,
  signal,
  onDelta,
}) {
  // Sahə çəkilibsə hava ONUN koordinatı üçün alınır, rayon mərkəzi üçün yox
  const noqte = havaNoqtesi({ location, sahe });

  let hava = null;
  try {
    const { data } = await fetchForecast({
      lat: noqte.lat,
      lon: noqte.lon,
      days: 7,
      signal,
    });
    hava = summarizeForecast(data.daily);
  } catch {
    // hava olmadan davam edirik
  }

  const response = await fetch("/api/agronom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      messages,
      bitkiKey: bitkiKey || undefined,
      rayon: location.name,
      ay: new Date().getMonth() + 1,
      hava,
      // Modelə sahənin ölçüsü lazımdır: 0.5 ha ilə 12 ha üçün "sahəni yoxlayın"
      // tövsiyəsinin praktiki mənası tamam fərqlidir
      sahe: sahe?.hektar ? { hektar: sahe.hektar } : undefined,
      havaDeqiq: noqte.deqiq,
      ndvi: FARM.ndvi,
      dil: lang,
    }),
  });

  // Status kodu saxlanılır ki, istifadəçiyə səbəbə uyğun mesaj göstərilsin
  if (!response.ok) {
    const error = new Error(`agronom ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const vəziyyət = { answer: "", referral: false, replaced: false, xeta: false };

  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bufer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bufer += decoder.decode(value, { stream: true });
      const setirler = bufer.split("\n");
      // Son element yarımçıq ola bilər — növbəti oxumaya saxlayırıq
      bufer = setirler.pop() ?? "";
      for (const setir of setirler) hadiseleriIsle(setir, vəziyyət, onDelta);
    }
    bufer += decoder.decode();
    hadiseleriIsle(bufer, vəziyyət, onDelta);
  } else {
    // Axın dəstəyi olmayan köhnə brauzerlər: hamısını bir dəfəyə oxuyuruq.
    // Cavab yenə düzgündür, sadəcə tədricən görünmür.
    const metn = await response.text();
    for (const setir of metn.split("\n")) hadiseleriIsle(setir, vəziyyət, onDelta);
  }

  if (vəziyyət.xeta || !vəziyyət.answer) {
    throw new Error("agronom boş cavab");
  }

  return { answer: vəziyyət.answer, referral: vəziyyət.referral };
}
