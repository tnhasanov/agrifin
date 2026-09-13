import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { formatQiymet } from "../../lib/format.js";
import { kateqoriyaTap } from "../../../lib/bazar/kataloq.js";
import { ton } from "./tonlar.js";

/**
 * ƏKİN PLANI — kateqoriya başına "nə qədər lazımdır, nə qədəri alınıb".
 *
 *   Toxum            ✓
 *   Gübrə            60%  ▓▓▓▓▓▓░░░░
 *   Bitki mühafizəsi 20%
 *   Qalan ehtiyac    1 240 ₼
 *
 * Əhatə REAL sifarişlərdən çıxır (lib/bazar/tovsiye.js) — sifarişi olmayan
 * fermer hər sətirdə 0% görür və bu düzgündür. Normaların nümunə olduğu
 * kartın altında açıq yazılır.
 */
export function TovsiyeKarti({ plan, onMehsullar, yigcam = false }) {
  const { t, lang } = useI18n();
  if (!plan || plan.hal !== "hazir") return null;

  return (
    <section className="rounded-2xl p-4" style={{ backgroundColor: C.card, boxShadow: "0 1px 2px rgba(18,63,45,0.05), 0 6px 16px rgba(18,63,45,0.05)" }}>
      <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
        {t("bazar.tovsiye.plan")}
      </p>
      <ul className="mt-2 space-y-2.5">
        {plan.setirler.map((s) => {
          const kateqoriya = kateqoriyaTap(s.kateqoriya);
          const tonu = ton(kateqoriya?.ton);
          const tam = s.ehate >= 1;
          const faiz = Math.round(s.ehate * 100);
          return (
            <li key={s.kateqoriya}>
              <div className="flex items-center gap-2.5">
                <span className="flex shrink-0 items-center justify-center rounded-lg" style={{ width: 28, height: 28, backgroundColor: tonu.bg }}>
                  <Icon name={kateqoriya?.ikon ?? "Package"} size={14} color={tonu.fg} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold" style={{ color: C.ink }}>
                  {t(kateqoriya?.adKey ?? "bazar.kat.diger")}
                </span>
                {tam ? (
                  <span className="flex items-center gap-1 text-xs font-bold" style={{ color: C.field }}>
                    <Icon name="Check" size={14} color={C.field} strokeWidth={3} />
                    {!yigcam && t("bazar.tovsiye.tam")}
                  </span>
                ) : (
                  <span className="text-xs font-bold" style={{ color: faiz > 0 ? C.goldInk : C.muted, fontVariantNumeric: "tabular-nums" }}>
                    {t("bazar.tovsiye.faiz", { faiz })}
                  </span>
                )}
              </div>
              <div className="mt-1.5 ml-[38px] h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: C.mist }}>
                <div className="bar-dolur h-1.5 rounded-full" style={{ width: `${Math.max(faiz, tam ? 100 : 0)}%`, backgroundColor: tam ? C.field : C.gold }} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t pt-3" style={{ borderColor: C.line }}>
        <span className="text-sm font-semibold" style={{ color: C.muted }}>
          {t("bazar.tovsiye.qalan")}
        </span>
        <span className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}>
          {formatQiymet(plan.qalanMebleg, lang)}
        </span>
      </div>

      {onMehsullar && (
        <button
          type="button"
          onClick={onMehsullar}
          className="basilir mt-3 flex w-full items-center justify-center gap-1 rounded-xl text-sm font-bold"
          style={{ minHeight: 46, backgroundColor: C.fieldSoft, color: C.pine }}
        >
          {t("bazar.tovsiye.cta")}
          <Icon name="ChevronRight" size={16} color={C.pine} />
        </button>
      )}

      <p className="mt-2.5 leading-relaxed" style={{ color: C.muted, fontSize: 11 }}>
        {t("bazar.tovsiye.numune")}
      </p>
    </section>
  );
}
