import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { bitkiSekli } from "../../services/bitkiSekilleri.js";
import { bitkiIkonu } from "../../services/bitkiGorunus.js";
import cropSprite from "../../assets/bitki/crop-sprite-ai.webp";

const SPRITE_YERI = {
  qargidali: [0, 0],
  pambiq: [1, 0],
  kartof: [2, 0],
  uzum: [3, 0],
  alma: [4, 0],
  bugda: [0, 1],
  arpa: [1, 1],
  pomidor: [2, 1],
  sogan: [3, 1],
  findiq: [4, 1],
};

/**
 * BİTKİ ŞƏKLİ — kartın sol tərəfindəki kvadrat.
 *
 * Üç hal var və hər üçü EYNİ ölçüdə yer tutur, ona görə şəkil gec gəlsə də
 * kart yerindən tərpənmir (layout shift olmur):
 *   1) asset var    → <picture> AVIF → WebP;
 *   2) ayrıca asset yoxdur → vahid optimallaşdırılmış foto-mozaikadan kadr;
 *   3) tanınmayan kod → neytral ikon yuvası.
 *
 * ALT MƏTN BOŞDUR: bitkinin adı kartın özündə, şəklin yanında yazılıb —
 * ekran oxuyucusu üçün adı iki dəfə demək səs-küydür. Şəkil bəzəkdir,
 * məlumat deyil, ona görə `aria-hidden`.
 */
export function BitkiSekli({ kod, en = 48, hund = 58 }) {
  const { t } = useI18n();
  const [dusdu, setDusdu] = useState(false);
  const sekil = bitkiSekli(kod);
  const gosterilir = sekil && !dusdu;
  const spriteYeri = SPRITE_YERI[kod];

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center overflow-hidden"
      style={{
        width: en,
        height: hund,
        borderRadius: 11,
        backgroundColor: C.fieldSoft,
      }}
      title={gosterilir ? undefined : t(`kbcrop.${kod}`)}
    >
      {gosterilir ? (
        <picture>
          {sekil.avif && <source srcSet={sekil.avif} type="image/avif" />}
          {sekil.webp && <source srcSet={sekil.webp} type="image/webp" />}
          <img
            src={sekil.webp ?? sekil.avif}
            alt=""
            width={en}
            height={hund}
            loading="lazy"
            decoding="async"
            onError={() => setDusdu(true)}
            style={{ width: en, height: hund, objectFit: "cover", display: "block" }}
          />
        </picture>
      ) : spriteYeri ? (
        <span
          data-crop-photo={kod}
          style={{
            width: en,
            height: hund,
            display: "block",
            backgroundImage: `url(${cropSprite})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "500% 200%",
            backgroundPosition: `${spriteYeri[0] * 25}% ${spriteYeri[1] * 100}%`,
          }}
        />
      ) : (
        <Icon name={bitkiIkonu(kod)} size={20} color={C.fresh} />
      )}
    </span>
  );
}
