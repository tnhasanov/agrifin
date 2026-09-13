import { useEffect, useRef } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, RADIUS, TIPO, TOXUNMA } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/**
 * AXTARIŞ XANASI — iki rejim:
 *   • `onAc` verilibsə: DÜYMƏDİR (ana səhifə) — toxunanda axtarış səhifəsi
 *     açılır və orada xana fokuslanır. Ana səhifədə canlı xana klaviaturanı
 *     lazımsız yerə qaldırırdı.
 *   • əks halda: canlı `<input>` (axtarış səhifəsi), `avtoFokus` ilə.
 *
 * Rayon vərəqindəki xana ilə eyni ölçü və ton (mist fon, 16 px giriş).
 */
export function BazarAxtaris({ deger = "", onDeyis, onAc, avtoFokus = false, onTemizle }) {
  const { t } = useI18n();
  const ref = useRef(null);

  useEffect(() => {
    if (avtoFokus) ref.current?.focus();
  }, [avtoFokus]);

  const yerTutucu = t("bazar.axtarisYeri");

  if (onAc) {
    return (
      <button
        type="button"
        onClick={onAc}
        aria-label={yerTutucu}
        className="basilir flex w-full items-center gap-2 px-3 text-left"
        style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: RADIUS.idare, minHeight: 48 }}
      >
        <Icon name="Search" size={18} color={C.muted} />
        <span className="truncate" style={{ color: C.muted, ...TIPO.metn }}>
          {yerTutucu}
        </span>
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3"
      style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: RADIUS.idare, minHeight: TOXUNMA }}
    >
      <Icon name="Search" size={18} color={C.muted} />
      <input
        ref={ref}
        value={deger}
        onChange={(h) => onDeyis?.(h.target.value)}
        placeholder={yerTutucu}
        aria-label={yerTutucu}
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        className="w-full bg-transparent outline-none"
        style={{ color: C.ink, ...TIPO.giris }}
      />
      {deger && (
        <button
          type="button"
          onClick={() => {
            onTemizle ? onTemizle() : onDeyis?.("");
            ref.current?.focus();
          }}
          aria-label={t("common.close")}
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 28, height: 28, backgroundColor: C.line }}
        >
          <Icon name="X" size={14} color={C.muted} />
        </button>
      )}
    </div>
  );
}
