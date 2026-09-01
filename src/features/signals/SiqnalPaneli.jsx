import { Icon } from "../../components/Icon.jsx";
import { Sheet } from "../../components/Sheet.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { SiqnalKarti } from "./SiqnalKarti.jsx";

/**
 * Bildirişlər paneli — zəngə toxunanda ÜSTDƏ açılır, ayrı ekran açılmır.
 *
 * Əvvəl zəng məsləhət ekranına aparırdı: fermer hava zolağını açıb saatlara
 * baxırdısa, geri qayıdanda hamısı bağlı idi. Bildiriş baxmaq üçün olduğun
 * yeri itirmək düzgün deyil — panel bağlananda arxadakı ekran eyni yerdədir.
 *
 * Kartlar burada da iş görür: bağlamaq və çata keçmək panelin içindən
 * mümkündür. Yalnız oxumaq üçün açılan panel bir addım artıq deməkdir.
 */
export function SiqnalPaneli({
  acilib,
  siqnallar = [],
  onBagla,
  onSiqnaliBagla,
  onHereket,
  onHamisi,
  // Sahə yoxdursa panel "Sahənizdən" demir — xəbərdarlıqlar rayon üzrədir
  saheVar = true,
  rayon = null,
}) {
  const { t } = useI18n();

  const altYazi = siqnallar.length > 0
    ? saheVar
      ? t("siqnal.panelAltYazi", { count: siqnallar.length })
      : t("siqnal.panelRayonAltYazi", { count: siqnallar.length, rayon })
    : saheVar
      ? t("siqnal.panelBosAltYazi")
      : t("siqnal.panelRayonBosAltYazi", { rayon });

  return (
    <Sheet acilib={acilib} onBagla={onBagla} baslik={t("siqnal.panelBasliq")} altYazi={altYazi}>
      {siqnallar.length === 0 ? (
        // Boş vəziyyət susqun deyil: "siqnal yoxdur" özü də xəbərdir —
        // sahədə problem görünmür deməkdir
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <div className="rounded-2xl p-3" style={{ backgroundColor: C.mist }}>
            <Icon name="ShieldCheck" size={22} color={C.field} />
          </div>
          <p className="mt-3 text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {saheVar ? t("siqnal.bosBasliq") : t("siqnal.rayonBosBasliq", { rayon })}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
            {saheVar ? t("siqnal.bosMetn") : t("siqnal.rayonBosMetn")}
          </p>
        </div>
      ) : (
        <>
          {siqnallar.map((siqnal, index) => (
            <SiqnalKarti
              key={siqnal.id}
              siqnal={siqnal}
              saheVar={saheVar}
              rayon={rayon}
              onBagla={onSiqnaliBagla}
              onHereket={() => {
                // Çat panelin altında qalmasın deyə əvvəl panel bağlanır
                onBagla();
                onHereket();
              }}
              style={{ "--i": index, marginBottom: 12 }}
            />
          ))}

          <button
            type="button"
            onClick={onHamisi}
            className="mt-1 w-full rounded-xl py-2.5 text-xs font-bold"
            style={{ backgroundColor: C.mist, color: C.pine }}
          >
            {t("siqnal.panelHamisi")}
          </button>
        </>
      )}
    </Sheet>
  );
}
