import { useState } from "react";
import { nearestDistrict } from "../../services/location.js";

const GPS_TIMEOUT_MS = 10000;

/**
 * GPS ilə rayonu təyin edir. Həm yer seçimi paneli, həm də ilk qeydiyyat
 * eyni məntiqi işlədir — icazə rədd edilməsi və siqnal olmaması ayrı-ayrı
 * mesajlara düşür, çünki fermerin görəcəyi addım fərqlidir.
 */
export function useGps({ onSelect, adYarat }) {
  const [gps, setGps] = useState({ status: "idle", errorKey: null });

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
        setGps({ status: "idle", errorKey: null });
        onSelect({ name: adYarat(district.name), lat, lon, gps: true });
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

  return { gps, requestGps, busy: gps.status === "busy" };
}
