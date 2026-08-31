import { Card } from "../components/Card.jsx";
import { Icon } from "../components/Icon.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { Sparkline } from "../components/Sparkline.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { formatDelta, formatNumber } from "../lib/format.js";
import { BUYER_OFFERS, CROP_PRICES, SELL_WINDOW } from "../services/market.js";

export function MarketScreen() {
  const { t, lang } = useI18n();

  return (
    <div className="px-4 pb-4">
      <SectionTitle>{t("market.yourPrices")}</SectionTitle>
      {/* MƏNBƏ ETİKETİ MƏCBURDUR: bu qiymətlər statik nümunədir (bax:
          services/market.js). Real kredit rəqəmləri ilə eyni tətbiqdə
          etiketsiz nümunə göstərmək ikisini bir-birinə qatır. */}
      <p className="-mt-1 mb-2 px-1 text-xs" style={{ color: C.muted }}>
        {t("market.numuneQeyd")}
      </p>
      <Card style={{ padding: "6px 16px" }}>
        {CROP_PRICES.map((crop, index) => {
          const up = crop.change >= 0;
          return (
            <div
              key={crop.id}
              className="giris flex items-center gap-3 py-3"
              style={{
                "--i": index,
                borderBottom: index < CROP_PRICES.length - 1 ? `1px solid ${C.line}` : "none",
              }}
            >
              <div className="flex-1">
                <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
                  {t(crop.nameKey)}
                </h3>
                <p
                  className="text-xs font-semibold"
                  style={{ color: up ? C.field : C.danger }}
                >
                  {t("market.thisWeek", { change: formatDelta(crop.change) })}
                </p>
              </div>
              <Sparkline points={crop.points} up={up} />
              <p className="w-20 text-right text-sm font-bold" style={{ color: C.ink }}>
                {formatNumber(crop.price, lang)} ₼
                <span className="text-xs font-medium" style={{ color: C.muted }}>
                  {t("market.perTon")}
                </span>
              </p>
            </div>
          );
        })}
      </Card>

      <SectionTitle>{t("market.forecastTitle")}</SectionTitle>
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Icon name="TrendingUp" size={16} color={C.field} />
          <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {t(SELL_WINDOW.headlineKey)}
          </h3>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          {t(SELL_WINDOW.bodyKey)}
        </p>
        {/* "Forvard müqaviləsi yarat" ARXASINDA AXIN YOXDUR: alıcı, şərt
            sənədi, imza və icra izləməsi qurulmayıb. İşləməyən düymə fermerə
            olmayan bir imkanı vəd edir — vəziyyət açıq yazılır. */}
        <p
          className="mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed"
          style={{ backgroundColor: C.mist, color: C.muted }}
        >
          {t("market.forvardHazirDeyil")}
        </p>
      </Card>

      <SectionTitle>{t("market.buyers")}</SectionTitle>
      {BUYER_OFFERS.map((offer, index) => (
        <Card key={offer.id} className="giris" style={{ "--i": index, marginBottom: 8 }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ backgroundColor: C.mist }}>
              <Icon name="MapPin" size={16} color={C.pine} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {t(offer.nameKey)}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                {t(offer.descKey)} · {t(offer.badgeKey)}
              </p>
            </div>
            <p className="text-sm font-bold" style={{ color: C.field }}>
              {formatNumber(offer.price, lang)} ₼{t("market.perTon")}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
