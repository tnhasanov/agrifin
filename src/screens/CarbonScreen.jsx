import { Card } from "../components/Card.jsx";
import { Chip } from "../components/Chip.jsx";
import { Icon } from "../components/Icon.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { formatNumber } from "../lib/format.js";
import { CARBON, PRACTICES, carbonPayout } from "../services/carbon.js";
import { useCountUp } from "../lib/useCountUp.js";

export function CarbonScreen() {
  const { t, money, lang } = useI18n();
  const { state, actions } = useStore();
  const payout = carbonPayout();
  // Tutulan karbon 0-dan saydırılır — ölçülmüş dəyər təəssüratı üçün
  const tonlar = useCountUp(CARBON.capturedTonnes, { onluq: 1 });

  return (
    <div className="px-4 pb-4">
      <div
        className="mt-3 rounded-3xl p-4"
        style={{ background: `linear-gradient(150deg, #123A24, ${C.field})` }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-xs font-bold"
            style={{ color: "rgba(255,255,255,0.75)", letterSpacing: "0.15em" }}
          >
            {t("carbon.seasonLabel")}
          </p>
          <Chip
            icon="Satellite"
            label={t("carbon.mrv")}
            color="#BFE8CF"
            bg="rgba(255,255,255,0.14)"
          />
        </div>
        <p className="mt-3 text-3xl font-extrabold text-white" style={{ fontFamily: font.display }}>
          {formatNumber(tonlar, lang, { minimumFractionDigits: 1 })}{" "}
          <span className="text-base font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>
            {t("carbon.captured")}
          </span>
        </p>
        <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
          {t("carbon.capturedDesc")}
        </p>
      </div>

      <SectionTitle>{t("carbon.earn")}</SectionTitle>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
              {t("carbon.creditsReady", { count: CARBON.creditsReady })}
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
              {t("carbon.creditsPrice", {
                price: { money: CARBON.pricePerCredit },
                total: { money: payout },
              })}
            </p>
          </div>
          {state.creditsSold ? (
            <span
              className="flex shrink-0 items-center gap-1 text-xs font-bold"
              style={{ color: C.field }}
            >
              <Icon name="Check" size={14} color={C.field} /> {t("common.sold")}
            </span>
          ) : (
            <button
              type="button"
              onClick={actions.sellCredits}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold"
              style={{ backgroundColor: C.gold, color: C.pine }}
            >
              {t("carbon.sellCta", { total: money(payout) })}
            </button>
          )}
        </div>
        <p
          className="mt-3 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: C.mist, color: C.muted }}
        >
          {t("carbon.scoreNote")}
        </p>
      </Card>

      <SectionTitle>{t("carbon.practices")}</SectionTitle>
      <Card style={{ padding: "6px 16px" }}>
        {PRACTICES.map((practice, index) => (
          <div
            key={practice.id}
            className="giris flex items-center gap-3 py-3"
            style={{
              "--i": index,
              borderBottom: index < PRACTICES.length - 1 ? `1px solid ${C.line}` : "none",
            }}
          >
            <div
              className="rounded-full p-1.5"
              style={{ backgroundColor: practice.verified ? C.fieldSoft : C.mist }}
            >
              <Icon
                name={practice.verified ? "Check" : "Info"}
                size={13}
                color={practice.verified ? C.field : C.muted}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {t(practice.labelKey)}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                {t(practice.verified ? "practice.satelliteVerified" : "practice.needReceipt")}
              </p>
            </div>
            {!practice.verified && (
              <button
                type="button"
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                style={{ border: `1px solid ${C.line}`, color: C.pine }}
              >
                {t("common.verify")}
              </button>
            )}
          </div>
        ))}
      </Card>

      <SectionTitle>{t("carbon.esgTitle")}</SectionTitle>
      <Card>
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          {t("carbon.esgBody")}
        </p>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold"
          style={{ backgroundColor: C.pine, color: "#fff" }}
        >
          <Icon name="FileText" size={15} color="#fff" />
          {t("carbon.esgCta")}
        </button>
      </Card>
    </div>
  );
}
