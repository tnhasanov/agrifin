import { Button } from "../../components/Button.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, KOLGE, RADIUS, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { kateqoriyaTap } from "../../../lib/bazar/kataloq.js";
import { siqnalTeklifleri } from "../../../lib/bazar/siqnalTovsiye.js";
import { MehsulKarti } from "./MehsulKarti.jsx";

/**
 * "SAHƏNİZİN BU HƏFTƏKİ EHTİYACI" — açıq sahə siqnallarından bazar təklifi.
 *
 * Bölmə yalnız siqnal varsa görünür (reklam bloku deyil). Hər qrup:
 * siqnalın başlığı → "niyə bu məhsul" izahı → 3-ə qədər məhsul →
 * kateqoriyaya keçid. Dolu düymə YOXDUR: səhifənin əsas hərəkəti
 * "Tövsiyələrə bax"dadır (bax: TesserufatKarti); burada hər şey konturlu
 * və ya mətn keçididir.
 */
export function SiqnalTeklifleri({ siqnallar = [], bitki = null, rayon = null, get }) {
  const { t } = useI18n();
  const qruplar = siqnalTeklifleri(siqnallar, { bitki });
  if (!qruplar.length) return null;

  return (
    <section className="mt-5" aria-label={t("bazar.siqnal.basliq")}>
      <div className="px-1">
        <h2 className="text-sm font-bold tracking-wide" style={{ color: C.ink, fontFamily: font.display }}>
          {t("bazar.siqnal.basliq")}
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
          {t("bazar.siqnal.altyazi")}
        </p>
      </div>

      <div className="mt-2 space-y-3">
        {qruplar.map(({ siqnal, kateqoriya, izahKey, mehsullar }) => {
          const kat = kateqoriyaTap(kateqoriya);
          return (
            <article
              key={siqnal.nov}
              className="p-3.5"
              style={{ backgroundColor: C.card, borderRadius: RADIUS.kart, boxShadow: KOLGE.kart }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="flex shrink-0 items-center justify-center rounded-xl"
                  style={{ width: 34, height: 34, backgroundColor: C.fieldSoft }}
                >
                  <Icon name={siqnal.icon ?? "Sprout"} size={16} color={C.field} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
                    {t(siqnal.basliqKey)}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.muted }}>
                    {t(izahKey)}
                  </p>
                </div>
              </div>

              <div className="-mx-3.5 mt-3 flex gap-2.5 overflow-x-auto px-3.5 pb-1" style={{ scrollSnapType: "x proximity" }}>
                {mehsullar.map((m, i) => (
                  <MehsulKarti key={m.kod} mehsul={m} duzum="sebeke" rayon={rayon} sira={i} onAc={() => get.mehsul(m.kod)} />
                ))}
              </div>

              {kat && (
                <Button variant="ghost" size="sm" ikonSag="ChevronRight" className="-ml-2 mt-1" onClick={() => get.kateqoriya(kateqoriya)}>
                  {t("bazar.siqnal.kateqoriya", { kateqoriya: t(kat.adKey) })}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
