import { Card } from "../../components/Card.jsx";
import { SectionTitle } from "../../components/SectionTitle.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { gunAdi } from "../../lib/tarix.js";

/** Hərəkət tipinə görə ikon/rəng — status yalnız rənglə DEYİL, ikon+mətnlə */
const GORUNUS = {
  gecikme: { icon: "AlertCircle", reng: C.danger, fon: C.dangerSoft },
  siqnal: { icon: "Sprout", reng: C.goldDeep, fon: C.goldSoft },
  giris: { icon: "ShieldCheck", reng: C.pine, fon: C.mist },
  teklif: { icon: "Sparkles", reng: C.field, fon: C.fieldSoft },
  odenisYaxin: { icon: "Calendar", reng: C.goldDeep, fon: C.goldSoft },
  saheCek: { icon: "MapPin", reng: C.field, fon: C.fieldSoft },
  komek: { icon: "Check", reng: C.field, fon: C.fieldSoft },
  yuklenir: { icon: "LoaderCircle", reng: C.muted, fon: C.mist },
  xeta: { icon: "Info", reng: C.goldDeep, fon: C.goldSoft },
};

/**
 * "Bu gün nə etməli?" — panonun bir nömrəli iş kartı.
 *
 * Məzmun determinist həlledicidən gəlir (bax: esasHereket.js) — kart yalnız
 * GÖSTƏRİR. Siqnal tipində siqnalın öz başlıq/mətn açarları işlədilir ki,
 * mühərrikin dediyi ilə panonun dediyi heç vaxt ayrılmasın.
 */
export function EsasHereketKarti({ hereket, onHereket }) {
  const { t } = useI18n();
  if (!hereket) return null;

  const gorunus = GORUNUS[hereket.tip] ?? GORUNUS.komek;
  const siqnal = hereket.siqnal ?? null;
  const basliq = siqnal ? t(siqnal.basliqKey) : t(hereket.basliqKey);
  // Tarix BURADA formatlanır: həlledici safdır, `t`-ni görmür — ona görə
  // ISO sətri ötürür, istifadəçiyə isə "15 Sentyabr" göstərilir
  const deyisenler = hereket.tarix
    ? { ...(hereket.vars ?? {}), tarix: gunAdi(t, hereket.tarix) }
    : (hereket.vars ?? undefined);
  const metn = siqnal ? t(siqnal.metnKey, siqnal.vars) : t(hereket.metnKey, deyisenler);
  const tecilidir = hereket.prioritet <= 2;
  // Ən aşağı prioritet = görüləsi iş yoxdur ("Hər şey qaydasındadır").
  // Yüklənmə/xəta halları da sakit deyil: onlarda ya düymə yoxdur, ya da
  // "yenidən cəhd" real hərəkətdir.
  const sakitdir = hereket.tip === "komek";

  return (
    <>
      {/* Başlıq PAYLAŞILAN komponentdir: bu kart əvvəl özünə məxsus böyük
          hərfli boz sətir yazırdı, qonşu bölmələr isə SectionTitle. Eyni
          səviyyəli iki başlıq iki cür görünəndə ekran səliqəsiz oxunur. */}
      <SectionTitle>{t("pano.hereketBasliq")}</SectionTitle>
      <Card
        className="giris"
        style={tecilidir ? { borderColor: gorunus.reng } : undefined}
        role={tecilidir ? "alert" : undefined}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-xl p-2" style={{ backgroundColor: gorunus.fon }}>
            <Icon name={gorunus.icon} size={16} color={gorunus.reng} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
              {basliq}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.muted }}>
              {metn}
            </p>
            {/* Yüklənmə halında düymə YOXDUR: hələ nəyin lazım olduğunu
                bilmirik, "təsadüfi" bir hərəkət təklif etmək yanıldıcıdır */}
            {/* SAKİT HAL SAKİT GÖRÜNÜR. "Hər şey qaydasındadır" halında
                tam enli tünd düymə ekranın ən güclü elementi olurdu —
                halbuki görüləsi iş YOXDUR. Təklif olunan kömək indi mətn
                keçididir; toxunma sahəsi 44px qalır. */}
            {hereket.ctaKey &&
              (sakitdir ? (
                <button
                  type="button"
                  onClick={() => onHereket?.(hereket)}
                  className="mt-1.5 flex items-center gap-1 text-sm font-bold"
                  style={{ color: C.field, minHeight: 44 }}
                >
                  {t(hereket.ctaKey)}
                  <Icon name="ChevronRight" size={16} color={C.field} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onHereket?.(hereket)}
                  className="basilir mt-2.5 w-full rounded-xl py-2.5 text-sm font-bold"
                  style={{
                    backgroundColor: hereket.tip === "gecikme" ? C.danger : C.pine,
                    color: "#fff",
                    minHeight: 44,
                  }}
                >
                  {t(hereket.ctaKey)}
                </button>
              ))}
          </div>
        </div>
      </Card>
    </>
  );
}
