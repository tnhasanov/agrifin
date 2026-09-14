// api/tarixce.js — sahənin çoxillik peyk tarixçəsi: mövsüm zirvələri.
//
// Məhsuldarlıq indeksinin xammalı. Sentinel-2 arxivi 2017-dən tamdır, ona
// görə fermer sahəni BU GÜN çəksə də 8-9 mövsümlük tarixçə dərhal mövcuddur.
//
// HESABLAMA NÜVƏSİ ARTIQ BURADA DEYİL: lib/tarixceGetir.js-dədir, çünki
// eyni nüvəni kredit anderraytinqi də çağırır — sübutu klientdən almaq
// olmaz (bax: lib/saheSubutu.js). Bu fayl indi nazik HTTP örtüyüdür:
// sürət həddi, giriş yoxlaması, status kodları.
//
// XƏRC: sorğu başına ~2 emal vahidi, sahə başına BİR DƏFƏ — tarixçə
// dəyişmir, müştəri onu daimi keşləyir (yalnız cari mövsüm yenilənir).
import { acarQurulub, diaqnostikaCavabi, ipTap, suretHeddiYarat, acarlariGizle } from "../lib/copernicus.js";
import { tarixceGetir } from "../lib/tarixceGetir.js";

// Testlər və müştəri bu adları buradan gözləyir — nüvədən yenidən ixrac
export { ILK_IL, MIN_ETRAF_PIKSEL, aylariCixar, movsumlereBol } from "../lib/tarixceGetir.js";

export const maxDuration = 60;

// Ağır endpoint: sahə başına bir dəfə çağırılmalıdır — hədd aşağıdır
const suretHeddiKecilib = suretHeddiYarat({ pencereMs: 10 * 60 * 1000, hedd: 10 });

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
    const netice = await tarixceGetir({ noqteler: req.body?.noqteler });
    if (!netice.ok) {
      const govde = { error: netice.sebeb };
      if (netice.menbeStatus) govde.menbeStatus = netice.menbeStatus;
      return res.status(netice.status).json(govde);
    }
    // QONAQ NƏTİCƏSİDİR: fermer sahəsini çəkən kimi təhlili görsün deyə
    // autentifikasiyasız qalır. Kredit qərarı bunu OXUMUR — qərar anında
    // server öz sorğusunu edir (bax: lib/saheSubutu.js).
    return res.status(200).json({
      movsumler: netice.movsumler,
      ilkIl: netice.ilkIl,
      etrafAlinib: netice.etrafAlinib,
      etrafAyi: netice.etrafAyi,
      muqayiseli: netice.muqayiseli,
      menbe: netice.menbe,
    });
  } catch (error) {
    console.error("tarixce error:", error?.status ?? "", acarlariGizle(error?.message).slice(0, 300));
    if (error?.status === 400 || error?.status === 401) {
      return res.status(502).json({ error: "Peyk xidmətinə giriş alınmadı." });
    }
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
