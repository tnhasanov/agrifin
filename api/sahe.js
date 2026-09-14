// api/sahe.js — istifadəçinin sahəsi və ölçmə arxivi serverdə.
//
// Faza 1-in mənası: sahə brauzerdən çıxıb hesaba bağlanır. Brauzer təmizlənsə,
// telefon dəyişsə — kontur, tarixçə snapshot-u və bal jurnalı qalır.
//
//   GET             → {sahe, snapshotlar: {tarixce}}
//   PUT             → {noqteler, bitki} — sahəni yazır/yeniləyir. HEKTAR
//                     KLİENTDƏN QƏBUL EDİLMİR: serverdə konturdan geodezik
//                     hesablanır (kredit tavanı ona bağlıdır).
//   POST snapshot   → {nov: "tarixce", mezmun} — bahalı peyk nəticəsinin nüsxəsi
//   POST bal        → {bal, bant, etibar, amiller} — KALİBRLƏMƏ JURNALI:
//                     hər hesablama amillərlə yazılır ki, ödəniş nəticələri
//                     yığılanda çəkiləri yenidən hesablamaq mümkün olsun.
//                     Cədvəl versiyası serverdə damğalanır.
//
// Hamısı sessiya tələb edir. Qeydiyyatsız istifadəçi üçün heç nə dəyişmir —
// tətbiq localStorage ilə əvvəlki kimi işləyir; bu API yalnız ƏLAVƏDİR.
import { sorgu, dbQurulub } from "../lib/db.js";
import { cookieToken, hesabQurulub, sessiyaOxu } from "../lib/hesab.js";
import { MIN_NOQTE, polygonaCevir } from "../lib/geoJson.js";
import { CEDVEL, BANTLAR } from "../lib/mehsuldarliq.js";
import { sahəHektar, sahəniYoxla } from "../lib/geo.js";
import { konturHash } from "../lib/konturHash.js";

// Cədvəl dəyişəndə bu versiya da dəyişməlidir — jurnal sətri hansı çəkilərlə
// yazıldığını bilməlidir. Məzmundan çıxarılır: unutmaq mümkün deyil.
const CEDVEL_VERSIYASI = `v1-${CEDVEL.map((a) => `${a.key}${a.maxXal}`).join(".")}`;

const SNAPSHOT_NOVLERI = new Set(["tarixce"]);
const BANT_ADLARI = new Set(BANTLAR.map((b) => b.ad));

