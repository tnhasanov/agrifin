import { useCallback, useEffect, useRef, useState } from "react";
import { nearestDistrict } from "../../services/location.js";
import { track } from "../../lib/analytics.js";

const GPS_TIMEOUT_MS = 10000;

/**
 * GPS ilə rayonu təyin edir.
 *
 * HALLAR AYRIDIR, ÇÜNKİ FERMERİN GÖRƏCƏYİ İŞ AYRIDIR:
 *   • `redd`    — icazə verilmədi: təkrar cəhdin mənası yoxdur, siyahıya yönəlt;
 *   • `vaxt`    — siqnal gəlmədi: təkrar cəhd real şansdır, "yenidən" göstər;
 *   • `oflayn`  — şəbəkə yoxdur: siyahı onsuz da işləyir, dürüst de;
 *   • `desteksiz` — brauzerdə geolokasiya yoxdur.
 *
 * Əvvəl "vaxt" ilə "siqnal yoxdur" eyni mesaja düşürdü və fermer icazəni
 * rədd etmədiyi halda da "icazə" mətnini görürdü.
 *
 * İCAZƏ YALNIZ TOXUNUŞDAN SONRA istənilir: bu hook heç nəyi öz-özünə
 * çağırmır, `requestGps` düyməyə bağlıdır.
 *
 * ANALİTİKA KOORDİNAT GÖRMÜR: yalnız üsul və nəticə yazılır (bax:
 * lib/analytics.js) — dəqiq məkan telemetriyaya çıxmır.
 */
export function useGps({ onSelect, adYarat }) {
  const [gps, setGps] = useState({ status: "idle", errorKey: null });
  const canli = useRef(true);

  useEffect(() => {
    canli.current = true;
    return () => {
      canli.current = false;
    };
  }, []);

  const legvEt = useCallback(() => {
    setGps({ status: "idle", errorKey: null });
    track("onb.gps", { netice: "legv" });
  }, []);

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGps({ status: "error", sebeb: "desteksiz", errorKey: "location.gpsUnsupported" });
      track("onb.gps", { netice: "desteksiz" });
      return;
    }
    // Oflayn halda brauzer onsuz da uğursuz olacaq — fermeri gözlətmirik
    if (typeof navigator.onLine === "boolean" && !navigator.onLine) {
      setGps({ status: "error", sebeb: "oflayn", errorKey: "location.gpsOffline" });
      track("onb.gps", { netice: "oflayn" });
      return;
    }

    setGps({ status: "busy", sebeb: null, errorKey: null });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!canli.current) return;
        const lat = Number(position.coords.latitude.toFixed(4));
        const lon = Number(position.coords.longitude.toFixed(4));
        const district = nearestDistrict(lat, lon);
        setGps({ status: "idle", sebeb: null, errorKey: null });
        // Analitikaya YALNIZ rayon kodu gedir, koordinat yox
        track("onb.gps", { netice: "ugurlu", rayon: district.kod });
        onSelect({
          kod: district.kod,
          name: adYarat(district.name),
          lat,
          lon,
          gps: true,
        });
      },
      (error) => {
        if (!canli.current) return;
        // 1 = PERMISSION_DENIED, 3 = TIMEOUT, 2 = POSITION_UNAVAILABLE
        const sebeb = error.code === 1 ? "redd" : error.code === 3 ? "vaxt" : "siqnal";
        setGps({
          status: "error",
          sebeb,
          errorKey:
            sebeb === "redd"
              ? "location.gpsDenied"
              : sebeb === "vaxt"
                ? "location.gpsTimeout"
                : "location.gpsNoSignal",
        });
        track("onb.gps", { netice: sebeb });
      },
      { timeout: GPS_TIMEOUT_MS, enableHighAccuracy: true },
    );
  }, [adYarat, onSelect]);

  return {
    gps,
    requestGps,
    legvEt,
    busy: gps.status === "busy",
    // Təkrar cəhd yalnız şans olanda təklif olunur — rədd edilmiş icazəni
    // düymə ilə "yenidən" istəmək fermeri eyni divara aparır
    tekrarOlar: gps.sebeb === "vaxt" || gps.sebeb === "siqnal" || gps.sebeb === "oflayn",
  };
}
