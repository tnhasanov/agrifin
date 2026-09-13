/**
 * Bazar brauzer testləri üçün SERVER TƏQLİDİ — `/api/bazar` yaddaşda.
 *
 * Yekunlar REAL domen modulundan hesablanır (lib/bazar/sifaris.js) —
 * server də eyni funksiyanı işlədir, ona görə test ekrandakı rəqəmi
 * serverin yazacağı rəqəmlə tutuşdurur. Sifarişlər sadə vəziyyət maşınıdır:
 * yarat → (ləğv). Statusun irəliləməsi tədarükçü tərəfidir, təqliddə yoxdur.
 *
 * `sebekeniQur`-dan SONRA çağırılmalıdır: Playwright ən son qeydiyyatı
 * əvvəl yoxlayır, ona görə bu marşrut `**\/api/**` catch-all-ını üstələyir.
 */
import { sebetiHesabla, setirleriYoxla, gozlenilenCatdirilma, FERMER_LEGV_OLAR } from "../lib/bazar/sifaris.js";
import { KATALOQ_VERSIYA } from "../lib/bazar/kataloq.js";

export const TELEFON = "+994501234567";

export function bazarServeri({ girisVar = true, maliyyeHal = "uygun" } = {}) {
  const sifarisler = [];
  let sonId = 0;

  const json = (route, status, govde) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(govde) });

  const sifarisYarat = (govde) => {
    const yoxlama = setirleriYoxla(govde.setirler);
    if (!yoxlama.ok) return { status: 400, govde: { error: yoxlama.sebeb } };
    const hesab = sebetiHesabla(yoxlama.setirler, { rayonKod: govde.catdirilma?.rayonKod ?? null });
    const indi = new Date();
    sonId += 1;
    const maliyye = govde.odenisUsulu === "agrofin_financing";
    const sifaris = {
      id: sonId,
      nomre: `AF-${String(sonId).padStart(6, "0")}`,
      hal: "new",
      odenisUsulu: govde.odenisUsulu,
      maliyyeIstenilib: maliyye,
      bitki: "pomidor",
      hektar: 10.02,
      araCem: hesab.araCem,
      catdirilmaHaqqi: hesab.catdirilma,
      cemi: hesab.cemi,
      kataloqVersiyasi: KATALOQ_VERSIYA,
      unvan: {
        rayonKod: govde.catdirilma.rayonKod,
        unvan: govde.catdirilma.unvan || null,
        ad: govde.catdirilma.ad,
        telefon: TELEFON,
        qeyd: govde.catdirilma.qeyd || null,
      },
      gozlenilenTarix: gozlenilenCatdirilma(hesab.tedarukculer, indi).toISOString().slice(0, 10),
      tarix: indi.toISOString(),
      yenilenib: indi.toISOString(),
      legvOlar: true,
      setirler: hesab.setirler.map((s, i) => ({ id: i + 1, ...s })),
      tedarukculer: hesab.tedarukculer.map((t) => ({ kod: t.kod, ad: t.ad })),
      hadiseler: [{ nov: "order_created", haradan: null, haraya: "new", aktor: "farmer", tarix: indi.toISOString() }],
      maliyye: maliyye ? { hal: "requested", mebleg: hesab.maliyyeMeblegi, muracietId: null } : null,
    };
    sifarisler.unshift(sifaris);
    return { status: 200, govde: { sifaris } };
  };

  return {
    oxu: () => sifarisler,
    async qur(page) {
      // Hesab: daxil olmuş fermer (telefon çatdırılma formasına düşür)
      await page.route("**/api/hesab", (route) =>
        json(route, 200, girisVar ? { dbQurulub: true, hesabQurulub: true, telefon: TELEFON } : { dbQurulub: true, hesabQurulub: true }),
      );

      await page.route("**/api/bazar**", async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (req.method() === "GET") {
          if (!girisVar) return json(route, 401, { error: "girisLazim" });
          const id = url.searchParams.get("sifaris");
          if (id) {
            const s = sifarisler.find((x) => String(x.id) === id);
            return s ? json(route, 200, { sifaris: s }) : json(route, 404, { error: "sifarisYoxdur" });
          }
          return json(route, 200, { sifarisler, numune: true });
        }
        const govde = req.postDataJSON() ?? {};
        if (govde.emel === "sebet-hesabla") {
          const yoxlama = setirleriYoxla(govde.setirler);
          if (!yoxlama.ok) return json(route, 400, { error: yoxlama.sebeb });
          return json(route, 200, { hesab: sebetiHesabla(yoxlama.setirler, { rayonKod: govde.rayonKod ?? null }), numune: true });
        }
        if (!girisVar) return json(route, 401, { error: "girisLazim" });
        if (govde.emel === "maliyye-yoxla") {
          const yoxlama = setirleriYoxla(govde.setirler);
          const hesab = sebetiHesabla(yoxlama.setirler);
          const mebleg = Math.round(hesab.maliyyeMeblegi);
          const maliyye =
            maliyyeHal === "uygun"
              ? { hal: "uygun", mebleg, tesdiq: mebleg, muddetAy: 6, illikFaiz: 11.5, ilkAyFaiz: Math.round((mebleg * 0.115) / 12), minKredit: 500, sebebler: [] }
              : { hal: maliyyeHal, mebleg, minKredit: 500, illikFaiz: 11.5 };
          return json(route, 200, { maliyye, hesab });
        }
        if (govde.emel === "sifaris-yarat") {
          const netice = sifarisYarat(govde);
          return json(route, netice.status, netice.govde);
        }
        if (govde.emel === "sifaris-legv") {
          const s = sifarisler.find((x) => x.id === govde.sifarisId);
          if (!s) return json(route, 404, { error: "sifarisYoxdur" });
          if (!FERMER_LEGV_OLAR.includes(s.hal)) return json(route, 409, { error: "legvOlmur", hal: s.hal });
          s.hal = "cancelled";
          s.legvOlar = false;
          s.hadiseler.push({ nov: "cancelled_by_farmer", haradan: "new", haraya: "cancelled", aktor: "farmer", tarix: new Date().toISOString() });
          if (s.maliyye) s.maliyye = { ...s.maliyye, hal: "withdrawn" };
          return json(route, 200, { sifaris: s });
        }
        return json(route, 400, { error: "Naməlum əməl" });
      });
    },
  };
}

/** Quraşdırmanı bitirmiş, sahəsi və bitkisi olan fermer — bazar üçün baza vəziyyət */
export const BAZAR_FERMERI = (BERDE, SAHE) => ({
  onboarded: true,
  onboarding: { versiya: "2.1", tamamlananAddim: "sahe" },
  location: BERDE,
  sonRayonlar: ["berde"],
  sahe: SAHE,
  hesab: { telefon: TELEFON },
  chat: { messages: [], crop: "pomidor", referral: false },
  bagliSiqnallar: [],
});
