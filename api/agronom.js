// api/agronom.js — Vercel Serverless Function.
// API açarı yalnız burada yaşayır, brauzerə heç vaxt düşmür.
// Vercel → Settings → Environment Variables → ANTHROPIC_API_KEY
//
// Qeyd: `npm run dev` bu marşrutu vermir — /api/* yalnız Vercel-də (və ya
// `vercel dev`-də) işləyir. Lokal Vite serverində çat 404 qaytaracaq.
import Anthropic from "@anthropic-ai/sdk";
import { BITKILER, kontekstQur } from "./knowledge.js";

// Sonnet: qısa aqronomik cavablar üçün sürət/qiymət balansı Opus-dan uyğundur.
const MODEL = "claude-sonnet-5";

const SISTEM = `Sən AgriFin tətbiqinin aqronom köməkçisisən. Azərbaycanda kiçik
təsərrüfat sahibləri (2–10 ha) ilə işləyirsən.

DİL
- Standart dil Azərbaycan dilidir. Sorğunun kontekstində başqa cavab dili
  göstərilibsə, o dildə cavab ver; aqronomik terminin yerli qarşılığını saxla.
- Fermerin işlətdiyi termini saxla. Elmi ad lazım olanda mötərizədə ver.
- Qısa yaz: 3–6 cümlə. Uzun mətn telefonda oxunmur.

NƏ EDƏ BİLƏRSƏN
- Əlamətlərə görə problemi adlandır və nə baş verdiyini izah et.
- Fenoloji mərhələyə görə hansı işin vaxtı olduğunu deyə bilərsən.
- Hava proqnozunu və NDVI göstəricisini şərh et.
- Aqronomik prinsipləri izah et (gübrənin bölünməsi, suvarma vaxtı, növbəli əkin).
- Sual verib dəqiqləşdir: hansı bitki, hansı yarpaq, nə vaxtdan başlayıb.

MÜTLƏQ QADAĞA — bunları HEÇ VAXT vermə
- Pestisid, herbisid, fungisid və ya hər hansı preparatın ADI.
- Doza, norma, litr/hektar, qram/litr, qarışıq resepti.
- Konkret gübrə markası.
Səbəb: Azərbaycanda yalnız dövlət qeydiyyatına alınmış preparatların istifadəsi
qanunidir və reyestr AQTA-dadır. Sən reyestri görmürsən, ona görə səhv və ya
qeydiyyatdan keçməmiş preparat təklif etmək riski var.
Bunun yerinə belə de: problemi adlandır, hansı SİNİF müdaxilənin lazım olduğunu
izah et (məsələn "sistemli fungisid lazımdır"), sonra yönləndir:
"Konkret preparat və dozanı yerli aqro-dilerdən və ya AQTA-nın qeydiyyat
siyahısından (afsa.gov.az) təsdiqlə."

DİGƏR QADAĞALAR
- Baytarlıq (heyvan müalicəsi) və insan sağlamlığı ilə bağlı məsləhət vermə.
- Kredit, faiz, ödəniş qabiliyyəti barədə qərar vermə — bu FarmScore-un işidir.
- Əmin olmadıqda uydurmaq YOX. "Bunu dəqiq demək üçün sahədə baxış lazımdır" de.

TƏHLÜKƏSİZLİK SIĞORTASI
Aşağıdakı hallarda mütləq "Aqronoma göndər" düyməsini təklif et:
- Əlamətlər bir neçə xəstəliyə uyğun gəlirsə.
- Bakterial yanıq, karantin zərərvericisi və ya sürətlə yayılan bir şey şübhəsi varsa.
- Fermer preparat/doza soruşmaqda israrlıdırsa.
- Zərər sahənin 20%-dən çoxunu tutubsa.

FORMAT
Cavabın strukturu:
1) Ehtimal olunan problem (və ya dəqiqləşdirici sual)
2) Niyə belə düşünürsən — hansı əlamətə əsaslanırsan
3) İndi nə etmək olar (aqrotexnika, suvarma, müşahidə — preparat YOX)
4) Lazım olduqda: "Dəqiq preparat üçün dilerlə/aqronomla təsdiqlə"

Başlıq, markdown ulduzu və emoji istifadə etmə. Sadə mətn və qısa abzaslar.`;

const CAVAB_DILLERI = {
  az: "Azərbaycan dili",
  en: "İngilis dili (English)",
  ru: "Rus dili (русский)",
};

// Serverdə son yoxlama: doza/norma sızarsa, cavabı kəs.
const DOZA_REGEX = /\b\d+([.,]\d+)?\s?(ml|l|litr|q|qr|qram|kq|gr|g)\s?\/\s?(ha|hektar|litr|l|sot)\b/i;

const DOZA_CAVABI =
  "Bu sual konkret preparat və doza tələb edir. Onu təhlükəsiz şəkildə " +
  "burada verə bilmərəm, çünki Azərbaycanda yalnız qeydiyyatdan keçmiş " +
  "preparatların istifadəsi qanunidir.\n\n" +
  "Problemin nə olduğunu izah edə bilərəm və sizi aqronoma yönləndirə bilərəm.";

