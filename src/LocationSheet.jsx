import { useState } from "react";
import * as L from "lucide-react";
import { RAYONLAR, enYaxinRayon } from "./location.js";

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
  pine: "#14351F",
  field: "#2E7D4F",
  card: "#FFFFFF",
  ink: "#1A211C",
  muted: "#6B7568",
  line: "#E3E8E0",
  danger: "#C24A3F",
};

const font = {
  display: "'Sora', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
};

export default function LocationSheet({ open, current, onSelect, onClose }) {
  const [axtar, setAxtar] = useState("");
  const [gpsHal, setGpsHal] = useState("bos"); // bos | gedir | xeta
  const [gpsXeta, setGpsXeta] = useState("");

  if (!open) return null;

  const gpsIstə = () => {
    if (!navigator.geolocation) {
      setGpsHal("xeta");
      setGpsXeta("Bu cihaz yer təyinini dəstəkləmir.");
      return;
    }
    setGpsHal("gedir");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = +p.coords.latitude.toFixed(4);
        const lon = +p.coords.longitude.toFixed(4);
        const r = enYaxinRayon(lat, lon);
        onSelect({ ad: `${r.ad} (GPS)`, lat, lon, gps: true });
        onClose();
      },
      (err) => {
        setGpsHal("xeta");
        setGpsXeta(
          err.code === 1
            ? "İcazə verilmədi. Rayonu aşağıdan seçə bilərsiniz."
            : "Siqnal tapılmadı. Rayonu aşağıdan seçin."
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const siyahi = RAYONLAR.filter((r) =>
    r.ad.toLocaleLowerCase("az").includes(axtar.toLocaleLowerCase("az"))
  );

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ fontFamily: font.body }}>
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(12,24,16,0.45)" }}
      />

      <div
        className="relative rounded-t-3xl flex flex-col"
        style={{ backgroundColor: C.card, maxHeight: "82%" }}
      >
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold" style={{ color: C.ink, fontFamily: font.display }}>
                Sahənizin yeri
              </h3>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                Hava proqnozu və suvarma tövsiyələri buna görə hesablanır.
              </p>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5" style={{ backgroundColor: "#F1F4EF" }}>
              <Ic n="X" size={16} color={C.muted} />
            </button>
          </div>

          <button
            onClick={gpsIstə}
            disabled={gpsHal === "gedir"}
            className="mt-3 w-full rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-bold"
            style={{
              backgroundColor: C.pine,
              color: "#FFFFFF",
              opacity: gpsHal === "gedir" ? 0.65 : 1,
            }}
          >
            <Ic n={gpsHal === "gedir" ? "LoaderCircle" : "Crosshair"} size={16} color="#E9B54A" />
            {gpsHal === "gedir" ? "Yer təyin edilir…" : "Sahəmin yerini təyin et"}
          </button>

          {gpsHal === "xeta" && (
            <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: C.danger }}>
              <Ic n="AlertCircle" size={13} color={C.danger} /> {gpsXeta}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#F4F7F2" }}>
            <Ic n="Search" size={15} color={C.muted} />
            <input
              value={axtar}
              onChange={(e) => setAxtar(e.target.value)}
              placeholder="Rayon axtarın"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: C.ink }}
            />
          </div>
        </div>

        <div className="overflow-y-auto px-2 py-2">
          {siyahi.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: C.muted }}>
              Rayon tapılmadı.
            </p>
          )}
          {siyahi.map((r) => {
            const seçili = current?.ad === r.ad;
            return (
              <button
                key={r.ad}
                onClick={() => {
                  onSelect({ ad: r.ad, lat: r.lat, lon: r.lon, gps: false });
                  onClose();
                }}
                className="w-full flex items-center justify-between rounded-xl px-3 py-3"
                style={{ backgroundColor: seçili ? "#EAF4EC" : "transparent" }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: seçili ? C.field : C.ink }}
                >
                  {r.ad}
                </span>
                {seçili && <Ic n="Check" size={16} color={C.field} />}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="text-xs font-semibold py-3"
          style={{ color: C.muted, borderTop: `1px solid ${C.line}` }}
        >
          Sonra seçəcəyəm
        </button>
      </div>
    </div>
  );
}
