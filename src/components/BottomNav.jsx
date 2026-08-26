import { Icon } from "./Icon.jsx";
import { C } from "../theme/tokens.js";
import { ROUTES } from "../routes.js";
import { useI18n } from "../i18n/index.jsx";
import { useRouter } from "../lib/router.jsx";

export function BottomNav() {
  const { t } = useI18n();
  const { path, navigate } = useRouter();

  return (
    <nav
      className="az-safe-bottom flex items-center justify-around px-2 pt-2"
      style={{ backgroundColor: C.card, borderTop: `1px solid ${C.line}` }}
    >
      {ROUTES.map((route) => {
        const active = route.path === path;
        return (
          <button
            key={route.id}
            type="button"
            onClick={() => navigate(route.path)}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-1"
            style={{
              backgroundColor: active ? C.mist : "transparent",
              transition: "background-color 200ms ease",
            }}
          >
            {/* key=active: tab seçiləndə ikon bir dəfə sıçrayır */}
            <span key={active ? "a" : "p"} className={active ? "nav-pop" : undefined}>
              <Icon
                name={route.icon}
                size={18}
                color={active ? C.pine : C.muted}
                strokeWidth={active ? 2.4 : 2}
              />
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: active ? C.pine : C.muted }}
            >
              {t(route.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
