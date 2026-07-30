import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { nearestDistrict, searchDistricts } from "../../services/location.js";

const GPS_TIMEOUT_MS = 10000;

export function LocationSheet({ current, onSelect, onClose }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [gps, setGps] = useState({ status: "idle", errorKey: null });
  const sheetRef = useRef(null);

  useEffect(() => {
    sheetRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const requestGps = () => {
    if (!navigator.geolocation) {
      setGps({ status: "error", errorKey: "location.gpsUnsupported" });
      return;
    }

    setGps({ status: "busy", errorKey: null });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lon = Number(position.coords.longitude.toFixed(4));
        const district = nearestDistrict(lat, lon);
        onSelect({
          name: t("location.gpsName", { district: district.name }),
          lat,
          lon,
          gps: true,
        });
        onClose();
      },
      (error) => {
        setGps({
          status: "error",
          // code 1 = PERMISSION_DENIED
          errorKey: error.code === 1 ? "location.gpsDenied" : "location.gpsNoSignal",
        });
      },
      { timeout: GPS_TIMEOUT_MS, enableHighAccuracy: true },
    );
  };

  const districts = searchDistricts(query);
  const busy = gps.status === "busy";

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end"
      style={{ fontFamily: font.body }}
    >
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(12,24,16,0.45)" }}
      />

      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("location.title")}
        className="relative flex flex-col rounded-t-3xl"
        style={{ backgroundColor: C.card, maxHeight: "82%" }}
      >
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="flex items-start justify-between">
            <div>
              <h2
                className="text-base font-bold"
                style={{ color: C.ink, fontFamily: font.display }}
              >
                {t("location.title")}
              </h2>
              <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
                {t("location.subtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("location.close")}
              className="rounded-full p-1.5"
              style={{ backgroundColor: "#F1F4EF" }}
            >
              <Icon name="X" size={16} color={C.muted} />
            </button>
          </div>

          <button
            type="button"
            onClick={requestGps}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
            style={{ backgroundColor: C.pine, color: "#FFFFFF", opacity: busy ? 0.65 : 1 }}
          >
            <Icon name={busy ? "LoaderCircle" : "Crosshair"} size={16} color={C.gold} />
            {busy ? t("location.gpsBusy") : t("location.gpsCta")}
          </button>

          {gps.status === "error" && (
            <p
              className="mt-2 flex items-center gap-1.5 text-xs"
              style={{ color: C.danger }}
              role="alert"
            >
              <Icon name="AlertCircle" size={13} color={C.danger} /> {t(gps.errorKey)}
            </p>
          )}

          <div
            className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: "#F4F7F2" }}
          >
            <Icon name="Search" size={15} color={C.muted} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("location.searchPlaceholder")}
              aria-label={t("location.searchPlaceholder")}
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: C.ink }}
            />
          </div>
        </div>

        <div className="overflow-y-auto px-2 py-2">
          {districts.length === 0 && (
            <p className="py-6 text-center text-xs" style={{ color: C.muted }}>
              {t("location.notFound")}
            </p>
          )}
          {districts.map((district) => {
            const selected = current?.name === district.name;
            return (
              <button
                key={district.name}
                type="button"
                onClick={() => {
                  onSelect({ ...district, gps: false });
                  onClose();
                }}
                aria-current={selected ? "true" : undefined}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3"
                style={{ backgroundColor: selected ? "#EAF4EC" : "transparent" }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: selected ? C.field : C.ink }}
                >
                  {district.name}
                </span>
                {selected && <Icon name="Check" size={16} color={C.field} />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="py-3 text-xs font-semibold"
          style={{ color: C.muted, borderTop: `1px solid ${C.line}` }}
        >
          {t("location.later")}
        </button>
      </div>
    </div>
  );
}
