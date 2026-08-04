// api/saheSekli.js — sahənin NDVI xəritəsi (şəkil).
//
// NİYƏ: orta NDVI ("0,31") fermerə az şey deyir. Sahənin rəngli xəritəsi isə
// PROBLEMİN HARADA olduğunu göstərir — quru künc, susuz zolaq, zəif tala.
// Fermer öz sahəsini tanıyır və "bəli, o künc həmişə quraqdır" deyəndə
// tətbiqə inam yaranır. Orta rəqəm bunu heç vaxt edə bilmir.
//
// Process API rasteri özü hazırlayır; biz hazır PNG alırıq.
import { cerceve, polygonaCevir } from "../lib/geoJson.js";
import {
  BAZA_URL,
  BULUD_SERTI,
  acarQurulub,
  acarlariGizle,
  diaqnostikaCavabi,
  ipTap,
  suretHeddiYarat,
  tokenAl,
} from "../lib/copernicus.js";

const PROCESS_URL = `${BAZA_URL}/process`;

const STANDART_GUN = 30;
const MAX_GUN = 120;
const MAX_DERECE = 0.5;

// Telefon ekranı üçün 384 piksel kifayətdir; daha böyüyü həm yavaş,
// həm də keşdə yer tutur. Sentinel-2 onsuz da 10 m/pikseldir.
const MAX_OLCU = 384;
const MIN_OLCU = 64;

export const maxDuration = 30;

const suretHeddiKecilib = suretHeddiYarat({ pencereMs: 10 * 60 * 1000, hedd: 20 });

/**
 * Xəritə qatları. Fermer aşağıdakı düymələrlə keçir və YALNIZ açdığı qat
 * yüklənir — üç qatı birdən çəkmək emal kvotasını üç dəfə xərcləyərdi.
 *
 * Rəng pillələri kəskindir, hamar keçid deyil: gözəl görünən qradiyent
 * "buradan bura zəifdir" sərhədini itirir, fermerə isə məhz o sərhəd lazımdır.
 */
const BITKI_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
function evaluatePixel(s) {
  var pis = ${BULUD_SERTI};
  // Buludlu və ya sahədən kənar piksel şəffaf qalır
  if (pis || s.dataMask === 0) return [0, 0, 0, 0];
  var cem = s.B08 + s.B04;
  var n = cem === 0 ? 0 : (s.B08 - s.B04) / cem;
  if (n < 0.15) return [0.55, 0.40, 0.26, 1];
  if (n < 0.30) return [0.79, 0.65, 0.34, 1];
  if (n < 0.45) return [0.91, 0.85, 0.35, 1];
  if (n < 0.60) return [0.62, 0.80, 0.33, 1];
  if (n < 0.75) return [0.28, 0.63, 0.29, 1];
  return [0.09, 0.40, 0.17, 1];
}`;

/**
 * NDMI — bitkidəki su. NDVI "zəifdir" deyir, bu isə quru zolağı göstərir:
 * suvarma çatmayan yer xəritədə dərhal görünür.
 */
const NEMLIK_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B08", "B11", "SCL", "dataMask"] }],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
function evaluatePixel(s) {
  var pis = ${BULUD_SERTI};
  if (pis || s.dataMask === 0) return [0, 0, 0, 0];
  var cem = s.B08 + s.B11;
  var n = cem === 0 ? 0 : (s.B08 - s.B11) / cem;
  if (n < -0.10) return [0.66, 0.44, 0.29, 1];
  if (n < 0.00) return [0.85, 0.64, 0.25, 1];
  if (n < 0.10) return [0.91, 0.85, 0.45, 1];
  if (n < 0.20) return [0.55, 0.78, 0.79, 1];
  if (n < 0.35) return [0.24, 0.61, 0.78, 1];
  return [0.12, 0.37, 0.66, 1];
}`;

/**
 * Xəritə qatları. Hər ikisi ÖLÇMƏDİR: piksel 10 m-dir və hamarlanmır,
 * çünki uydurulmuş detal olmayan dəqiqlik iddia edir.
 *
 * Bir müddət "əsl rəng" qatı da vardı və çıxarıldı: sahəni tanımaq işini
 * onsuz da sahə çəkmə xəritəsi görür (FieldDraw, Esri görüntüsü ~0,5 m).
 * Sentinel-2-nin 10 m-i şəkil kimi baxmaq üçün kifayət etmirdi — nə təzə
 * ölçmə qədər faydalı, nə də çəkmə xəritəsi qədər aydın idi.
 */
export const QATLAR = {
  bitki: { evalscript: BITKI_EVALSCRIPT },
  nemlik: { evalscript: NEMLIK_EVALSCRIPT },
};

/** Naməlum qat sorğusu səssizcə bitki qatına düşməməlidir — açıq yoxlanır */
export const qatDuzgun = (qat) => Object.hasOwn(QATLAR, String(qat));

/**
 * Şəklin ölçüsünü sahənin formasından çıxarır ki, uzunsov sahə əzilməsin.
 * 10 m/piksel Sentinel-2-nin öz həlledicilik həddidir — ondan incə istəmək
 * yeni məlumat vermir, yalnız faylı böyüdür.
 */
