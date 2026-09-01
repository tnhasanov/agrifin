import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { bitkiSekli } from "../../services/bitkiSekilleri.js";
import { bitkiIkonu } from "../../services/bitkiGorunus.js";

/**
 * BİTKİ ŞƏKLİ — kartın sol tərəfindəki kvadrat.
 *
 * Üç hal var və hər üçü EYNİ ölçüdə yer tutur, ona görə şəkil gec gəlsə də
 * kart yerindən tərpənmir (layout shift olmur):
 *   1) asset var    → <picture> AVIF → WebP;
 *   2) asset yoxdur → neytral yuva (bitkinin ikonu, sakit yaşıl fon);
 *   3) asset var, amma yüklənmədi → yenə neytral yuva.
 *
 * ALT MƏTN BOŞDUR: bitkinin adı kartın özündə, şəklin yanında yazılıb —
 * ekran oxuyucusu üçün adı iki dəfə demək səs-küydür. Şəkil bəzəkdir,
 * məlumat deyil, ona görə `aria-hidden`.
 */
export function BitkiSekli({ kod, olcu = 52 }) {
  const { t } = useI18n();
  const [dusdu, setDusdu] = useState(false);
  const sekil = bitkiSekli(kod);
  const gosterilir = sekil && !dusdu;

  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center overflow-hidden"
      style={{
        width: olcu,
        height: olcu,
        borderRadius: 12,
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
            width={olcu}
            height={olcu}
            loading="lazy"
            decoding="async"
            onError={() => setDusdu(true)}
            style={{ width: olcu, height: olcu, objectFit: "cover", display: "block" }}
          />
        </picture>
      ) : (
        <Icon name={bitkiIkonu(kod)} size={20} color={C.field} />
      )}
    </span>
  );
}
