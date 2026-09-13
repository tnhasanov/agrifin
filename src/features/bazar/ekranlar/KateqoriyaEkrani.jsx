import { useState } from "react";
import { Icon } from "../../../components/Icon.jsx";
import { C } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { KATEQORIYALAR, kateqoriyaMehsullari, kateqoriyaTap } from "../../../../lib/bazar/kataloq.js";
import { sirala, suzgecTetbiq } from "../../../../lib/bazar/axtaris.js";
import { BazarBasliq, IkonDuymesi } from "../BazarBasliq.jsx";
import { KateqoriyaKarti } from "../KateqoriyaKarti.jsx";
import { MehsulKarti } from "../MehsulKarti.jsx";
import { SiraVereqi, SiyahiAletleri, SuzgecVereqi } from "../SuzgecVereqi.jsx";

/**
 * KATEQORİYA SƏHİFƏSİ — bir kateqoriyanın məhsulları; üstdə kateqoriya
 * çipləri (keçid), alət zolağı (say · sıra · süzgəc), siyahı.
 * Süzgəc və sıra BazarScreen-də saxlanılır: kateqoriyadan məhsula gedib
 * qayıdanda seçim qalır.
 */
export function KateqoriyaEkrani({ kod, get, geri, sebetSayi, rayon, bitki, suzgec, onSuzgec, sira, onSira }) {
  const { t } = useI18n();
  const [suzgecAcilib, setSuzgecAcilib] = useState(false);
  const [siraAcilib, setSiraAcilib] = useState(false);
  const kateqoriya = kateqoriyaTap(kod);

  if (!kateqoriya) {
    return (
      <div className="px-4 pb-4">
        <BazarBasliq basliq={t("bazar.kateqoriya.tapilmadi")} onGeri={geri} />
      </div>
    );
  }

  const hamisi = kateqoriyaMehsullari(kod);
  // Kateqoriya səhifədən gəlir — süzgəcin öz kateqoriyası burada nəzərə alınmır
  const suzulmus = sirala(suzgecTetbiq(hamisi, { ...suzgec, kateqoriya: null }), sira, { bitki });

  return (
    <div className="px-4 pb-4">
      <BazarBasliq
        basliq={t(kateqoriya.adKey)}
        altYazi={t("bazar.kateqoriya.say", { say: hamisi.length })}
        onGeri={geri}
        sag={<IkonDuymesi ikon="ShoppingCart" say={sebetSayi} etiket={t("bazar.sebet")} onClick={() => get.sebet()} />}
      />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollSnapType: "x proximity" }}>
        {KATEQORIYALAR.map((k) => (
          <KateqoriyaKarti key={k.kod} kateqoriya={k} duzum="cip" secili={k.kod === kod} onAc={() => get.kateqoriya(k.kod)} />
        ))}
      </div>

      <SiyahiAletleri say={suzulmus.length} sira={sira} suzgec={{ ...suzgec, kateqoriya: null }} onSira={() => setSiraAcilib(true)} onSuzgec={() => setSuzgecAcilib(true)} />

      {suzulmus.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: C.card }}>
          <Icon name="Package" size={24} color={C.muted} />
          <p className="mt-2 text-sm font-bold" style={{ color: C.ink }}>
            {hamisi.length === 0 ? t("bazar.kateqoriya.bos") : t("bazar.axtaris.bos")}
          </p>
          {hamisi.length > 0 && (
            <p className="mt-1 text-xs" style={{ color: C.muted }}>
              {t("bazar.axtaris.bosIzah")}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {suzulmus.map((m, i) => (
            <MehsulKarti key={m.kod} mehsul={m} rayon={rayon} sira={Math.min(i, 8)} onAc={() => get.mehsul(m.kod)} />
          ))}
        </div>
      )}

      <SuzgecVereqi
        acilib={suzgecAcilib}
        onBagla={() => setSuzgecAcilib(false)}
        suzgec={{ ...suzgec, kateqoriya: kod }}
        onTetbiq={(yeni) => onSuzgec({ ...yeni, kateqoriya: suzgec.kateqoriya })}
        mehsullar={hamisi}
        rayon={rayon}
        kateqoriyaSabit
      />
      <SiraVereqi acilib={siraAcilib} onBagla={() => setSiraAcilib(false)} sira={sira} onSec={onSira} />
    </div>
  );
}
