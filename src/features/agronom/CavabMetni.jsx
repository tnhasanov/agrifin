import { C } from "../../theme/tokens.js";
import { bloklaraBol, vurguParcalari } from "../../lib/cavabMetni.js";

/**
 * Aqronomun cavabını oxunaqlı şəkildə göstərir: vacib ifadələr qalın,
 * addımlar nişanlı sətirlərdə.
 *
 * VURĞU RƏNGİ QIRMIZI DEYİL. Tətbiqdə qırmızı (C.danger) bir şey deməkdir —
 * xəta, gecikmiş ödəniş, təcili siqnal. Hər cavabda 2–3 ifadəni qırmızı
 * yazsaq, fermer bir həftədən sonra həqiqi təhlükə rəngini də saymayacaq.
 * Ona görə vurğu tünd yaşıldır (C.pine, ağ üzərində ~15:1) və işi ÇƏKİ
 * görür — rəng yalnız gözü tutur.
 */
export function CavabMetni({ metn, kursor = null }) {
  const bloklar = bloklaraBol(metn);
  const sonuncu = bloklar.length - 1;

  return (
    <>
      {bloklar.map((blok, sira) =>
        blok.nov === "madde" ? (
          <div key={sira} className={`flex gap-1.5 ${sira === 0 ? "" : "mt-1.5"}`}>
            <span
              className="shrink-0 font-bold"
              style={{ color: C.field, fontVariantNumeric: "tabular-nums" }}
            >
              {blok.nisan === "•" ? "•" : `${blok.nisan}.`}
            </span>
            <span className="flex-1">
              <Parcalar metn={blok.metn} />
              {sira === sonuncu && kursor}
            </span>
          </div>
        ) : (
          <p key={sira} className={sira === 0 ? "" : "mt-2"}>
            <Parcalar metn={blok.metn} />
            {sira === sonuncu && kursor}
          </p>
        ),
      )}
      {/* Mətn hələ gəlməyibsə kursor tək qalır — blok yoxdursa da yanıb-sönür */}
      {bloklar.length === 0 && kursor}
    </>
  );
}

/**
 * Vurğusuz parça ÇILPAQ SƏTİRDİR, <span> deyil: mətni artıq element
 * qatına bürüsək, ekran oxuyucusu bir cümləni parça-parça oxuyur və
 * testlərdəki mətn axtarışı da bölünür.
 */
function Parcalar({ metn }) {
  return vurguParcalari(metn).map((parca, sira) =>
    parca.vurgu ? (
      <strong key={sira} className="font-bold" style={{ color: C.pine }}>
        {parca.metn}
      </strong>
    ) : (
      parca.metn
    ),
  );
}
