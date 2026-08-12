import { useI18n, LANGUAGES } from "./i18n/index.jsx";
import { useStore } from "./state/store.jsx";
import { useRoute } from "./lib/router.js";
import { ROLES } from "./domain/workflow.js";
import Pipeline from "./screens/Pipeline.jsx";
import NewCase from "./screens/NewCase.jsx";
import CaseView from "./screens/case/CaseView.jsx";

export default function App() {
  const { t, lang, setLang } = useI18n();
  const { user, dispatch } = useStore();
  const [route, navigate] = useRoute();

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-[var(--color-line)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            className="flex items-center gap-2 text-left"
            onClick={() => navigate({ name: "pipeline" })}
          >
            <span className="grid h-8 w-8 place-items-center rounded bg-[var(--color-brand)] text-sm font-bold text-white">
              ATB
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">{t("app.name")}</span>
              <span className="block text-xs text-[var(--color-muted)]">{t("app.subtitle")}</span>
            </span>
          </button>

          <span className="ml-auto flex items-center gap-2">
            <label className="text-xs text-[var(--color-muted)]" htmlFor="role-select">
              {t("nav.role")}
            </label>
            <select
              id="role-select"
              className="rounded-md border border-[var(--color-line)] bg-white px-2 py-1 text-sm focus:border-[var(--color-brand)] focus:outline-none"
              value={user.role}
              onChange={(e) => dispatch({ type: "setUser", user: { role: e.target.value } })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`role.${r}`)}
                </option>
              ))}
            </select>
            <span className="hidden text-sm text-[var(--color-muted)] sm:inline">{user.name}</span>

            <span className="flex overflow-hidden rounded-md border border-[var(--color-line)]">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={`px-2 py-1 text-xs font-medium ${
                    lang === l.code
                      ? "bg-[var(--color-brand)] text-white"
                      : "bg-white text-[var(--color-muted)] hover:bg-slate-50"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        {route.name === "pipeline" ? <Pipeline navigate={navigate} /> : null}
        {route.name === "new" ? <NewCase navigate={navigate} /> : null}
        {route.name === "case" ? <CaseView route={route} navigate={navigate} /> : null}
      </main>

      <footer className="no-print mx-auto max-w-7xl px-4 pb-8 text-xs text-[var(--color-muted)]">
        {t("app.demo")} — nümunə portfel brauzerdə saxlanılır, bank sistemlərinə qoşulmayıb.
      </footer>
    </div>
  );
}
