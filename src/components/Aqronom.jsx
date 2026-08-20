import bugda from "../assets/aqro/bugda.webp";
import pambiq from "../assets/aqro/pambiq.webp";
import pomidor from "../assets/aqro/pomidor.webp";
import qargidali from "../assets/aqro/qargidali.webp";
import uzum from "../assets/aqro/uzum.webp";
import yarpaq from "../assets/aqro/yarpaq.webp";
import bugdaTam from "../assets/aqro/bugda-tam.webp";
import pambiqTam from "../assets/aqro/pambiq-tam.webp";
import pomidorTam from "../assets/aqro/pomidor-tam.webp";
import qargidaliTam from "../assets/aqro/qargidali-tam.webp";
import uzumTam from "../assets/aqro/uzum-tam.webp";
import yarpaqTam from "../assets/aqro/yarpaq-tam.webp";

/**
 * AQRO — aqronom köməkçisinin siması.
 *
 * ═══ NİYƏ RASTR, SVG DEYİL ════════════════════════════════════════════
 * Personaj əvvəl əl ilə çəkilmiş SVG cücərti idi (bax: git tarixçəsi,
 * b4a213e). Sonra istehsalçı öz personajını yaratdı — 3D fermer — və onu
 * istədi. İnsan personajın SVG-də bu keyfiyyətdə yenidən çəkilməsi real
 * deyil, ona görə şəkillər WebP kimi daxil edilir:
 *   • hər büst ~8 kB, tam boy ~15 kB — yalnız görünən bitki yüklənir,
 *     JS paketinə heç nə əlavə olunmur (Vite onları ayrı fayl kimi verir)
 *   • büst 192 px-dir: ən böyük yuvası 76 px-dir, 2.5x ekranda da kəskindir
 *   • mənbə PNG-lər (~1.5 MB, 1122×1402) repoya salınmır — istehsalçıda
 *     qalır; yenilərini əlavə etmək üçün eyni boru kəməri işlədilir
 *
 * ═══ İFADƏLƏR İNDİ HƏRƏKƏTDƏDİR ═══════════════════════════════════════
 * SVG üzün beş ifadəsi var idi (ağız, göz dəyişirdi). Rastr tək pozadır,
 * ona görə hal indi HƏRƏKƏTLƏ danışır (bax: index.css):
 *   sakit    — yüngül nəfəs yellənməsi
 *   dusunur  — baş yana əyilir + fikir nöqtələri yanıb-sönür
 *   danisir  — cavab axarkən xırda tullanma
 *   sevincli — iki dəfə tullanır, dayanır (sonsuz sevinc yorur)
 *   narahat  — hərəkət dayanır, personaj yüngülcə "çökür"
 * İfadə şəkilləri (düşünən, narahat üz) gələndə xəritəyə hal üzrə də
 * açar əlavə etmək kifayətdir — API dəyişməz.
 *
 * ═══ BİTKİYƏ GÖRƏ PERSONAJ ════════════════════════════════════════════
 * Fermerin seçdiyi bitki personajın saçındadır (istehsalçının dizaynı):
 * buğda sünbülü, pambıq qozası, qarğıdalı qozası, üzüm salxımı, pomidor.
 * Şəkli olmayan bitkilər ən yaxın olana düşür; heç nə yoxdursa —
 * ümumi cücərti-saçlı variant. Nar şəkli də hazırdır (assets/aqro/nar*),
 * amma nar hələ CROP_KEYS-də yoxdur — əlavə olunanda xəritəyə yazılacaq.
 */

const HALLAR = ["sakit", "dusunur", "danisir", "sevincli", "narahat"];

/** Büst (kvadrat) — kiçik avatar yuvaları üçün */
const BYUST = {
  bugda,
  arpa: bugda, // arpa şəkli hələ yoxdur — vizual ən yaxını buğdadır
  qargidali,
  pambiq,
  pomidor,
  uzum,
};

/** Tam boy (şaquli) — böyük anlar üçün: uğur ekranı, boş çat */
const TAM = {
  bugda: bugdaTam,
  arpa: bugdaTam,
  qargidali: qargidaliTam,
  pambiq: pambiqTam,
  pomidor: pomidorTam,
  uzum: uzumTam,
};

// TODO(istehsalçı): kartof, soğan, alma, fındıq şəkilləri hələ yaradılmayıb —
// hamısı ümumi cücərti variantına düşür. Şəkil gələndə xəritəyə əlavə edin.

export function Aqronom({ hal = "sakit", bitki = null, olcu = 64, boy = "byust", className = "", ...qalan }) {
  const h = HALLAR.includes(hal) ? hal : "sakit";
  const tam = boy === "tam";
  // Naməlum bitki adı personajı sındırmır — ümumi varianta qayıdır
  const sekil = (tam ? TAM[bitki] : BYUST[bitki]) ?? (tam ? yarpaqTam : yarpaq);

  return (
    <span
      className={`aqro aqro--${h} ${tam ? "aqro--tam" : ""} ${className}`}
      // Personaj məlumat daşımır — ekran oxuyucusuna mətn onsuz da yanındadır
      aria-hidden="true"
      {...qalan}
    >
      <img
        className="aqro-sekil"
        src={sekil}
        alt=""
        draggable="false"
        loading="lazy"
        decoding="async"
        // Tam boyda olcu HÜNDÜRLÜKDÜR (fiqur şaquli), büstdə isə en = boy
        height={olcu}
        style={tam ? { height: olcu, width: "auto" } : { width: olcu, height: olcu }}
      />
      {/* Düşünmə nöqtələri — yalnız "dusunur" halında görünür */}
      <span className="aqro-fikir">
        <i className="aqro-nokte aqro-nokte--1" />
        <i className="aqro-nokte aqro-nokte--2" />
        <i className="aqro-nokte aqro-nokte--3" />
      </span>
    </span>
  );
}
