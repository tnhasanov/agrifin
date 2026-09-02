import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { formatNumber } from "../../lib/format.js";
import { ortukFaizi } from "../../services/ndvi.js";

const PILLE_RENGI = {
  ust: C.field,
  yuxari: C.field,
  asagi: C.goldDeep,
  alt: C.danger,
};

/**
 * Paylanma zolağı: ətrafdakı əkinlərin orta yarısı (p25–p75) qutu kimi,
 * median xətt kimi, fermerin sahəsi isə nöqtə kimi göstərilir.
 *
 * Miqyas sabit deyil, məlumatdan çıxarılır: bütün NDVI aralığını (0–1)
 * göstərsək qutu 2–3 piksel enində qalar və heç nə görünməz.
 */
function Zolaq({ p25, medyan, p75, ndvi, reng }) {
  const hamisi = [p25, p75, ndvi];
  const asagi = Math.min(...hamisi);
  const yuxari = Math.max(...hamisi);
  const bosluq = Math.max(0.06, (yuxari - asagi) * 0.35);
  const bas = asagi - bosluq;
  const en = yuxari + bosluq - bas;
  const faiz = (deyer) => `${(((deyer - bas) / en) * 100).toFixed(1)}%`;

  return (
    <div className="relative mt-3 mb-1" style={{ height: 26 }}>
      <div
        className="absolute rounded-full"
        style={{ left: 0, right: 0, top: 9, height: 8, backgroundColor: C.mist }}
      />
      {/* Qonşuların orta yarısı. Rəng C.line-dan tünddür: zolağın fonu ilə
          fərqi az olsa qutu ümumiyyətlə görünmür (ekranda yoxlanılıb). */}
      <div
        className="absolute rounded-full"
        style={{
          left: faiz(p25),
          width: `${(((p75 - p25) / en) * 100).toFixed(1)}%`,
          top: 9,
          height: 8,
          backgroundColor: "#C7D2C3",
        }}
      />
      {/* Median */}
      <div
        className="absolute"
        style={{ left: faiz(medyan), top: 5, width: 2, height: 16, backgroundColor: C.muted }}
      />
      {/* Fermerin sahəsi */}
      <div
        className="absolute rounded-full"
        style={{
          left: faiz(ndvi),
          top: 4,
          width: 18,
          height: 18,
          marginLeft: -9,
          backgroundColor: reng,
          border: "2px solid #fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

export function QonsuMuqayisesi({ qonsu, ndvi, illik }) {
  const { t, lang } = useI18n();

  // Müqayisə bəzəkdir, məlumat deyil: alınmasa səssizcə buraxılır
  if (qonsu.hal !== "hazir" || !Number.isFinite(ndvi)) return null;

  const { pille, p25, medyan, p75 } = qonsu.muqayise;
  const reng = PILLE_RENGI[pille] ?? C.muted;
  // Bütün rəqəmlər eyni ölçüdədir: örtük faizi. Əvvəl başlıqda "+9%" (medianla
  // NİSBİ fərq) dururdu, altında isə 0,68 və 0,58 — üç fərqli miqyas bir
  // kartda. İndi başlıqda rəqəm yoxdur (cümlə vəziyyəti deyir), alt sətir isə
  // sahəni medianla yanaşı qoyur — fərqi fermer özü görür. Öz faizini burada
  // təkrar etmirik: eyni "68%" yuxarıdakı xanada onsuz da var.
  const seninFaiz = ortukFaizi(ndvi);

  return (
    <div
      className="giris mt-3 rounded-2xl p-3"
      style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
    >
      <div className="flex items-center gap-2">
        <Icon name="BarChart3" size={16} color={reng} />
        <h3 className="flex-1 text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
          {t(`qonsu.pille.${pille}`)}
        </h3>
      </div>

      <Zolaq p25={p25} medyan={medyan} p75={p75} ndvi={ndvi} reng={reng} />

      <div className="flex justify-between text-xs" style={{ color: C.muted }}>
        <span>{t("qonsu.you", { faiz: formatNumber(seninFaiz, lang) })}</span>
        <span>{t("qonsu.median", { faiz: formatNumber(ortukFaizi(medyan), lang) })}</span>
      </div>

      {/* Keçən ilin eyni dövrü — qonşudan da güclü müqayisə: eyni sahə,
          eyni sort, eyni torpaq. Ölçmə alınmasa sətir sadəcə olmur. */}
      {illik && (
        <div
          className="mt-2.5 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: C.mist }}
        >
          <Icon
            name={illik.istiqamet === "pis" ? "ArrowDownLeft" : "ArrowUpRight"}
            size={16}
            color={illik.istiqamet === "pis" ? C.danger : C.field}
          />
          <span className="flex-1 text-xs" style={{ color: C.ink }}>
            {/* Nisbi faiz ("12% yaxşıdır") çıxarıldı: səviyyələr də faizlə
                yazılanda bir cümlədə iki fərqli mənalı faiz qalırdı. İki
                səviyyəni yan-yana qoymaq həm dəqiqdir, həm oxunaqlı. */}
            {t(`qonsu.illik.${illik.istiqamet}`, {
              kecen: formatNumber(ortukFaizi(illik.kecen), lang),
              indi: formatNumber(seninFaiz, lang),
            })}
          </span>
        </div>
      )}

      {/* Nə ilə müqayisə olunduğu açıq yazılır — "qonşu" sözü qeyri-dəqiqdir */}
      <p className="mt-2 text-xs leading-relaxed" style={{ color: C.muted }}>
        {t("qonsu.note")}
      </p>
    </div>
  );
}
