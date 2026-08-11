import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { gunlukYagis } from "../../services/weather.js";
import { gununSaatlari, torpaqOrtasi } from "../../services/saatlar.js";

// Bundan zəif külək fermerin qərarını dəyişmir; hər saatda rəqəm yazsaq
// sütunlar oxunmaz olur
const KULEK_HEDDI = 12;

/** Soyuq saat mavi, isti saat qırmızı — göz sətri oxumadan tapsın */
function tempRengi(temp) {
  if (!Number.isFinite(temp)) return C.muted;
  if (temp <= 2) return "#2C5BC7";
  if (temp >= 35) return C.danger;
  return C.ink;
}

/**
 * Bir günün saatlıq təfərrüatı.
 *
 * Fermerin qərarları saata bağlıdır: şaxta gecə 4-də vurur, külək günortadan
 * sonra qalxır, yağış axşam başlayır. Zolaqdakı bir rəqəm bunların heç birini
 * demir, ona görə gün seçiləndə saatlar açılır.
 *
 * Torpaq temperaturu ayrıca yazılır: səpin qərarı HAVANIN yox, TORPAĞIN
 * temperaturundan asılıdır və fermer bunu başqa yerdə görmür.
 */
export function SaatlarPaneli({ hourly, gunISO }) {
  const { t } = useI18n();
  const setirler = gununSaatlari(hourly, gunISO);

  if (setirler.length === 0) {
    return (
      <p className="px-1 py-2 text-xs" style={{ color: C.muted }}>
        {t("weather.hourNone")}
      </p>
    );
  }

  const torpaq = torpaqOrtasi(setirler);

  return (
    <div className="mt-2" style={{ borderTop: `1px solid ${C.line}` }}>
      <div className="flex overflow-x-auto pt-2" style={{ gap: 14 }}>
        {setirler.map((s) => {
          const yagis = gunlukYagis(s.yagis);
          return (
            <div key={s.saat} className="flex flex-col items-center" style={{ minWidth: 44 }}>
              <span className="text-xs font-semibold" style={{ color: C.muted }}>
                {String(s.saat).padStart(2, "0")}
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: tempRengi(s.temp), fontFamily: font.body }}
              >
                {s.temp == null ? "—" : `${s.temp}°`}
              </span>
              {/* Yağış və külək yalnız MƏNALI olanda yazılır: hər saatda sıfır
                  göstərmək sətri oxunmaz edir */}
              <span style={{ color: C.blue, fontSize: 10, minHeight: 12 }}>
                {yagis ? t(yagis.az ? "weather.mmAz" : "weather.mm", { mm: yagis.mm }) : ""}
              </span>
              {/* Vahid mütləq yazılır: yağış mm-nin altında tək "16" rəqəmi
                  nəyin 16-sı olduğunu demirdi (ekranda yoxlanılıb) */}
              <span style={{ color: C.muted, fontSize: 9, minHeight: 12 }}>
                {Number.isFinite(s.kulek) && s.kulek >= KULEK_HEDDI
                  ? t("weather.kmS", { kulek: s.kulek })
                  : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 pb-0.5">
        <span className="flex items-center gap-1" style={{ color: C.muted, fontSize: 10 }}>
          <Icon name="Wind" size={11} color={C.muted} />
          {t("weather.windNote")}
        </span>
        {torpaq != null && (
          <span className="flex items-center gap-1" style={{ color: C.muted, fontSize: 10 }}>
            <Icon name="Sprout" size={11} color={C.field} />
            {t("weather.soilTemp", { derece: { number: torpaq, options: { maximumFractionDigits: 1 } } })}
          </span>
        )}
      </div>
    </div>
  );
}
