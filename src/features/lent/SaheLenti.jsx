import { Card } from "../../components/Card.jsx";
import { Icon } from "../../components/Icon.jsx";
import { SectionTitle } from "../../components/SectionTitle.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { necheGunEvvel, ortukFaizi } from "../../services/ndvi.js";

/**
 * Sahə lenti — Monzo feed-inin buradakı qarşılığı.
 *
 * Bankda hər əməliyyat lentə düşür; burada "əməliyyat" peykin sahədən
 * keçməsidir. Hər ölçmə bir sətirdir: nə vaxt, örtük neçə faiz, əvvəlkinə
 * görə hansı istiqamətdə. Fermer siyahını yuxarıdan aşağı oxuyub mövsümün
 * hekayəsini görür — sparkline bunu deyə bilmir, çünki rəqəmsiz və tarixsizdir.
 *
 * Yalnız REAL ölçmələr: seriya boşdursa lent də yoxdur. Uydurma sətir,
 * nümunə tarix yoxdur.
 */
export function SaheLenti({ peyk = { hal: "yoxdur", seriya: [] }, radar = { hal: "yoxdur" } }) {
  const { t } = useI18n();

  if (peyk.hal !== "hazir" || (peyk.seriya?.length ?? 0) === 0) return null;

  // Ən yenisi üstdə; dəyişmə əvvəlki ölçmə ilə müqayisədir
  const setirler = peyk.seriya
    .map((olcme, i) => {
      const evvelki = peyk.seriya[i - 1];
      const faiz = ortukFaizi(olcme.ndvi);
      const evvelkiFaiz = evvelki ? ortukFaizi(evvelki.ndvi) : null;
      return {
        acar: olcme.son,
        gun: necheGunEvvel(olcme.son),
        faiz,
        ferq: evvelkiFaiz == null ? null : faiz - evvelkiFaiz,
        suAz: Number.isFinite(olcme.nemlik) && olcme.nemlik < 0,
      };
    })
    .reverse();

  // Radar oxunuşu lentin öz sətri kimi: optik ölçmə buludda qalanda bu,
  // lentin yeganə təzə xəbəri olur
  const radarSetri =
    radar.hal === "hazir" && radar.xulase
      ? {
          gun: necheGunEvvel(radar.xulase.tarix),
          suVar: radar.xulase.suVar,
          suPayi: radar.xulase.suPayi,
        }
      : null;

  const tarixYaz = (gun) =>
    gun === 0 ? t("lent.buGun") : t("lent.gunEvvel", { gun });

  return (
    <>
      <SectionTitle>{t("lent.basliq")}</SectionTitle>
      <Card style={{ padding: "6px 16px" }}>
        {radarSetri && (
          <div
            className="giris flex items-center gap-3 py-3"
            style={{ borderBottom: `1px solid ${C.line}` }}
          >
            <div className="rounded-full p-2" style={{ backgroundColor: "rgba(74,144,226,0.12)" }}>
              <Icon name="Radar" size={14} color="#4A90E2" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {radarSetri.suVar
                  ? t("lent.radarSu", { faiz: Math.round(radarSetri.suPayi * 100) })
                  : t("lent.radar")}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                {tarixYaz(radarSetri.gun)} · Sentinel-1
              </p>
            </div>
          </div>
        )}

        {setirler.map((s, index) => (
          <div
            key={s.acar}
            className="giris flex items-center gap-3 py-3"
            style={{
              "--i": index,
              borderBottom: index < setirler.length - 1 ? `1px solid ${C.line}` : "none",
            }}
          >
            <div className="rounded-full p-2" style={{ backgroundColor: C.fieldSoft }}>
              <Icon name="Satellite" size={14} color={C.field} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {t("lent.olcme")}
              </p>
              <p className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                {tarixYaz(s.gun)} · Sentinel-2
                {/* Su işarəsi yalnız quraqlıqda: hər sətirdə təkrarlanan
                    "hər şey qaydasındadır" nişanı heç nə demir */}
                {s.suAz && <Icon name="Droplets" size={11} color={C.goldDeep} />}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-bold"
                style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
              >
                {s.faiz}%
              </p>
              {s.ferq != null && s.ferq !== 0 && (
                <p
                  className="text-xs font-semibold"
                  style={{ color: s.ferq > 0 ? C.field : C.danger }}
                >
                  {s.ferq > 0 ? "▲" : "▼"} {Math.abs(s.ferq)} b.
                </p>
              )}
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
