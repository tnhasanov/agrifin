import { Amount } from "../../components/Amount.jsx";
import { FaktSetri, MenbeQeydi } from "../../components/Ayirici.jsx";
import { Chip } from "../../components/Chip.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, TIPO, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { subsidiyaHesabla } from "../../../lib/subsidiya/index.js";

/**
 * TƏXMİNİ ƏKİN SUBSİDİYASI — fermerin sahəsi üçün 2026 tarif matrisi ilə hesab.
 *
 * İki rəqəm AYRI-AYRI göstərilir və heç vaxt qarışdırılmır:
 *   • "İlkin təxmin" — tarif × hektar (və ya üsul bilinmirsə aralıq);
 *   • "Kredit hesablamasına daxil edilən məbləğ" — yalnız tarif rəsmi
 *     mənbə ilə tutuşdurulub VƏ uyğunluq təsdiqlənibsə > 0; indi 0 ₼.
 *
 * Suvarma çipləri yalnız bitkinin HƏQİQİ tarifi olan üsullardır: qarğıdalı
 * üçün dəmyə tarifi bilinmir, ona görə üçüncü çip yoxdur. Mənbə linki
 * kliklənir; "rəsmi təsdiqlənib" yalnız verifiedAt dolu olanda yazılır.
 * Çatışmayan məlumatlar ayrıca sətirdə sadalanır.
 */
export function SubsidiyaKarti({ bitki, hektar, suvarma = null, onSuvarma, indi = new Date() }) {
  const { t } = useI18n();
  const n = subsidiyaHesabla({ bitki, hektar, suvarma, indi });
  if (n.estimateStatus === "saheYoxdur" || n.estimateStatus === "bitkiYoxdur") return null;

  const menbeMetni = [
    t("subsidiya.menbe", { ad: n.menbe?.sourceTitle ?? "" }),
    n.menbe?.decisionDate ? t("subsidiya.qerar", { tarix: n.menbe.decisionDate }) : null,
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
      {n.menbe?.sourceUrl ? (
        <a href={n.menbe.sourceUrl} target="_blank" rel="noreferrer" style={{ color: C.muted, textDecoration: "underline" }}>
          {menbeMetni}
        </a>
      ) : (
        <span>{menbeMetni}</span>
      )}
    </MenbeQeydi>
  );

  const catismayan =
    n.catismayanMelumatlar?.length > 0 ? (
      <FaktSetri etiket={t("subsidiya.catismayan")}>
        <span style={{ fontWeight: 500 }}>{n.catismayanMelumatlar.map((k) => t(`subsidiya.catismayan.${k}`)).join(", ")}</span>
      </FaktSetri>
    ) : null;

  const kreditSetri = (
    <FaktSetri etiket={t("subsidiya.kreditLimit")} qeyd={t("subsidiya.kreditLimitQeyd")} son>
      <Amount value={n.kreditLimitindeNezereAlinan} size="md" qepik="hec" />
    </FaktSetri>
  );

  const dovrMetni = n.dovr ? `${t(`subsidiya.dovr.${n.dovr.nov}`)} · ${t(`subsidiya.dovrHal.${n.dovr.hal}`)}` : null;

  // ── Rəqəm yoxdur: bağ dərəcəsi / üsul tarifi / təkrar əkin daxil edilməyib ──
  if (n.estimateStatus === "menbeLazim") {
    const sebeb = n.catismayan?.[0] ?? "";
    const acar = sebeb === "bag.derece" ? "subsidiya.bag" : sebeb.endsWith(".tekrarEkin") ? "subsidiya.tekrarYoxdur" : n.suvarma ? "subsidiya.usulYoxdur" : "subsidiya.menbeLazim";
    return (
      <section className="mt-5" aria-label={t("subsidiya.basliq")}>
        {basliq}
        <p style={{ ...TIPO.metn, color: C.muted }}>{t(acar)}</p>
        {n.ekin?.usullar?.length > 0 && <SuvarmaSecimi usullar={n.ekin.usullar} suvarma={suvarma} onSuvarma={onSuvarma} sual t={t} />}
        <div className="mt-3">
          {catismayan}
          {kreditSetri}
        </div>
        {menbe}
      </section>
    );
  }

  // ── Pambıq: məhsul subsidiyası (₼/ton), hektar rəqəmi YOXDUR ──
  if (n.estimateStatus === "mehsulModeli") {
    return (
      <section className="mt-5" aria-label={t("subsidiya.basliq")}>
        {basliq}
        <p style={{ ...TIPO.metn, color: C.muted }}>{t("subsidiya.mehsulIzah")}</p>
        <div className="mt-3">
          <FaktSetri etiket={t("subsidiya.mehsul")}>
            {t("subsidiya.mehsulDeyeri", { min: { money: n.mehsul.min }, max: { money: n.mehsul.max } })}
          </FaktSetri>
          {dovrMetni && <FaktSetri etiket={t("subsidiya.dovrEtiketi")}>{dovrMetni}</FaktSetri>}
          {catismayan}
          {kreditSetri}
        </div>
        {menbe}
      </section>
    );
  }

  const araliq = n.estimateStatus === "araliq";

  return (
    <section className="mt-5" aria-label={t("subsidiya.basliq")}>
      {basliq}

      <p style={{ ...TIPO.qeyd, color: C.muted, fontWeight: 600 }}>{t("subsidiya.ilkinTexmin")}</p>
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

      <SuvarmaSecimi usullar={n.ekin.usullar} suvarma={suvarma} onSuvarma={onSuvarma} sual={araliq} t={t} />

      <div className="mt-3">
        {!araliq && (
          <FaktSetri etiket={t("subsidiya.esas")}>
            {t("subsidiya.esasDeyeri", { ha: { number: n.hektar }, derece: { money: n.ekin.derece } })}
          </FaktSetri>
        )}
        {dovrMetni && <FaktSetri etiket={t("subsidiya.dovrEtiketi")}>{dovrMetni}</FaktSetri>}
        {catismayan}
        {kreditSetri}
      </div>

      {menbe}
    </section>
  );
}

/** Suvarma üsulu — yalnız bitkinin real tarifi olan üsullar; seçim sahədə saxlanılır */
function SuvarmaSecimi({ usullar, suvarma, onSuvarma, sual, t }) {
  return (
    <div className="mt-3">
      <p style={{ ...TIPO.qeyd, color: sual ? C.ink : C.muted, fontWeight: sual ? 600 : 500 }}>
        {t(sual ? "subsidiya.suvarmaSual" : "subsidiya.suvarmaEtiketi")}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={t("subsidiya.suvarmaEtiketi")}>
        {usullar.map((u) => {
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
  );
}
