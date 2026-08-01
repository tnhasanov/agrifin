import { Icon } from "./Icon.jsx";
import { C, font } from "../theme/tokens.js";
import { LANGUAGES, useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { useRouter } from "../lib/router.jsx";
import { pathFor } from "../routes.js";
import { withCompletion } from "../services/advisor.js";

export function AppHeader() {
  const { t, lang, cycleLang } = useI18n();
  const { state } = useStore();
  const { navigate } = useRouter();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  // Nişan uydurma deyil: gözləyən tövsiyələrin həqiqi sayıdır. Fermer
  // hamısını tamamlayanda nişan yox olur, zəng isə yenə məsləhət ekranına
  // aparır. Əvvəl burada sabit qırmızı nöqtə vardı və düymə heç nə etmirdi —
  // toxunub heç nə almamaq etibarı ən sürətli itirən şeydir.
  const gozleyen = withCompletion(state.completedRecs).filter((rec) => !rec.done).length;

  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-2">
      <div className="flex items-center gap-2">
        <div className="rounded-xl p-1.5" style={{ backgroundColor: C.pine }}>
          <Icon name="Leaf" size={14} color={C.gold} />
        </div>
        <span className="text-sm font-extrabold" style={{ color: C.pine, fontFamily: font.display }}>
          {t("app.name")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={cycleLang}
          aria-label={`${t("header.language")} (${current.name})`}
          className="flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-bold"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.ink }}
        >
          <Icon name="Languages" size={14} color={C.muted} />
          {current.label}
        </button>

        <button
          type="button"
          onClick={() => navigate(pathFor("advisor"))}
          aria-label={
            gozleyen > 0
              ? t("header.notificationsCount", { count: gozleyen })
              : t("header.notificationsEmpty")
          }
          className="relative rounded-full p-2"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
        >
          <Icon name="Bell" size={15} color={C.ink} />
          {gozleyen > 0 && (
            <span
              className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-bold"
              style={{
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                fontSize: 10,
                backgroundColor: C.danger,
                color: "#fff",
                border: "2px solid #EFF2EC",
              }}
            >
              {gozleyen}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
