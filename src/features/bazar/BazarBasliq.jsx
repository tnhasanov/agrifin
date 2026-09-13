import { Icon } from "../../components/Icon.jsx";
import { C, TOXUNMA, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/**
 * ALT-SƏHİFƏ BAŞLIĞI — geri oxu + başlıq + sağ yuva (səbət düyməsi).
 * Sahələr ekranındakı "geri-ox başlıq" ilə eyni ölçülər (44 px hədəf).
 * `merkez` verilibsə başlıq yerinə o göstərilir (axtarış xanası).
 */
export function BazarBasliq({ basliq, altYazi, onGeri, sag, merkez }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 flex items-center gap-2">
      {onGeri && (
        <button
          type="button"
          onClick={onGeri}
          aria-label={t("bazar.geri")}
          className="basilir -ml-2 flex shrink-0 items-center justify-center rounded-full"
          style={{ minWidth: TOXUNMA, minHeight: TOXUNMA }}
        >
          <Icon name="ChevronLeft" size={22} color={C.ink} strokeWidth={2.2} />
        </button>
      )}
      {merkez ? (
        <div className="min-w-0 flex-1">{merkez}</div>
      ) : (
        <div className="min-w-0 flex-1">
          {/* Uzun başlıq ("Sahəniz üçün tövsiyə olunur") kəsilmir, iki sətrə keçir */}
          <h1 className="line-clamp-2 text-lg font-extrabold" style={{ color: C.ink, fontFamily: font.display, lineHeight: "22px" }}>
            {basliq}
          </h1>
          {altYazi && (
            <p className="truncate text-xs" style={{ color: C.muted }}>
              {altYazi}
            </p>
          )}
        </div>
      )}
      {sag && <div className="flex shrink-0 items-center gap-1.5">{sag}</div>}
    </div>
  );
}

/** Dairəvi ikon düyməsi + nişan sayı (səbət, sifarişlər) */
export function IkonDuymesi({ ikon, say = 0, etiket, onClick, aktiv = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={say > 0 ? `${etiket} (${say})` : etiket}
      className="basilir relative flex items-center justify-center rounded-full"
      style={{
        minWidth: TOXUNMA,
        minHeight: TOXUNMA,
        backgroundColor: aktiv ? C.pine : C.card,
        border: `1px solid ${aktiv ? C.pine : C.line}`,
      }}
    >
      <Icon name={ikon} size={18} color={aktiv ? "#fff" : C.ink} />
      {say > 0 && (
        <span
          className="nisan-pop absolute flex items-center justify-center rounded-full font-bold"
          style={{
            top: -3,
            right: -3,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            fontSize: 10,
            backgroundColor: C.field,
            color: "#fff",
            border: `2px solid ${C.mist}`,
          }}
        >
          {say}
        </span>
      )}
    </button>
  );
}
