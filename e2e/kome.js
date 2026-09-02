/**
 * Brauzer testləri üçün ortaq qurğu.
 *
 * Bütün xarici sorğular burada əvəzlənir: test nə Copernicus-a, nə hava
 * xidmətinə, nə də xəritə plitələrinə çıxmır. Beləliklə nəticə şəbəkənin
 * o günkü halından asılı olmur.
 */
const BUGUN = () => new Date().toISOString().slice(0, 10);

export const HAVA = () => ({
  daily: {
    time: Array.from({ length: 5 }, (_, i) =>
      new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
    ),
    weather_code: [0, 1, 3, 61, 0],
    temperature_2m_max: [31, 30, 29, 27, 30],
    temperature_2m_min: [19, 18, 18, 17, 18],
    precipitation_sum: [0, 0, 0, 6, 0],
    et0_fao_evapotranspiration: [5, 5, 4, 3, 5],
  },
  hourly: {
    time: Array.from({ length: 48 }, (_, i) => `${BUGUN()}T${String(i % 24).padStart(2, "0")}:00`),
    temperature_2m: Array.from({ length: 48 }, () => 25),
    precipitation: Array.from({ length: 48 }, () => 0),
    wind_speed_10m: Array.from({ length: 48 }, () => 8),
    wind_gusts_10m: Array.from({ length: 48 }, () => 12),
    precipitation_probability: Array.from({ length: 48 }, () => 10),
    relative_humidity_2m: Array.from({ length: 48 }, () => 50),
    dew_point_2m: Array.from({ length: 48 }, () => 12),
    soil_temperature_6cm: Array.from({ length: 48 }, () => 20),
    soil_moisture_0_to_7cm: Array.from({ length: 48 }, () => 0.24),
  },
});

const BIR_PIKSEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNsaGj4DwAFhAJ/pdC1uwAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * @param {import('@playwright/test').Page} page
 * @param {object} [secim]
 * @param {"501"|"xeta"|"oflayn"} [secim.api]  Server ucunun davranışı
 */
export async function sebekeniQur(page, { api = "501" } = {}) {
  await page.route("**/api/**", (route) => {
    if (api === "oflayn") return route.abort("internetdisconnected");
    if (api === "xeta") return route.fulfill({ status: 500, body: "{}" });
    // 501 = "bu uc qurulmayıb" — pilotda normal hal
    return route.fulfill({ status: 501, contentType: "application/json", body: "{}" });
  });

  await page.route("**open-meteo.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(HAVA()) }),
  );
  await page.route("**arcgisonline.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: BIR_PIKSEL }),
  );
}

/**
 * Təmiz ilk açılış. `gps` verilsə brauzerin öz icazə dialoqu əvəzinə
 * determinist cavab qoyulur — real icazə pəncərəsi testdə asır.
 *
 * @param {"ugurlu"|"redd"|"vaxt"|null} [gps]
 */
export async function temizAcilis(page, { gps = null, oflayn = false, dil = "az" } = {}) {
  await page.addInitScript(
    ([gpsHal, dilKodu]) => {
      // TƏMİZLƏMƏ YALNIZ BİR DƏFƏ: initScript hər naviqasiyada, yenidən
      // yükləmə də daxil olmaqla işləyir. Şərtsiz `clear()` reload testlərini
      // yalandan sındırırdı — tətbiq deyil, qoşqu vəziyyəti silirdi.
      if (!sessionStorage.getItem("__test-temiz")) {
        localStorage.clear();
        sessionStorage.setItem("__test-temiz", "1");
        localStorage.setItem("agrifin:lang", JSON.stringify(dilKodu));
      }
      if (gpsHal) {
        Object.defineProperty(navigator, "geolocation", {
          configurable: true,
          value: {
            getCurrentPosition: (ugur, xeta) => {
              if (gpsHal === "ugurlu") ugur({ coords: { latitude: 40.3705, longitude: 47.1265 } });
              else if (gpsHal === "redd") xeta({ code: 1 });
              else xeta({ code: 3 });
            },
          },
        });
      }
      if (window.__oflayn) Object.defineProperty(navigator, "onLine", { value: false });
    },
    [gps, dil],
  );
  if (oflayn) await page.addInitScript(() => Object.defineProperty(navigator, "onLine", { value: false }));
}

/** localStorage-a hazır vəziyyət əkir (davam etmə/bypass testləri üçün) */
export async function veziyyetEk(page, state, { version = 10 } = {}) {
  await page.addInitScript(
    ([saxlanan, versiya]) => {
      // Əkmə də bir dəfədir: reload-dan sonra tətbiqin yazdığı vəziyyət
      // qalmalıdır, yoxsa miqrasiyanın nəticəsi üstündən silinərdi
      if (sessionStorage.getItem("__test-ekildi")) return;
      sessionStorage.setItem("__test-ekildi", "1");
      localStorage.clear();
      localStorage.setItem("agrifin:lang", JSON.stringify("az"));
      localStorage.setItem("agrifin:state", JSON.stringify({ version: versiya, state: saxlanan }));
    },
    [state, version],
  );
}

export const BERDE = { kod: "berde", name: "Bərdə", lat: 40.3705, lon: 47.1265, gps: false };

export const SAHE = {
  hektar: 10.02,
  noqteler: [
    [40.4, 47.1],
    [40.4, 47.1024],
    [40.4018, 47.1024],
    [40.4018, 47.1],
  ],
};
