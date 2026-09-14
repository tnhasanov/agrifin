import { useCallback, useEffect, useRef, useState } from "react";
import {
  maliyyeBagla as apiMaliyyeBagla,
  sifarisLegv as apiSifarisLegv,
  sifarisYarat as apiSifarisYarat,
  sifarisleriYukle,
} from "../../services/bazar.js";

/**
 * MODUL BU QURAŞDIRMADA YOXDUR — iki fərqli cavab, eyni məna (bax:
 * features/loan/useKreditVeziyyeti.js): 501 baza qurulmayıb, 404 marşrut
 * yoxdur (`npm run dev` /api/* vermir).
 */
const QURULMAYIB = new Set([404, 501]);
const YUKLENMEYIB = Symbol("yuklenmeyib");

function xetaHali(xeta) {
  if (xeta?.status === 401) return "girisYox";
  if (QURULMAYIB.has(xeta?.status)) return "qurulmayib";
  // 503 sxemYoxdur: baza var, cədvəl yoxdur — miqrasiya işlədilməyib
  // (bax: api/bazar.js → sxemCavabi). Bunu ümumi "xəta" saymaq yanlış
  // istiqamət verir: nə şəbəkə, nə server sınıb — sxem tətbiq olunmayıb.
  // Kredit tərəfi eyni ayrımı edir (features/loan/useKreditVeziyyeti.js).
  if (xeta?.acar === "sxemYoxdur") return "sxemYoxdur";
  return "xeta";
}

function xetaniQeydEt(xeta) {
  if (xeta?.status === 401) return;
  if (xeta?.status) console.warn(`[bazar] /api/bazar → HTTP ${xeta.status}`);
  else console.warn("[bazar] /api/bazar — şəbəkə sorğusu alınmadı");
}

/**
 * SERVER sifarişləri — kredit vəziyyəti ilə eyni naxış: burada yalnız
 * serverin SURƏTİ və yükləmə/xəta halı var; yazma əməlləri serverin
 * qaytardığı sifarişi siyahıya qoyur, yerli təxmin yoxdur.
 *
 * `aktiv` false ikən heç nə gətirilmir: sifarişlər yalnız Bazar tabında
 * lazımdır, ona görə tətbiqin açılışına əlavə sorğu qoyulmur. Bir dəfə
 * gətiriləndən sonra siyahı qalır (tab dəyişəndə yenidən yüklənmir).
 *
 * Hallar: "gozleyir" | "yuklenir" | "girisYox" | "qurulmayib" | "xeta" | "hazir"
 */
export function useSifarisler({ telefon = null, aktiv = false } = {}) {
  const [hal, setHal] = useState("gozleyir");
  const [sifarisler, setSifarisler] = useState([]);
  const [gedir, setGedir] = useState(false);
  const abortRef = useRef(null);
  // Telefon dəyişəndə (giriş/çıxış) siyahı yenidən gətirilir
  const yuklenenTelefonRef = useRef(YUKLENMEYIB);

  const yukle = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setHal("yuklenir");
    try {
      const cavab = await sifarisleriYukle({ signal: controller.signal });
      setSifarisler(cavab.sifarisler ?? []);
      setHal("hazir");
    } catch (xeta) {
      if (xeta?.name === "AbortError") return;
      xetaniQeydEt(xeta);
      // Giriş yoxdursa köhnə siyahı qalmamalıdır — başqa hesabın sifarişi görünməsin
      if (xeta?.status === 401) setSifarisler([]);
      setHal(xetaHali(xeta));
    }
  }, []);

  useEffect(() => {
    if (!aktiv) return undefined;
    if (yuklenenTelefonRef.current === telefon) return undefined;
    yuklenenTelefonRef.current = telefon;
    let bitdi = false;
    yukle().finally(() => {
      bitdi = true;
    });
    return () => {
      abortRef.current?.abort();
      // React StrictMode development-da effekti dərhal dayandırıb yenidən
      // başladır. Sorğu tamamlanmayıbsa açarı geri aç ki, ikinci effekt
      // həqiqi sorğunu başlatsın; tamamlanıbsa tab dəyişəndə keş saxlanır.
      if (!bitdi && yuklenenTelefonRef.current === telefon) {
        yuklenenTelefonRef.current = YUKLENMEYIB;
      }
    };
  }, [aktiv, telefon, yukle]);

  /** Serverin qaytardığı sifarişi siyahıda yeniləyir/əlavə edir */
  const sifarisiQoy = useCallback((sifaris) => {
    if (!sifaris) return;
    setSifarisler((movcud) => {
      const var_ = movcud.some((s) => s.id === sifaris.id);
      return var_ ? movcud.map((s) => (s.id === sifaris.id ? sifaris : s)) : [sifaris, ...movcud];
    });
    setHal("hazir");
  }, []);

  const emelEt = useCallback(
    async (isle) => {
      setGedir(true);
      try {
        const cavab = await isle();
        sifarisiQoy(cavab.sifaris);
        return { ok: true, sifaris: cavab.sifaris, tekrar: Boolean(cavab.tekrar) };
      } catch (xeta) {
        if (xeta?.status === 401) {
          setHal("girisYox");
          return { ok: false, acar: "girisLazim" };
        }
        return { ok: false, acar: xeta?.acar ?? "xeta", melumat: xeta?.melumat ?? null, status: xeta?.status };
      } finally {
        setGedir(false);
      }
    },
    [sifarisiQoy],
  );

  return {
    hal,
    gedir,
    sifarisler,
    yenile: yukle,
    sifarisiQoy,
    sifarisYarat: (giris) => emelEt(() => apiSifarisYarat(giris)),
    legvEt: (sifarisId) => emelEt(() => apiSifarisLegv(sifarisId)),
    maliyyeBagla: (sifarisId, muracietId) => emelEt(() => apiMaliyyeBagla({ sifarisId, muracietId })),
  };
}
