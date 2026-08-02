import { useEffect, useMemo, useState } from "react";
import { fetchForecast, proqnozIsleyir } from "../../services/weather.js";
import { siqnallariQur } from "../../services/siqnal.js";

/**
 * Sahə siqnalları — proqnozu gətirir və peyk xülasəsi ilə birləşdirir.
 *
 * Tətbiqdə YALNIZ bir dəfə (App-də) çağırılır və nəticə aşağı ötürülür:
 * başlıq, əsas ekran və məsləhət ekranı eyni siyahını göstərməlidir, həm də
 * hər biri ayrıca sorğu göndərməməlidir.
 *
 * Proqnoz alınmasa siqnal siyahısı boş qalmır — peykdən gələnlər (suvarma,
 * zəifləmə) havadan asılı olmayan hissəsi ilə yenə hesablanır.
 */
export function useSiqnallar({ lat, lon, xulase, muqayise }) {
  const acar = `${lat},${lon}`;
  const [proqnoz, setProqnoz] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchForecast({ lat, lon, days: 7, signal: controller.signal })
      .then((cavab) => {
        // Naqis cavabda siqnal qurmuruq: yanlış xəbərdarlıq heç bir
        // xəbərdarlıqdan pisdir
        if (proqnozIsleyir(cavab.data)) setProqnoz({ acar, data: cavab.data });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [acar, lat, lon]);

  // Yer dəyişəndə köhnə proqnoz dərhal düşür — effektin içində vəziyyəti
  // sıfırlamaq əvəzinə açarla müqayisə edilir (bax: useNdvi)
  const gecerli = proqnoz?.acar === acar ? proqnoz.data : null;

  return useMemo(
    () => siqnallariQur({ daily: gecerli?.daily, hourly: gecerli?.hourly, xulase, muqayise }),
    [gecerli, xulase, muqayise],
  );
}
