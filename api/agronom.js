// api/agronom.js — Vercel Serverless Function.
// API açarı yalnız burada yaşayır, brauzerə heç vaxt düşmür.
// Vercel → Settings → Environment Variables → ANTHROPIC_API_KEY
//
// Qeyd: `npm run dev` bu marşrutu vermir — /api/* yalnız Vercel-də (və ya
// `vercel dev`-də) işləyir. Lokal Vite serverində çat 404 qaytaracaq.
import Anthropic from "@anthropic-ai/sdk";
import { BITKILER, kontekstQur } from "./knowledge.js";
import { dozaQoruyucusuYarat } from "./dozaQoruyucu.js";

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
    const { messages = [], bitkiKey, rayon, ay, hava, sahe, havaDeqiq, ndvi, dil } =
      req.body || {};

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
      // Sahə ölçüsü müştəridən gəlir — həddləri geo.js-dəki ilə eynidir
      sahe:
        sahe && typeof sahe === "object" && eded(sahe.hektar, 0.05, 1000) != null
          ? { hektar: sahe.hektar }
          : undefined,
      havaDeqiq: havaDeqiq === true,
    });

    const cavabDili = CAVAB_DILLERI[dil] ?? CAVAB_DILLERI.az;

    // Başlıqlar yalnız ilk mətn hazır olanda yazılır. Səbəb: başlıq gedəndən
    // sonra status 200-dür və artıq dəyişdirilə bilməz — sorğu heç başlamasa,
    // müştəri həqiqi 502/500 alsın deyə gözləyirik.
    let axinBasladi = false;
    const axinaYaz = (hadise) => {
      if (!axinBasladi) {
        axinBasladi = true;
        res.writeHead(200, {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store, no-transform",
          // Aralıq proxy-lərin buferləməsini söndürür — yoxsa axının mənası qalmır
          "X-Accel-Buffering": "no",
        });
      }
      res.write(`${JSON.stringify(hadise)}\n`);
    };

    const client = new Anthropic({ maxRetries: 1, timeout: 25_000 });
    const axin = client.messages.stream({
      model: MODEL,
      max_tokens: 700,
      // Sonnet 5-də düşünmə susmaya görə AÇIQdır və max_tokens büdcəsini
      // cavabla bölüşür. Qısa aqronomik cavab üçün lazım deyil: söndürmək həm
      // gecikməni azaldır, həm də cavabın yarımçıq kəsilmə riskini aradan qaldırır.
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: [
        // Sabit hissə keşlənir — hər mesajda yenidən emal olunmur
        { type: "text", text: SISTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: `CAVAB DİLİ: ${cavabDili}\n\n---\n${kontekst}` },
      ],
      messages: temiz,
    });

    const qoruyucu = dozaQoruyucusuYarat();
    let bloklandi = false;

    for await (const hadise of axin) {
      if (hadise.type !== "content_block_delta" || hadise.delta?.type !== "text_delta") {
        continue;
      }
      const netice = qoruyucu.elaveEt(hadise.delta.text);
      if (netice.bloklandi) {
        bloklandi = true;
        axin.abort?.();
        break;
      }
      if (netice.metn) axinaYaz({ t: "delta", v: netice.metn });
    }

    if (!bloklandi) {
      const son = qoruyucu.bosalt();
      if (son.bloklandi) bloklandi = true;
      else if (son.metn) axinaYaz({ t: "delta", v: son.metn });
    }

    // Doza aşkarlanıbsa: göstərilən hər şey ləğv olunur və təhlükəsiz mətn qalır
    if (bloklandi) {
      axinaYaz({ t: "replace", v: DOZA_CAVABI, aqronomTeklif: true });
      return res.end();
    }

    const cavab = qoruyucu.tamMetn.trim();
    let final = null;
    try {
      final = await axin.finalMessage();
    } catch {
      /* axın yarımçıq bitdi — aşağıdakı yoxlamalar cavabın özünə baxır */
    }

    if (final) {
      // Vercel → Deployments → Functions → Logs. `final.model` sorğuya real
      // cavab verən modeldir — bizim sabitimizin əks-səsi deyil.
      console.log(
        `[agronom] model=${final.model} giris=${final.usage?.input_tokens ?? "?"} ` +
          `cixis=${final.usage?.output_tokens ?? "?"} ` +
          `kesden=${final.usage?.cache_read_input_tokens ?? 0}`,
      );
    }

    if (final?.stop_reason === "refusal" || !cavab) {
      axinaYaz({ t: "replace", v: DOZA_CAVABI, aqronomTeklif: true });
      return res.end();
    }

    const aqronomTeklif =
      /aqronom|sahədə baxış|dəqiq demək üçün|bakterial yanıq|karantin/i.test(cavab);

    axinaYaz({ t: "done", aqronomTeklif });
    return res.end();
  } catch (error) {
    const apiXetasi = error instanceof Anthropic.APIError;
    if (apiXetasi) {
      console.error("Anthropic error:", error.status, String(error.message).slice(0, 400));
    } else {
      console.error(error);
    }

    // Başlıq artıq gedibsə status dəyişmir — xətanı axının içində bildiririk
    if (res.headersSent) {
      res.write(`${JSON.stringify({ t: "error" })}\n`);
      return res.end();
    }
    return res
      .status(apiXetasi ? 502 : 500)
      .json({ error: apiXetasi ? "Köməkçi hazırda cavab vermir." : "Gözlənilməz xəta." });
  }
}