export function olcuHesabla({ enFerq, uzFerq }, orta) {
  // Dərəcə → metr (uzunluq dərəcəsi enliyə görə qısalır)
  const enMetr = enFerq * 111_320;
  const uzMetr = uzFerq * 111_320 * Math.cos((orta * Math.PI) / 180);

  const boyuk = Math.max(enMetr, uzMetr);
  const kicik = Math.min(enMetr, uzMetr);
  if (!Number.isFinite(boyuk) || boyuk <= 0) return { width: MIN_OLCU, height: MIN_OLCU };

  // DİQQƏT: hər tərəfi ayrıca hədləmək OLMAZ. 400×100 m sahədə hər ikisi
  // aşağı həddə düşür və uzunsov sahə kvadrat kimi görünür — fermer öz
  // sahəsini tanımaz. Ona görə böyük tərəf hədlənir, kiçik tərəf nisbətlə
  // ondan çıxarılır.
  const boyukPiksel = Math.max(MIN_OLCU, Math.min(MAX_OLCU, Math.round(boyuk / 10)));
  const kicikPiksel = Math.max(1, Math.round(boyukPiksel * (kicik / boyuk)));

  return enMetr >= uzMetr
    ? { width: kicikPiksel, height: boyukPiksel }
    : { width: boyukPiksel, height: kicikPiksel };
}

const gunISO = (ms) => new Date(ms).toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(await diaqnostikaCavabi());
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnız POST" });
  }
  if (!acarQurulub()) {
    return res.status(501).json({ error: "Peyk inteqrasiyası hələ qurulmayıb." });
  }
  if (suretHeddiKecilib(ipTap(req))) {
    return res.status(429).json({ error: "Çox sorğu göndərildi. Bir az sonra yoxlayın." });
  }

  try {
    const { noqteler, gun, qat = "bitki" } = req.body || {};
    if (!qatDuzgun(qat)) {
      return res.status(400).json({ error: "Bilinməyən xəritə qatı." });
    }

    const polygon = polygonaCevir(noqteler);
    if (!polygon) {
      return res.status(400).json({ error: "Sahə konturu yararsızdır." });
    }
    const cerc = cerceve(noqteler);
    if (cerc.enFerq > MAX_DERECE || cerc.uzFerq > MAX_DERECE) {
      return res.status(400).json({ error: "Sahə çox böyükdür." });
    }

    const ortaEn = noqteler.reduce((c, p) => c + p[0], 0) / noqteler.length;
    const { width, height } = olcuHesabla(cerc, ortaEn);

    // Şəklin coğrafi sərhədi. Process API `geometry` verildikdə onun əhatə
    // çərçivəsini çəkir, kənar pikselləri isə şəffaf saxlayır — yəni şəklin
    // künc koordinatları məhz bunlardır. Müştəri şəkli peyk xəritəsinin
    // üstünə bu sərhədlə oturdur.
    const enler = noqteler.map((n) => n[0]);
    const uzler = noqteler.map((n) => n[1]);
    const sinirler = {
      enMin: Math.min(...enler),
      enMax: Math.max(...enler),
      uzMin: Math.min(...uzler),
      uzMax: Math.max(...uzler),
    };

    const gunSayi =
      Number.isFinite(gun) && gun >= 5 && gun <= MAX_GUN ? Math.round(gun) : STANDART_GUN;
    const indi = Date.now();
    const basdan = indi - gunSayi * 24 * 60 * 60 * 1000;

    const token = await tokenAl();

    const cavab = await fetch(PROCESS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({
        input: {
          bounds: {
            geometry: polygon,
            properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
          },
          data: [
            {
              type: "sentinel-2-l2a",
              dataFilter: {
                timeRange: { from: `${gunISO(basdan)}T00:00:00Z`, to: `${gunISO(indi)}T23:59:59Z` },
                // Dövr ərzində ƏN AZ BULUDLU görüntü seçilir
                mosaickingOrder: "leastCC",
              },
            },
          ],
        },
        output: {
          width,
          height,
          responses: [{ identifier: "default", format: { type: "image/png" } }],
        },
        evalscript: QATLAR[qat].evalscript,
      }),
    });

    if (!cavab.ok) {
      const detal = acarlariGizle((await cavab.text().catch(() => "")).slice(0, 300));
      console.error("Copernicus process error:", cavab.status, detal);
      return res.status(502).json({ error: "Sahə şəkli alınmadı.", menbeStatus: cavab.status });
    }

    // PNG-ni data URL kimi qaytarırıq: müştəri onu localStorage-də seriya ilə
    // yanaşı saxlaya bilir, ayrıca fayl anbarı lazım gəlmir.
    const bayt = Buffer.from(await cavab.arrayBuffer());
    console.log(`[saheSekli] qat=${qat} ${width}x${height} ${Math.round(bayt.length / 1024)}kB`);

    return res.status(200).json({
      qat,
      sinirler,
      sekil: `data:image/png;base64,${bayt.toString("base64")}`,
      en: width,
      hundurluk: height,
      baslangic: gunISO(basdan),
      son: gunISO(indi),
    });
  } catch (error) {
    console.error("saheSekli error:", error?.status ?? "", acarlariGizle(error?.message).slice(0, 300));
    if (error?.status === 400 || error?.status === 401) {
      return res.status(502).json({ error: "Peyk xidmətinə giriş alınmadı." });
    }
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
