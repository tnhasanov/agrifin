import { IconButton } from "../../components/IconButton.jsx";
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
        <IconButton ikon="ChevronLeft" label={t("bazar.geri")} size={TOXUNMA} strokeWidth={2.2} className="-ml-2" onClick={onGeri} />
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

/** Dairəvi ikon düyməsi + nişan sayı (səbət, sifarişlər) — ortaq IconButton */
export function IkonDuymesi({ ikon, say = 0, etiket, onClick, aktiv = false }) {
  return (
    <IconButton
      ikon={ikon}
      label={say > 0 ? `${etiket} (${say})` : etiket}
      variant="secondary"
      size={TOXUNMA}
      aktiv={aktiv}
      say={say}
      onClick={onClick}
    />
  );
}
