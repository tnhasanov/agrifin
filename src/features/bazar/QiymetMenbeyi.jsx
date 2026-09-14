import { Icon } from "../../components/Icon.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { gunAdi } from "../../lib/tarix.js";

/**
 * Açıq bazar elanından götürülmüş qiymətin mənbəsini göstərir.
 * Kartın özü button olduğu üçün `kicik` görünüş interaktiv deyil; məhsul
 * detalındakı tam görünüş isə mənbəni yeni vərəqdə açır.
 */
export function QiymetMenbeyi({ mehsul, kicik = false }) {
  const { t } = useI18n();
  const menbe = mehsul?.qiymetMenbe;
  if (mehsul?.qiymetNovu !== "bazar" || !menbe) return null;

  const tarix = gunAdi(t, menbe.yoxlanib);

  if (kicik) {
    return (
      <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold" style={{ color: C.field }}>
        <Icon name="Clock" size={11} color={C.field} />
        {t("bazar.qiymet.bazarQisa", { tarix })}
      </span>
    );
  }

  return (
    <a
      href={menbe.url}
      target="_blank"
      rel="noopener noreferrer"
      className="basilir mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left"
      style={{ backgroundColor: C.fieldSoft, color: C.pine, minHeight: 48 }}
      aria-label={t("bazar.qiymet.menbeAc", { menbe: menbe.ad })}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: C.card }}>
        <Icon name="Clock" size={16} color={C.field} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold">{t("bazar.qiymet.bazar")}</span>
        <span className="block truncate text-[11px]" style={{ color: C.muted }}>
          {t("bazar.qiymet.menbeTarix", { menbe: menbe.ad, tarix })}
        </span>
      </span>
      <Icon name="ArrowUpRight" size={16} color={C.field} />
    </a>
  );
}
