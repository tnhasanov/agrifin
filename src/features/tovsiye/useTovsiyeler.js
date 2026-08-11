import { useEffect, useMemo, useState } from "react";
import { fetchTeqvim } from "../../services/teqvim.js";
import { fetchZona } from "../../services/zona.js";
import { fetchForecast, proqnozIsleyir } from "../../services/weather.js";
import { tovsiyeleriQur } from "../../services/tovsiye.js";
import { saheAcari } from "../../services/ndvi.js";

const BOS = [];

/**
 * Tövsiyələr — üç mənbənin birləşməsi: bitki təqvimi, hava proqnozu və
 * sahənin kvadrant ölçməsi.
 *
 * Hər mənbə ayrıca uğursuz ola bilər və bu, qalanını dayandırmır: təqvim
 * gəlməsə də baxış planı verilə bilər, peyk gəlməsə də təqvim işləyir.
 * Ona görə hər biri öz `catch`-i ilə null-a düşür.
 */
export function useTovsiyeler({ sahe, bitki, lat, lon, ay }) {
  const [teqvim, setTeqvim] = useState(null);
  const [zona, setZona] = useState(null);
  const [proqnoz, setProqnoz] = useState(null);

  const saheAcarı = sahe?.noqteler ? saheAcari(sahe.noqteler) : null;
  const teqvimAcarı = bitki ? `${bitki}:${ay}` : null;
  const havaAcarı = `${lat},${lon}`;

  useEffect(() => {
    if (!teqvimAcarı) return undefined;
    const controller = new AbortController();
    fetchTeqvim({ bitki, ay, signal: controller.signal })
      .then((netice) => setTeqvim({ acar: teqvimAcarı, netice }))
      .catch(() => {});
    return () => controller.abort();
  }, [teqvimAcarı, bitki, ay]);

  useEffect(() => {
    if (!saheAcarı) return undefined;
    const controller = new AbortController();
    fetchZona({ noqteler: sahe.noqteler, signal: controller.signal })
      .then((netice) => setZona({ acar: saheAcarı, netice }))
      // Kvadrant ölçməsi bəzəkdir: alınmasa qalan tövsiyələr göstərilir
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saheAcarı]);

  useEffect(() => {
    const controller = new AbortController();
    fetchForecast({ lat, lon, days: 7, signal: controller.signal })
      .then((cavab) => {
        if (proqnozIsleyir(cavab.data)) setProqnoz({ acar: havaAcarı, data: cavab.data });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [havaAcarı, lat, lon]);

  // Açar dəyişəndə köhnə nəticə dərhal düşür (bax: useNdvi)
  const teqvimNetice = teqvim?.acar === teqvimAcarı ? teqvim.netice : null;
  const zonaNetice = zona?.acar === saheAcarı ? zona.netice : null;
  const havaNetice = proqnoz?.acar === havaAcarı ? proqnoz.data : null;

  return useMemo(() => {
    if (!teqvimNetice && !sahe) return BOS;
    return tovsiyeleriQur({
      teqvim: teqvimNetice,
      daily: havaNetice?.daily,
      // Torpaq temperaturu saatlıqdır — səpin qərarı ondan asılıdır
      hourly: havaNetice?.hourly,
      hektar: sahe?.hektar,
      zona: zonaNetice,
    });
  }, [teqvimNetice, zonaNetice, havaNetice, sahe]);
}
