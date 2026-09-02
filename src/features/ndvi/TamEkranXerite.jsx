import { useEffect } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { QatSecici, Leyend } from "./QatSecici.jsx";
import { XeriteQati } from "./XeriteQati.jsx";

/**
 * Xəritənin tam ekran görünüşü — YAXINLAŞDIRMAQ üçün.
 *
 * Kartdakı xəritə bilərəkdən hərəkətsizdir: 260 piksellik pəncərədə barmaq
 * sürüşdürəndə səhifə deyil, xəritə hərəkət edir və fermer ekranda ilişir.
 * Burada isə xəritədən başqa heç nə yoxdur, ona görə sürüşdürmə və zoom
 * təhlükəsizdir.
 *
 * Sürüşdürmə sahənin ətrafı ilə məhdudlaşır (bax: XeriteQati) — fermer
 * təsadüfən qonşu rayona sürüşüb "mənim sahəm hanı?" deməsin.
 */
export function TamEkranXerite({ noqteler, netice, aktiv, onQat, onBagla }) {
  const { t } = useI18n();

  // Escape ilə bağlanır və arxadakı siyahı sürüşmür
  useEffect(() => {
    const basildi = (hadise) => {
      if (hadise.key === "Escape") onBagla();
    };
    document.addEventListener("keydown", basildi);
    return () => document.removeEventListener("keydown", basildi);
  }, [onBagla]);

  return (
    <div
      // z-50 AZ İDİ: Leaflet öz panellərini 200–1000 arası z-index ilə çəkir və
      // konteyner ayrıca yığın konteksti yaratmır, ona görə kartdakı xəritənin
      // döşəmələri tam ekranın ÜSTÜNDƏ qalırdı (ekranda görünüb).
      className="absolute inset-0 z-[1200] flex flex-col"
      style={{ backgroundColor: C.pineDeep }}
      role="dialog"
      aria-modal="true"
      aria-label={t("ndvi.mapTitle")}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p
          className="flex items-center gap-1.5 text-sm font-bold text-white"
          style={{ fontFamily: font.display }}
        >
          <Icon name="Satellite" size={16} color={C.gold} />
          {t("ndvi.mapTitle")}
        </p>
        <button
          type="button"
          onClick={onBagla}
          aria-label={t("common.close")}
          className="rounded-full p-1.5"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <Icon name="X" size={16} color="#fff" />
        </button>
      </div>

      {/* min-h-0 olmasa flex uşağı öz məzmununa görə böyüyür və xəritə
          ekrandan çıxır */}
      <div className="min-h-0 flex-1 px-3">
        <div className="h-full overflow-hidden rounded-2xl">
          <XeriteQati
            noqteler={noqteler}
            sekil={netice?.sekil}
            sinirler={netice?.sinirler}
            etiket={t(`ndvi.mapAlt.${aktiv}`)}
            hereketli
            hundurluk="100%"
          />
        </div>
      </div>

      <div className="px-3 pt-2 pb-4">
        <QatSecici aktiv={aktiv} onSec={onQat} aciq />
        <div className="mt-2">
          <Leyend qat={aktiv} aciq />
        </div>
        {/* Yaxınlaşdırma DETAL ARTIRMIR — bunu deməsək fermer bulanıq
            xanaları xəritənin qüsuru sayacaq */}
        <p className="mt-2" style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>
          {t("ndvi.mapZoomNote")}
        </p>
      </div>
    </div>
  );
}
