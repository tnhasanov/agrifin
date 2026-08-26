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
 * ═══ İFADƏLƏR ═════════════════════════════════════════════════════════
 * dusunur və narahat üçün istehsalçı AYRICA ÜZ renderləri göndərib
 * (çənədə əl / boynunu qaşıyan) — hal dəyişəndə şəkil də dəyişir.
 * Renderi olmayan hal sakit şəklə düşür, tonu duruş animasiyası daşıyır.
 * TODO(ifadeler): danisir və sevincli renderləri, yarpaq variantının
 * ifadələri və 4 yeni bitkinin ifadələri gözlənilir.
 *
 * Bütün hərəkət index.css-dədir (.fermer) və azaldılmış hərəkət
 * rejimində qlobal qayda ilə sönür.
 */

const HALLAR = ["sakit", "dusunur", "danisir", "sevincli", "narahat"];

/**
 * Assetlər ad konvensiyasından yığılır: {variant}-{hal}-{gorunus}.webp
 * (məs. bugda-dusunur-bas.webp). Yeni ifadə şəkli qovluğa düşən kimi
 * özü xəritəyə girir — komponentdə import siyahısı dəyişmir.
 */
const MODULLAR = import.meta.glob("../assets/fermer/*.webp", {
  eager: true,
  import: "default",
});

const FERMER = {};
for (const [yol, sekil] of Object.entries(MODULLAR)) {
  const [variant, hal, gorunus] = yol.split("/").pop().replace(".webp", "").split("-");
  ((FERMER[variant] ??= {})[hal] ??= {})[gorunus] = sekil;
}

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
  // İfadə renderi hələ gəlməyibsə sakit (gülümsəyən) şəklə düşür — duruş
  // animasiyası tonu onsuz da daşıyır. İstehsalçı ifadələri hissə-hissə
  // göndərir; hər yeni fayl qovluğa düşən kimi bura özü qoşulur.
  const sekiller = variant[h] ?? variant.sakit;
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
        src={tam ? sekiller.tam : sekiller.bas}
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
