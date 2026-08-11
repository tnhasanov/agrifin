import { useEffect, useState } from "react";
import { fetchRadar, radarXulasesi } from "../../services/radar.js";
import { necheGunEvvel, saheAcari } from "../../services/ndvi.js";

const BOS = { hal: "yoxdur", seriya: [], xulase: null };

/**
 * Optik ölçmə bu qədər gündən köhnədirsə radar çağırılır.
 *
 * Sentinel-2 2–3 gündən bir keçir; 8 gündür təmiz ölçmə yoxdursa səbəb
 * buluddur. Elə bu vaxt radar lazımdır.
 */
export const KOHNE_GUN = 8;

/**
 * Radar YALNIZ optik ölçmə çatmayanda çağırılır — hər fermer üçün daimi
 * ikinci sorğu Copernicus emal kvotasını iki dəfə artırardı, halbuki günəşli
 * həftədə Sentinel-2 onsuz da daha çox şey deyir (bitki örtüyü, nəmlik).
 *
 * @param {object} peyk `useNdvi` nəticəsi
 */
export function radarLazimdir(peyk, indi = Date.now()) {
  if (peyk?.hal === "olcmeYox") return true;
  if (peyk?.hal !== "hazir" || !peyk.xulase?.tarix) return false;
  const gun = necheGunEvvel(peyk.xulase.tarix, indi);
  return Number.isFinite(gun) && gun >= KOHNE_GUN;
}

/**
 * Sentinel-1 radar ölçməsi — buludun arxasından.
 *
 * Hallar `useNdvi` ilə eyni məntiqdədir; fərq odur ki, radar heç vaxt
 * "buludlu" səbəbi ilə boş qayıtmır. Boş qayıdırsa səbəb ya orbit
 * cədvəlidir, ya da xidmətdir.
 */
export function useRadar(sahe, peyk) {
  const [veziyyet, setVeziyyet] = useState(BOS);
  const noqteler = sahe?.noqteler;
  const lazim = Array.isArray(noqteler) && noqteler.length >= 3 && radarLazimdir(peyk);
  const acar = lazim ? saheAcari(noqteler) : "";

  useEffect(() => {
    if (!lazim) return undefined;
    const controller = new AbortController();

    fetchRadar({ noqteler, signal: controller.signal })
      .then((seriya) => {
        setVeziyyet({
          acar,
          hal: seriya?.length ? "hazir" : "olcmeYox",
          seriya: seriya ?? [],
          xulase: radarXulasesi(seriya),
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setVeziyyet({
          acar,
          hal: error?.status === 501 ? "qurulmayib" : "xeta",
          seriya: [],
          xulase: null,
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acar, lazim]);

  if (!lazim) return BOS;
  return veziyyet.acar === acar ? veziyyet : { ...BOS, hal: "yuklenir" };
}
