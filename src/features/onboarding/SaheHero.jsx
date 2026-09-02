import { YASIL } from "../../theme/tokens.js";

/**
 * EDİTORİAL HERO — yuxarıdan görünən əkin sahələri.
 *
 * NİYƏ VEKTOR, NİYƏ FOTO DEYİL: sənədləşdirilmiş lisenziyalı aerofoto
 * hazırda repozitoriyada yoxdur, lisenziyasız şəkil isə məhsula qoyula
 * bilməz. Ona görə burada ÇƏKİLMİŞ kompozisiya var — kadr aerofotonundur
 * (üfüq, zolaqlanmış tarlalar, yol), amma heç nə foto kimi təqdim
 * olunmur. Fayl 2 KB-dır, şəbəkə gözləmir, layout sıçramır.
 *
 * FOTO GƏLƏNDƏ: bu komponenti dəyişmək kifayətdir — `XosGelmisiniz.jsx`
 * yalnız sabit nisbətli bir yuva verir (bax: HERO_NISBET).
 *
 * Karikatura, maskot, əl sıxma və traktor stoku QƏSDƏN yoxdur: birinci
 * ekran məhsulun yetkinliyini deyir, şən şəkil yox.
 */
export function SaheHero({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 390 300"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        {/* Üfüqə doğru açılan işıq — günün ilk saatları */}
        <linearGradient id="hero-goy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DCE9DE" />
          <stop offset="100%" stopColor="#F0F4EC" />
        </linearGradient>
        {/* Mətnin oxunması üçün aşağıya doğru tündləşən pərdə */}
        <linearGradient id="hero-perde" x1="0" y1="0" x2="0" y2="1">
          <stop offset="35%" stopColor="rgba(18,63,45,0)" />
          <stop offset="100%" stopColor="rgba(18,63,45,0.72)" />
        </linearGradient>
      </defs>

      <rect width="390" height="300" fill="url(#hero-goy)" />

      {/* Üfüq alçaqdır: kadrın böyük hissəsi TARLADIR, göy deyil — aerofoto
          belə qurulur, mənzərə şəkli isə əksinə */}
      <path d="M0 54 L70 42 L132 52 L200 36 L268 50 L332 40 L390 48 L390 78 L0 78 Z" fill={YASIL[300]} opacity="0.45" />
      <path d="M0 66 L84 58 L158 68 L238 54 L312 66 L390 60 L390 86 L0 86 Z" fill={YASIL[400]} opacity="0.4" />

      {/* Parsel zolaqları: eyni enli deyil — real tarlalar da eyni deyil */}
      <path d="M0 82 L390 76 L390 100 L0 108 Z" fill={YASIL[200]} />
      <path d="M0 108 L390 100 L390 132 L0 144 Z" fill={YASIL[400]} opacity="0.75" />
      <path d="M0 144 L390 132 L390 152 L0 166 Z" fill={YASIL[100]} />
      <path d="M0 166 L390 152 L390 196 L0 216 Z" fill={YASIL[500]} />
      <path d="M0 216 L390 196 L390 224 L0 248 Z" fill={YASIL[300]} opacity="0.9" />
      <path d="M0 248 L390 224 L390 300 L0 300 Z" fill={YASIL[600]} />

      {/* Şumlanmış cizgilər: sahənin işlənmiş olduğunu bir cizgi deyir.
          Perspektivdə üfüqə doğru yığılır. */}
      <g stroke={YASIL[100]} strokeOpacity="0.22" strokeWidth="1">
        {[-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <line key={i} x1={i * 72 - 40} y1="300" x2={i * 26 + 120} y2="80" />
        ))}
      </g>

      {/* Parselləri ayıran torpaq yol — perspektivdə daralır */}
      <path d="M96 300 L188 84 L198 84 L150 300 Z" fill="#EDF0E7" opacity="0.55" />

      <rect width="390" height="300" fill="url(#hero-perde)" />
    </svg>
  );
}
