import { C, font } from "../theme/tokens.js";
import { scoreFraction } from "../services/farm.js";
import { useCountUp } from "../lib/useCountUp.js";

const RADIUS = 84;
const CX = 110;
const CY = 104;

function arcPath(from, to, radius = RADIUS) {
  const x1 = CX + radius * Math.cos(from);
  const y1 = CY - radius * Math.sin(from);
  const x2 = CX + radius * Math.cos(to);
  const y2 = CY - radius * Math.sin(to);
  const largeArc = from - to > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

/** Tətbiqin imza elementi: qızıl qövs FarmScore, kəsikli yaşıl qövs NDVI. */
export function FarmScoreGauge({ score, ndvi, label }) {
  // Qövs və rəqəm birlikdə 0-dan hədəfə "hesablanır" — bal statik yazı
  // deyil, ölçülmüş dəyər təəssüratı verir. aria-label isə yekun baldır:
  // ekran oxuyucusu sayma prosesini eşitməməlidir.
  const gorunen = useCountUp(score);
  const fraction = scoreFraction(gorunen);
  const start = Math.PI;

  return (
    <svg width="220" height="120" viewBox="0 0 220 120" role="img" aria-label={`${label}: ${score}`}>
      <path d={arcPath(start, 0)} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={12} strokeLinecap="round" />
      {fraction > 0 && (
        <path
          d={arcPath(start, start - fraction * Math.PI)}
          fill="none"
          stroke={C.gold}
          strokeWidth={12}
          strokeLinecap="round"
        />
      )}
      {ndvi > 0 && (
        <path
          d={arcPath(start, start - ndvi * Math.PI)}
          fill="none"
          stroke="rgba(96,190,134,0.9)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="2 6"
        />
      )}
      <text
        x={CX}
        y={CY - 18}
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily={font.display}
        fontSize="34"
        fontWeight="800"
      >
        {gorunen}
      </text>
      <text
        x={CX}
        y={CY + 2}
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
        fontFamily={font.body}
        fontSize="10"
        fontWeight="600"
        letterSpacing="0.12em"
      >
        {label}
      </text>
    </svg>
  );
}
