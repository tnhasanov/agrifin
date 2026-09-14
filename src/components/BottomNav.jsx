import { Icon } from "./Icon.jsx";
import { C, KOLGE } from "../theme/tokens.js";
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
    // Hairline yox, yuxarıya kölgə (KOLGE.nav): səth məzmunun ÜSTÜNDƏ durur,
    // onunla bir müstəvidə deyil. Aktiv tab bütöv düzbucaq yox, yalnız ikonun
    // arxasında mint pilü — iOS/Material 3 qaydası; düzbucaq "veb" oxunurdu.
    <nav
      className="az-safe-bottom flex items-center justify-around px-1 pt-1.5"
      style={{ backgroundColor: C.card, boxShadow: KOLGE.nav, position: "relative", zIndex: 1 }}
    >
      {NAV_ROUTES.map((route) => {
        const active = routeMatches(route, path);
        return (
          <button
            key={route.id}
            type="button"
            onClick={() => navigate(route.path)}
            aria-current={active ? "page" : undefined}
            className="basilir flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-0.5"
            style={{ minHeight: 44 }}
          >
            {/* key=active: tab seçiləndə ikon bir dəfə sıçrayır */}
            <span
              key={active ? "a" : "p"}
              className={`flex items-center justify-center rounded-full ${active ? "nav-pop" : ""}`}
              style={{
                width: 48,
                height: 28,
                backgroundColor: active ? C.fieldSoft : "transparent",
                transition: "background-color 180ms ease",
              }}
            >
              <Icon
                name={route.icon}
                size={20}
                color={active ? C.pine : C.muted}
                strokeWidth={active ? 2.4 : 1.9}
              />
            </span>
            <span
              className="truncate"
              style={{
                color: active ? C.pine : C.muted,
                fontSize: 11,
                lineHeight: "14px",
                fontWeight: active ? 700 : 600,
                maxWidth: "100%",
              }}
            >
              {t(route.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
