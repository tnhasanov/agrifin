import { lazy, Suspense, useEffect, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { fetchSaheSekli } from "../../services/ndvi.js";
import { QatSecici, Leyend } from "./QatSecici.jsx";

// Leaflet ~150 kB-dır və yalnız sahə çəkilibsə lazımdır — əsas paketə düşmür
const XeriteQati = lazy(() =>
  import("./XeriteQati.jsx").then((m) => ({ default: m.XeriteQati })),
);
// Tam ekran yalnız fermer "böyüt" düyməsinə basanda gəlir
const TamEkranXerite = lazy(() =>
  import("./TamEkranXerite.jsx").then((m) => ({ default: m.TamEkranXerite })),
);

/**
 * Sahənin peyk xəritəsi — iki ölçmə qatı ilə.
 *
 * Orta rəqəm problemin OLDUĞUNU deyir, xəritə isə HARADA olduğunu. Fermer
 * öz sahəsini tanıyır: quru künc, susuz zolaq, zəif tala onun üçün tanış
 * yerlərdir.
 *
 * İndeks PEYK ŞƏKLİNİN ÜSTÜNƏ çəkilir (bax: XeriteQati). Boz fonda tək
 * duran rəngli ləkə fermerə sahənin harası olduğunu demirdi.
 *
 * Qatlar TƏLƏB OLUNDUQDA yüklənir. İkisini birdən çəkmək Copernicus emal
 * kvotasını iki dəfə xərcləyər, halbuki fermerlərin çoxu birinə baxıb
 * keçəcək. Açılmış qat keşdə qalır — geri qayıdanda sorğu getmir.
 */
export function SaheXeritesi({ sahe, konturRengi }) {
  const { t } = useI18n();
  // Qat başına ayrı nəticə və hal — keçid zamanı köhnə şəkil itməsin.
  // Sahə açarı vəziyyətin İÇİNDƏ saxlanılır: effektin içində sıfırlama
  // setState çağırmaq artıq render dövrü yaradır (bax: useNdvi).
  const [veziyyet, setVeziyyet] = useState({
    acar: "",
    aktiv: "bitki",
    neticeler: {},
    hallar: {},
  });
  const [tamEkran, setTamEkran] = useState(false);

  const noqteler = sahe?.noqteler;
  const acar = noqteler ? JSON.stringify(noqteler) : "";

  // Sahə dəyişibsə köhnə qatlar etibarsızdır — burada, render zamanı
  const cari =
    veziyyet.acar === acar
      ? veziyyet
      : { acar, aktiv: "bitki", neticeler: {}, hallar: {} };
  const { aktiv, neticeler, hallar } = cari;

  const yenile = (funksiya) =>
    setVeziyyet((kohne) => {
      const baza =
        kohne.acar === acar ? kohne : { acar, aktiv: "bitki", neticeler: {}, hallar: {} };
      return { ...baza, ...funksiya(baza) };
    });

  useEffect(() => {
    if (!noqteler || noqteler.length < 3) return undefined;

    const controller = new AbortController();
    const qat = aktiv;

    fetchSaheSekli({ noqteler, qat, signal: controller.signal })
      .then((cavab) => {
        yenile((baza) => ({
          neticeler: { ...baza.neticeler, [qat]: cavab },
          hallar: { ...baza.hallar, [qat]: cavab?.sekil ? "hazir" : "xeta" },
        }));
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        yenile((baza) => ({
          hallar: { ...baza.hallar, [qat]: error?.status === 501 ? "qurulmayib" : "xeta" },
        }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acar, aktiv]);

  if (!noqteler || noqteler.length < 3) return null;
  // Əsas qat alınmayıbsa bütün kart gizlənir: xəritə bəzəkdir, statusu
  // yuxarıdaki peyk zolağı onsuz da deyir
  if (hallar.bitki === "xeta" || hallar.bitki === "qurulmayib") return null;

  // Qeyd yoxdursa sorğu yenicə başlayıb — ayrıca "yuklenir" yazmağa ehtiyac yoxdur
  const hal = hallar[aktiv] ?? "yuklenir";
  const netice = neticeler[aktiv];
  const qatSec = (id) => yenile(() => ({ aktiv: id }));

  return (
    <div className="mt-3">
      <p
        className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: C.muted }}
      >
        <Icon name="Satellite" size={13} color={C.field} />
        {t("ndvi.mapTitle")}
      </p>

      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ backgroundColor: "#EDF1EA", border: `1px solid ${C.line}` }}
      >
        {hal === "hazir" ? (
          <Suspense fallback={<div style={{ height: 260 }} />}>
            <XeriteQati
              noqteler={noqteler}
              sekil={netice.sekil}
              sinirler={netice.sinirler}
              etiket={t(`ndvi.mapAlt.${aktiv}`)}
              konturRengi={konturRengi}
            />
            {/* Peyk skanı: yeni şəkil gələndə üstündən bir dəfə skan xətti
                keçir — "peyk sahəni indi oxudu" anı (bax: index.css).
                key=şəkil: qat dəyişəndə (NDVI→nəmlik) yenidən keçir. */}
            <div key={netice.sekil} className="peyk-skan" aria-hidden="true" />
            {/* Kartdakı xəritə hərəkətsizdir (səhifə sürüşməsi üçün) —
                yaxınlaşdırmaq bu düymə ilə tam ekranda olur */}
            <button
              type="button"
              onClick={() => setTamEkran(true)}
              aria-label={t("ndvi.mapExpand")}
              className="absolute top-2 right-2 z-[500] flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: "rgba(20,53,31,0.82)", color: "#fff" }}
            >
              <Icon name="Maximize2" size={13} color={C.gold} />
              {t("ndvi.mapExpand")}
            </button>
          </Suspense>
        ) : (
          <div className="flex h-40 items-center justify-center gap-2 px-4 text-center">
            <Icon
              name={hal === "yuklenir" ? "LoaderCircle" : "Info"}
              size={14}
              color={C.muted}
            />
            <span className="text-xs" style={{ color: C.muted }}>
              {hal === "yuklenir" ? t("ndvi.mapLoading") : t("ndvi.mapLayerError")}
            </span>
          </div>
        )}
      </div>

      {/* Qat seçicisi xəritənin ALTINDADIR: fermer əvvəl şəkli görür,
          sonra başqa cür baxmaq istəyirsə keçir */}
      <div className="mt-2">
        <QatSecici aktiv={aktiv} onSec={qatSec} />
      </div>

      {hal === "hazir" && (
        <>
          <div className="mt-2">
            <Leyend qat={aktiv} />
          </div>
          <p
            className="mt-1.5 px-0.5"
            style={{ color: C.muted, fontSize: 10, fontFamily: font.body }}
          >
            {t(`ndvi.mapNote.${aktiv}`)}
          </p>
        </>
      )}

      {tamEkran && hal === "hazir" && (
        <Suspense fallback={null}>
          <TamEkranXerite
            noqteler={noqteler}
            netice={netice}
            aktiv={aktiv}
            onQat={qatSec}
            onBagla={() => setTamEkran(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
