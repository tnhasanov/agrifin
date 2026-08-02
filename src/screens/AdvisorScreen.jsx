import { Icon } from "../components/Icon.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { SiqnalKarti } from "../features/signals/SiqnalKarti.jsx";

export function AdvisorScreen({ onOpenChat, siqnallar = [] }) {
  const { t } = useI18n();
  const { actions } = useStore();

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

      {/* Bütün siyahı BU sahənin ölçmələrindən çıxır. Əvvəl burada nümunə
          tövsiyələr də vardı — uydurma rəqəmlərlə, üstəlik həqiqi siqnallarla
          eyni görkəmdə. Fermer hansının ölçülmüş olduğunu ayıra bilmirdi. */}
      <SectionTitle>{t("siqnal.title")}</SectionTitle>
      <p className="-mt-1 mb-3 px-1 text-xs" style={{ color: C.muted }}>
        {t("siqnal.subtitle")}
      </p>

      {siqnallar.length === 0 ? (
        <div
          className="giris rounded-2xl p-4 text-center"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
        >
          {/* Icon svg-dir: text-center onu mərkəzləmir, flex lazımdır */}
          <div className="flex justify-center">
            <Icon name="Check" size={18} color={C.field} />
          </div>
          <p className="mt-1.5 text-sm font-semibold" style={{ color: C.ink }}>
            {t("siqnal.bosBasliq")}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
            {t("siqnal.bosMetn")}
          </p>
        </div>
      ) : (
        siqnallar.map((siqnal, index) => (
          <SiqnalKarti
            key={siqnal.id}
            siqnal={siqnal}
            onBagla={actions.siqnaliBagla}
            onHereket={onOpenChat}
            style={{ marginBottom: 10, "--i": index + 1 }}
          />
        ))
      )}
    </div>
  );
}
