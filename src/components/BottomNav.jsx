import { Icon } from "./Icon.jsx";
import { C } from "../theme/tokens.js";
import { NAV_ROUTES, routeMatches } from "../routes.js";
import { useI18n } from "../i18n/index.jsx";
import { useRouter } from "../lib/router.jsx";

/**
 * Beş tab. Ən dar dəstəklənən ekranda (360 px) hər taba ~72 px düşür —
 * ona görə yan doldurma kiçikdir və etiket bir sətirdə qalır; toxunma
 * hədəfi isə hündürlükdən (44 px) gəlir, endən yox.
 */
export function BottomNav() {
  const { t } = useI18n();
  const { path, navigate } = useRouter();

  return (
    <nav
      className="az-safe-bottom flex items-center justify-around px-1 pt-2"
      style={{ backgroundColor: C.card, borderTop: `1px solid ${C.line}` }}
    >
      {NAV_ROUTES.map((route) => {
        const active = routeMatches(route, path);
        return (
          <button
            key={route.id}
            type="button"
            onClick={() => navigate(route.path)}
            aria-current={active ? "page" : undefined}
            className="basilir flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1"
            style={{
              backgroundColor: active ? C.mist : "transparent",
              transition: "background-color 200ms ease",
              minHeight: 44,
            }}
          >
            {/* key=active: tab seçiləndə ikon bir dəfə sıçrayır */}
            <span key={active ? "a" : "p"} className={active ? "nav-pop" : undefined}>
              <Icon
                name={route.icon}
                size={20}
                color={active ? C.pine : C.muted}
                strokeWidth={active ? 2.4 : 2}
              />
            </span>
            <span
              className="truncate font-semibold"
              style={{ color: active ? C.pine : C.muted, fontSize: 11, lineHeight: "14px", maxWidth: "100%" }}
            >
              {t(route.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
