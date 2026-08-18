import { useEffect, useState } from "react";
import { fetchTarixce } from "../../services/tarixce.js";
import { mehsuldarliqIndeksi } from "../../../lib/mehsuldarliq.js";
import { saheAcari } from "../../services/ndvi.js";

const BOS = { hal: "yoxdur", indeks: null, movsumler: [] };

/**
 * Məhsuldarlıq indeksi — tarixçəni gətirir və bal cədvəlini tətbiq edir.
 *
 * Cari mövsüm parametri `useNdvi`-dən gəlir: son ölçmə və qonşu medianı
 * onsuz da əldədir, tarixçə sorğusuna salmırıq.
 */
export function useIndeks(sahe, xulase, muqayise) {
  const [veziyyet, setVeziyyet] = useState(BOS);
  const noqteler = sahe?.noqteler;
  const varmi = Array.isArray(noqteler) && noqteler.length >= 3;
  const acar = varmi ? saheAcari(noqteler) : "";

  useEffect(() => {
    if (!varmi) return undefined;
    const controller = new AbortController();

    fetchTarixce({ noqteler, signal: controller.signal })
      .then((movsumler) => {
        setVeziyyet({ acar, hal: movsumler?.length ? "hazir" : "olcmeYox", movsumler: movsumler ?? [] });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setVeziyyet({
          acar,
          hal: error?.status === 501 ? "qurulmayib" : "xeta",
          movsumler: [],
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acar, varmi]);

  if (!varmi) return BOS;
  if (veziyyet.acar !== acar) return { ...BOS, hal: "yuklenir" };

  // İndeks render zamanı hesablanır: cari mövsüm (xulase/muqayise) sonradan
  // gələndə yenidən qurulsun deyə vəziyyətdə saxlanılmır
  const indeks =
    veziyyet.hal === "hazir"
      ? mehsuldarliqIndeksi({
          movsumler: veziyyet.movsumler,
          cari:
            Number.isFinite(xulase?.ndvi) && Number.isFinite(muqayise?.medyan)
              ? { ndvi: xulase.ndvi, etrafMedyan: muqayise.medyan }
              : null,
        })
      : null;

  return { ...veziyyet, indeks };
}
