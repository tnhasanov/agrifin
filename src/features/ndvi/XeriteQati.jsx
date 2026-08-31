import { useEffect, useRef, useState } from "react";

const PEYK_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const PEYK_ATRIBUT = "Görüntü: Esri";

// İndeks yarımşəffafdır ki, altdakı yol, arx və cərgələr görünsün. Tam
// örtsə peyk şəkli mənasız olur, çox şəffaf olsa rəng oxunmur.
const ORTUK_SEFFAFLIQ = 0.72;

// Tam ekranda neçə pillə uzaqlaşmaq olar. Yaxınlaşmanın həddi Esri-nin öz
// həddidir (z19) — süni "böyütmə" əlavə etmirik, çünki o, detal artırmır,
// yalnız pikselləri şişirdir.
const UZAQ_PILLE = 2;

// Sürüşdürmə çərçivəsi sahədən neçə dəfə genişdir. Kiçik dəyər (1,5) telefon
// ekranında uzaqlaşdırmanı TAMAMİLƏ bloklayırdı: Leaflet çərçivəyə sığmayan
// zoom pilləsini söndürür, uzun ekranda isə şaquli görüntü çərçivədən böyük
// olurdu. Brauzerdə ölçülüb seçilib.
const CERCEVE_PAY = 8;

/**
 * İndeks xəritəsi PEYK ŞƏKLİNİN ÜSTÜNDƏ.
 *
 * Əvvəl indeks boz fonda tək dururdu: fermer rəngi görürdü, amma sahənin
 * harasına baxdığını bilmirdi. İndi alt qat Esri peyk görüntüsüdür (~0,5 m)
 * — yol, arx, ağac sırası tanış nişanələrdir — üstündə isə ölçmə.
 *
 * Kartdakı xəritə HƏRƏKƏTSİZDİR: səhifə sürüşəndə barmaq xəritəyə düşüb
 * səhifəni kilidləməsin. Yaxınlaşdırmaq üçün tam ekran açılır — orada
 * `hereketli` ilə sürüşdürmə və zoom işə düşür (bax: TamEkranXerite).
 *
 * PROYEKSİYA QEYDİ: şəkil coğrafi (EPSG:4326) şəbəkədədir, Leaflet isə
 * Merkator göstərir. Sahə ölçüsündə (bir neçə yüz metr) fərq santimetrlərlə
 * ölçülür — 500 m-lik sahədə ~3 sm. Piksel 10 m olduğuna görə görünməzdir.
 */
export function XeriteQati({ konturRengi = "#FFD264",
  noqteler,
  sekil,
  sinirler,
  etiket,
  // Tam ekranda: sürüşdürmə, zoom düymələri, iki barmaqla yaxınlaşdırma
  hereketli = false,
  hundurluk = 260,
}) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const ortukRef = useRef(null);
  const [xeta, setXeta] = useState(false);
  // Xəritə asinxron qurulur; örtük yalnız o hazır olandan sonra əlavə edilə bilər
  const [hazir, setHazir] = useState(false);

  // Qat dəyişəndə yalnız örtük yenilənir — xəritə yenidən qurulmur
  useEffect(() => {
    let dagilib = false;
    let olcuTaymeri = null;

    (async () => {
      try {
        const [{ default: L }] = await Promise.all([
          import("leaflet"),
          import("leaflet/dist/leaflet.css"),
        ]);
        if (dagilib || !divRef.current || mapRef.current) return;

        const map = L.map(divRef.current, {
          zoomControl: hereketli,
          attributionControl: true,
          dragging: hereketli,
          scrollWheelZoom: hereketli,
          touchZoom: hereketli,
          doubleClickZoom: hereketli,
          boxZoom: false,
          keyboard: hereketli,
        });
        L.tileLayer(PEYK_URL, { attribution: PEYK_ATRIBUT, maxZoom: 19 }).addTo(map);
        L.polygon(noqteler, {
          // Xəbərdarlıq aktivdirsə kontur narıncıdır (mock 04, hal F) —
          // xəritənin özü də "hara baxmalı" sualına işarə verir
          color: konturRengi,
          weight: 2,
          fill: false,
          interactive: false,
        }).addTo(map);
        map.fitBounds(noqteler, { padding: [18, 18] });

        if (hereketli) {
          // Fermer öz sahəsini itirməsin: sürüşdürmə sahənin ətrafı ilə
          // məhdudlaşır. Uzaqlaşdırmaya iki pillə yer verilir — sahəni qonşu
          // tarlaların, yolun, arxın yanında görmək müqayisə üçün lazımdır.
          map.setMaxBounds?.(L.latLngBounds(noqteler).pad(CERCEVE_PAY));
          map.setMinZoom?.(Math.max(1, (map.getZoom?.() ?? 15) - UZAQ_PILLE));
        }

        mapRef.current = { L, map };
        setHazir(true);
        // Tam ekran açılanda konteyner ölçüsü bir kadr sonra gəlir; bunsuz
        // Leaflet döşəmələri köhnə ölçüyə görə çəkir və yarısı boş qalır
        olcuTaymeri = setTimeout(() => map.invalidateSize?.(), 60);
      } catch {
        // Xəritə kitabxanası yüklənmirsə şəkil onsuz da göstərilir
        if (!dagilib) setXeta(true);
      }
    })();

    return () => {
      dagilib = true;
      clearTimeout(olcuTaymeri);
      mapRef.current?.map.remove();
      mapRef.current = null;
      ortukRef.current = null;
      setHazir(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(noqteler), hereketli]);

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
        style={{ imageRendering: "pixelated", maxHeight: hundurluk, objectFit: "contain" }}
      />
    );
  }

  return (
    <div ref={divRef} data-testid="sahe-xeritesi" style={{ height: hundurluk, width: "100%" }} />
  );
}