export default async function handler(req, res) {
  if (!dbQurulub() || !hesabQurulub()) {
    return res.status(501).json({ error: "Hesab sistemi hələ qurulmayıb." });
  }

  let istifadeci;
  try {
    istifadeci = await sessiyaOxu(cookieToken(req));
  } catch (error) {
    console.error("sahe sessiya:", error?.message);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
  if (!istifadeci) return res.status(401).json({ error: "Giriş tələb olunur." });

  try {
    if (req.method === "GET") {
      const [sahe] = await sorgu(
        "SELECT id, noqteler, hektar, hektar_server, bitki FROM saheler WHERE istifadeci_id=$1",
        [istifadeci.id],
      );
      if (!sahe) return res.status(200).json({ sahe: null, snapshotlar: {} });

      const snapshotSetirleri = await sorgu(
        "SELECT nov, mezmun FROM peyk_snapshotlar WHERE sahe_id=$1",
        [sahe.id],
      );
      const snapshotlar = Object.fromEntries(snapshotSetirleri.map((s) => [s.nov, s.mezmun]));
      return res.status(200).json({
        // Serverin ölçüsü varsa O qayıdır (avtoritativ); köhnə sətirlərdə
        // hələ backfill olunmayıbsa klient dəyəri ilə davam edilir
        sahe: {
          noqteler: sahe.noqteler,
          hektar: sahe.hektar_server ?? sahe.hektar,
          bitki: sahe.bitki,
        },
        snapshotlar,
      });
    }

    if (req.method === "PUT") {
      const { noqteler, hektar, bitki } = req.body || {};
      // Eyni yoxlama peyk endpointlərindəki kimi — zibil kontur bazaya düşməsin
      if (!polygonaCevir(noqteler)) {
        return res.status(400).json({ error: `Sahə konturu yararsızdır (ən azı ${MIN_NOQTE} künc).` });
      }
      // ═══ HEKTAR KLİENTDƏN QƏBUL EDİLMİR ═══════════════════════════════
      // Gəlir modeli gəliri hektara vurur (lib/gelir.js) və kredit tavanı
      // oradan çıxır — yəni klientin dediyi hektar limitə birbaşa təsir
      // edərdi. Ölçü konturun ÖZÜNDƏN, geodezik düsturla hesablanır;
      // klientin göndərdiyi rəqəm yalnız diaqnostika sütununda qalır.
      const serverHektar = sahəHektar(noqteler);
      const yoxlama = sahəniYoxla(noqteler);
      if (!yoxlama.ok) {
        return res.status(400).json({ error: "Sahə konturu yararsızdır.", sebeb: yoxlama.xetaAcari });
      }
      const hash = konturHash(noqteler);
      await sorgu(
        `INSERT INTO saheler (istifadeci_id, noqteler, hektar, hektar_server, kontur_hash, bitki)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (istifadeci_id) DO UPDATE
           SET noqteler=$2, hektar=$3, hektar_server=$4, kontur_hash=$5, bitki=$6,
               yenilenib=now()`,
        [
          istifadeci.id,
          JSON.stringify(noqteler),
          Number.isFinite(hektar) ? hektar : null,
          serverHektar,
          hash,
          typeof bitki === "string" ? bitki : null,
        ],
      );
      // Cavabda SERVERİN dəyəri qayıdır — klient öz rəqəmini deyil, bunu
      // göstərməlidir ki, ekranla qərar eyni ölçüdən danışsın
      return res.status(200).json({ yazildi: true, hektar: serverHektar });
    }

    if (req.method === "POST") {
      const [sahe] = await sorgu("SELECT id FROM saheler WHERE istifadeci_id=$1", [istifadeci.id]);
      if (!sahe) return res.status(409).json({ error: "Əvvəl sahə yazılmalıdır." });

      const { emel } = req.body || {};

      if (emel === "snapshot") {
        const { nov, mezmun } = req.body || {};
        if (!SNAPSHOT_NOVLERI.has(nov) || mezmun == null) {
          return res.status(400).json({ error: "yanlis" });
        }
        // KLİENT SNAPSHOT-U ANDERRAYTİNQDƏ İŞLƏDİLMİR: burada yazılan sətir
        // menbe='klient' damğası alır və kredit qərarı onu oxumur (qərar
        // yalnız serverin özünün gətirdiyi ölçmələrə baxır — bax:
        // lib/saheSubutu.js). Sətir yenə saxlanılır: oflayn UI-ni sürətli
        // açır və kalibrləmə üçün dəyərlidir.
        await sorgu(
          `INSERT INTO peyk_snapshotlar (sahe_id, nov, mezmun, menbe) VALUES ($1, $2, $3, 'klient')
           ON CONFLICT (sahe_id, nov, menbe) DO UPDATE SET mezmun=$3, yaradilib=now()`,
          [sahe.id, nov, JSON.stringify(mezmun)],
        );
        return res.status(200).json({ yazildi: true });
      }

      if (emel === "bal") {
        const { bal, bant, etibar, amiller } = req.body || {};
        if (
          !Number.isInteger(bal) ||
          bal < 0 ||
          bal > 100 ||
          !BANT_ADLARI.has(bant) ||
          typeof etibar !== "string" ||
          amiller == null
        ) {
          return res.status(400).json({ error: "yanlis" });
        }
        // Jurnal yalnız artır — köhnə sətirlərə toxunulmur (audit prinsipi)
        // menbe='klient': bu sətir KALİBRLƏMƏ jurnalıdır, qərar mənbəyi deyil.
        // Qərarın balı serverdə hesablanır və menbe='server' ilə yazılır.
        await sorgu(
          `INSERT INTO bal_jurnali (sahe_id, bal, bant, etibar, amiller, cedvel_versiyasi, menbe)
           VALUES ($1, $2, $3, $4, $5, $6, 'klient')`,
          [sahe.id, bal, bant, etibar, JSON.stringify(amiller), CEDVEL_VERSIYASI],
        );
        return res.status(200).json({ yazildi: true });
      }

      return res.status(400).json({ error: "Naməlum əməl" });
    }

    return res.status(405).json({ error: "Yalnız GET/PUT/POST" });
  } catch (error) {
    console.error("sahe error:", error?.message);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
