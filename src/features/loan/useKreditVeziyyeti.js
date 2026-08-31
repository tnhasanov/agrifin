import { useCallback, useEffect, useRef, useState } from "react";
import {
  kreditVeziyyeti,
  muracietGonder as apiMuracietGonder,
  muracietLegv as apiMuracietLegv,
  odenisEt as apiOdenisEt,
  teklifQebul as apiTeklifQebul,
} from "../../services/kredit.js";

const BOS = { muraciet: null, qerar: null, teklif: null, kredit: null, hadiseler: [] };

/** Xəta → istifadəçiyə göstərilən hal */
function xetaHali(xeta) {
  if (xeta?.status === 401) return "girisYox";
  if (xeta?.status === 501) return "qurulmayib";
  return "xeta";
}

/**
 * SERVER kredit vəziyyəti — müraciət, qərar, təklif, kredit.
 *
 * ═══ NİYƏ STORE-DA DEYİL ══════════════════════════════════════════════
 * Əvvəl müraciət `state.muraciet` idi, yəni localStorage-da: fermer onu əl
 * ilə dəyişə, cihaz dəyişəndə itirə bilərdi. Maliyyə vəziyyəti serverdədir;
 * burada yalnız onun SURƏTİ və yükləmə/xəta vəziyyəti saxlanılır.
 *
 * Hallar: "yuklenir" | "girisYox" (401) | "qurulmayib" (501) | "xeta" | "hazir"
 */
export function useKreditVeziyyeti(telefon) {
  const [hal, setHal] = useState("yuklenir");
  const [veziyyet, setVeziyyet] = useState(BOS);
  const [gedir, setGedir] = useState(false);
  const [xetaAcari, setXetaAcari] = useState(null);
  const abortRef = useRef(null);

  // Açılışda və giriş/çıxışda vəziyyət gətirilir. setState yalnız cavab
  // gələndə çağırılır — effekt gövdəsində sinxron setState kaskad render
  // yaradır (react-hooks/set-state-in-effect).
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    let atildi = false;

    kreditVeziyyeti({ signal: controller.signal })
      .then((cavab) => {
        if (atildi) return;
        setVeziyyet(cavab);
        setHal("hazir");
        setXetaAcari(null);
      })
      .catch((xeta) => {
        if (atildi || xeta?.name === "AbortError") return;
        setHal(xetaHali(xeta));
      });

    return () => {
      atildi = true;
      controller.abort();
    };
  }, [telefon]);

  /** Xəta düyməsi üçün təkrar cəhd */
  const yenile = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setHal("yuklenir");
    try {
      const cavab = await kreditVeziyyeti({ signal: controller.signal });
      setVeziyyet(cavab);
      setHal("hazir");
      setXetaAcari(null);
    } catch (xeta) {
      if (xeta?.name === "AbortError") return;
      setHal(xetaHali(xeta));
    }
  }, []);

  /** Yazma əməli: nəticə serverin qaytardığı vəziyyətdir — yerli təxmin yox */
  const emelEt = useCallback(async (isle) => {
    setGedir(true);
    setXetaAcari(null);
    try {
      const cavab = await isle();
      setVeziyyet(cavab);
      setHal("hazir");
      return { ok: true };
    } catch (xeta) {
      if (xeta?.status === 401) {
        setHal("girisYox");
        return { ok: false, acar: "girisLazim" };
      }
      const acar = xeta?.acar ?? "xeta";
      setXetaAcari(acar);
      return { ok: false, acar };
    } finally {
      setGedir(false);
    }
  }, []);

  return {
    hal,
    gedir,
    xetaAcari,
    ...veziyyet,
    yenile,
    // Yalnız MƏBLƏĞ göndərilir: müddət, dərəcə, limit və qərar serverdədir
    muracietEt: (mebleg, acar) => emelEt(() => apiMuracietGonder({ mebleg, acar })),
    teklifiQebulEt: (teklifId, acar) => emelEt(() => apiTeklifQebul(teklifId, acar)),
    legvEt: () => emelEt(() => apiMuracietLegv()),
    // Bölgü (əvvəl faiz, sonra əsas) SERVERDƏDİR — burada yalnız məbləğ gedir
    odeEt: (mebleg, acar) => emelEt(() => apiOdenisEt({ mebleg, acar })),
  };
}
