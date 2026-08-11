import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { XeriteQati } from "./XeriteQati.jsx";

const NOQTELER = [
  [40.4, 47.1],
  [40.4023, 47.1],
  [40.4023, 47.1029],
  [40.4, 47.1029],
];
const SINIRLER = { enMin: 40.4, enMax: 40.4023, uzMin: 47.1, uzMax: 47.1029 };
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

/** Leaflet-in yalnız istifadə etdiyimiz hissəsi */
const { qeydler, leafletDusur } = vi.hoisted(() => ({
  qeydler: {
    tileLayer: [],
    imageOverlay: [],
    polygon: [],
    fitBounds: [],
    mapAyarlari: null,
    silinen: 0,
    maxBounds: null,
    minZoom: null,
    olcuYenilendi: 0,
  },
  leafletDusur: { deyer: false },
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet", () => {
  const qat = (siyahi) => (...args) => {
    siyahi.push(args);
    return { addTo: () => qatObyekti, remove: () => (qeydler.silinen += 1) };
  };
  const qatObyekti = { remove: () => (qeydler.silinen += 1) };

  return {
    default: {
      map: (_div, ayarlar) => {
        if (leafletDusur.deyer) throw new Error("leaflet yüklənmədi");
        qeydler.mapAyarlari = ayarlar;
        return {
          fitBounds: (...args) => qeydler.fitBounds.push(args),
          setMaxBounds: (b) => (qeydler.maxBounds = b),
          setMinZoom: (z) => (qeydler.minZoom = z),
          getZoom: () => 16,
          invalidateSize: () => (qeydler.olcuYenilendi += 1),
          remove: () => {},
        };
      },
      latLngBounds: (noqteler) => ({ noqteler, pad: (n) => ({ noqteler, pad: n }) }),
      tileLayer: qat(qeydler.tileLayer),
      imageOverlay: qat(qeydler.imageOverlay),
      polygon: qat(qeydler.polygon),
    },
  };
});

beforeEach(() => {
  // Massivləri YERİNDƏ təmizləyirik: mock onların istinadını bir dəfə tutur,
  // yenisi ilə əvəz etsək qeydlər köhnəsinə düşür və test boş görünür
  qeydler.tileLayer.length = 0;
  qeydler.imageOverlay.length = 0;
  qeydler.polygon.length = 0;
  qeydler.fitBounds.length = 0;
  qeydler.mapAyarlari = null;
  qeydler.silinen = 0;
  qeydler.maxBounds = null;
  qeydler.minZoom = null;
  qeydler.olcuYenilendi = 0;
  leafletDusur.deyer = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

const cek = (props = {}) =>
  render(
    <XeriteQati
      noqteler={NOQTELER}
      sekil={PNG}
      sinirler={SINIRLER}
      etiket="Sahənin xəritəsi"
      {...props}
    />,
  );

describe("xəritə qatı", () => {
  it("peyk döşəmələrini alt qat kimi qoyur", async () => {
    cek();
    await waitFor(() => expect(qeydler.tileLayer).toHaveLength(1));
    const [url, ayar] = qeydler.tileLayer[0];
    expect(url).toContain("World_Imagery");
    // Atribusiya Esri-nin şərtidir
    expect(ayar.attribution).toContain("Esri");
  });

  // ƏSAS: indeks peyk şəklinin ÜSTÜNDƏ və düz koordinatda oturmalıdır
  it("indeksi şəklin coğrafi sərhədinə oturdur", async () => {
    cek();
    await waitFor(() => expect(qeydler.imageOverlay).toHaveLength(1));
    const [sekil, sinir, ayar] = qeydler.imageOverlay[0];
    expect(sekil).toBe(PNG);
    // Leaflet [[cənub, qərb], [şimal, şərq]] gözləyir
    expect(sinir).toEqual([
      [40.4, 47.1],
      [40.4023, 47.1029],
    ]);
    // Yarımşəffaf olmalıdır ki, altdakı yol və cərgələr görünsün
    expect(ayar.opacity).toBeGreaterThan(0.5);
    expect(ayar.opacity).toBeLessThan(1);
  });

  it("sahənin konturunu çəkir və ona yaxınlaşır", async () => {
    cek();
    await waitFor(() => expect(qeydler.polygon).toHaveLength(1));
    expect(qeydler.polygon[0][0]).toEqual(NOQTELER);
    expect(qeydler.polygon[0][1].fill).toBe(false);
    expect(qeydler.fitBounds[0][0]).toEqual(NOQTELER);
  });

  // Səhifə sürüşəndə barmaq xəritəyə düşüb sürüşməni kilidləməməlidir
  it("xəritə hərəkətsizdir", async () => {
    cek();
    await waitFor(() => expect(qeydler.mapAyarlari).not.toBeNull());
    expect(qeydler.mapAyarlari.dragging).toBe(false);
    expect(qeydler.mapAyarlari.scrollWheelZoom).toBe(false);
    expect(qeydler.mapAyarlari.touchZoom).toBe(false);
  });

  // Tam ekranda yaxınlaşdırma açılır — kartda isə bağlı qalır
  it("hərəkətli rejimdə zoom və sürüşdürmə işə düşür", async () => {
    cek({ hereketli: true });
    await waitFor(() => expect(qeydler.mapAyarlari).not.toBeNull());
    expect(qeydler.mapAyarlari.dragging).toBe(true);
    expect(qeydler.mapAyarlari.touchZoom).toBe(true);
    expect(qeydler.mapAyarlari.zoomControl).toBe(true);
  });

  // Fermer sürüşdürüb qonşu rayonda itməsin
  it("hərəkətli rejimdə sürüşdürməni sahənin ətrafı ilə məhdudlaşdırır", async () => {
    cek({ hereketli: true });
    await waitFor(() => expect(qeydler.maxBounds).not.toBeNull());
    expect(qeydler.maxBounds.noqteler).toEqual(NOQTELER);
    // Fit z16-dır (mock), iki pillə uzaqlaşmağa yer qalır
    expect(qeydler.minZoom).toBe(14);
  });

  it("kartdakı xəritədə məhdudiyyət qoyulmur", async () => {
    cek();
    await waitFor(() => expect(qeydler.mapAyarlari).not.toBeNull());
    expect(qeydler.maxBounds).toBeNull();
  });

  it("qat dəyişəndə köhnə örtük silinir", async () => {
    const { rerender } = cek();
    await waitFor(() => expect(qeydler.imageOverlay).toHaveLength(1));

    rerender(
      <XeriteQati
        noqteler={NOQTELER}
        sekil="data:image/png;base64,YENI"
        sinirler={SINIRLER}
        etiket="Nəmlik"
      />,
    );

    await waitFor(() => expect(qeydler.imageOverlay).toHaveLength(2));
    expect(qeydler.silinen).toBeGreaterThan(0);
    expect(qeydler.imageOverlay[1][0]).toBe("data:image/png;base64,YENI");
  });

  // Leaflet gəlməsə ölçmə itməməlidir — şəkil tək başına göstərilir
  it("xəritə kitabxanası yüklənməsə indeksi şəkil kimi göstərir", async () => {
    leafletDusur.deyer = true;
    cek();
    await waitFor(() => expect(screen.getByAltText("Sahənin xəritəsi")).toBeInTheDocument());
    expect(screen.getByAltText("Sahənin xəritəsi")).toHaveAttribute("src", PNG);
  });
});
