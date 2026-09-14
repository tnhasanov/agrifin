import { Icon } from "../../components/Icon.jsx";
import { C, KOLGE } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { ton } from "./tonlar.js";

/**
 * KATEQORİYA KARTI — iki forma:
 *   • "kart": 108×116, tonlu fon, iri ikon, ad — ana səhifənin üfüqi zolağı;
 *   • "cip": kiçik yuvarlaq düymə — kateqoriya/axtarış səhifəsində keçid.
 *
 * İkon şəkil deyil, amma ikon TORU da deyil: hər kart öz təbii tonunu
 * daşıyır (mamır, buğda, gil, səma…), ikon tonun mürəkkəbi ilə çəkilir və
 * ağ dairəyə oturur — kartlar bir-birindən rənglə ayrılır, kontur yoxdur.
 */
export function KateqoriyaKarti({ kateqoriya, duzum = "kart", secili = false, onAc, sira = 0 }) {
  const { t } = useI18n();
  const tonu = ton(kateqoriya.ton);
  const ad = t(kateqoriya.adKey);

  if (duzum === "cip") {
    return (
      <button
        type="button"
        onClick={() => onAc?.(kateqoriya)}
        aria-pressed={secili}
        className="basilir flex shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
        style={{
          minHeight: 44,
          backgroundColor: secili ? C.pine : C.card,
          color: secili ? "#fff" : C.ink,
          border: `1px solid ${secili ? C.pine : C.line}`,
          scrollSnapAlign: "start",
        }}
      >
        <Icon name={kateqoriya.ikon} size={14} color={secili ? "#fff" : tonu.fg} />
        {ad}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAc?.(kateqoriya)}
      className="basilir giris flex shrink-0 flex-col items-start justify-between text-left"
      style={{
        "--i": sira,
        width: 108,
        height: 116,
        borderRadius: 18,
        padding: 12,
        backgroundColor: tonu.bg,
        boxShadow: KOLGE.kart,
        scrollSnapAlign: "start",
      }}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{ width: 40, height: 40, backgroundColor: "rgba(255,255,255,0.7)" }}
      >
        <Icon name={kateqoriya.ikon} size={20} color={tonu.fg} strokeWidth={2} />
      </span>
      <span className="text-xs font-bold" style={{ color: tonu.fg, lineHeight: "15px" }}>
        {ad}
      </span>
    </button>
  );
}
