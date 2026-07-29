import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { SectionTitle } from "../../components/SectionTitle.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { buildAdvisory, fetchForecast, iconForCode } from "../../services/weather.js";

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
export function WeatherStrip({ lat, lon, days = 5, locationName, onPickLocation }) {
  const { t } = useI18n();
  const [result, setResult] = useState({ status: "loading", data: null, stale: false });
  const { status, data: forecast, stale } = result;

  useEffect(() => {
    const controller = new AbortController();

    fetchForecast({ lat, lon, days: 7, signal: controller.signal })
      .then((response) => {
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
            return (
              <div key={iso} className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold" style={{ color: C.muted }}>
                  {label}
                </span>
                <Icon name={name} size={18} color={wet ? C.blue : C.goldDeep} />
                <span className="text-xs font-bold" style={{ color: C.ink, fontFamily: font.body }}>
                  {Math.round(daily.temperature_2m_max[index])}°
                </span>
              </div>
            );
          })}
        </div>

        <div
          className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
          style={{ backgroundColor: tone.bg, color: tone.fg }}
        >
          <Icon name={tone.icon} size={14} color={tone.fg} />
          {t(advisory.key, advisory.vars)}
        </div>

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