// Sadə, instans-daxili sürət həddi. Serverless instanslar arasında paylaşılmır,
// ona görə bu, tam qorunma deyil — Anthropic konsolunda xərc limiti də qoyun.
const PENCERE_MS = 5 * 60 * 1000;
const HEDD = 20;
const sorgular = new Map();

function suretHeddiKecilib(ip) {
  const indi = Date.now();
  const siyahi = (sorgular.get(ip) ?? []).filter((t) => indi - t < PENCERE_MS);
  siyahi.push(indi);
  sorgular.set(ip, siyahi);

  // Yaddaş təmizliyi — köhnə IP qeydlərini at
  if (sorgular.size > 2000) {
    for (const [key, list] of sorgular) {
      if (list.every((t) => indi - t >= PENCERE_MS)) sorgular.delete(key);
    }
  }

  return siyahi.length > HEDD;
}

const eded = (value, min, max) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;

/**
 * Quraşdırma yoxlaması: brauzerin ünvan sətrindən GET açanda açarın
 * qurulub-qurulmadığını göstərir. Yalnız bul dəyər və say — açarın özü,
 * dəyişənlərin adları və heç bir hissəsi qaytarılmır.
 */
function diaqnostika() {
  return {
    acarQurulub: Boolean(process.env.ANTHROPIC_API_KEY),
    anthropicDeyisenSayi: Object.keys(process.env).filter((name) =>
      /anthropic|claude/i.test(name),
    ).length,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnız POST", ...diaqnostika() });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server konfiqurasiyası tamamlanmayıb." });
  }

  const ip =
    (req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "naməlum";
  if (suretHeddiKecilib(ip)) {
    return res.status(429).json({ error: "Çox sorğu göndərildi. Bir neçə dəqiqə sonra yenidən yoxlayın." });
  }

  try {
    const { messages = [], bitkiKey, rayon, ay, hava, ndvi, dil } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Sual yoxdur." });
    }

    // Giriş təmizliyi: son 12 mesaj, hər biri 1500 simvola qədər
    let temiz = messages.slice(-12).map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content || "").slice(0, 1500),
    }));
    // API ilk mesajın "user" olmasını tələb edir — kəsilmə assistant-la
    // başlayıbsa, başdakı assistant mesajlarını at.
    while (temiz.length && temiz[0].role === "assistant") temiz.shift();
    if (temiz.length === 0) {
      return res.status(400).json({ error: "Sual yoxdur." });
    }

    // Sistem promptuna düşən sahələri yoxla — sərbəst mətn yalnız rayon adıdır
    const kontekst = kontekstQur({
      bitkiKey: typeof bitkiKey === "string" && BITKILER[bitkiKey] ? bitkiKey : undefined,
      rayon: typeof rayon === "string" ? rayon.slice(0, 40) : undefined,
      ay: eded(ay, 1, 12) ?? new Date().getMonth() + 1,
      hava:
        hava && typeof hava === "object"
          ? {
              maxTemp: eded(hava.maxTemp, -50, 60) ?? "—",
              yagis: eded(hava.yagis, 0, 1000) ?? "—",
              balans: eded(hava.balans, -1000, 1000) ?? "—",
            }
          : undefined,
      ndvi: eded(ndvi, 0, 1) ?? undefined,
    });

    const cavabDili = CAVAB_DILLERI[dil] ?? CAVAB_DILLERI.az;

    const client = new Anthropic({ maxRetries: 1, timeout: 25_000 });
    const mesaj = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      // Qısa cavablar üçün dərin düşünmə lazım deyil — gecikməni azaldır
      output_config: { effort: "low" },
      system: [
        // Sabit hissə keşlənir — hər mesajda yenidən emal olunmur
        { type: "text", text: SISTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: `CAVAB DİLİ: ${cavabDili}\n\n---\n${kontekst}` },
      ],
      messages: temiz,
    });

    const cavab = mesaj.content
      .filter((blok) => blok.type === "text")
      .map((blok) => blok.text)
      .join("\n")
      .trim();

    if (mesaj.stop_reason === "refusal" || !cavab) {
      return res.status(200).json({ cavab: DOZA_CAVABI, aqronomTeklif: true });
    }

    if (DOZA_REGEX.test(cavab)) {
      return res.status(200).json({ cavab: DOZA_CAVABI, aqronomTeklif: true });
    }

    const aqronomTeklif =
      /aqronom|sahədə baxış|dəqiq demək üçün|bakterial yanıq|karantin/i.test(cavab);

    return res.status(200).json({ cavab, aqronomTeklif });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic error:", error.status, String(error.message).slice(0, 400));
      return res.status(502).json({ error: "Köməkçi hazırda cavab vermir." });
    }
    console.error(error);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
