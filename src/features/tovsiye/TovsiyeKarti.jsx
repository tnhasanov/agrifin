import { Card } from "../../components/Card.jsx";
import { Chip } from "../../components/Chip.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/**
 * Tövsiyə kartı. Siqnal kartından fərqi qəsdəndir: siqnal rəngli və təcili,
 * tövsiyə sakit və planlıdır — fermer ikisini bir baxışda ayırmalıdır.
 *
 * Mənbə çipi qalır (dörd söz), metodologiya isə yox: "bu rəqəm SİZİN
 * sahənizdən gəlir" etibar qazandırır, "FAO-56 əmsalı ±20% dəyişir" isə
 * kartı sənədə çevirir.
 */
export function TovsiyeKarti({ tovsiye, style }) {
  const { t } = useI18n();

  // Bilik bazasından gələn mətn tərcümə açarı deyil, hazır cümlədir
  const basliq = tovsiye.basliq ?? t(tovsiye.basliqKey, tovsiye.vars);
  const metn = tovsiye.metn ?? t(tovsiye.metnKey, tovsiye.vars);

  return (
    <Card className="giris" style={{ marginBottom: 12, ...style }}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl p-2" style={{ backgroundColor: C.fieldSoft }}>
          <Icon name={tovsiye.icon} size={16} color={C.field} />
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {basliq}
          </h3>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
            {metn}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Chip icon={tovsiye.icon} label={t(tovsiye.menbeKey)} color={C.field} bg={C.fieldSoft} />
          </div>
        </div>
      </div>
    </Card>
  );
}
