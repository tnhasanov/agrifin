import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/**
 * Rəng ciddilikdən gəlir, məzmun növündən yox: fermer ekrana baxanda
 * əvvəlcə "təcilidir, yoxsa yox" sualına cavab almalıdır.
 */
const CIDDILIK_RENGI = {
  tecili: { fg: C.danger, bg: C.dangerSoft, kenar: "rgba(194,74,63,0.28)" },
  diqqet: { fg: C.goldDeep, bg: C.goldSoft, kenar: "rgba(201,147,43,0.3)" },
  melumat: { fg: "#2C5BC7", bg: C.blueSoft, kenar: "rgba(62,123,250,0.22)" },
};

export function SiqnalKarti({ siqnal, onBagla, onHereket, style, className = "giris" }) {
  const { t } = useI18n();
  const reng = CIDDILIK_RENGI[siqnal.ciddilik] ?? CIDDILIK_RENGI.melumat;

  return (
    <div
      className={`rounded-2xl p-3 ${className}`}
      style={{ backgroundColor: reng.bg, border: `1px solid ${reng.kenar}`, ...style }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 rounded-xl p-2"
          style={{ backgroundColor: "rgba(255,255,255,0.72)" }}
        >
          <Icon name={siqnal.icon} size={16} color={reng.fg} />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-sm font-bold"
              style={{ color: reng.fg, fontFamily: font.display }}
            >
              {t(siqnal.basliqKey)}
            </h3>
            {onBagla && (
              <button
                type="button"
                onClick={() => onBagla(siqnal.id)}
                aria-label={t("siqnal.bagla")}
                // 40px hədəf: barmaq üçün minimum (əvvəl ~21px idi). Mənfi
                // kənar böyüyən toxunma sahəsini vizual sıxlığa çevirmir.
                className="-mt-2.5 -mr-2.5 flex items-center justify-center rounded-full"
                style={{ minWidth: 40, minHeight: 40 }}
              >
                <Icon name="X" size={13} color={reng.fg} />
              </button>
            )}
          </div>

          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.ink }}>
            {t(siqnal.metnKey, siqnal.vars)}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: C.muted }}>
              {t(siqnal.menbeKey)}
            </span>
            {/* Yalnız işi başqa ekranda görülən siqnalda düymə olur —
                "OK" düyməsi fermerə heç nə vermir */}
            {siqnal.hereket === "chat" && onHereket && (
              <button
                type="button"
                onClick={onHereket}
                className="rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                style={{ backgroundColor: C.pine, color: "#fff" }}
              >
                {t("siqnal.sekilCek")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
