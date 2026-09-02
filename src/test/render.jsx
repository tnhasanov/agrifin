import { render } from "@testing-library/react";
import { I18nProvider } from "../i18n/index.jsx";
import { PERSIST_KEY, PERSIST_VERSION, StoreProvider } from "../state/store.jsx";
import { RouterProvider } from "../lib/router.jsx";
import { DEFAULT_LOCATION } from "../services/location.js";

/**
 * İlk açılış keçilmiş kimi göstərir. Bunu etməsək qeydiyyat axını qalxır
 * və digər testlərdə ekranı örtür.
 */
export function seedLocation(location = DEFAULT_LOCATION) {
  seedState({ location, onboarded: true });
}

/**
 * İlk açılış keçilib, amma rayon seçilməyib. Yer seçimi panelinin
 * "hələ seçilməyib" davranışını yoxlamaq üçün.
 */
export function seedOnboarded() {
  seedState({ location: null, onboarded: true });
}

export function seedState(state) {
  window.localStorage.setItem(
    `agrifin:${PERSIST_KEY}`,
    JSON.stringify({ version: PERSIST_VERSION, state }),
  );
}

/** Tətbiqin bütün provayderləri ilə render edir */
export function renderApp(ui) {
  return render(
    <I18nProvider>
      <StoreProvider>
        <RouterProvider>{ui}</RouterProvider>
      </StoreProvider>
    </I18nProvider>,
  );
}

export const WEATHER_FIXTURE = {
  daily: {
    time: ["2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"],
    weather_code: [0, 1, 3, 61, 95],
    temperature_2m_max: [34.2, 33.1, 31.8, 28.4, 27.9],
    temperature_2m_min: [21, 20, 19, 18, 18],
    precipitation_sum: [0, 0, 0, 12, 4],
    et0_fao_evapotranspiration: [5, 5, 5, 3, 3],
  },
  hourly: {
    // İlk 24 saat 29-u, qalanı 30-u — saatlıq panel gün seçimini yoxlayır
    time: Array.from({ length: 36 }, (_, i) =>
      i < 24 ? `2026-07-29T${String(i).padStart(2, "0")}:00` : `2026-07-30T${String(i - 24).padStart(2, "0")}:00`,
    ),
    temperature_2m: Array.from({ length: 36 }, (_, i) => 22 + (i % 12)),
    precipitation: Array.from({ length: 36 }, () => 0),
    wind_speed_10m: Array.from({ length: 36 }, () => 8),
    wind_gusts_10m: Array.from({ length: 36 }, () => 14),
    precipitation_probability: Array.from({ length: 36 }, () => 5),
    relative_humidity_2m: Array.from({ length: 36 }, () => 55),
    dew_point_2m: Array.from({ length: 36 }, () => 12),
    soil_temperature_6cm: Array.from({ length: 36 }, () => 19),
    soil_moisture_0_to_7cm: Array.from({ length: 36 }, () => 0.24),
  },
};

/**
 * Kredit API-sinin sınaq cavabları.
 *
 * Kredit vəziyyəti ARTIQ localStorage-da deyil (bax: api/kredit.js) — ona görə
 * ekran testləri serveri təqlid etməlidir. `kreditServeri()` sadə vəziyyət
 * maşınıdır: müraciət → təklif → kredit, real API ilə eyni formada.
 */
