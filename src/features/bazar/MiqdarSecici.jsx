import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, TOXUNMA } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/**
 * MİQDAR SEÇİCİ — [−] [say] [+].
 *
 * Say heç vaxt yararsız ola bilmir: "−" minimumda, "+" maksimumda sönür;
 * əl ilə yazılan dəyər fokusdan çıxanda sərhədə sıxılır. `onDeyis` YALNIZ
 * sərhəd daxilində tam ədədlə çağırılır — səbətdə də, məhsul səhifəsində
 * də eyni komponent.
 *
 * `silOlar` verilibsə minimumda "−" düyməsi silmə düyməsinə çevrilir
 * (səbətdə sətri çıxarmaq üçün); məhsul səhifəsində yoxdur.
 */
export function MiqdarSecici({ say, min = 1, max = 999, onDeyis, onSil, kicik = false, etiket }) {
  const { t } = useI18n();
  const [metn, setMetn] = useState(String(say));

  // Kənardan gələn say (store) dəyişəndə xana da dəyişir — render-zamanı
  // uyğunlaşdırma (effektdə sinxron setState kaskad render yaradır)
  const [sonSay, setSonSay] = useState(say);
  if (say !== sonSay) {
    setSonSay(say);
    setMetn(String(say));
  }

  const six = (n) => Math.min(max, Math.max(min, Math.round(n)));
  const teyin = (n) => {
    const yeni = six(n);
    if (yeni !== say) onDeyis(yeni);
    setMetn(String(yeni));
  };

  const boy = kicik ? 36 : TOXUNMA;
  const minimumda = say <= min;
  const maksimumda = say >= max;

  return (
    <div
      className="inline-flex items-center overflow-hidden"
      role="group"
      aria-label={etiket ?? t("bazar.mehsul.miqdar")}
      style={{ borderRadius: 12, border: `1px solid ${C.line}`, backgroundColor: C.card }}
    >
      <button
        type="button"
        onClick={() => (minimumda && onSil ? onSil() : teyin(say - 1))}
        disabled={minimumda && !onSil}
        aria-label={minimumda && onSil ? t("bazar.sebet.sil") : "−"}
        className="basilir flex items-center justify-center"
        style={{ width: boy, height: boy, color: minimumda && !onSil ? C.line : C.ink }}
      >
        <Icon name={minimumda && onSil ? "Trash2" : "Minus"} size={16} color={minimumda && !onSil ? C.line : minimumda && onSil ? C.danger : C.ink} />
      </button>
      <input
        value={metn}
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={t("bazar.mehsul.miqdar")}
        onChange={(h) => setMetn(h.target.value.replace(/[^\d]/g, ""))}
        onBlur={() => teyin(Number(metn) || min)}
        onKeyDown={(h) => {
          if (h.key === "Enter") h.currentTarget.blur();
        }}
        className="bg-transparent text-center font-bold outline-none"
        style={{
          width: kicik ? 40 : 52,
          height: boy,
          color: C.ink,
          // 16 px: iOS kiçik girişdə səhifəni özü böyüdür
          fontSize: 16,
          fontVariantNumeric: "tabular-nums",
        }}
      />
      <button
        type="button"
        onClick={() => teyin(say + 1)}
        disabled={maksimumda}
        aria-label="+"
        className="basilir flex items-center justify-center"
        style={{ width: boy, height: boy }}
      >
        <Icon name="Plus" size={16} color={maksimumda ? C.line : C.ink} />
      </button>
    </div>
  );
}
