import { Amount } from "../../components/Amount.jsx";
import { FaktSetri, MenbeQeydi } from "../../components/Ayirici.jsx";
import { Chip } from "../../components/Chip.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, TIPO, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { SUVARMA_USULLARI, subsidiyaHesabla } from "../../../lib/subsidiya/index.js";

/**
 * TƏXMİNİ ƏKİN SUBSİDİYASI — fermerin sahəsi üçün 2026 modeli ilə hesab.
 *
 * Üç vəziyyət ayrı-ayrı göstərilir (bax: lib/subsidiya/index.js):
 *   • estimateStatus — aralıq (suvarma bilinmir → min–max + sual),
 *     hesablanıb (tək rəqəm), mənbə lazımdır (rəqəm YOX, səbəb VAR);
 *   • sourceVerified — mənbə qeydində "rəsmi mənbə ilə tutuşdurulub /
 *     hələ tutuşdurulmayıb";
 *   • kreditLimitindeNezereAlinan — ayrıca sətir, indi 0 ₼: təsdiqsiz
 *     subsidiya borc qabiliyyətinə girmir və fermer bunu açıq görür.
 *
 * Kartsız fakt sətirləri, dolu düymə yoxdur. Suvarma seçimi konturlu
 * çiplərdir — bu, sifariş deyil, sualdır.
 */
export function SubsidiyaKarti({ bitki, hektar, suvarma = null, onSuvarma, indi = new Date() }) {
  const { t } = useI18n();
  const n = subsidiyaHesabla({ bitki, hektar, suvarma, indi });
  if (n.estimateStatus === "saheYoxdur" || n.estimateStatus === "bitkiYoxdur") return null;

  const menbeMetni = [
    t("subsidiya.menbe", { il: n.campaignYear }),
    n.menbe?.qerarTarixi ? t("subsidiya.qerar", { tarix: n.menbe.qerarTarixi }) : null,
    t(n.sourceVerified ? "subsidiya.menbeYoxlanib" : "subsidiya.menbeYoxlanmayib"),
  ]
    .filter(Boolean)
    .join(" · ");

  const basliq = (
    <div className="flex items-center justify-between gap-3 pb-1">
      <p className="font-bold" style={{ ...TIPO.metn, color: C.ink, fontFamily: font.display }}>
        {t("subsidiya.basliq")}
      </p>
      <Chip icon="Info" label={t("subsidiya.texmini")} color={C.muted} bg={C.mist} />
    </div>
  );

  const menbe = (
    <MenbeQeydi className="mt-2">
      <Icon name="Info" size={14} color={C.muted} />
      {n.menbe?.url ? (
        <a href={n.menbe.url} target="_blank" rel="noreferrer" style={{ color: C.muted, textDecoration: "underline" }}>
          {menbeMetni}
        </a>
      ) : (
        menbeMetni
      )}
    </MenbeQeydi>
  );

  // Rəqəm yoxdur: bağ dərəcəsi / təkrar əkin əmsalı hələ daxil edilməyib
  if (n.estimateStatus === "menbeLazim") {
    return (
      <section className="mt-5" aria-label={t("subsidiya.basliq")}>
        {basliq}
        <p style={{ ...TIPO.metn, color: C.muted }}>
          {t(n.catismayan?.includes("bag.derece") ? "subsidiya.bag" : "subsidiya.menbeLazim")}
        </p>
        {menbe}
      </section>
    );
  }

  const araliq = n.estimateStatus === "araliq";
  const setir = araliq ? null : n.ekin.setirler[0];
  const dovrMetni = n.dovr
    ? `${t(`subsidiya.dovr.${n.dovr.nov}`)} · ${t(`subsidiya.dovrHal.${n.dovr.hal}`)}`
    : null;

  return (
    <section className="mt-5" aria-label={t("subsidiya.basliq")}>
      {basliq}

      {araliq ? (
        <p className="flex flex-wrap items-baseline gap-x-1.5" aria-label={t("subsidiya.araliqEtiketi")}>
          <Amount value={n.ekin.min} size="lg" texmini />
          <span style={{ ...TIPO.metn, color: C.muted }}>–</span>
          <Amount value={n.ekin.max} size="lg" />
        </p>
      ) : (
        <Amount value={n.ekin.deyer} size="lg" texmini />
      )}
      <p className="mt-0.5" style={{ ...TIPO.qeyd, color: C.muted }}>
        {t("subsidiya.izah")}
      </p>

      {/* Suvarma üsulu — məbləğ ondan asılıdır; seçim sahədə saxlanılır */}
      <div className="mt-3">
        <p style={{ ...TIPO.qeyd, color: araliq ? C.ink : C.muted, fontWeight: araliq ? 600 : 500 }}>
          {t(araliq ? "subsidiya.suvarmaSual" : "subsidiya.suvarmaEtiketi")}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={t("subsidiya.suvarmaEtiketi")}>
          {SUVARMA_USULLARI.map((u) => {
            const secili = suvarma === u;
            return (
              <button
                key={u}
                type="button"
                aria-pressed={secili}
                onClick={() => onSuvarma?.(u)}
                className="btn btn--sm"
                style={{
                  backgroundColor: secili ? C.fieldSoft : C.card,
                  color: secili ? C.pine : C.ink,
                  borderColor: secili ? C.field : C.line,
                  fontWeight: 600,
                }}
              >
                {t(`subsidiya.suvarma.${u}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        {setir && (
          <FaktSetri etiket={t("subsidiya.esas")}>
            {t("subsidiya.esasDeyeri", {
              ha: { number: n.hektar },
              baza: { money: setir.baza },
              emsal: { number: setir.bitkiEmsali * setir.suvarmaEmsali * setir.tekrarEmsali },
            })}
          </FaktSetri>
        )}
        {dovrMetni && <FaktSetri etiket={t("subsidiya.dovrEtiketi")}>{dovrMetni}</FaktSetri>}
        {n.mehsul && (
          <FaktSetri etiket={t("subsidiya.mehsul")}>
            {t("subsidiya.mehsulDeyeri", { derece: { money: n.mehsul.derece } })}
          </FaktSetri>
        )}
        <FaktSetri etiket={t("subsidiya.kreditLimit")} qeyd={t("subsidiya.kreditLimitQeyd")} son>
          <Amount value={n.kreditLimitindeNezereAlinan} size="md" qepik="hec" />
        </FaktSetri>
      </div>

      {menbe}
    </section>
  );
}
