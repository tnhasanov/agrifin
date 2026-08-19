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

/**
 * ═══ BİTKİYƏ GÖRƏ BAŞLIQ ══════════════════════════════════════════════
 * Personajın KİMLİYİ dəyişmir — gövdə, üz və papaq eynidir. Yalnız
 * papağın arxasından çıxan bitki dəyişir. Beləliklə fermer öz bitkisini
 * görür, amma qarşısındakı yenə də "Aqro"dur (Leo həmişə Leo qalır,
 * sadəcə paltarı dəyişir).
 *
 * Siluetlər 34 pikseldə də ayırd edilməlidir (çat başlığı ən kiçik yer),
 * ona görə hər biri sadə formadan qurulub: sünbül, qoza, dənə, salxım.
 * Rənglər fərqi ikinci dəfə deyir — rəng korluğu olan istifadəçi üçün
 * forma tək başına kifayətdir.
 *
 * Sahə: x 12–52, y 2–28 (papağın kənarı y≈25-dədir, altı görünmür).
 */
const SAP = { stroke: "#3E9A63", strokeWidth: 2, strokeLinecap: "round", fill: "none" };

/** Sünbül dənəsi — buğda və arpa üçün ortaq forma */
const dene = (x, y, bucaq, reng) => (
  <ellipse
    key={`${x}-${y}`}
    cx={x}
    cy={y}
    rx="2.9"
    ry="4.4"
    fill={reng}
    // Kontur saman papağın üstündə dənəni ayırır — rəngləri yaxındır
    stroke="#B07F1E"
    strokeWidth="0.7"
    transform={`rotate(${bucaq} ${x} ${y})`}
  />
);

const BITKI_BASLIQLARI = {
  // Buğda: sıx sünbül + qısa qılçıqlar
  bugda: (
    <g>
      <path d="M32 30 L32 20" {...SAP} />
      {[
        [28.3, 19, -24], [35.7, 19, 24],
        [28.3, 13.5, -24], [35.7, 13.5, 24],
        [28.3, 8, -24], [35.7, 8, 24],
        [32, 3.5, 0],
      ].map(([x, y, b]) => dene(x, y, b, "#E9B54A"))}
      <path d="M32 1 L28.5 -5 M32 0 L32 -7 M32 1 L35.5 -5" stroke="#C9932B" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </g>
  ),
  // Arpa: daha uzun qılçıqlar, açıq rəng — buğdadan siluetlə fərqlənir
  arpa: (
    <g>
      <path d="M32 30 L32 22" {...SAP} />
      {[
        [28.3, 21, -20], [35.7, 21, 20],
        [28.3, 16, -20], [35.7, 16, 20],
        [32, 11, 0],
      ].map(([x, y, b]) => dene(x, y, b, "#EBCB84"))}
      {/* Uzun qılçıqlar arpanın imzasıdır */}
      <path d="M28.5 13 L23 -8 M32 8 L32 -11 M35.5 13 L41 -8" stroke="#D9B45F" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </g>
  ),
  // Qarğıdalı: qoza + iki qabıq yarpağı
  qargidali: (
    <g>
      <path d="M22 27 C 18 20, 20 12, 25 8" stroke="#3E9A63" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M42 27 C 46 20, 44 12, 39 8" stroke="#4FAE74" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <rect x="27" y="5" width="10" height="22" rx="5" fill="#F2C744" />
      <path d="M30 9 L30 24 M34 9 L34 24" stroke="#D9A82F" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  ),
  // Pambıq: dörd ağ topa + qəhvəyi kasacıq
  pambiq: (
    <g>
      <path d="M32 28 L32 18" {...SAP} />
      <circle cx="32" cy="9" r="6.5" fill="#FFFFFF" />
      <circle cx="25.5" cy="13.5" r="5.2" fill="#F4F7F2" />
      <circle cx="38.5" cy="13.5" r="5.2" fill="#F4F7F2" />
      <circle cx="32" cy="16.5" r="5" fill="#FFFFFF" />
      <path d="M26 19 L32 17 L38 19" stroke="#A9743F" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </g>
  ),
  // Kartof: yarpaqlı kol + bənövşəyi çiçək (yumru torpaqdadır, görünmür)
  kartof: (
    <g>
      <path d="M32 28 L32 15" {...SAP} />
      <ellipse cx="24" cy="18" rx="6.5" ry="4.2" fill="#3E9A63" transform="rotate(-24 24 18)" />
      <ellipse cx="40" cy="18" rx="6.5" ry="4.2" fill="#4FAE74" transform="rotate(24 40 18)" />
      <circle cx="32" cy="9" r="4.6" fill="#B79BE0" />
      <circle cx="32" cy="9" r="1.7" fill="#F2C744" />
    </g>
  ),
  // Pomidor: qırmızı meyvə + yaşıl kasa
  pomidor: (
    <g>
      <path d="M32 28 L32 16" {...SAP} />
      <circle cx="32" cy="14" r="9.5" fill="#D9483B" />
      <ellipse cx="28.5" cy="11" rx="2.6" ry="1.8" fill="rgba(255,255,255,0.4)" />
      <path d="M32 6 L26 4 M32 6 L38 4 M32 6 L32 2" stroke="#3E9A63" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </g>
  ),
  // Soğan: soğanaqlı dib + üç yaşıl pər
  sogan: (
    <g>
      <path d="M32 20 C 26 14, 27 6, 32 2 C 37 6, 38 14, 32 20" fill="#4FAE74" opacity="0.9" />
      <path d="M25 26 C 22 20, 24 14, 27 11" stroke="#3E9A63" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M39 26 C 42 20, 40 14, 37 11" stroke="#4FAE74" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <ellipse cx="32" cy="24" rx="8" ry="5.5" fill="#D9C6E8" />
      <path d="M27 23 C 30 20, 34 20, 37 23" stroke="#B79BE0" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  ),
  // Üzüm: salxım + yarpaq
  uzum: (
    <g>
      <path d="M32 26 L32 18" {...SAP} />
      <ellipse cx="42" cy="9" rx="6" ry="4.6" fill="#3E9A63" transform="rotate(22 42 9)" />
      {[[32, 6], [27, 11], [37, 11], [32, 14], [24.5, 17], [39.5, 17], [32, 21]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.2" fill={y < 12 ? "#8E5AAE" : "#7B4A9C"} />
      ))}
    </g>
  ),
  // Alma: meyvə + yarpaq
  alma: (
    <g>
      <path d="M32 26 L32 14" {...SAP} />
      <circle cx="32" cy="14" r="10" fill="#D9483B" />
      <ellipse cx="28" cy="10.5" rx="2.8" ry="2" fill="rgba(255,255,255,0.4)" />
      <path d="M32 5 C 32 2, 34 1, 36 1" stroke="#7A4A2A" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="40" cy="4" rx="5.4" ry="3.2" fill="#3E9A63" transform="rotate(-22 40 4)" />
    </g>
  ),
  // Fındıq: qoz + dişli yaşıl qabıq
  findiq: (
    <g>
      <path d="M32 28 L32 20" {...SAP} />
      <circle cx="32" cy="14" r="8" fill="#A9743F" />
      <path d="M28 10 C 30 12, 34 12, 36 10" stroke="#8A5A2C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M22 12 L26 6 L30 10 L32 3 L34 10 L38 6 L42 12 C 38 8, 26 8, 22 12 Z" fill="#4FAE74" />
    </g>
  ),
};

