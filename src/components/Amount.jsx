import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { meblegMetni, meblegParcala } from "../lib/mebleg.js";

/**
 * MƏBLƏĞ — pul rəqəminin YEGANƏ göstərilmə forması.
 *
 * Fintech-də rəqəm dizaynın özüdür: eyni məbləğ hər yerdə eyni cür
 * oxunmalıdır. Sabit iyerarxiya:
 *   tam hissə  — display şrifti, qalın, tabular (sütunlar düz durur)
 *   qəpik      — kiçik və yüngül: 39,90-da "90" gözü çəkmir, amma var
 *   vahid (₼)  — qəpiklə eyni ölçü, kiçik boşluqla
 *   mənfi      — həqiqi minus (U+2212), rəng dəyişmir (rəng məna yox,
 *                işarə məna daşıyır); `ton="danger"` yalnız gecikmiş məbləğ
 *
 * Ölçülər (tam hissə / köməkçi):
 *   xl 34/17 — ekranın əsas rəqəmi (qalıq borc, uyğun limit)
 *   lg 24/14 — kart başlığı
 *   md 17/12 — sətir dəyəri
 *   sm 15/11 — siyahı və cədvəl
 *
 * Oxunan mətn TƏK MƏTN DÜYÜNÜDÜR ("5.400,50 ₼", sr-only): ekran oxuyucusu
 * hissələri ayrı-ayrı oxumur, testlər isə məbləği bütöv tapır. Vizual
 * hissələr aria-hidden-dır. (Generik span-da aria-label oxuyucular
 * tərəfindən etibarlı dəstəklənmir — ona görə gizli mətn.)
 */
const OLCU = {
  xl: { tam: 34, kicik: 17, setir: "40px", ceki: 800 },
  lg: { tam: 24, kicik: 14, setir: "30px", ceki: 800 },
  md: { tam: 17, kicik: 12, setir: "24px", ceki: 700 },
  sm: { tam: 15, kicik: 11, setir: "20px", ceki: 700 },
};

const TON = {
  ink: C.ink,
  mal: C.mal,
  pine: C.pine,
  danger: C.danger,
  muted: C.muted,
  white: "#fff",
};

export function Amount({ value, size = "md", ton = "ink", qepik = "auto", texmini = false, className = "", style }) {
  const { lang } = useI18n();
  const p = meblegParcala(value, lang, { qepik });
  const o = OLCU[size] ?? OLCU.md;
  const reng = TON[ton] ?? C.ink;

  if (!p) {
    return (
      <span className={className} style={{ color: C.muted, fontSize: o.tam, lineHeight: o.setir, ...style }}>
        —
      </span>
    );
  }

  // Köməkçi hissələr (qəpik, vahid) əsas rəngin yüngül variantıdır: ağ
  // üstündə şəffaflıq, rəngli mətndə isə eyni rəng — kontrast itmir
  const komekci = ton === "white" ? "rgba(255,255,255,0.78)" : reng;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 0,
        color: reng,
        fontFamily: font.display,
        fontVariantNumeric: "tabular-nums lining-nums",
        fontWeight: o.ceki,
        fontSize: o.tam,
        lineHeight: o.setir,
        letterSpacing: size === "xl" ? "-0.02em" : "-0.01em",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span className="sr-only">{`${texmini ? "~" : ""}${meblegMetni(value, lang, { qepik })}`}</span>
      {texmini && (
        <span aria-hidden="true" style={{ fontSize: o.kicik, fontWeight: 600, color: komekci, marginRight: 1 }}>
          ~
        </span>
      )}
      {p.isare && <span aria-hidden="true">{p.isare}</span>}
      <span aria-hidden="true">{p.tam}</span>
      {p.kesr != null && (
        <span aria-hidden="true" style={{ fontSize: o.kicik, fontWeight: 600, color: komekci, opacity: ton === "white" ? 1 : 0.72 }}>
          {p.ayirici}
          {p.kesr}
        </span>
      )}
      <span
        aria-hidden="true"
        style={{ fontSize: o.kicik, fontWeight: 700, color: komekci, opacity: ton === "white" ? 1 : 0.72, marginLeft: Math.max(3, Math.round(o.kicik * 0.3)) }}
      >
        {p.vahid}
      </span>
    </span>
  );
}
