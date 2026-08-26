import { C } from "../theme/tokens.js";

/**
 * Yüklənmə skeleti — donmuş spinner mətnlərinin əvəzi.
 *
 * Spinner "nəsə fırlanır" deyir, skelet isə "bura BU FORMADA məzmun
 * gələcək" — gözləmə qavranılan olaraq qısalır və ekran sıçramır
 * (skelet gələcək məzmunla eyni yeri tutur).
 *
 * Sayrışma index.css-dədir (.skelet) və hərəkəti azaldılmış rejimdə
 * qlobal qayda ilə sönür — o halda sadəcə boz forma qalır, bu kifayətdir.
 * aria-hidden: skelet məlumat daşımır; vəziyyəti yanındakı mətn deyir.
 */
export function Skeleton({ en = "100%", hund = 12, radius = 6, className = "", style = {} }) {
  return (
    <div
      className={`skelet ${className}`}
      aria-hidden="true"
      style={{ width: en, height: hund, borderRadius: radius, backgroundColor: C.line, ...style }}
    />
  );
}
