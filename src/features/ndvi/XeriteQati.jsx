import { useEffect, useRef, useState } from "react";

const PEYK_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const PEYK_ATRIBUT = "Görüntü: Esri";

// İndeks yarımşəffafdır ki, altdakı yol, arx və cərgələr görünsün. Tam
// örtsə peyk şəkli mənasız olur, çox şəffaf olsa rəng oxunmur.
const ORTUK_SEFFAFLIQ = 0.72;

/**
 * İndeks xəritəsi PEYK ŞƏKLİNİN ÜSTÜNDƏ.
 *
 * Əvvəl indeks boz fonda tək dururdu: fermer rəngi görürdü, amma sahənin
 * harasına baxdığını bilmirdi. İndi alt qat Esri peyk görüntüsüdür (~0,5 m)
 * — yol, arx, ağac sırası tanış nişanələrdir — üstündə isə ölçmə.
 *
 * Xəritə HƏRƏKƏTSİZDİR: səhifə sürüşəndə barmaq xəritəyə düşüb səhifəni
 * kilidləməsin. Fermer sahəni redaktə etmək istəsə çəkmə ekranı var.
 *
 * PROYEKSİYA QEYDİ: şəkil coğrafi (EPSG:4326) şəbəkədədir, Leaflet isə
 * Merkator göstərir. Sahə ölçüsündə (bir neçə yüz metr) fərq santimetrlərlə
 * ölçülür — 500 m-lik sahədə ~3 sm. Piksel 10 m olduğuna görə görünməzdir.
 */
export function XeriteQati({ noqteler, sekil, sinirler, etiket }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const ortukRef = useRef(null);
  const [xeta, setXeta] = useState(false);
  // Xəritə asinxron qurulur; örtük yalnız o hazır olandan sonra əlavə edilə bilər
  const [hazir, setHazir] = useState(false);

  // Qat dəyişəndə yalnız örtük yenilənir — xəritə yenidən qurulmur
  useEffect(() => {
    let dagilib = false;

    (async () => {
      try {
        const [{ default: L }] = await Promise.all([
          import("leaflet"),
          import("leaflet/dist/leaflet.css"),
        ]);
        if (dagilib || !divRef.current || mapRef.current) return;

        const map = L.map(divRef.current, {
          zoomControl: false,
          attributionControl: true,
          dragging: false,
          scrollWheelZoom: false,
          touchZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
        });
        L.tileLayer(PEYK_URL, { attribution: PEYK_ATRIBUT, maxZoom: 19 }).addTo(map);
        L.polygon(noqteler, {
          color: "#FFD264",
          weight: 2,
          fill: false,
          interactive: false,
        }).addTo(map);
        map.fitBounds(noqteler, { padding: [18, 18] });

        mapRef.current = { L, map };
        setHazir(true);
      } catch {
        // Xəritə kitabxanası yüklənmirsə şəkil onsuz da göstərilir
        if (!dagilib) setXeta(true);
      }
    })();

    return () => {
      dagilib = true;
      mapRef.current?.map.remove();
      mapRef.current = null;
      ortukRef.current = null;
      setHazir(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(noqteler)]);

  // `hazir` asılılığı vacibdir: xəritə dinamik import ilə gəlir və bu effekt
  // ilk dəfə ondan ƏVVƏL işləyir. Onsuz örtük heç vaxt əlavə olunmurdu —
  // yalnız qat dəyişəndə görünürdü.
  useEffect(() => {
    const qurulub = mapRef.current;
    if (!hazir || !qurulub || !sekil || !sinirler) return;
    const { L, map } = qurulub;

    ortukRef.current?.remove();
    ortukRef.current = L.imageOverlay(
      sekil,
      [
        [sinirler.enMin, sinirler.uzMin],
        [sinirler.enMax, sinirler.uzMax],
      ],
      { opacity: ORTUK_SEFFAFLIQ, alt: etiket, interactive: false },
    ).addTo(map);
  }, [hazir, sekil, sinirler, etiket]);

  if (xeta) {
    // Leaflet gəlmədisə indeksi tək başına göstəririk — heç nədən yaxşıdır
    return (
      <img
        src={sekil}
        alt={etiket}
        className="block w-full"
        style={{ imageRendering: "pixelated", maxHeight: 260, objectFit: "contain" }}
      />
    );
  }

  return <div ref={divRef} data-testid="sahe-xeritesi" style={{ height: 260, width: "100%" }} />;
}
