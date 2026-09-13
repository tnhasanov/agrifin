import { Icon } from "../../../components/Icon.jsx";
import { SectionTitle } from "../../../components/SectionTitle.jsx";
import { C, KOLGE, RADIUS, font } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { formatQiymet } from "../../../lib/format.js";
import { mehsulTap } from "../../../../lib/bazar/kataloq.js";
import { BazarBasliq, IkonDuymesi } from "../BazarBasliq.jsx";
import { BitkiSekli } from "../../crop/BitkiSekli.jsx";
import { MehsulKarti } from "../MehsulKarti.jsx";
import { TovsiyeKarti } from "../TovsiyeKarti.jsx";

/**
 * SAHƏ ÜÇÜN TÖVSİYƏ — əkin planı + hər sətrin məhsulları tövsiyə olunan sayla.
 * "Qalanları səbətə əlavə et" yalnız əhatəsi tam olmayan kateqoriyaların
 * məhsullarını əlavə edir — artıq alınmış toxum ikinci dəfə səbətə düşmür.
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
          <button
            type="button"
            onClick={bitkiYox ? onOpenBitki : onDrawField}
            className="basilir mt-4 w-full text-sm font-bold"
            style={{ minHeight: 48, borderRadius: RADIUS.idare, backgroundColor: C.pine, color: "#fff" }}
          >
            {t(bitkiYox ? "bazar.teserrufat.bitkiCta" : "bazar.teserrufat.saheCta")}
          </button>
        </div>
      </div>
    );
  }

  const qalanlar = plan.setirler.filter((s) => s.ehate < 1).flatMap((s) => s.mehsullar);
  const qalanlariElave = () => {
    for (const m of qalanlar) sebet.elave(m.kod, m.say);
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

      {qalanlar.length > 0 && (
        <button
          type="button"
          onClick={qalanlariElave}
          className="basilir mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-bold"
          style={{ minHeight: 48, borderRadius: RADIUS.idare, backgroundColor: C.pine, color: "#fff" }}
        >
          <Icon name="ShoppingCart" size={16} color="#fff" />
          {t("bazar.tovsiye.hamisiniElave")} · {q(plan.qalanMebleg)}
        </button>
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
                    <span className="text-right" style={{ color: C.muted, fontSize: 11, lineHeight: "14px" }}>
                      {t("bazar.tovsiye.mehsulSayi", { say: m.say, vahid, cemi: q(m.cemi) })}
                    </span>
                    <button
                      type="button"
                      onClick={() => sebet.elave(m.kod, m.say)}
                      aria-label={`${t("bazar.mehsul.sebeteElave")}: ${mehsul.ad}`}
                      className="basilir flex items-center justify-center rounded-full"
                      style={{ width: 44, height: 44, backgroundColor: s.ehate >= 1 ? C.mist : C.pine }}
                    >
                      <Icon name={s.ehate >= 1 ? "Check" : "Plus"} size={18} color={s.ehate >= 1 ? C.muted : "#fff"} />
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
