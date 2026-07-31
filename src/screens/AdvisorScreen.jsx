import { Card } from "../components/Card.jsx";
import { Chip } from "../components/Chip.jsx";
import { Icon } from "../components/Icon.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { C, font, tone as TONES } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { withCompletion } from "../services/advisor.js";

export function AdvisorScreen({ onOpenChat }) {
  const { t } = useI18n();
  const { state, actions } = useStore();
  const recs = withCompletion(state.completedRecs);

  return (
    <div className="px-4 pb-4">
      <SectionTitle>{t("chat.title")}</SectionTitle>
      {/* AI girişi: fırlanan haşiyə + parıltı (bax: index.css "AI kartı") */}
      <div className="ai-halqa giris">
        <button
          type="button"
          onClick={onOpenChat}
          aria-label={t("chat.open")}
          className="ai-kart w-full p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div
              className="ai-ikon rounded-full p-2.5"
              style={{
                backgroundColor: "rgba(233,181,74,0.16)",
                border: "1px solid rgba(233,181,74,0.4)",
              }}
            >
              <Icon name="Sparkles" size={18} color={C.gold} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white" style={{ fontFamily: font.display }}>
                  {t("chat.open")}
                </p>
                <span
                  className="flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.06em",
                    color: C.gold,
                    border: "1px solid rgba(233,181,74,0.45)",
                    backgroundColor: "rgba(233,181,74,0.1)",
                  }}
                >
                  <span
                    className="ai-nokta inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: C.gold }}
                  />
                  AI
                </span>
              </div>
              <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                {t("chat.openDesc")}
              </p>
            </div>
            <Icon name="ChevronRight" size={18} color="rgba(255,255,255,0.5)" />
          </div>
        </button>
      </div>

      <SectionTitle>{t("advisor.title")}</SectionTitle>
      <p className="-mt-1 mb-3 px-1 text-xs" style={{ color: C.muted }}>
        {t("advisor.subtitle")}
      </p>

      {recs.map((rec, index) => {
        const palette = TONES[rec.tone];
        return (
          <Card
            key={rec.id}
            className="giris"
            style={{ "--i": index + 1, marginBottom: 10, opacity: rec.done ? 0.55 : 1 }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl p-2" style={{ backgroundColor: palette.bg }}>
                <Icon name={rec.icon} size={16} color={palette.color} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
                    {t(rec.titleKey)}
                  </h3>
                  {rec.impactKey && (
                    <Chip label={t(rec.impactKey)} color={C.goldDeep} bg={C.goldSoft} />
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
                  {t(rec.bodyKey)}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <Chip
                    icon={rec.icon}
                    label={t(rec.sourceKey)}
                    color={palette.color}
                    bg={palette.bg}
                  />
                  {rec.done ? (
                    <span
                      className="flex items-center gap-1 text-xs font-bold"
                      style={{ color: C.field }}
                    >
                      <Icon name="Check" size={14} color={C.field} /> {t("common.ready")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => actions.completeRec(rec.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold"
                      style={{ backgroundColor: C.pine, color: "#fff" }}
                    >
                      {t(rec.ctaKey)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
