import { Icon } from "../../components/Icon.jsx";
import { Button } from "../../components/Button.jsx";
import { C, KOLGE, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { BitkiSekli } from "../crop/BitkiSekli.jsx";
import heroSekli from "../../assets/hero/azerbaijan-fields-ai.webp";

/**
 * TƏSƏRRÜFAT KARTI — bazarın "sizin üçün" girişi.
 *
 * Fermerin öz sahəsi: bitki fotosu, "3,8 ha · Şəmkir", tövsiyəyə keçid.
 * Fon ilk açılış ekranındakı Azərbaycan tarlası fotosudur (yenidən
 * yüklənmir — artıq keşdədir), fil dişi keçidlə solur ki, mətn oxunsun.
 *
 * Üç hal, hər biri DÜRÜST:
 *   sahə yoxdur → "sahənizi əlavə edin" dəvəti (uydurma tövsiyə yox);
 *   bitki yoxdur → "bitkinizi seçin";
 *   hər ikisi var → tövsiyələrə keçid.
 */
export function TesserufatKarti({ sahe, bitki, rayon, onTovsiye, onDrawField, onOpenBitki }) {
  const { t } = useI18n();
  const hazir = Boolean(sahe && bitki);

  const cta = !sahe
    ? { label: t("bazar.teserrufat.saheCta"), onClick: onDrawField, ikon: "MapPin" }
    : !bitki
      ? { label: t("bazar.teserrufat.bitkiCta"), onClick: onOpenBitki, ikon: "Leaf" }
      : { label: t("bazar.teserrufat.cta"), onClick: onTovsiye, ikon: "ChevronRight" };

  return (
    <section
      className="relative mt-4 overflow-hidden"
      style={{ borderRadius: 20, boxShadow: KOLGE.qalxan, backgroundColor: C.ivory }}
      aria-label={t("bazar.teserrufat.basliq")}
    >
      <img
        src={heroSekli}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full"
        style={{ objectFit: "cover", objectPosition: "center 70%", opacity: 0.55 }}
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{ background: `linear-gradient(90deg, ${C.ivory} 0%, rgba(251,250,246,0.94) 55%, rgba(251,250,246,0.55) 100%)` }}
      />
      <div className="relative p-4">
        <p className="text-xs font-bold tracking-wide" style={{ color: C.field }}>
          {t("bazar.teserrufat.basliq")}
        </p>
        <div className="mt-2 flex items-center gap-3">
          {hazir ? (
            <BitkiSekli kod={bitki} en={52} hund={62} />
          ) : (
            <span
              className="flex shrink-0 items-center justify-center rounded-xl"
              style={{ width: 52, height: 62, backgroundColor: "rgba(255,255,255,0.7)" }}
            >
              <Icon name={sahe ? "Leaf" : "MapPin"} size={22} color={C.field} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {hazir ? (
              <>
                <p className="text-lg font-extrabold" style={{ color: C.pine, fontFamily: font.display, lineHeight: "24px" }}>
                  {t(`kbcrop.${bitki}`)}
                </p>
                <p className="text-sm font-semibold" style={{ color: C.ink }}>
                  {t("bazar.teserrufat.setir", { ha: { number: sahe.hektar }, rayon: rayon?.name ?? "—" })}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
                  {t("bazar.teserrufat.metn")}
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold leading-relaxed" style={{ color: C.ink }}>
                {t(sahe ? "bazar.teserrufat.bitkiYox" : "bazar.teserrufat.saheYox")}
              </p>
            )}
          </div>
        </div>
        <Button fullWidth className="mt-3" ikonSag={cta.ikon} onClick={cta.onClick}>
          {cta.label}
        </Button>
      </div>
    </section>
  );
}
