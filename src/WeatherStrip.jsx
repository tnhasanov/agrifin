import { useState, useEffect } from "react";
import * as L from "lucide-react";

// App.jsx-dəki ilə eyni təhlükəsiz ikon
const Ic = ({ n, size = 16, color = "currentColor", strokeWidth = 2 }) => {
  const Cmp = L[n];
  if (Cmp) return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5" fill={color} />
    </svg>
  );
};

const C = {
  field: "#2E7D4F",
  goldDeep: "#C9932B",
  blue: "#3E7BFA",
  card: "#FFFFFF",
  ink: "#1A211C",
  muted: "#6B7568",
  line: "#E3E8E0",
};

const font = {
  display: "'Sora', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
};

// Həftənin günləri (getDay: 0 = bazar)
const GUN = ["Baz", "B.e", "Ç.ax", "Çərş", "C.ax", "Cümə", "Şən"];

// WMO hava kodu -> ikon adı
function ikon(kod) {
  if (kod === 0) return { n: "Sun", wet: false };
  if (kod <= 2) return { n: "CloudSun", wet: false };
  if (kod <= 48) return { n: "Cloud", wet: false };
  if (kod <= 67) return { n: "CloudRain", wet: true };
  if (kod <= 77) return { n: "CloudSnow", wet: true };
  if (kod <= 82) return { n: "CloudRain", wet: true };
  if (kod <= 86) return { n: "CloudSnow", wet: true };
  return { n: "CloudLightning", wet: true };
}

const TON = {
  yas: { bg: "#EAF1FD", fg: "#2C5BC7", ikon: "Droplets" },
  quru: { bg: "#FBF1DA", fg: "#8A6410", ikon: "AlertCircle" },
  normal: { bg: "#EAF4EC", fg: "#256B41", ikon: "Wind" },
};

// Real rəqəmlərdən tövsiyə qurur — prioritet sırası ilə
function tovsiye(g, s) {
  const yagis3 = g.precipitation_sum.slice(0, 3).reduce((a, b) => a + (b || 0), 0);
  if (yagis3 >= 10) {
    return {
      metn: `Növbəti 3 gündə ${Math.round(yagis3)} mm yağış gözlənilir. Suvarmanı saxlayın.`,
      ton: "yas",
    };
  }

  const yagis7 = g.precipitation_sum.slice(0, 7).reduce((a, b) => a + (b || 0), 0);
  const et7 = g.et0_fao_evapotranspiration.slice(0, 7).reduce((a, b) => a + (b || 0), 0);
  const catismazliq = et7 - yagis7;
  if (catismazliq > 25) {
    return {
      metn: `Bu həftə ${Math.round(catismazliq)} mm su çatışmazlığı. Suvarma tövsiyə olunur.`,
      ton: "quru",
    };
  }

  for (let i = 0; i < 36; i++) {
    const kulek = s.wind_speed_10m?.[i] ?? 99;
    const ehtimal = s.precipitation_probability?.[i] ?? 100;
    if (kulek < 12 && ehtimal < 20) {
      const vaxt = new Date(s.time[i]);
      const etiket = i < 12 ? "bu gün" : GUN[vaxt.getDay()];
      return {
        metn: `Dərmanlama üçün əlverişli vaxt: ${etiket} — külək zəif, yağış yoxdur.`,
        ton: "normal",
      };
    }
  }

  const nem = s.soil_moisture_0_to_7cm?.[0];
  return {
    metn: `Torpağın səth nəmliyi ${nem != null ? Math.round(nem * 100) : "—"}%. Şərait normaldır.`,
    ton: "normal",
  };
}

const Baslik = ({ children, yerAd, onYerSec }) => (
  <div className="flex items-center justify-between mt-5 mb-2 px-1">
    <h3 className="text-sm font-bold tracking-wide" style={{ color: C.ink, fontFamily: font.display }}>
      {children}
    </h3>
    {onYerSec && (
      <button
        onClick={onYerSec}
        className="flex items-center gap-1 text-xs font-semibold"
        style={{ color: C.field }}
      >
        <Ic n="MapPin" size={12} color={C.field} />
        {yerAd || "Yeri seçin"}
        <Ic n="ChevronDown" size={12} color={C.field} />
      </button>
    )}
  </div>
);

const Qutu = ({ children }) => (
  <div
    className="rounded-2xl"
    style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, padding: "12px" }}
  >
    {children}
  </div>
);

export default function WeatherStrip({ lat = 40.3705, lon = 47.1265, gunSayi = 5, yerAd, onYerSec }) {
  const [hava, setHava] = useState(null);
  const [xeta, setXeta] = useState(false);

  useEffect(() => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,` +
      `et0_fao_evapotranspiration` +
      `&hourly=wind_speed_10m,precipitation_probability,soil_moisture_0_to_7cm` +
      `&timezone=Asia%2FBaku&forecast_days=7`;

    let legv = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => !legv && setHava(j))
      .catch(() => !legv && setXeta(true));
    return () => {
      legv = true;
    };
  }, [lat, lon]);

  if (xeta) {
    return (
      <>
        <Baslik yerAd={yerAd} onYerSec={onYerSec}>Sahədə hava</Baslik>
        <Qutu>
          <p className="text-xs" style={{ color: C.muted }}>
            Hava məlumatı hazırda əlçatan deyil.
          </p>
        </Qutu>
      </>
    );
  }

  if (!hava) {
    return (
      <>
        <Baslik yerAd={yerAd} onYerSec={onYerSec}>Sahədə hava</Baslik>
        <Qutu>
          <div className="flex justify-between">
            {Array.from({ length: gunSayi }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div style={{ width: 26, height: 8, borderRadius: 4, backgroundColor: C.line }} />
                <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.line }} />
                <div style={{ width: 22, height: 8, borderRadius: 4, backgroundColor: C.line }} />
              </div>
            ))}
          </div>
        </Qutu>
      </>
    );
  }

  const g = hava.daily;
  const qeyd = tovsiye(g, hava.hourly);
  const ton = TON[qeyd.ton];

  return (
    <>
      <Baslik yerAd={yerAd} onYerSec={onYerSec}>Sahədə hava</Baslik>
      <Qutu>
        <div className="flex justify-between">
          {g.time.slice(0, gunSayi).map((iso, i) => {
            const { n, wet } = ikon(g.weather_code[i]);
            const etiket = i === 0 ? "Bu gün" : GUN[new Date(iso).getDay()];
            return (
              <div key={iso} className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold" style={{ color: C.muted }}>
                  {etiket}
                </span>
                <Ic n={n} size={18} color={wet ? C.blue : C.goldDeep} />
                <span className="text-xs font-bold" style={{ color: C.ink }}>
                  {Math.round(g.temperature_2m_max[i])}°
                </span>
              </div>
            );
          })}
        </div>

        <div
          className="mt-3 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2"
          style={{ backgroundColor: ton.bg, color: ton.fg }}
        >
          <Ic n={ton.ikon} size={14} color={ton.fg} /> {qeyd.metn}
        </div>
      </Qutu>
    </>
  );
}
