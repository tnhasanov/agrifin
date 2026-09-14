import { Icon } from "../../components/Icon.jsx";
import { C, KOLGE, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { formatQiymet } from "../../lib/format.js";
import { pulsuzCatdirilma, rayonaCatdirilir, tedarukcuTap } from "../../../lib/bazar/kataloq.js";
import { MehsulSekli } from "./MehsulSekli.jsx";
import { MaliyyeNisani, StokNisani, TedarukcuNisani } from "./Nisanlar.jsx";
import { QiymetMenbeyi } from "./QiymetMenbeyi.jsx";

/**
 * MƏHSUL KARTI — iki düzülüş:
 *   • "siyahi": şəkil solda (84 px), mətn sağda — kateqoriya, axtarış,
 *     tədarükçü səhifələri. Bir sətirdə bir məhsul, ad iki sətir kəsilir.
 *   • "sebeke": şəkil üstdə, dar kart (140 px) — ana səhifədəki üfüqi
 *     "Sizin üçün" zolağı.
 *
 * KART SAKİTDİR: ən çox iki nişan (təsdiqli, maliyyə) + stok xəbərdarlığı.
 * Çatdırılma sətri yalnız fermerin rayonu məlum olanda və məhsul ORA
 * çatdırılanda görünür — "hər yerə çatdırılır" yazmaq məlumat deyil.
 *
 * Bütün kart bir <button>-dur (Card ilə eyni prinsip): klaviatura və
 * ekran oxuyucusu üçün.
 */
export function MehsulKarti({ mehsul, duzum = "siyahi", rayon = null, onAc, elave = null, sira = 0 }) {
  const { t, lang } = useI18n();
  const tedarukcu = tedarukcuTap(mehsul.tedarukcu);
  const saticiNumune = mehsul.qiymetNovu === "bazar";
  const saticiTesdiqli = !saticiNumune && tedarukcu?.tesdiqli;
  const rayonaGedir = rayon?.kod ? rayonaCatdirilir(mehsul, rayon.kod) : null;
  const vahid = t(`bazar.vahid.${mehsul.vahidKey}`);
  const etiket = `${mehsul.ad} — ${formatQiymet(mehsul.qiymet, lang)}`;

  if (duzum === "sebeke") {
    return (
      <button
        type="button"
        onClick={() => onAc?.(mehsul)}
        aria-label={etiket}
        className="basilir giris flex shrink-0 flex-col text-left"
        style={{
          "--i": sira,
          width: 148,
          borderRadius: 18,
          backgroundColor: C.card,
          boxShadow: KOLGE.kart,
          padding: 10,
          scrollSnapAlign: "start",
        }}
      >
        <MehsulSekli mehsul={mehsul} olcu={128} radius={14} />
        <span className="mt-2 flex items-center gap-1">
          <TedarukcuNisani tesdiqli={saticiTesdiqli} kicik />
          <StokNisani stok={mehsul.stok} kicik />
        </span>
        <span
          className="mt-1 line-clamp-2 text-xs font-semibold"
          style={{ color: C.ink, lineHeight: "16px", minHeight: 32 }}
        >
          {mehsul.ad}
        </span>
        <span className="mt-1 text-sm font-extrabold" style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}>
          {formatQiymet(mehsul.qiymet, lang)}
        </span>
        <QiymetMenbeyi mehsul={mehsul} kicik />
      </button>
    );
  }

  return (
    <div
      className="giris flex items-stretch gap-3"
      style={{
        "--i": sira,
        borderRadius: 18,
        backgroundColor: C.card,
        boxShadow: KOLGE.kart,
        padding: 12,
      }}
    >
      <button type="button" onClick={() => onAc?.(mehsul)} aria-label={etiket} className="basilir flex min-w-0 flex-1 items-start gap-3 text-left">
        <MehsulSekli mehsul={mehsul} olcu={84} radius={14} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="line-clamp-2 text-sm font-bold" style={{ color: C.ink, lineHeight: "19px" }}>
            {mehsul.ad}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs" style={{ color: C.muted }}>
            <span className="truncate">
              {tedarukcu?.ad}
              {saticiNumune ? ` · ${t("bazar.qiymet.saticiNumuneQisa")}` : ""}
            </span>
            <TedarukcuNisani tesdiqli={saticiTesdiqli} kicik />
          </span>
          <span className="mt-auto flex items-end justify-between gap-2 pt-1.5">
            <span>
              <span className="text-base font-extrabold" style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}>
                {formatQiymet(mehsul.qiymet, lang)}
              </span>
              <span className="ml-1 text-xs" style={{ color: C.muted }}>
                {t("bazar.vahidBasina", { vahid })}
              </span>
            </span>
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1">
            <MaliyyeNisani maliyye={mehsul.maliyye} kicik />
            {pulsuzCatdirilma(mehsul) && (
              <span className="text-xs" style={{ color: C.muted, fontSize: 11 }}>
                · {t("bazar.nisan.pulsuz")}
              </span>
            )}
            <StokNisani stok={mehsul.stok} kicik />
          </span>
          <QiymetMenbeyi mehsul={mehsul} kicik />
          {rayonaGedir === true && (
            <span className="mt-1 flex items-center gap-1" style={{ color: C.field, fontSize: 11, lineHeight: "14px" }}>
              <Icon name="Truck" size={12} color={C.field} />
              {t("bazar.catdirilirRayon", { rayon: rayon.name })}
            </span>
          )}
        </span>
      </button>
      {elave && <div className="flex shrink-0 flex-col justify-end">{elave}</div>}
    </div>
  );
}
