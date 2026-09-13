import { Icon } from "../../../components/Icon.jsx";
import { SectionTitle } from "../../../components/SectionTitle.jsx";
import { C, font } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { KATEQORIYALAR, MEHSULLAR, NUMUNE } from "../../../../lib/bazar/kataloq.js";
import { sirala, yeniMehsullar } from "../../../../lib/bazar/axtaris.js";
import { BazarAxtaris } from "../BazarAxtaris.jsx";
import { IkonDuymesi } from "../BazarBasliq.jsx";
import { KateqoriyaKarti } from "../KateqoriyaKarti.jsx";
import { MehsulKarti } from "../MehsulKarti.jsx";
import { TesserufatKarti } from "../TesserufatKarti.jsx";
import { TovsiyeKarti } from "../TovsiyeKarti.jsx";

/**
 * BAZAR ANA SƏHİFƏSİ — kataloq deyil, TƏSƏRRÜFATDAN BAŞLAYAN vitrin:
 *   başlıq + səbət/sifarişlər → axtarış → fermerin sahəsi (tövsiyə girişi)
 *   → kateqoriyalar → "sizin üçün" → əkin planı (varsa) → yeni məhsullar
 *   → maliyyə zolağı → nümunə qeydi.
 *
 * "Sizin üçün" sırası fermerin bitkisinə görədir (lib/bazar/axtaris.js →
 * tovsiyeBali): pomidor əkən əvvəlcə pomidor toxumunu görür, traktoru yox.
 */
export function BazarEvi({ get, sebetSayi, aktivSifarisSayi, sahe, bitki, rayon, plan, onDrawField, onOpenBitki }) {
  const { t } = useI18n();
  const sizinUcun = sirala(MEHSULLAR, "tovsiye", { bitki }).slice(0, 8);
  const yeniler = yeniMehsullar(4);

  return (
    <div className="px-4 pb-4">
      {/* Başlıq: ad + səbət və sifarişlər */}
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: font.display }}>
            {t("bazar.basliq", { app: { key: "app.name" } })}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: C.muted }}>
            {t("bazar.altyazi")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <IkonDuymesi ikon="ClipboardList" say={aktivSifarisSayi} etiket={t("bazar.sifarisler")} onClick={() => get.sifarisler()} />
          <IkonDuymesi ikon="ShoppingCart" say={sebetSayi} etiket={t("bazar.sebet")} onClick={() => get.sebet()} />
        </div>
      </div>

      <div className="mt-3">
        <BazarAxtaris onAc={() => get.axtar()} />
      </div>

      <TesserufatKarti
        sahe={sahe}
        bitki={bitki}
        rayon={rayon}
        onTovsiye={() => get.tovsiye()}
        onDrawField={onDrawField}
        onOpenBitki={onOpenBitki}
      />

      {/* Kateqoriyalar — üfüqi, snap ilə; kənardan kənara sürüşür */}
      <SectionTitle>{t("bazar.kateqoriyalar")}</SectionTitle>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2" style={{ scrollSnapType: "x proximity" }}>
        {KATEQORIYALAR.map((k, i) => (
          <KateqoriyaKarti key={k.kod} kateqoriya={k} sira={i} onAc={() => get.kateqoriya(k.kod)} />
        ))}
      </div>

      {/* Sizin üçün — bitkiyə görə sıralanmış. "Hamısına bax" 40 px hədəfdir
          (SectionTitle-ın mətn keçidi 16 px-dir — barmaq üçün azdır) */}
      <div className="mt-5 mb-1 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold tracking-wide" style={{ color: C.ink, fontFamily: font.display }}>
          {t("bazar.sizinUcun")}
        </h2>
        <button
          type="button"
          onClick={() => get.axtar()}
          className="basilir -mr-2 flex items-center gap-0.5 px-2 text-xs font-semibold"
          style={{ color: C.field, minHeight: 40 }}
        >
          {t("bazar.hamisinaBax")}
          <Icon name="ChevronRight" size={14} color={C.field} />
        </button>
      </div>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2" style={{ scrollSnapType: "x proximity" }}>
        {sizinUcun.map((m, i) => (
          <MehsulKarti key={m.kod} mehsul={m} duzum="sebeke" sira={i} onAc={() => get.mehsul(m.kod)} />
        ))}
      </div>

      {/* Əkin planı — yalnız sahə və bitki varsa (uydurma plan yox) */}
      {plan?.hal === "hazir" && (
        <div className="mt-5">
          <TovsiyeKarti plan={plan} onMehsullar={() => get.tovsiye()} yigcam />
        </div>
      )}

      <SectionTitle>{t("bazar.yeniMehsullar")}</SectionTitle>
      <div className="space-y-2.5">
        {yeniler.map((m, i) => (
          <MehsulKarti key={m.kod} mehsul={m} rayon={rayon} sira={i} onAc={() => get.mehsul(m.kod)} />
        ))}
      </div>

      {/* Maliyyə zolağı — bənövşəyi, sakit; vəd yox, izah var */}
      <section className="mt-5 flex items-start gap-3 rounded-2xl p-4" style={{ backgroundColor: C.malSoft }}>
        <span className="flex shrink-0 items-center justify-center rounded-xl bg-white" style={{ width: 36, height: 36 }}>
          <Icon name="Wallet" size={18} color={C.mal} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold" style={{ color: C.mal, fontFamily: font.display }}>
            {t("bazar.maliyyeStrip.basliq", { app: { key: "app.name" } })}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.mal }}>
            {t("bazar.maliyyeStrip.metn")}
          </p>
        </div>
      </section>

      {NUMUNE && (
        <p className="mt-4 px-1 text-center leading-relaxed" style={{ color: C.muted, fontSize: 11 }}>
          {t("bazar.numuneQeyd")}
        </p>
      )}
    </div>
  );
}
