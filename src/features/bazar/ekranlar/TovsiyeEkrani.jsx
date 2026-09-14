import { Icon } from "../../../components/Icon.jsx";
import { Button } from "../../../components/Button.jsx";
import { SectionTitle } from "../../../components/SectionTitle.jsx";
import { C, KOLGE, RADIUS, font } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { formatQiymet } from "../../../lib/format.js";
import { mehsulTap } from "../../../../lib/bazar/kataloq.js";
import { sayiSix } from "../../../../lib/bazar/sifaris.js";
import { BazarBasliq, IkonDuymesi } from "../BazarBasliq.jsx";
import { BitkiSekli } from "../../crop/BitkiSekli.jsx";
import { MehsulKarti } from "../MehsulKarti.jsx";
import { TovsiyeKarti } from "../TovsiyeKarti.jsx";

/**
 * SAHƏ ÜÇÜN TÖVSİYƏ — əkin planı + hər sətrin məhsulları tövsiyə olunan sayla.
 *
 * "Qalanları səbətə əlavə et" MƏHZ QALANI əlavə edir: hər məhsul üçün plan
 * miqdarından həm artıq alınmış, həm də səbətdə olan miqdar çıxılır.
 * Düymənin üzərindəki məbləğ də elə həmin siyahıdan hesablanır, yəni
 * yazılan rəqəmlə səbətə düşən şey eynidir.
 *
 * MƏHDUDİYYƏT: əhatə yalnız BAZARDAN keçən sifarişləri bilir. Fermer
 * gübrəni kənardan alıbsa plan bunu görmür və həmin miqdarı yenə təklif
 * edir. Bunun həlli fermerin öz ehtiyatını qeyd edə bilməsidir — ayrıca iş.
 */
