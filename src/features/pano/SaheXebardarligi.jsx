import { Card } from "../../components/Card.jsx";
import { Chip } from "../../components/Chip.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { EtibarNisani } from "./EtibarNisani.jsx";

/**
 * Sahə xəbərdarlığı kartı (hal F) — siqnalın "sahə dili"ndə təqdimatı.
 *
 * CİDDİLİK MÜHƏRRİKDƏN GƏLİR və burada yenidən yazılmır: "Yüksək prioritet"
 * çipi YALNIZ mühərrik "tecili" deyəndə görünür (bax: services/siqnal.js).
 * Diqqət səviyyəli aqronomik siqnal "Diqqət" çipi ilə göstərilir — çip
 * səviyyəni ŞİŞİRTMİR.
 *
 * "İndi nə etməli?" addımları yalnız SAHƏYƏ BAXMAQ tələb edən aqronomik
 * siqnallar üçün göstərilir — hava siqnalına (məs. şaxta) "zərərverici
 * izlərini yoxlayın" demək yanlış olardı.
 *
 * Hər iki düymə mövcud dəstəklənən kanala açılır: Aqro çatı (şəkil çəkmə
 * imkanı oradadır) — sahə yoxlamasının qeydə alındığı yeganə kanal budur.
 */
const BAXIS_TELEB_EDEN = new Set(["bitkiZeifleyir", "qonsu", "xesteliyRiski", "suGolu"]);

export function SaheXebardarligi({ siqnal, etibar = null, movsumSayi = null, qonsuFerq = null, onChat }) {
  const { t } = useI18n();
  if (!siqnal) return null;

  const tecilidir = siqnal.ciddilik === "tecili";
  const addimliDir = BAXIS_TELEB_EDEN.has(siqnal.nov);

  return (
    <Card
      className="giris"
      style={{
        marginBottom: 12,
        backgroundColor: C.warnSoft,
        borderColor: tecilidir ? C.danger : C.goldDeep,
      }}
      /* Yalnız TƏCİLİ siqnal assertiv elan olunur. "diqqet" səviyyəli
         tövsiyə (vegetasiya zəifləyir, suvarma) hər ekran açılışında ekran
         oxuyucusunu kəsməməlidir — mühərrik onu təcili saymır. */
      role={tecilidir ? "alert" : "status"}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: C.warnInk, fontFamily: font.display }}>
          {t(siqnal.basliqKey)}
        </p>
        <Chip
          icon="AlertCircle"
          label={t(tecilidir ? "xeberdarliq.prioritet" : "xeberdarliq.diqqet")}
          color={tecilidir ? C.danger : C.goldInk}
          bg={tecilidir ? C.dangerSoft : C.goldSoft}
        />
      </div>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
        {t(siqnal.metnKey, siqnal.vars)}
      </p>

      {/* İkinci sübut sətri (mock 04): rayonla müqayisə — yalnız GERİDƏDİRSƏ.
          Rəqəm müqayisə mühərrikindəndir (median bazalı), uydurma deyil */}
      {Number.isFinite(qonsuFerq) && qonsuFerq < 0 && (
        <p className="mt-1 text-xs font-semibold" style={{ color: C.warnInk }}>
          {t("veg.ferqAlt", { faiz: Math.abs(qonsuFerq) })}
        </p>
      )}

      {addimliDir && (
        <>
          <p className="mt-2.5 text-xs font-bold" style={{ color: C.ink }}>
            {t("xeberdarliq.neEtmeli")}
          </p>
          <ol className="mt-1 space-y-1">
            {["xeberdarliq.addim1", "xeberdarliq.addim2", "xeberdarliq.addim3"].map(
              (acar, sira) => (
                <li key={acar} className="flex items-start gap-2 text-xs" style={{ color: C.muted }}>
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-bold"
                    style={{ backgroundColor: C.mist, color: C.pine, fontSize: 10 }}
                  >
                    {sira + 1}
                  </span>
                  {t(acar)}
                </li>
              ),
            )}
          </ol>
        </>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onChat}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold"
          style={{ backgroundColor: C.pine, color: "#fff", minHeight: 44 }}
        >
          {t(addimliDir ? "xeberdarliq.yoxlama" : "xeberdarliq.aqronom")}
        </button>
        {addimliDir && (
          <button
            type="button"
            onClick={onChat}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold"
            style={{ backgroundColor: C.mist, color: C.pine, minHeight: 44 }}
          >
            {t("xeberdarliq.aqronom")}
          </button>
        )}
      </div>

      {etibar && (
        <div className="mt-2">
          <EtibarNisani etibar={etibar} say={movsumSayi} setir />
        </div>
      )}
    </Card>
  );
}
