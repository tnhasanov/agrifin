import { lazy, Suspense, useEffect, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { fetchSaheSekli } from "../../services/ndvi.js";

// Leaflet ~150 kB-dır və yalnız sahə çəkilibsə lazımdır — əsas paketə düşmür
const XeriteQati = lazy(() =>
  import("./XeriteQati.jsx").then((m) => ({ default: m.XeriteQati })),
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
const QATLAR = [
  { id: "bitki", ikon: "Sprout", etiket: "ndvi.layer.bitki" },
  { id: "nemlik", ikon: "Droplets", etiket: "ndvi.layer.nemlik" },
];

const LEYENDLER = {
  bitki: [
    { reng: "#8C6642", acar: "ndvi.legend.bare" },
    { reng: "#E8D959", acar: "ndvi.legend.sparse" },
    { reng: "#9ECC54", acar: "ndvi.legend.medium" },
    { reng: "#17662B", acar: "ndvi.legend.dense" },
  ],
  nemlik: [
    { reng: "#A9714B", acar: "ndvi.moist.veryDry" },
    { reng: "#E8D973", acar: "ndvi.moist.dry" },
    { reng: "#8CC7CA", acar: "ndvi.moist.ok" },
    { reng: "#1F5FA8", acar: "ndvi.moist.wet" },
  ],
};

export function SaheXeritesi({ sahe }) {
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
  const leyend = LEYENDLER[aktiv] ?? [];

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
        className="overflow-hidden rounded-2xl"
        style={{ backgroundColor: "#EDF1EA", border: `1px solid ${C.line}` }}
      >
        {hal === "hazir" ? (
          <Suspense fallback={<div style={{ height: 260 }} />}>
            <XeriteQati
              noqteler={noqteler}
              sekil={netice.sekil}
              sinirler={netice.sinirler}
              etiket={t(`ndvi.mapAlt.${aktiv}`)}
            />
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
      <div className="mt-2 flex gap-1.5">
        {QATLAR.map((qat) => {
          const secili = qat.id === aktiv;
          return (
            <button
              key={qat.id}
              type="button"
              onClick={() => yenile(() => ({ aktiv: qat.id }))}
              aria-pressed={secili}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
              style={{
                backgroundColor: secili ? C.pine : C.card,
                color: secili ? "#fff" : C.ink,
                border: `1px solid ${secili ? C.pine : C.line}`,
              }}
            >
              <Icon name={qat.ikon} size={13} color={secili ? C.gold : C.muted} />
              {t(qat.etiket)}
            </button>
          );
        })}
      </div>

      {hal === "hazir" && (
        <>
          {leyend.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              {leyend.map((p) => (
                <span key={p.acar} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: p.reng }}
                  />
                  <span style={{ color: C.muted, fontSize: 10 }}>{t(p.acar)}</span>
                </span>
              ))}
            </div>
          )}
          <p
            className="mt-1.5 px-0.5"
            style={{ color: C.muted, fontSize: 10, fontFamily: font.body }}
          >
            {t(`ndvi.mapNote.${aktiv}`)}
          </p>
        </>
      )}
    </div>
  );
}
