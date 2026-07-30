import { Icon } from "./Icon.jsx";
import { C, font } from "../theme/tokens.js";
import { LANGUAGES, useI18n } from "../i18n/index.jsx";

export function AppHeader() {
  const { t, lang, cycleLang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

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
          aria-label={t("header.notifications")}
          className="relative rounded-full p-2"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
        >
          <Icon name="Bell" size={15} color={C.ink} />
          <span
            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: C.danger }}
          />
        </button>
      </div>
    </header>
  );
}
