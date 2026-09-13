import { useState } from "react";
import { Icon } from "../../../components/Icon.jsx";
import { C } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { KATEQORIYALAR, MEHSULLAR } from "../../../../lib/bazar/kataloq.js";
import { AXTARIS_HEDDI, kateqoriyalariAxtar, mehsullariAxtar, sirala, suzgecTetbiq } from "../../../../lib/bazar/axtaris.js";
import { normalizeAz } from "../../../../lib/metn.js";
import { BazarAxtaris } from "../BazarAxtaris.jsx";
import { BazarBasliq, IkonDuymesi } from "../BazarBasliq.jsx";
import { KateqoriyaKarti } from "../KateqoriyaKarti.jsx";
import { MehsulKarti } from "../MehsulKarti.jsx";
import { SiraVereqi, SiyahiAletleri, SuzgecVereqi } from "../SuzgecVereqi.jsx";

/**
 * AXTARIŞ SƏHİFƏSİ — canlı xana başlıqda, nəticə altında.
 *
 * Sorğu 2 hərfdən qısadırsa siyahı süzülmür: o halda kateqoriya çipləri və
 * (süzgəc varsa) süzülmüş tam kataloq göstərilir — "Hamısına bax" da bura
 * gəlir. Sorğuya uyğun kateqoriyalar nəticənin üstündə çip kimi çıxır.
 */
export function AxtarisEkrani({ get, geri, sebetSayi, rayon, bitki, sorgu, onSorgu, suzgec, onSuzgec, sira, onSira }) {
  const { t } = useI18n();
  const [suzgecAcilib, setSuzgecAcilib] = useState(false);
  const [siraAcilib, setSiraAcilib] = useState(false);

  const axtarilir = normalizeAz(sorgu).length >= AXTARIS_HEDDI;
  const tapilan = mehsullariAxtar(sorgu, MEHSULLAR);
  const netice = sirala(suzgecTetbiq(tapilan, suzgec), sira, { bitki });
  const uygunKateqoriyalar = axtarilir ? kateqoriyalariAxtar(sorgu) : [];

  return (
    <div className="px-4 pb-4">
      <BazarBasliq
        onGeri={geri}
        merkez={<BazarAxtaris deger={sorgu} onDeyis={onSorgu} avtoFokus />}
        sag={<IkonDuymesi ikon="ShoppingCart" say={sebetSayi} etiket={t("bazar.sebet")} onClick={() => get.sebet()} />}
      />

      {!axtarilir && (
        <>
          <p className="mt-3 text-xs font-bold tracking-wide" style={{ color: C.muted }}>
            {t("bazar.kateqoriyalar")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {KATEQORIYALAR.map((k) => (
              <KateqoriyaKarti key={k.kod} kateqoriya={k} duzum="cip" secili={suzgec.kateqoriya === k.kod} onAc={() => get.kateqoriya(k.kod)} />
            ))}
          </div>
        </>
      )}

      {uygunKateqoriyalar.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {uygunKateqoriyalar.map((k) => (
            <KateqoriyaKarti key={k.kod} kateqoriya={k} duzum="cip" onAc={() => get.kateqoriya(k.kod)} />
          ))}
        </div>
      )}

      <SiyahiAletleri say={netice.length} sira={sira} suzgec={suzgec} onSira={() => setSiraAcilib(true)} onSuzgec={() => setSuzgecAcilib(true)} />

      {netice.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: C.card }}>
          <Icon name="Search" size={24} color={C.muted} />
          <p className="mt-2 text-sm font-bold" style={{ color: C.ink }}>
            {t("bazar.axtaris.bos")}
          </p>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>
            {t("bazar.axtaris.bosIzah")}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {netice.map((m, i) => (
            <MehsulKarti key={m.kod} mehsul={m} rayon={rayon} sira={Math.min(i, 8)} onAc={() => get.mehsul(m.kod)} />
          ))}
        </div>
      )}

      <SuzgecVereqi acilib={suzgecAcilib} onBagla={() => setSuzgecAcilib(false)} suzgec={suzgec} onTetbiq={onSuzgec} mehsullar={tapilan} rayon={rayon} />
      <SiraVereqi acilib={siraAcilib} onBagla={() => setSiraAcilib(false)} sira={sira} onSec={onSira} />
    </div>
  );
}
