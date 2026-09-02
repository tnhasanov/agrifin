import { Icon } from "./Icon.jsx";
import { C, font } from "../theme/tokens.js";
import { LANGUAGES, useI18n } from "../i18n/index.jsx";

export function AppHeader({ siqnalSayi = 0, onZeng, panelAcilib = false }) {
  const { t, lang, cycleLang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  // Nişan uydurma deyil: sahədən gələn açıq siqnalların sayıdır. Əvvəl bura
  // nümunə tövsiyələr də sayılırdı — "5" görünürdü, amma yalnız 1-i ölçmədən
  // çıxırdı. Qarışıq say nişanı mənasızlaşdırır.
  const gozleyen = siqnalSayi;

  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-2">
      <div className="flex items-center gap-2">
        <div className="rounded-xl p-1.5" style={{ backgroundColor: C.pine }}>
          <Icon name="Leaf" size={16} color={C.gold} />
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
          <Icon name="Languages" size={16} color={C.muted} />
          {current.label}
        </button>

        {/* Zəng ayrı ekrana aparmır: bildirişlər üstdə panel kimi açılır və
            bağlananda fermer eyni yerdə qalır (bax: features/signals) */}
        <button
          type="button"
          onClick={onZeng}
          aria-haspopup="dialog"
          aria-expanded={panelAcilib}
          aria-label={
            gozleyen > 0
              ? t("header.notificationsCount", { count: gozleyen })
              : t("header.notificationsEmpty")
          }
          className="relative rounded-full p-2"
          style={{
            backgroundColor: panelAcilib ? C.mist : C.card,
            border: `1px solid ${panelAcilib ? C.field : C.line}`,
          }}
        >
          {/* key=say: yeni siqnal gələndə zəng yenidən yellənir. Yellənmə
              birdəfəlikdir — sonsuz yellənən zəng narahatlıq yaradır. */}
          <span key={gozleyen} className={gozleyen > 0 ? "zeng-yellen" : undefined}>
            <Icon name="Bell" size={16} color={C.ink} />
          </span>
          {gozleyen > 0 && (
            <span
              className="nisan-pop absolute -top-1 -right-1 flex items-center justify-center rounded-full font-bold"
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
