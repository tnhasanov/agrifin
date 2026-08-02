import { useEffect, useState } from "react";
import { fetchQonsu, qonsuMuqayisesi, saheAcari } from "../../services/ndvi.js";

const BOS = { hal: "yoxdur", muqayise: null };

/**
 * Sahəni ətrafdakı əkinlərlə müqayisə edir.
 *
 * Sorğu yalnız sahənin ÖZ ölçməsi hazır olduqdan sonra gedir: müqayisə
 * ediləcək rəqəm yoxdursa ətrafı soruşmağın mənası yoxdur və emal kvotası
 * boş yerə xərclənir.
 */
export function useQonsu(sahe, xulase) {
  const [veziyyet, setVeziyyet] = useState(BOS);
  const varmi = Boolean(sahe?.noqteler?.length && Number.isFinite(xulase?.ndvi));
  const acar = varmi ? `${saheAcari(sahe.noqteler)}|${xulase.tarix}` : null;

  useEffect(() => {
    if (!varmi) return undefined;
    const controller = new AbortController();

    fetchQonsu({ noqteler: sahe.noqteler, son: xulase.tarix, signal: controller.signal })
      .then((qonsu) => {
        const muqayise = qonsuMuqayisesi(xulase.ndvi, qonsu);
        // Ətrafda kifayət qədər əkin yoxdursa "xəta" demirik — sadəcə
        // göstərmirik; bu, dağlıq və ya şəhər ətrafı üçün normaldır
        setVeziyyet({ acar, hal: muqayise ? "hazir" : "yoxdur", muqayise });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setVeziyyet({ acar, hal: "xeta", muqayise: null });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acar, varmi]);

  if (!varmi) return BOS;
  // Vəziyyəti effektin içində sıfırlamırıq — açarla müqayisə edilir
  return veziyyet.acar === acar ? veziyyet : { ...BOS, hal: "yuklenir" };
}
