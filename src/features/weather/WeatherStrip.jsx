import { useEffect, useState } from "react";
import { SaatlarPaneli } from "./SaatlarPaneli.jsx";
import { Icon } from "../../components/Icon.jsx";
import { Skeleton } from "../../components/Skeleton.jsx";
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

function GozlemeSkeleti({ days }) {
  return (
    <div className="flex justify-between">
      {Array.from({ length: days }).map((_, index) => (
        <div key={index} className="flex flex-col items-center gap-1.5">
          <Skeleton en={26} hund={8} radius={4} />
          <Skeleton en={18} hund={18} radius={9} />
          <Skeleton en={22} hund={8} radius={4} />
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
 *   Əsas ekranda həmişə açıqdır. Söndürmə imkanı o vaxtdan qalıb ki, siqnal
 *   kartı da eyni ekranda idi və eyni proqnozdan eyni cümləni deyirdi; kart
 *   zəngin arxasına keçəndən sonra təkrar riski qalmadı.
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
  // Açıq gün: fermer sütuna toxunanda o günün saatları açılır. Standart
  // bağlıdır — zolaq ilk baxışda qısa qalmalıdır.
  const [aciqGun, setAciqGun] = useState(null);
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
      {/* Sahə çəkilməyibsə proqnoz rayon mərkəzinindir — başlıq da bunu
          deməlidir. "Sahədə hava" sahəsiz fermerə uydurma dəqiqlik vəd edir
          (bax: services/saheYeri.js — deqiq bayrağı). */}
      {deqiq ? t("weather.title") : t("weather.titleRayon", { rayon: locationName ?? "" })}
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
          <GozlemeSkeleti days={days} />
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
            const acilib = aciqGun === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setAciqGun(acilib ? null : iso)}
                aria-expanded={acilib}
                className="flex flex-col items-center gap-1 rounded-lg px-1 py-1"
                style={{ backgroundColor: acilib ? C.mist : "transparent" }}
              >
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
              </button>
            );
          })}
        </div>

        {/* Seçilmiş günün saatları. Yalnız tələb olunanda açılır: 24 sətir
            hər gün üçün açıq dursa zolaq oxunmaz olur. */}
        {aciqGun && <SaatlarPaneli hourly={forecast.hourly} gunISO={aciqGun} />}

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
