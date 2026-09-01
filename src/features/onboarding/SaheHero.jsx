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

      {/* Uzaq təpələr */}
      <path d="M0 96 L64 78 L128 92 L196 70 L268 90 L330 76 L390 88 L390 130 L0 130 Z" fill={YASIL[300]} opacity="0.55" />
      <path d="M0 112 L78 100 L150 114 L232 98 L310 112 L390 104 L390 150 L0 150 Z" fill={YASIL[400]} opacity="0.5" />

      {/* Zolaqlanmış tarlalar — perspektivdə genişlənən lentlər */}
      <path d="M0 132 L390 122 L390 158 L0 172 Z" fill={YASIL[200]} />
      <path d="M0 172 L390 158 L390 196 L0 216 Z" fill={YASIL[400]} opacity="0.85" />
      <path d="M0 216 L390 196 L390 236 L0 262 Z" fill={YASIL[500]} />
      <path d="M0 262 L390 236 L390 300 L0 300 Z" fill={YASIL[600]} />

      {/* Şumlanmış cizgilər: sahənin işlənmiş olduğunu bir cizgi deyir */}
      <g stroke={YASIL[100]} strokeOpacity="0.28" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={i} x1={i * 56} y1="300" x2={i * 44 + 40} y2="124" />
        ))}
      </g>

      {/* Sahələri ayıran yol */}
      <path d="M148 300 L196 128 L210 128 L186 300 Z" fill="#E7EDE2" opacity="0.7" />

      <rect width="390" height="300" fill="url(#hero-perde)" />
    </svg>
  );
}
