import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { SectionTitle } from "../../components/SectionTitle.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { buildAdvisory, fetchForecast, gunlukYagis, iconForCode, proqnozIsleyir } from "../../services/weather.js";

const TONE = {
  wet: { bg: C.blueSoft, fg: "#2C5BC7", icon: "Droplets" },
  dry: { bg: C.goldSoft, fg: "#8A6410", icon: "AlertCircle" },
  normal: { bg: "#EAF4EC", fg: "#256B41", icon: "Wind" },
};

function Box({ children }) {
  return (
    <div
      className="rounded-2xl"
      style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, padding: 12 }}
    >
      {children}
    </div>
  );
}

function Skeleton({ days }) {
  return (
    <div className="flex justify-between">
      {Array.from({ length: days }).map((_, index) => (
        <div key={index} className="flex flex-col items-center gap-1.5">
          <div style={{ width: 26, height: 8, borderRadius: 4, backgroundColor: C.line }} />
          <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.line }} />
          <div style={{ width: 22, height: 8, borderRadius: 4, backgroundColor: C.line }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Koordinatlar dəyişəndə komponent `key` ilə yenidən qurulur (bax: HomeScreen) —
 * effektin içində vəziyyəti "loading"-ə qaytarmağa ehtiyac qalmır.
 */
/**
 * @param {boolean} meslehetGoster Zolağın altındakı bir sətirlik məsləhət.
 *   Sahə siqnalları varsa söndürülür: onlar eyni proqnozdan daha dəqiq
 *   (peyk ölçməsi ilə birlikdə) nəticə çıxarır və eyni cümləni iki dəfə
 *   göstərmək fermeri çaşdırır.
 */
export function WeatherStrip({
  lat,
  lon,
  days = 5,
  locationName,
  onPickLocation,
  onDrawField,
  // Proqnoz sahənin öz mərkəzinə aiddirsə true; rayon mərkəzinə aiddirsə false
  deqiq = false,
  meslehetGoster = true,
}) {
  const { t } = useI18n();
  const [result, setResult] = useState({ status: "loading", data: null, stale: false });
  const { status, data: forecast, stale } = result;

  useEffect(() => {
    const controller = new AbortController();

    fetchForecast({ lat, lon, days: 7, signal: controller.signal })
      .then((response) => {
        // 200 gəlməsi məzmunun düzgün olması demək deyil — boş və ya naqis
        // cavabda "əlçatan deyil" göstəririk, çöküb tətbiqi aparmaqdansa
        if (!proqnozIsleyir(response.data)) {
          setResult({ status: "error", data: null, stale: false });
          return;
        }
        setResult({ status: "ready", data: response.data, stale: response.stale });
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setResult({ status: "error", data: null, stale: false });
        }
      });

    return () => controller.abort();
  }, [lat, lon]);

  // Başlığın sağ tərəfi yer seçicisidir; seçici verilmirsə sadəcə müddəti yazır
  const header = (
    <SectionTitle
      action={
        onPickLocation ? (
          <>
            <Icon name="MapPin" size={12} color={C.field} />
            {locationName || t("location.pick")}
            <Icon name="ChevronDown" size={12} color={C.field} />
          </>
        ) : (
          t("common.days7")
        )
      }
      onAction={onPickLocation}
    >
      {t("weather.title")}
    </SectionTitle>
  );

  if (status === "error") {
    return (
      <>
        {header}
        <Box>
          <p className="text-xs" style={{ color: C.muted }}>
            {t("weather.unavailable")}
          </p>
        </Box>
      </>
    );
  }

  if (status === "loading" || !forecast) {
    return (
      <>
        {header}
        <Box>
          <Skeleton days={days} />
        </Box>
      </>
    );
  }

  const daily = forecast.daily;
  const advisory = buildAdvisory(daily, forecast.hourly);
  const tone = TONE[advisory.tone] ?? TONE.normal;

  return (
    <>
      {header}
      <Box>
        <div className="flex justify-between">
          {daily.time.slice(0, days).map((iso, index) => {
            const { name, wet } = iconForCode(daily.weather_code[index]);
            const label =
              index === 0 ? t("common.today") : t(`weather.day.${new Date(iso).getDay()}`);
            // Neçə mm — buludun nə demək olduğunu ancaq bu rəqəm deyir
            const yagis = gunlukYagis(daily.precipitation_sum?.[index]);
            return (
              <div key={iso} className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold" style={{ color: C.muted }}>
                  {label}
                </span>
                <Icon name={name} size={18} color={wet ? C.blue : C.goldDeep} />
                <span className="text-xs font-bold" style={{ color: C.ink, fontFamily: font.body }}>
                  {Math.round(daily.temperature_2m_max[index])}°
                </span>
                {/* Gecə temperaturu ARTIQ gətirilirdi (şaxta siqnalı onu
                    işlədir), sadəcə göstərilmirdi. Fermer üçün gecə gündüzdən
                    vacibdir: şaxta gecə vurur, meyvə gecə-gündüz fərqi ilə
                    şirinləşir. Əlavə sorğu getmir. */}
                <span style={{ color: C.muted, fontSize: 11, fontFamily: font.body }}>
                  {Math.round(daily.temperature_2m_min[index])}°
                </span>
                {/* Yağışsız günlərdə də yer saxlanılır ki, sütunlar sürüşməsin */}
                <span style={{ color: C.blue, fontSize: 10, minHeight: 12 }}>
                  {yagis ? t(yagis.az ? "weather.mmAz" : "weather.mm", { mm: yagis.mm }) : ""}
                </span>
              </div>
            );
          })}
        </div>

        {meslehetGoster && (
          <div
            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
            style={{ backgroundColor: tone.bg, color: tone.fg }}
          >
            <Icon name={tone.icon} size={14} color={tone.fg} />
            {t(advisory.key, advisory.vars)}
          </div>
        )}

        {/* Proqnozun HANSI nöqtəyə aid olduğu. Bunu yazmasaq zolağın başlığı
            "Ağdam" göstərir, rəqəmlər isə sahənin öz nöqtəsindən gəlir — və ya
            əksinə, fermer rayon mərkəzinin proqnozunu öz sahəsininki sanır.
            Azərbaycanda yağış çox yerlidir: fərq 10–20 km-də real fərqdir. */}
        {deqiq ? (
          <p className="mt-2 px-1" style={{ color: C.muted, fontSize: 10 }}>
            {t("weather.pointField")}
          </p>
        ) : (
          <button
            type="button"
            onClick={onDrawField}
            disabled={!onDrawField}
            className="mt-2 px-1 text-left"
            style={{ color: C.muted, fontSize: 10 }}
          >
            {t(onDrawField ? "weather.pointDistrictCta" : "weather.pointDistrict")}
          </button>
        )}

        {stale && (
          <div className="mt-2 flex items-center gap-1.5 px-1 text-xs" style={{ color: C.muted }}>
            <Icon name="WifiOff" size={12} color={C.muted} />
            {t("weather.cached")}
          </div>
        )}
      </Box>
    </>
  );
}
