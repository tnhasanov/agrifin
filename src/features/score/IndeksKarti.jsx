import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

const BANT_RENGI = {
  yuksek: "#7FD6A4",
  yaxsi: "#BFE8CF",
  orta: C.gold,
  zeif: "#F0A0A0",
};

/**
 * Məhsuldarlıq indeksi — əsas ekranın qövsünün yerinə.
 *
 * Üç qayda (bax: services/mehsuldarliq.js):
 *   1. Bu, KREDİT BALI DEYİL və elə adlandırılmır — aqronomik indeksdir.
 *   2. Səbəblər görünür: fermer balın haradan gəldiyini açıb baxa bilir.
 *   3. Etibar gizlədilmir: az mövsüm = "ilkin qiymətləndirmə" yazısı.
 *
 * 300-850 aralıqlı FICO görünüşü QƏSDƏN atılıb: o miqyas "kredit balı"
 * deyir. 0-100 + bant adı aqronomik göstərici kimi oxunur.
 */
export function IndeksKarti({ indeksHali }) {
  const { t } = useI18n();
  const [acilib, setAcilib] = useState(false);
  const { hal, indeks, movsumler } = indeksHali;

  if (hal === "yoxdur") return null;

  if (hal !== "hazir" || !indeks) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
        <Icon
          name={hal === "yuklenir" ? "LoaderCircle" : "Info"}
          size={13}
          color="rgba(255,255,255,0.6)"
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.72)" }}>
          {hal === "yuklenir" && t("indeks.yuklenir")}
          {hal === "olcmeYox" && t("indeks.olcmeYox")}
          {hal === "qurulmayib" && t("ndvi.notConfigured")}
          {hal === "xeta" && t("indeks.xeta")}
          {hal === "hazir" && !indeks && t("indeks.olcmeYox")}
        </span>
      </div>
    );
  }

  const reng = BANT_RENGI[indeks.bant] ?? C.gold;
  const olculen = movsumler.filter((m) => Number.isFinite(m.zirve)).length;

  return (
    <div className="mt-2 rounded-2xl px-3 py-3" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
      <button
        type="button"
        onClick={() => setAcilib(!acilib)}
        aria-expanded={acilib}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="flex flex-col items-center" style={{ minWidth: 64 }}>
          <span className="text-2xl font-extrabold text-white" style={{ fontFamily: font.display }}>
            {indeks.bal}
          </span>
          <span className="text-xs font-bold" style={{ color: reng }}>
            {t(`indeks.bant.${indeks.bant}`)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white">{t("indeks.basliq")}</p>
          <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
            {t("indeks.movsum", { say: olculen })}
            {indeks.etibar !== "tam" && ` · ${t("indeks.ilkin")}`}
          </p>
        </div>

        <Icon name={acilib ? "ChevronDown" : "ChevronRight"} size={14} color="rgba(255,255,255,0.6)" />
      </button>

      {acilib && (
        <div className="mt-2.5 border-t pt-2.5" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          {/* BÜTÜN sətirlər görünür, yalnız ən yaxşı/ən pis deyil: cədvəlin
              vədi şəffaflıqdır — fermer hər amilin balını görə bilməlidir.
              Gizli düstur etibar yaratmır, düzəldilə də bilmir. */}
          {indeks.setirler.map((setir) => {
            const nisbet = setir.xal == null ? null : setir.xal / setir.maxXal;
            return (
              <div key={setir.key} className="mb-1 flex items-center gap-1.5 text-xs">
                <Icon
                  name={nisbet == null ? "Info" : nisbet >= 0.75 ? "ArrowUpRight" : nisbet < 0.5 ? "ArrowDownLeft" : "ChevronRight"}
                  size={12}
                  color={nisbet == null ? "rgba(255,255,255,0.4)" : nisbet >= 0.75 ? "#7FD6A4" : nisbet < 0.5 ? "#F0A0A0" : "rgba(255,255,255,0.6)"}
                />
                <span className="flex-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {setir.sebeb ? t(`indeks.sebeb.${setir.sebeb}`) : t("indeks.olculmeyib")}
                </span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>
                  {setir.xal == null ? "—" : `${setir.xal}/${setir.maxXal}`}
                </span>
              </div>
            );
          })}

          {/* Mövsüm zolağı: hər il bir xana — əkilib/yaxşı/boş bir baxışda */}
          <div className="mt-2 flex gap-1">
            {movsumler.map((m) => (
              <div key={m.il} className="flex flex-1 flex-col items-center gap-0.5">
                <div
                  className="h-8 w-full rounded"
                  title={`${m.il}`}
                  style={{
                    backgroundColor:
                      m.zirve == null
                        ? "rgba(255,255,255,0.08)"
                        : m.zirve < 0.35
                          ? "rgba(240,160,160,0.5)"
                          : m.etrafMedyan != null && m.zirve > m.etrafMedyan
                            ? "#60BE86"
                            : "rgba(96,190,134,0.45)",
                  }}
                />
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 9 }}>
                  {String(m.il).slice(2)}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-2" style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, lineHeight: 1.4 }}>
            {t("indeks.izah")}
          </p>
        </div>
      )}
    </div>
  );
}
