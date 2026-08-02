import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { fetchSaheSekli } from "../../services/ndvi.js";

/**
 * Sahənin NDVI xəritəsi.
 *
 * Orta rəqəm problemin OLDUĞUNU deyir, xəritə isə HARADA olduğunu. Fermer
 * öz sahəsini tanıyır: quru künc, susuz zolaq, zəif tala onun üçün tanış
 * yerlərdir. Rəqəm bunu heç vaxt verə bilmir.
 *
 * Şəkil ağırdır (~50–150 kB), ona görə yalnız sahə çəkiləndə yüklənir və
 * ayrıca keşlənir.
 */
const LEYEND = [
  { reng: "#8C6642", acar: "ndvi.legend.bare" },
  { reng: "#E8D959", acar: "ndvi.legend.sparse" },
  { reng: "#9ECC54", acar: "ndvi.legend.medium" },
  { reng: "#17662B", acar: "ndvi.legend.dense" },
];

export function SaheXeritesi({ sahe }) {
  const { t } = useI18n();
  const [hal, setHal] = useState("yuklenir");
  const [netice, setNetice] = useState(null);
  const noqteler = sahe?.noqteler;
  const acar = noqteler ? JSON.stringify(noqteler) : "";

  useEffect(() => {
    if (!noqteler || noqteler.length < 3) return undefined;

    const controller = new AbortController();
    fetchSaheSekli({ noqteler, signal: controller.signal })
      .then((cavab) => {
        setNetice(cavab);
        setHal(cavab?.sekil ? "hazir" : "xeta");
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setHal(error?.status === 501 ? "qurulmayib" : "xeta");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acar]);

  if (!noqteler || noqteler.length < 3) return null;
  // Xəritə bəzəkdir, əsas məlumat deyil: alınmasa sükutla gizlənir və
  // fermerə əlavə xəta mesajı göstərilmir (statusu yuxarıdaki zolaq deyir)
  if (hal === "xeta" || hal === "qurulmayib") return null;

  return (
    <div className="mt-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.muted }}>
        <Icon name="Satellite" size={13} color={C.field} />
        {t("ndvi.mapTitle")}
      </p>

      <div
        className="overflow-hidden rounded-2xl"
        style={{ backgroundColor: "#EDF1EA", border: `1px solid ${C.line}` }}
      >
        {hal === "yuklenir" ? (
          <div className="flex h-40 items-center justify-center gap-2">
            <Icon name="LoaderCircle" size={14} color={C.muted} />
            <span className="text-xs" style={{ color: C.muted }}>
              {t("ndvi.mapLoading")}
            </span>
          </div>
        ) : (
          <img
            src={netice.sekil}
            width={netice.en}
            height={netice.hundurluk}
            alt={t("ndvi.mapAlt")}
            className="block w-full"
            style={{
              // Piksellər 10 m-dir; hamarlamaq olmayan detalı uydurur
              imageRendering: "pixelated",
              maxHeight: 260,
              objectFit: "contain",
              backgroundColor: "#EDF1EA",
            }}
          />
        )}
      </div>

      {hal === "hazir" && (
        <>
          <div className="mt-2 flex items-center gap-2">
            {LEYEND.map((p) => (
              <span key={p.acar} className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: p.reng }}
                />
                <span style={{ color: C.muted, fontSize: 10 }}>{t(p.acar)}</span>
              </span>
            ))}
          </div>
          <p className="mt-1.5 px-0.5" style={{ color: C.muted, fontSize: 10, fontFamily: font.body }}>
            {t("ndvi.mapNote")}
          </p>
        </>
      )}
    </div>
  );
}
