import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { merkez, sahəHektar, sahəniYoxla } from "../../services/geo.js";
import { track } from "../../lib/analytics.js";

// Peyk təsviri Esri World Imagery-dəndir — pulsuz istifadəyə açıqdır,
// atributsiya məcburidir. Küçə xəritəsi BURADA İŞLƏMİR: kənddə küçə
// xəritəsi boş bej düzbucaqlıdır, fermer öz sahəsini yalnız peyk
// şəklində tanıyır.
const PEYK_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const PEYK_ATRIBUT = "Esri, Maxar, Earthstar Geographics";

const BASLANGIC_ZOOM = 15;

/**
 * Sahə çəkmə ekranı. Fermer peyk şəklinə toxunaraq künc qoyur, küncləri
 * sürükləyib düzəldir, sahə hektarla canlı görünür.
 *
 * Leaflet dinamik yüklənir (~42 kB gzip) — sahə çəkməyən fermer bu yükü
 * heç vaxt almır.
 */
export function FieldDraw({ location, existing, onSave, onClose }) {
  const { t } = useI18n();
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  // Leaflet obyektləri React state-də saxlanmır — yalnız UI-ya lazım olan
  // törəmələr (nöqtə sayı, hektar) state-dədir
  const markersRef = useRef([]);
  const polygonRef = useRef(null);

  const [hazir, setHazir] = useState(false);
  const [xetaAcari, setXetaAcari] = useState(null);
  const [noqteSayi, setNoqteSayi] = useState(0);
  const [hektar, setHektar] = useState(0);

  const noqteler = () => markersRef.current.map((m) => {
    const { lat, lng } = m.getLatLng();
    return [lat, lng];
  });

  const yenile = () => {
    const nq = noqteler();
    setNoqteSayi(nq.length);
    setHektar(nq.length >= 3 ? sahəHektar(nq) : 0);
    setXetaAcari(null);

    const L = LRef.current;
    if (!L) return;
    if (polygonRef.current) {
      polygonRef.current.setLatLngs(nq);
    } else if (nq.length >= 2) {
      polygonRef.current = L.polygon(nq, {
        color: "#F4C542",
        weight: 2,
        fillColor: "#F4C542",
        fillOpacity: 0.18,
      }).addTo(mapRef.current);
    }
  };

  const noqteElaveEt = (latlng) => {
    const L = LRef.current;
    // Künc markeri: barmaq üçün böyük toxunma sahəsi, sürüklənə bilir
    const marker = L.marker(latlng, {
      draggable: true,
      icon: L.divIcon({
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: '<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center"><div style="width:14px;height:14px;border-radius:50%;background:#F4C542;border:2.5px solid #14351F"></div></div>',
      }),
    }).addTo(mapRef.current);
    marker.on("drag", yenile);
    markersRef.current.push(marker);
    yenile();
  };

  const geriAl = () => {
    const marker = markersRef.current.pop();
    if (marker) mapRef.current.removeLayer(marker);
    if (markersRef.current.length < 2 && polygonRef.current) {
      mapRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
    yenile();
  };

  const temizle = () => {
    for (const m of markersRef.current) mapRef.current.removeLayer(m);
    markersRef.current = [];
    if (polygonRef.current) {
      mapRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
    yenile();
  };

  const saxla = () => {
    const nq = noqteler();
    const netice = sahəniYoxla(nq, { yer: location });
    if (!netice.ok) {
      setXetaAcari(netice.xetaAcari);
      track("field.save.rejected", { sebep: netice.xetaAcari });
      return;
    }
    track("field.save.ok", { hektar: netice.hektar, noqte: nq.length });
    onSave({ noqteler: nq, hektar: netice.hektar }, netice.xeberdarlıqAcari);
  };

  useEffect(() => {
    let dagilib = false;

    (async () => {
      // Xəritə kitabxanası yalnız bu ekranda lazımdır
      const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      if (dagilib || !mapDivRef.current) return;
      LRef.current = L;

      const basla = existing?.noqteler?.length
        ? merkez(existing.noqteler)
        : [location?.lat ?? 40.3705, location?.lon ?? 47.1265];

      const map = L.map(mapDivRef.current, {
        center: basla,
        zoom: BASLANGIC_ZOOM,
        zoomControl: false,
        attributionControl: true,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer(PEYK_URL, { attribution: PEYK_ATRIBUT, maxZoom: 19 }).addTo(map);

      map.on("click", (event) => noqteElaveEt(event.latlng));
      mapRef.current = map;

      // Mövcud sahə redaktəyə açılır
      if (existing?.noqteler?.length) {
        for (const [lat, lon] of existing.noqteler) noqteElaveEt({ lat, lng: lon });
        map.fitBounds(existing.noqteler, { padding: [40, 40] });
      }

      setHazir(true);
      track("field.draw.open", { movcud: Boolean(existing) });
    })();

    return () => {
      dagilib = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
      polygonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const kifayetdir = noqteSayi >= 3;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("field.title")}
      className="absolute inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "#0E2818", fontFamily: font.body }}
    >
      {/* Başlıq */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: C.pine }}>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("field.close")}
          className="rounded-full p-1.5"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <Icon name="ChevronLeft" size={18} color="#fff" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-white" style={{ fontFamily: font.display }}>
            {t("field.title")}
          </h2>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            {t("field.subtitle")}
          </p>
        </div>
        {noqteSayi > 0 && (
          <button
            type="button"
            onClick={temizle}
            aria-label={t("field.clear")}
            className="rounded-full p-1.5"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            <Icon name="Trash2" size={15} color="rgba(255,255,255,0.8)" />
          </button>
        )}
      </div>

      {/* Xəritə */}
      <div className="relative flex-1">
        <div ref={mapDivRef} data-testid="field-map" className="absolute inset-0" />

        {!hazir && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ backgroundColor: C.card }}>
              <Icon name="LoaderCircle" size={14} color={C.muted} />
              <span className="text-xs" style={{ color: C.muted }}>
                {t("field.loading")}
              </span>
            </div>
          </div>
        )}

        {/* Canlı ölçü */}
        {hazir && (
          <div
            className="absolute top-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold"
            style={{ backgroundColor: "rgba(14,40,24,0.85)", color: "#fff" }}
            aria-live="polite"
          >
            {kifayetdir
              ? t("field.area", { hektar: { number: hektar } })
              : t("field.tapHint", { count: noqteSayi })}
          </div>
        )}
      </div>

      {/* Alt panel */}
      <div className="px-4 py-3" style={{ backgroundColor: C.card }}>
        {xetaAcari && (
          <p role="alert" className="mb-2 flex items-start gap-1.5 text-xs" style={{ color: C.danger }}>
            <Icon name="AlertCircle" size={13} color={C.danger} /> {t(xetaAcari)}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={geriAl}
            disabled={noqteSayi === 0}
            aria-label={t("field.undo")}
            className="rounded-xl px-3 py-3 text-xs font-bold"
            style={{
              backgroundColor: "#F1F4EF",
              color: C.ink,
              opacity: noqteSayi === 0 ? 0.45 : 1,
            }}
          >
            {t("field.undo")}
          </button>
          <button
            type="button"
            onClick={saxla}
            disabled={!kifayetdir}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold"
            style={{ backgroundColor: C.pine, color: "#fff", opacity: kifayetdir ? 1 : 0.45 }}
          >
            <Icon name="Check" size={16} color={C.gold} />
            {t("field.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
