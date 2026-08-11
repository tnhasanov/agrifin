/**
 * Saatlıq proqnozun oxunaqlı hissəsi.
 *
 * Niyə lazımdır: fermerin sualı çox vaxt "sabah necədir" deyil, "NEÇƏDƏ"-dir.
 * Şaxta gecə 4-də vurur və 8-də qalxır; külək günortadan sonra qalxır; yağış
 * axşam başlayır. Günlük bir rəqəm bu qərarların heç birini vermir.
 *
 * 24 sətir telefonda oxunmur, ona görə 3 saatlıq addımla göstərilir — çiləmə
 * və suvarma qərarları üçün bu dəqiqlik kifayətdir.
 */

export const ADDIM_SAAT = 3;

/** Bir günün saatlıq sətirləri. Gün ISO tarixlə seçilir (yerli vaxt zonası). */
export function gununSaatlari(hourly, gunISO, { addim = ADDIM_SAAT } = {}) {
  const vaxtlar = hourly?.time;
  if (!Array.isArray(vaxtlar) || !gunISO) return [];

  const setirler = [];
  for (let i = 0; i < vaxtlar.length; i += 1) {
    const vaxt = String(vaxtlar[i]);
    if (!vaxt.startsWith(gunISO)) continue;

    const saat = Number(vaxt.slice(11, 13));
    if (!Number.isFinite(saat) || saat % addim !== 0) continue;

    setirler.push({
      saat,
      temp: reqem(hourly.temperature_2m?.[i]),
      yagis: hourly.precipitation?.[i] ?? null,
      ehtimal: reqem(hourly.precipitation_probability?.[i]),
      kulek: reqem(hourly.wind_speed_10m?.[i]),
      gulek: reqem(hourly.wind_gusts_10m?.[i]),
      rutubet: reqem(hourly.relative_humidity_2m?.[i]),
      torpaq: hourly.soil_temperature_6cm?.[i] ?? null,
    });
  }
  return setirler;
}

const reqem = (deyer) => (Number.isFinite(deyer) ? Math.round(deyer) : null);

/**
 * Günün ən soyuq saatı — şaxta xəbərdarlığını "sabah" yox, "sabah 04:00"
 * edir. Fermer örtük atmaq və ya tüstülətmək üçün saatı bilməlidir.
 */
export function enSoyuqSaat(setirler) {
  const uygun = (setirler ?? []).filter((s) => Number.isFinite(s.temp));
  if (uygun.length === 0) return null;
  return uygun.reduce((min, s) => (s.temp < min.temp ? s : min));
}

/** Torpaq temperaturu: günün orta göstəricisi — səpin qərarı üçün */
export function torpaqOrtasi(setirler) {
  const deyerler = (setirler ?? []).map((s) => s.torpaq).filter(Number.isFinite);
  if (deyerler.length === 0) return null;
  return Math.round((deyerler.reduce((c, d) => c + d, 0) / deyerler.length) * 10) / 10;
}
