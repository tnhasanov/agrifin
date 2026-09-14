/**
 * KREDİT API TƏQLİDİ — ekran matrisi və vizual QA üçün.
 *
 * Cavab forması api/kredit.js → veziyyetOxu ilə EYNİDİR (muraciet, qerar,
 * teklif, kredit, hadiseler, odenisler). Rəqəmlər real anderraytinqdən deyil,
 * amma bir-biri ilə uyğundur: qalıq ≤ əsas borc, faiz borcu növbəti
 * ödənişin içindədir, gecikmiş halda gecikmeGun > 0 və gecikmisMebleg > 0.
 *
 * `sebekeniQur`-dan SONRA çağırılmalıdır: Playwright-da son qeydiyyat qalib
 * gəlir, yəni bu marşrut oradakı ümumi 501-i üstələyir.
 */

const BUGUN = new Date();
const gun = (ferq) => new Date(BUGUN.getTime() + ferq * 86_400_000).toISOString().slice(0, 10);
const tarix = (ferq) => new Date(BUGUN.getTime() + ferq * 86_400_000).toISOString();

const BOS = { muraciet: null, qerar: null, teklif: null, kredit: null, hadiseler: [], odenisler: [] };

const MURACIET = {
  id: 41,
  hal: "offer_issued",
  mebleg: 6000,
  muddetAy: 6,
  bitki: "pomidor",
  hektar: 10.02,
  tarix: tarix(-2),
};

const TEKLIF = {
  id: 17,
  hal: "issued",
  mebleg: 5400,
  illikFaiz: 11.5,
  muddetAy: 6,
  qurulus: "bicinde_esas",
  sonTarix: gun(180),
  tarix: tarix(-1),
};

const QERAR = { qerar: "approved", mebleg: 5400, sebebler: ["limitAsagiSalinib"], versiya: "v3" };

function kreditYarat({ gecikmeGun = 0 } = {}) {
  const gecikib = gecikmeGun > 0;
  return {
    id: 9,
    hal: "active",
    veziyyet: gecikib ? "overdue" : "active",
    esasBorc: 5400,
    qaliqBorc: 5400,
    faizBorc: gecikib ? 103.42 : 0,
    faizCemi: gecikib ? 103.42 : 51.7,
    faizOdenilen: gecikib ? 0 : 51.7,
    illikFaiz: 11.5,
    muddetAy: 6,
    sonTarix: gun(gecikib ? 120 : 150),
    verilme: tarix(gecikib ? -60 : -30),
    hesablanmisDovr: gecikib ? 2 : 1,
    novbetiTarix: gun(gecikib ? -gecikmeGun : 12),
    novbetiMebleg: 51.71,
    novbetiEsasDaxil: false,
    odenilecekIndi: gecikib ? 103.42 : 0,
    payoffMebleg: gecikib ? 5523.9 : 5471.4,
    gecikmeGun,
    gecikmisMebleg: gecikib ? 103.42 : 0,
    tarix: tarix(gecikib ? -60 : -30),
  };
}

const ODENISLER = [{ tarix: tarix(-30), mebleg: 51.7, faizHissesi: 51.7, esasHissesi: 0 }];

/**
 * @param {"bos"|"teklif"|"aktiv"|"gecikmis"|"yuklenir"|"xeta"} hal
 */
export function kreditCavabi(hal) {
  switch (hal) {
    case "teklif":
      return { ...BOS, muraciet: MURACIET, qerar: QERAR, teklif: TEKLIF };
    case "aktiv":
      return {
        muraciet: { ...MURACIET, hal: "accepted" },
        qerar: QERAR,
        teklif: { ...TEKLIF, hal: "accepted" },
        kredit: kreditYarat(),
        hadiseler: [],
        odenisler: ODENISLER,
      };
    case "gecikmis":
      return {
        muraciet: { ...MURACIET, hal: "accepted" },
        qerar: QERAR,
        teklif: { ...TEKLIF, hal: "accepted" },
        kredit: kreditYarat({ gecikmeGun: 9 }),
        hadiseler: [],
        odenisler: [],
      };
    default:
      return BOS;
  }
}

/** /api/kredit marşrutunu verilən hal ilə təqlid edir */
export async function kreditServeri(page, hal = "bos") {
  await page.route("**/api/kredit**", async (route) => {
    if (hal === "yuklenir") {
      // Heç vaxt cavab vermir — yüklənmə halı ekranda qalır
      await new Promise((r) => setTimeout(r, 60_000));
      return route.abort();
    }
    if (hal === "xeta") {
      return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(kreditCavabi(hal)),
    });
  });
}
