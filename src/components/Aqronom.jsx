import { C } from "../theme/tokens.js";

/**
 * AQRO — aqronom köməkçisinin siması.
 *
 * ═══ NİYƏ SVG, LOTTIE DEYİL ═══════════════════════════════════════════
 * Leobank-ın Leo-su kimi canlı personaj istənildi. Lottie/Rive gözəl
 * nəticə verir, amma çalışma kitabxanası ~70 kB (gzip) gətirir — tətbiqin
 * bütün paketi hazırda ~107 kB-dır, yəni personaj paketi 65% şişirdərdi.
 * Kənd şəraitində 3G-də bu, açılış vaxtına birbaşa dəyir.
 *
 * SVG + CSS ilə eyni hiss ~3 kB-a alınır və üstəlik:
 *   • rənglər tokenlərdən gəlir (tema dəyişsə personaj da dəyişir)
 *   • hərəkət azaldılmış rejimdə index.css-dəki qlobal qayda onu dondurur
 *   • istənilən ölçüdə kəskin qalır (fermerin telefonu 1x da ola bilər, 3x da)
 *
 * ═══ NİYƏ CÜCƏRTİ, İNSAN DEYİL ════════════════════════════════════════
 * İnsan personaj yaş, cins və etnik seçim tələb edir — Azərbaycan fermeri
 * özünü orada görməyə bilər. Cücərti hamının işidir və loqodakı yarpaqla
 * eyni dildədir. Papaq isə "aqronom" işarəsini verir.
 *
 * Hallar mesajın TONUNU daşıyır, bəzək deyil: fermer üzə baxıb cavabın
 * yaxşı, pis, yoxsa gözlənildiyini bir baxışda anlayır.
 */

/** Üzün halları — hər biri ayrı animasiya və ayrı ifadə */
const HALLAR = ["sakit", "dusunur", "danisir", "sevincli", "narahat"];

export function Aqronom({ hal = "sakit", olcu = 64, className = "", ...qalan }) {
  const h = HALLAR.includes(hal) ? hal : "sakit";

  return (
    <svg
      viewBox="0 0 64 76"
      width={olcu}
      height={olcu * (76 / 64)}
      className={`aqro aqro--${h} ${className}`}
      // Personaj məlumat daşımır — ekran oxuyucusuna mətn onsuz da yanındadır
      aria-hidden="true"
      focusable="false"
      {...qalan}
    >
      {/* Kölgə: yerdə dayandığını göstərir, tullananda kiçilir */}
      <ellipse className="aqro-kolge" cx="32" cy="71" rx="15" ry="3.2" fill="rgba(0,0,0,0.16)" />

      <g className="aqro-govde">
        {/* Yarpaqlar — həm saç, həm əhval: narahat olanda aşağı əyilir */}
        <g className="aqro-yarpaq aqro-yarpaq--sol">
          <path
            d="M31 26 C 20 22, 12 14, 13 6 C 22 5, 30 12, 31 22 Z"
            fill={C.field}
          />
          <path d="M31 25 C 25 20, 20 14, 15 8" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
        <g className="aqro-yarpaq aqro-yarpaq--sag">
          <path
            d="M33 26 C 44 23, 52 16, 52 8 C 43 6, 35 13, 33 22 Z"
            fill="#3E9A63"
          />
          <path d="M33 25 C 39 21, 45 16, 50 10" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>

        {/* Gövdə: toxum forması */}
        <ellipse cx="32" cy="47" rx="18" ry="19.5" fill="#8FDCAE" />
        <ellipse cx="32" cy="47" rx="18" ry="19.5" fill="none" stroke="#2E7D4F" strokeWidth="1.6" />
        {/* İşıq ləkəsi — həcm verir */}
        <ellipse cx="25" cy="39" rx="6" ry="4.5" fill="rgba(255,255,255,0.3)" />

        {/* Papaq — "aqronom" işarəsi */}
        <g className="aqro-papaq">
          <ellipse cx="32" cy="30" rx="21" ry="5.2" fill={C.gold} />
          <path d="M20 29 C 21 20, 27 16, 32 16 C 37 16, 43 20, 44 29 Z" fill="#F0C368" />
          <path d="M20.5 28.5 C 27 26.5, 37 26.5, 43.5 28.5" stroke={C.goldDeep} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>

        {/* Üz */}
        <g className="aqro-uz">
          <g className="aqro-gozler">
            <circle className="aqro-goz" cx="25.5" cy="46" r="2.7" fill="#14351F" />
            <circle className="aqro-goz" cx="38.5" cy="46" r="2.7" fill="#14351F" />
            {/* Parıltı: canlılıq hissi. Sevinc halında gözlər qövsə
                çevrilir və parıltı bəbək kimi görünərdi — gizlədilir. */}
            <circle className="aqro-parilti" cx="26.4" cy="45.1" r="0.9" fill="#fff" />
            <circle className="aqro-parilti" cx="39.4" cy="45.1" r="0.9" fill="#fff" />
          </g>
          {/* Yanaqlar */}
          <ellipse className="aqro-yanaq" cx="20.5" cy="52" rx="3.2" ry="2.2" fill="rgba(224,128,118,0.45)" />
          <ellipse className="aqro-yanaq" cx="43.5" cy="52" rx="3.2" ry="2.2" fill="rgba(224,128,118,0.45)" />
          {/* Ağız — hər halda başqa əyri */}
          <path className="aqro-agiz" d="M27 54 Q 32 58.5, 37 54" stroke="#14351F" strokeWidth="1.9" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* Düşünmə nöqtələri — yalnız "dusunur" halında görünür */}
      <g className="aqro-fikir">
        <circle className="aqro-nokte aqro-nokte--1" cx="50" cy="20" r="2.2" fill={C.field} />
        <circle className="aqro-nokte aqro-nokte--2" cx="56" cy="14" r="2.8" fill={C.field} />
        <circle className="aqro-nokte aqro-nokte--3" cx="61" cy="7" r="3.4" fill={C.field} />
      </g>
    </svg>
  );
}