export function TovsiyeEkrani({ get, geri, sebet, sahe, bitki, rayon, plan, onDrawField, onOpenBitki }) {
  const { t, lang } = useI18n();
  const q = (v) => formatQiymet(v, lang);

  if (!plan || plan.hal !== "hazir") {
    const bitkiYox = plan?.hal === "bitkiYoxdur" || (sahe && !bitki);
    return (
      <div className="px-4 pb-4">
        <BazarBasliq basliq={t("bazar.tovsiye.basliq")} onGeri={geri} />
        <div className="mt-6 rounded-2xl p-6 text-center" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
          <Icon name={bitkiYox ? "Leaf" : "MapPin"} size={24} color={C.field} />
          <p className="mt-2 text-base font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {t(bitkiYox ? "bazar.tovsiye.bitkiYox" : "bazar.tovsiye.saheYox")}
          </p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: C.muted }}>
            {t(bitkiYox ? "bazar.tovsiye.bitkiYoxIzah" : "bazar.tovsiye.saheYoxIzah")}
          </p>
          <Button fullWidth className="mt-4" onClick={bitkiYox ? onOpenBitki : onDrawField}>
            {t(bitkiYox ? "bazar.teserrufat.bitkiCta" : "bazar.teserrufat.saheCta")}
          </Button>
        </div>
      </div>
    );
  }

  /**
   * SƏBƏTƏ NƏ DÜŞÜR — düymənin üzərindəki rəqəmlə EYNİ mənbədən.
   *
   * Əvvəl burada planın TAM miqdarı (`m.say`) əlavə olunurdu, düymədə isə
   * qalan MƏBLƏĞ yazılırdı: 90% qarşılanmış kateqoriya da tam yenidən
   * səbətə düşürdü, üstəlik reducer mövcud sayın üstünə gəldiyi üçün
   * düyməyə iki dəfə basmaq səbəti ikiqat edirdi.
   *
   * İndi üç qayda var:
   *   1) yalnız `qalanSay` — artıq alınmış miqdar təkrar əlavə olunmur;
   *   2) səbətdə olan da çıxılır, yəni təkrar basmaq heç nə dəyişmir
   *      (idempotent) — amma fermerin özünün artırdığı say AZALDILMIR;
   *   3) etiketdə göstərilən məbləğ məhz bu siyahıdan hesablanır.
   */
  const sebetdeki = new Map(sebet.setirler.map((s) => [s.mehsul.kod, s.say]));
  const elaveOlunacaq = plan.setirler
    .flatMap((s) => s.mehsullar)
    .map((m) => {
      const mehsul = mehsulTap(m.kod);
      if (!mehsul) return null;
      // HƏDƏF KATALOQ HƏDDİ İLƏ SIXILIR. Böyük sahədə plan məhsulun maxSay
      // həddini keçə bilər; store onsuz da sıxır, ona görə sıxılmamış hədəflə
      // hesablasaq "əlavə ediləsi qalıb" vəziyyəti heç vaxt bitməzdi —
      // düymə basılsa da yerində qalar, üzərindəki məbləğ isə səbətə heç
      // vaxt düşməyən miqdarı göstərərdi.
      const hedef = sayiSix(mehsul, m.qalanSay);
      const artim = Math.max(0, hedef - (sebetdeki.get(m.kod) ?? 0));
      return artim > 0 ? { kod: m.kod, artim, mebleg: mehsul.qiymet * artim } : null;
    })
    .filter(Boolean);

  const elaveMebleg = elaveOlunacaq.reduce((c, m) => c + m.mebleg, 0);

  const qalanlariElave = () => {
    for (const m of elaveOlunacaq) sebet.elave(m.kod, m.artim);
  };

  return (
    <div className="px-4 pb-4">
      <BazarBasliq
        basliq={t("bazar.tovsiye.basliq")}
        onGeri={geri}
        sag={<IkonDuymesi ikon="ShoppingCart" say={sebet.sayCemi} etiket={t("bazar.sebet")} onClick={() => get.sebet()} />}
      />

      <div className="mt-3 flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: C.fieldSoft }}>
        <BitkiSekli kod={bitki} en={44} hund={52} />
        <div className="min-w-0">
          <p className="text-base font-extrabold" style={{ color: C.pine, fontFamily: font.display }}>
            {t(`kbcrop.${bitki}`)}
          </p>
          <p className="text-xs font-semibold" style={{ color: C.ink }}>
            {t("bazar.teserrufat.setir", { ha: { number: sahe.hektar }, rayon: rayon?.name ?? "—" })}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <TovsiyeKarti plan={plan} />
      </div>

      {elaveOlunacaq.length > 0 && (
        <Button fullWidth className="mt-3" ikon="ShoppingCart" onClick={qalanlariElave}>
          {t("bazar.tovsiye.hamisiniElave")} · {q(elaveMebleg)}
        </Button>
      )}

      <SectionTitle>{t("bazar.tovsiye.tovsiyeMehsullar")}</SectionTitle>
      <div className="space-y-2.5">
        {plan.setirler.flatMap((s) =>
          s.mehsullar.map((m, i) => {
            const mehsul = mehsulTap(m.kod);
            if (!mehsul) return null;
            const vahid = t(`bazar.vahid.${mehsul.vahidKey}`);
            return (
              <MehsulKarti
                key={m.kod}
                mehsul={mehsul}
                rayon={rayon}
                sira={Math.min(i, 8)}
                onAc={() => get.mehsul(m.kod)}
                elave={
                  <div className="flex flex-col items-end gap-1.5">
                    {/* Miqdar SƏTİRLƏ deyil, MƏHSULLA ölçülür: bu məhsuldan
                        nə qədər alınıbsa, yalnız qalanı təklif olunur */}
                    <span className="text-right" style={{ color: C.muted, fontSize: 11, lineHeight: "14px" }}>
                      {m.qalanSay > 0
                        ? t("bazar.tovsiye.mehsulSayi", { say: m.qalanSay, vahid, cemi: q(m.qalanCemi) })
                        : t("bazar.tovsiye.tam")}
                    </span>
                    <button
                      type="button"
                      onClick={() => sebet.elave(m.kod, m.qalanSay)}
                      disabled={m.qalanSay <= 0}
                      aria-label={`${t("bazar.mehsul.sebeteElave")}: ${mehsul.ad}`}
                      className="basilir flex items-center justify-center rounded-full"
                      style={{ width: 44, height: 44, backgroundColor: m.qalanSay > 0 ? C.pine : C.mist }}
                    >
                      <Icon name={m.qalanSay > 0 ? "Plus" : "Check"} size={18} color={m.qalanSay > 0 ? "#fff" : C.muted} />
                    </button>
                  </div>
                }
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
