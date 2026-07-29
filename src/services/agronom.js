import { fetchForecast, summarizeForecast } from "./weather.js";
import { FARM } from "./farm.js";

/**
 * Aqronom köməkçisinə sual göndərir. Hava xülasəsi keşdən götürülür —
 * alınmasa sual havasız gedir (çat hava olmadan da işləməlidir).
 *
 * Qeyd: /api/agronom yalnız Vercel-də mövcuddur; `npm run dev` onu vermir.
 */
export async function askAgronomist({ messages, bitkiKey, location, lang, signal }) {
  let hava = null;
  try {
    const { data } = await fetchForecast({
      lat: location.lat,
      lon: location.lon,
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
      ndvi: FARM.ndvi,
      dil: lang,
    }),
  });

  if (!response.ok) {
    throw new Error(`agronom ${response.status}`);
  }

  const data = await response.json();
  if (!data.cavab) {
    throw new Error("agronom boş cavab");
  }

  return { answer: data.cavab, referral: Boolean(data.aqronomTeklif) };
}