/** Bitki seçilməyibsə: iki yarpaq — personajın öz forması */
function YarpaqBasliq() {
  return (
    <>
      <g className="aqro-yarpaq aqro-yarpaq--sol">
        <path d="M31 26 C 20 22, 12 14, 13 6 C 22 5, 30 12, 31 22 Z" fill={C.field} />
        <path d="M31 25 C 25 20, 20 14, 15 8" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
      <g className="aqro-yarpaq aqro-yarpaq--sag">
        <path d="M33 26 C 44 23, 52 16, 52 8 C 43 6, 35 13, 33 22 Z" fill="#3E9A63" />
        <path d="M33 25 C 39 21, 45 16, 50 10" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </g>
    </>
  );
}

export function Aqronom({ hal = "sakit", bitki = null, olcu = 64, className = "", ...qalan }) {
  const h = HALLAR.includes(hal) ? hal : "sakit";
  // Naməlum bitki adı personajı sındırmır — yarpaqlara qayıdır
  // Bitki papağın ÜSTÜNDƏ dayanmalıdır: aşağıda qalsa tac onu yeyir.
  // Yarpaqlar sürüşmür — onların forması papağın ətrafına uyğun çəkilib.
  const bitkiBasligi = BITKI_BASLIQLARI[bitki];
  const baslik = bitkiBasligi ? (
    <g transform="translate(0 -7)">{bitkiBasligi}</g>
  ) : (
    <YarpaqBasliq />
  );

  return (
    <svg
      viewBox="0 -12 64 88"
      width={olcu}
      height={olcu * (88 / 64)}
      className={`aqro aqro--${h} ${className}`}
      // Personaj məlumat daşımır — ekran oxuyucusuna mətn onsuz da yanındadır
      aria-hidden="true"
      focusable="false"
      {...qalan}
    >
      {/* Kölgə: yerdə dayandığını göstərir, tullananda kiçilir */}
      <ellipse className="aqro-kolge" cx="32" cy="71" rx="15" ry="3.2" fill="rgba(0,0,0,0.16)" />

      <g className="aqro-govde">
        {/* Başlıq: bitki seçilibsə onun forması, yoxsa yarpaqlar.
            Narahat halda hamısı birlikdə sallanır (bax: index.css) */}
        <g className="aqro-baslik">{baslik}</g>

        {/* Gövdə: toxum forması */}
        <ellipse cx="32" cy="47" rx="18" ry="19.5" fill="#8FDCAE" />
        <ellipse cx="32" cy="47" rx="18" ry="19.5" fill="none" stroke="#2E7D4F" strokeWidth="1.6" />
        {/* İşıq ləkəsi — həcm verir */}
        <ellipse cx="25" cy="39" rx="6" ry="4.5" fill="rgba(255,255,255,0.3)" />

        {/* Papaq — "aqronom" işarəsi.
            Rəng brend qızılı DEYİL: buğda və arpa da qızıldır və papaqla
            eyni rəngdə olanda sünbül fonda itirdi. Saman rəngi papağı
            fona salır, bitki isə ön plana çıxır. */}
        <g className="aqro-papaq">
          <ellipse cx="32" cy="30" rx="21" ry="5.2" fill="#D6B678" />
          <path d="M20 29 C 21 23, 27 19.5, 32 19.5 C 37 19.5, 43 23, 44 29 Z" fill="#E8D2A6" />
          <path d="M20.5 28.5 C 27 26.5, 37 26.5, 43.5 28.5" stroke="#B9955A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
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
        <circle className="aqro-nokte aqro-nokte--1" cx="50" cy="17" r="2.2" fill={C.field} />
        <circle className="aqro-nokte aqro-nokte--2" cx="56" cy="10" r="2.8" fill={C.field} />
        <circle className="aqro-nokte aqro-nokte--3" cx="61" cy="2" r="3.4" fill={C.field} />
      </g>
    </svg>
  );
}
