import { useEffect, useState } from "react";
import { fetchNdvi, illikMuqayise, xulase } from "../../services/ndvi.js";

/**
 * Sahənin peyk ölçmələrini gətirir.
 *
 * Vəziyyətlər ayrıca lazımdır, çünki peyk məlumatı hava kimi "həmişə var"
 * deyil: sahə təzə çəkilibsə tarixçə yoxdur, buludlu həftədə ölçmə olmur,
 * inteqrasiya qurulmayıbsa endpoint 501 verir. Hər biri fermerə fərqli
 * cümlə deməlidir — hamısını "xəta" saymaq yanlış olardı.
 *
 *   yoxdur    — sahə çəkilməyib
 *   yuklenir  — sorğu gedir
 *   hazir     — ölçmə var
 *   olcmeYox  — sorğu keçdi, amma heç bir təmiz ölçmə tapılmadı
 *   qurulmayib— peyk açarları yoxdur (501)
 *   xeta      — qalan hallar
 */
const BOS = { hal: "yoxdur", seriya: [], xulase: null, illik: null };

export function useNdvi(sahe) {
  const [veziyyet, setVeziyyet] = useState(BOS);
  const noqteler = sahe?.noqteler;
  const varmi = Array.isArray(noqteler) && noqteler.length >= 3;
  // Kontur dəyişəndə effekt yenidən işə düşsün deyə sadə açar
  const acar = varmi ? JSON.stringify(noqteler) : "";

  useEffect(() => {
    // Sahə yoxdursa state-ə toxunmuruq — nəticə aşağıda birbaşa hesablanır.
    // setState-i effektin içində sinxron çağırmaq artıq render dövrü yaradır.
    if (!varmi) return undefined;

    const controller = new AbortController();

    // Nəticə hansı sahəyə aid olduğunu özü ilə daşıyır — aşağıdaki müqayisə
    // həm "yüklənir" halını verir, həm də sahə dəyişəndə köhnə ölçmənin
    // bir an görünməsinin qarşısını alır.
    fetchNdvi({ noqteler, signal: controller.signal })
      .then(({ seriya, kohne, kecenIl }) => {
        const cari = xulase(seriya);
        setVeziyyet({
          acar,
          hal: seriya.length ? "hazir" : "olcmeYox",
          seriya,
          xulase: cari,
          // Keçən ilin eyni dövrü ilə müqayisə — alınmasa sadəcə null
          illik: illikMuqayise(cari?.ndvi, kecenIl),
          kohne,
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setVeziyyet({
          acar,
          hal: error?.status === 501 ? "qurulmayib" : "xeta",
          seriya: [],
          xulase: null,
          illik: null,
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acar]);

  if (!varmi) return BOS;
  // Saxlanan nəticə başqa sahəyə aiddirsə hələ yüklənirik
  return veziyyet.acar === acar ? veziyyet : { ...BOS, hal: "yuklenir" };
}
