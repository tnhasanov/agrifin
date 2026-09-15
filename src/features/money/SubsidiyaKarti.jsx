import { Amount } from "../../components/Amount.jsx";
import { FaktSetri, MenbeQeydi } from "../../components/Ayirici.jsx";
import { Chip } from "../../components/Chip.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, TIPO, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { subsidiyaHesabla } from "../../../lib/subsidiya.js";

/**
 * GÖZLƏNİLƏN SUBSİDİYA — fermerin sahəsi üçün dövlət dəstəyinin təxmini.
 *
 * Fermer heç nə daxil etmir: bitki və hektar artıq bizdədir. Rəqəm eyni
 * cədvəldən gəlir ki, kredit tavanına da gedir (lib/subsidiya.js) — ekran
 * və qərar eyni rəqəmdən danışır.
 *
 * Kart deyil, fakt sətirləridir (Maliyyə ekranının dili). Dolu düymə yoxdur.
 * Cədvəl təsdiqli olmayana qədər "İlkin" nişanı görünür və mənbə qeydi
 * "rəsmi məbləğ müraciət və qərarla müəyyənləşir" deyir — vəd yoxdur.
 * Server-avtoritativ kredit rəqəmlərinin yanında "nümunə/demo" sözü
 * qadağandır (Pano.test) — bu blok da o qaydaya tabedir: ya hesablanmış
 * təxmin, ya heç nə.
 */
export function SubsidiyaKarti({ bitki, hektar, indi = new Date() }) {
  const { t } = useI18n();
  const n = subsidiyaHesabla({ bitki, hektar, indi });
  if (n.hal === "saheYoxdur" || n.hal === "bitkiYoxdur") return null;

  const basliq = (
    <div className="flex items-center justify-between gap-3 pb-1">
      <p className="font-bold" style={{ ...TIPO.metn, color: C.ink, fontFamily: font.display }}>
        {t("subsidiya.basliq")}
      </p>
      {!n.tesdiqli && <Chip icon="Info" label={t("subsidiya.ilkin")} color={C.muted} bg={C.mist} />}
    </div>
  );

  // Dərəcəsi olmayan bitkidə bölmə YOXDUR: "sizə subsidiya düşmür" demək
  // ilkin cədvəllə vəd qədər yanlış olardı — rəsmi cədvəl gələnə qədər susulur
  if (n.hal !== "hazir") return null;

  const pencere = n.pencere
    ? `${t(`ay.${n.pencere.baslangicAy}`)}–${t(`ay.${n.pencere.sonAy}`)} · ${t(`subsidiya.pencere.${n.pencere.hal}`)}`
    : null;

  return (
    <section className="mt-5" aria-label={t("subsidiya.basliq")}>
      {basliq}
      <Amount value={n.cemi} size="lg" texmini qepik="hec" />
      <p className="mt-0.5" style={{ ...TIPO.qeyd, color: C.muted }}>
        {t("subsidiya.izah")}
      </p>

      <div className="mt-2">
        <FaktSetri etiket={t("subsidiya.esas")}>
          {t("subsidiya.esasDeyeri", { ha: { number: n.setirler[0].hektar }, derece: { money: n.derece } })}
        </FaktSetri>
        {pencere && (
          <FaktSetri etiket={t("subsidiya.pencereEtiketi")} son>
            {pencere}
          </FaktSetri>
        )}
      </div>

      <MenbeQeydi className="mt-2">
        <Icon name="Info" size={14} color={C.muted} />
        {t("subsidiya.menbe", { versiya: n.versiya })}
      </MenbeQeydi>
    </section>
  );
}
