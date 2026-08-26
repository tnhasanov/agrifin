import { C } from "../theme/tokens.js";

export function Sparkline({ points, up, width = 72, height = 26 }) {
  if (!points?.length) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1 || 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline
        points={coords.join(" ")}
        // pathLength=1: cızılma animasiyası uzunluğu bilmədən işləyir
        // (bax: index.css, .cizgi-cek)
        pathLength="1"
        className="cizgi-cek"
        fill="none"
        stroke={up ? C.field : C.danger}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