export function kreditServeri({
  mebleg = 2000,
  muddetAy = 12,
  illikFaiz = 11.5,
  faizBorc = 0,
  gecikmeGun = 0,
} = {}) {
  let veziyyet = { muraciet: null, qerar: null, teklif: null, kredit: null, hadiseler: [], odenisler: [] };
  let hadiseNo = 1;

  const cavab = (govde) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(govde) });

  return {
    /** Cari vəziyyət — testlər yoxlaya bilsin */
    oxu: () => veziyyet,
    /** fetch marşrutlayıcısı: /api/kredit sorğularını tutur, qalanı null */
    isle(url, secim) {
      if (!String(url).includes("/api/kredit")) return null;
      const govde = secim?.body ? JSON.parse(secim.body) : null;

      if (govde?.emel === "muraciet") {
        const verilen = Math.min(govde.mebleg, mebleg);
        veziyyet = {
          muraciet: { id: 1, hal: "offer_issued", mebleg: govde.mebleg, muddetAy, bitki: "pomidor" },
          qerar: { qerar: "approved", mebleg: verilen, sebebler: [], versiya: "v1-test" },
          teklif: {
            id: 7,
            hal: "issued",
            mebleg: verilen,
            illikFaiz,
            muddetAy,
            qurulus: "aylik_faiz_cevik_esas",
          },
          kredit: null,
          hadiseler: [],
          odenisler: [],
        };
      } else if (govde?.emel === "teklif-qebul") {
        veziyyet = {
          ...veziyyet,
          muraciet: { ...veziyyet.muraciet, hal: "accepted" },
          teklif: { ...veziyyet.teklif, hal: "accepted" },
          kredit: {
            id: 3,
            hal: "active",
            esasBorc: veziyyet.teklif.mebleg,
            qaliqBorc: veziyyet.teklif.mebleg,
            faizBorc,
            faizCemi: faizBorc,
            faizOdenilen: 0,
            illikFaiz,
            muddetAy,
            novbetiTarix: "2026-05-10",
            novbetiMebleg: 19,
            novbetiEsasDaxil: false,
            gecikmeGun,
            gecikmisMebleg: gecikmeGun > 0 ? faizBorc : 0,
            veziyyet: gecikmeGun > 0 ? "overdue" : "active",
          },
          hadiseler: [
            {
              id: hadiseNo++,
              nov: "disbursement",
              mebleg: veziyyet.teklif.mebleg,
              esasSonra: veziyyet.teklif.mebleg,
              tarix: "2026-04-10T00:00:00.000Z",
            },
          ],
        };
      } else if (govde?.emel === "odenis") {
        // Serverin bölgüsü: əvvəl faiz, sonra əsas borc
        const kredit = veziyyet.kredit;
        const faiz = Math.min(govde.mebleg, kredit.faizBorc);
        const esas = Math.min(govde.mebleg - faiz, kredit.qaliqBorc);
        const yeniEsas = kredit.qaliqBorc - esas;
        const yeniFaiz = kredit.faizBorc - faiz;
        veziyyet = {
          ...veziyyet,
          kredit: {
            ...kredit,
            qaliqBorc: yeniEsas,
            faizBorc: yeniFaiz,
            faizOdenilen: kredit.faizOdenilen + faiz,
            gecikmeGun: yeniFaiz > 0 ? kredit.gecikmeGun : 0,
            gecikmisMebleg: yeniFaiz > 0 ? yeniFaiz : 0,
            veziyyet:
              yeniEsas <= 0 && yeniFaiz <= 0 ? "closed" : yeniFaiz > 0 ? "overdue" : "active",
            hal: yeniEsas <= 0 && yeniFaiz <= 0 ? "repaid" : "active",
          },
          hadiseler: [
            ...(esas > 0
              ? [{ id: hadiseNo++, nov: "principal_repayment", mebleg: esas, esasSonra: yeniEsas, tarix: "2026-05-10T00:00:00.000Z" }]
              : []),
            ...(faiz > 0
              ? [{ id: hadiseNo++, nov: "interest_payment", mebleg: faiz, faizSonra: yeniFaiz, tarix: "2026-05-10T00:00:00.000Z" }]
              : []),
            ...veziyyet.hadiseler,
          ],
          // Serverdəki kimi: ödənişin faiz və əsas payı bir sətirdə
          odenisler: [
            {
              tarix: "2026-05-10T00:00:00.000Z",
              mebleg: faiz + esas,
              faizHissesi: faiz,
              esasHissesi: esas,
              esasQaliq: yeniEsas,
            },
            ...veziyyet.odenisler,
          ],
        };
      } else if (govde?.emel === "legv") {
        veziyyet = { muraciet: { ...veziyyet.muraciet, hal: "rejected" }, qerar: veziyyet.qerar, teklif: null, kredit: null, hadiseler: [], odenisler: [] };
      }

      return cavab(veziyyet);
    },
  };
}
