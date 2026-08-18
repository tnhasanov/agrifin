// api/hesab.js — hesab əməliyyatları BİR funksiyada.
//
// Niyə bir funksiya: Vercel Hobby planında api/ faylı = funksiya, limit 12.
// kod-iste / kod-tesdiq / cix ayrıca fayllar olsaydı üç funksiya yeyərdi.
// Əməl POST gövdəsindəki `emel` sahəsindən seçilir.
//
//   GET               → diaqnostika + (sessiya varsa) telefon
//   POST kod-iste     → {telefon} — OTP yaradıb SMS göndərir
//   POST kod-tesdiq   → {telefon, kod} — cookie qoyur
//   POST cix          → sessiyanı bağlayır, cookie silir
//
// Quraşdırma (Vercel → Settings → Environment Variables):
//   DATABASE_URL   — Storage-da Postgres yaradanda özü gəlir
//   SESSION_SECRET — `openssl rand -hex 32`
//   SMS_URL / SMS_ACAR — şlüz müqaviləsindən sonra (yoxdursa: log rejimi)
import { dbQurulub } from "../lib/db.js";
import { smsGonder, smsRejimi } from "../lib/sms.js";
import {
  cookieToken,
  cookieYaz,
  hesabQurulub,
  otpTesdiqle,
  otpYarat,
  sessiyaBagla,
  sessiyaOxu,
  telefonNormallasdir,
} from "../lib/hesab.js";
import { ipTap } from "../lib/copernicus.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Diaqnostika açar sızdırmır — yalnız qurulub/qurulmayıb
    const cavab = { dbQurulub: dbQurulub(), hesabQurulub: hesabQurulub(), smsRejimi: smsRejimi() };
    if (cavab.dbQurulub && cavab.hesabQurulub) {
      try {
        const istifadeci = await sessiyaOxu(cookieToken(req));
        if (istifadeci) cavab.telefon = istifadeci.telefon;
      } catch (error) {
        console.error("hesab GET:", error?.message);
        cavab.dbXeta = true;
      }
    }
    return res.status(200).json(cavab);
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnız GET/POST" });
  }
  if (!dbQurulub() || !hesabQurulub()) {
    return res.status(501).json({ error: "Hesab sistemi hələ qurulmayıb." });
  }

  try {
    const { emel } = req.body || {};

    if (emel === "kod-iste") {
      const telefon = telefonNormallasdir(req.body?.telefon);
      if (!telefon) return res.status(400).json({ error: "telefonYanlis" });

      const netice = await otpYarat({ telefon, ip: ipTap(req) });
      if (netice.xeta) return res.status(429).json({ error: "hedd" });

      const sms = await smsGonder({
        telefon,
        metn: `AgriFin təsdiq kodu: ${netice.kod}`,
      });
      if (!sms.gonderildi) return res.status(502).json({ error: "smsGetmedi" });
      // Rejim cavabda açıq deyilir: log rejimində UI "kod loglardadır" deyə bilər
      return res.status(200).json({ gonderildi: true, rejim: sms.rejim });
    }

    if (emel === "kod-tesdiq") {
      const telefon = telefonNormallasdir(req.body?.telefon);
      const kod = String(req.body?.kod ?? "").trim();
      if (!telefon || !/^\d{6}$/.test(kod)) return res.status(400).json({ error: "yanlis" });

      const netice = await otpTesdiqle({ telefon, kod });
      if (netice.xeta) return res.status(401).json({ error: netice.xeta });

      cookieYaz(res, req, netice.token);
      return res.status(200).json({ telefon: netice.telefon });
    }

    if (emel === "cix") {
      await sessiyaBagla(cookieToken(req));
      cookieYaz(res, req, "", { sil: true });
      return res.status(200).json({ cixildi: true });
    }

    return res.status(400).json({ error: "Naməlum əməl" });
  } catch (error) {
    console.error("hesab error:", error?.message);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
