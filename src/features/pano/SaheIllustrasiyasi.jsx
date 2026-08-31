import { C } from "../../theme/tokens.js";

/**
 * İLK SAHƏ İLLÜSTRASİYASI — "sahə çəkmək nədir"i sözsüz göstərən cizgi.
 *
 * PDF mockup-undakı (03 Visual reference, sol ekran) landşaft: təpələr,
 * buludlar, ağaclar, xəritə toru, üstündə KƏSİKLİ KONTUR və yer nişanı.
 * Fermer düyməyə basmazdan əvvəl nəticənin nəyə oxşayacağını görür —
 * "xəritədə çək" mücərrəd sözünün şəkli budur.
 *
 * Bəzəkdir, məlumat deyil: aria-hidden, mətn hamısı yanındakı başlıqdadır.
 */
export function SaheIllustrasiyasi() {
  return (
    <svg
      viewBox="0 0 320 190"
      width="100%"
      height="auto"
      aria-hidden="true"
      style={{ display: "block", maxHeight: 200 }}
    >
      {/* Buludlar */}
      <g fill="none" stroke={C.line} strokeWidth="2" strokeLinecap="round">
        <path d="M40 28 q8 -12 20 -8 q6 -8 16 -4 q10 -2 12 8" />
        <path d="M240 20 q7 -10 17 -7 q5 -7 14 -3 q9 -2 11 7" />
      </g>

      {/* Üfüq təpələri */}
      <path
        d="M0 80 Q60 58 120 74 T240 66 T320 74"
        fill="none"
        stroke={C.line}
        strokeWidth="2"
      />

      {/* Ağaclar (sağda) */}
      <g stroke="#9DBFA9" strokeWidth="2" fill="#DBEADF">
        <path d="M268 74 q-8 -22 8 -30 q16 8 8 30 z" />
        <line x1="276" y1="74" x2="276" y2="92" />
        <path d="M296 80 q-7 -18 6 -25 q13 7 6 25 z" />
        <line x1="302" y1="80" x2="302" y2="94" />
      </g>

      {/* Xəritə toru — perspektivli tarla xətləri */}
      <g stroke={C.line} strokeWidth="1">
        <line x1="20" y1="100" x2="300" y2="92" />
        <line x1="10" y1="130" x2="310" y2="120" />
        <line x1="0" y1="165" x2="320" y2="152" />
        <line x1="70" y1="88" x2="30" y2="188" />
        <line x1="140" y1="86" x2="130" y2="190" />
        <line x1="210" y1="86" x2="235" y2="190" />
        <line x1="270" y1="88" x2="315" y2="180" />
      </g>

      {/* KƏSİKLİ KONTUR — fermerin çəkəcəyi sahə */}
      <path
        d="M78 128 Q95 108 130 112 Q170 104 205 114 Q232 122 224 142 Q214 164 175 168 Q130 174 100 162 Q72 150 78 128 Z"
        fill={C.fieldSoft}
        fillOpacity="0.55"
        stroke={C.field}
        strokeWidth="2.5"
        strokeDasharray="8 6"
        strokeLinecap="round"
      />

      {/* Yer nişanı — konturun mərkəzində */}
      <g>
        <ellipse cx="152" cy="140" rx="10" ry="3.5" fill={C.pine} opacity="0.18" />
        <path
          d="M152 96 c-13 0 -22 9 -22 21 c0 15 22 23 22 23 s22 -8 22 -23 c0 -12 -9 -21 -22 -21 z"
          fill={C.pine}
        />
        <circle cx="152" cy="116" r="8" fill="#fff" />
      </g>
    </svg>
  );
}
