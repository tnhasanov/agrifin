import bugdaBas from "../assets/fermer/bugda-bas.webp";
import bugdaTam from "../assets/fermer/bugda-tam.webp";
import pambiqBas from "../assets/fermer/pambiq-bas.webp";
import pambiqTam from "../assets/fermer/pambiq-tam.webp";
import qargidaliBas from "../assets/fermer/qargidali-bas.webp";
import qargidaliTam from "../assets/fermer/qargidali-tam.webp";
import pomidorBas from "../assets/fermer/pomidor-bas.webp";
import pomidorTam from "../assets/fermer/pomidor-tam.webp";
import uzumBas from "../assets/fermer/uzum-bas.webp";
import uzumTam from "../assets/fermer/uzum-tam.webp";
import yarpaqBas from "../assets/fermer/yarpaq-bas.webp";
import yarpaqTam from "../assets/fermer/yarpaq-tam.webp";
import { BITKI_VARIANTI } from "./fermerVarianti.js";

/**
 * AQRO — aqronom köməkçisinin siması. İstehsalçının öz 3D fermeri.
 *
 * ═══ RASTER + CSS RİQİ ════════════════════════════════════════════════
 * Personaj istehsalçının GPT ilə yaratdığı 3D render-dir (istehsalçı
 * seçimi — əvvəlki əl ilə çəkilmiş SVG cücərti bəyənilmədi). Render
 * statikdir; canlılıq CSS riqi ilə verilir: nəfəs, yellənmə, fikir
 * nöqtələri, sevincdə tullanma, narahatlıqda sallanma. Raster İÇİNDƏN
 * kəsilmir — qol-baş ayrı qatlara bölünsə tikiş yerləri görünərdi;
 * bütöv fiqurun hərəkəti tikişsizdir.
 *
 * İki görünüş:
 *   baş (kvadrat medalyon) — kiçik yuvalarda (çat başlığı, salamlama)
 *   tam boy                — böyük anlarda (uğur ekranı)
 * Seçim ölçüdən avtomatikdir; `gorunus` ilə məcbur etmək olur.
 *
 * ═══ MƏHDUDİYYƏT: ÜZ DƏYİŞMİR ═════════════════════════════════════════
 * Render bir ifadə ilə gəlib (gülümsəyir). Halların tonunu ÜZ yox,
 * DURUŞ daşıyır: fikirləşəndə yana əyilib nöqtələr çıxır, sevinəndə
 * tullanır, narahatda yavaş sallanır. İfadəli üzlər üçün istehsalçıdan
 * hər hala ayrıca render lazımdır — TODO(ifadeler).
 *
 * Bütün hərəkət index.css-dədir (.fermer) və azaldılmış hərəkət
 * rejimində qlobal qayda ilə sönür.
 */

const HALLAR = ["sakit", "dusunur", "danisir", "sevincli", "narahat"];

const FERMER = {
  bugda: { bas: bugdaBas, tam: bugdaTam },
  pambiq: { bas: pambiqBas, tam: pambiqTam },
  qargidali: { bas: qargidaliBas, tam: qargidaliTam },
  pomidor: { bas: pomidorBas, tam: pomidorTam },
  uzum: { bas: uzumBas, tam: uzumTam },
  yarpaq: { bas: yarpaqBas, tam: yarpaqTam },
};

/** Bu ölçüdən yuxarıda tam boy mənalıdır — altında fiqur oxunmur */
const TAM_HEDDI = 72;

export function Aqronom({
  hal = "sakit",
  bitki = null,
  olcu = 64,
  gorunus = null,
  className = "",
  ...qalan
}) {
  const h = HALLAR.includes(hal) ? hal : "sakit";
  const variant = FERMER[BITKI_VARIANTI[bitki] ?? "yarpaq"] ?? FERMER.yarpaq;
  const tam = (gorunus ?? (olcu >= TAM_HEDDI ? "tam" : "bas")) === "tam";

  return (
    <span
      className={`fermer fermer--${h} ${tam ? "fermer--tam" : "fermer--bas"} ${className}`}
      // olcu: baş medalyonda tərəfdir, tam boyda HÜNDÜRLÜK (en nisbətdən gəlir)
      style={{ height: olcu, width: tam ? "auto" : olcu }}
      // Personaj məlumat daşımır — yanındakı mətn onsuz da eyni şeyi deyir
      aria-hidden="true"
      {...qalan}
    >
      {/* Yer kölgəsi yalnız tam boyda: renderin öz bişmiş kölgəsi silinib
          (tünd fonda ağarırdı) — kölgə CSS-dədir və tullananda kiçilir */}
      {tam && <span className="fermer-kolge" />}
      <img
        className="fermer-gov"
        src={tam ? variant.tam : variant.bas}
        alt=""
        draggable={false}
      />
      {/* Fikir nöqtələri — yalnız "dusunur" halında görünür (CSS) */}
      <span className="fermer-fikir">
        <i />
        <i />
        <i />
      </span>
      {/* Danışıq nöqtələri — "danisir" halında növbə ilə yanır (CSS) */}
      <span className="fermer-danisiq">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}
