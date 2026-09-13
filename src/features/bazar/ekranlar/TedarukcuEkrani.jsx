import { useState } from "react";
import { Icon } from "../../../components/Icon.jsx";
import { C, KOLGE, font } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { formatQiymet } from "../../../lib/format.js";
import { tedarukcuMehsullari, tedarukcuTap } from "../../../../lib/bazar/kataloq.js";
import { sirala } from "../../../../lib/bazar/axtaris.js";
import { rayonTap } from "../../../../lib/rayonlar.js";
import { BazarBasliq, IkonDuymesi } from "../BazarBasliq.jsx";
import { MehsulKarti } from "../MehsulKarti.jsx";
import { TedarukcuNisani } from "../Nisanlar.jsx";

/** Beş ulduz — dolu olanlar qızılı, qalanı xətt rəngində (ikonlar kontur əsaslıdır) */
function Ulduzlar({ reytinq }) {
  const dolu = Math.round(reytinq);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="Star" size={12} color={i < dolu ? C.gold : C.line} strokeWidth={2.5} />
      ))}
    </span>
  );
}

/**
 * TƏDARÜKÇÜ SƏHİFƏSİ — profil kartı + iki bölmə (Məhsullar | Haqqında).
 * Korporativ detal yoxdur: reytinq, məhsul sayı, rayonlar, çatdırılma —
 * fermerin qərarına lazım olan qədər.
 */
export function TedarukcuEkrani({ kod, get, geri, sebetSayi, rayon, bitki }) {
  const { t, lang } = useI18n();
  const [bolme, setBolme] = useState("mehsullar");
  const tedarukcu = tedarukcuTap(kod);

  if (!tedarukcu) {
    return (
      <div className="px-4 pb-4">
        <BazarBasliq basliq={t("bazar.tedarukcu.tapilmadi")} onGeri={geri} />
      </div>
    );
  }

  const mehsullar = sirala(tedarukcuMehsullari(kod), "tovsiye", { bitki });
  const rayonAdlari = tedarukcu.rayonlar === "*" ? null : tedarukcu.rayonlar.map((k) => rayonTap(k)?.name ?? k);

  return (
    <div className="px-4 pb-4">
      <BazarBasliq
        basliq={tedarukcu.ad}
        onGeri={geri}
        sag={<IkonDuymesi ikon="ShoppingCart" say={sebetSayi} etiket={t("bazar.sebet")} onClick={() => get.sebet()} />}
      />

      <section className="mt-3 rounded-2xl p-4" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
        <div className="flex items-center gap-3">
          <span className="flex shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold" style={{ width: 56, height: 56, backgroundColor: C.fieldSoft, color: C.pine, fontFamily: font.display }}>
            {tedarukcu.ad.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold" style={{ color: C.ink, fontFamily: font.display }}>
              {tedarukcu.ad}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <TedarukcuNisani tesdiqli={tedarukcu.tesdiqli} tam />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: C.line }}>
          <div>
            {tedarukcu.reytinq != null ? (
              <>
                <p className="text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                  {tedarukcu.reytinq.toFixed(1)}
                </p>
                <Ulduzlar reytinq={tedarukcu.reytinq} />
                <p style={{ color: C.muted, fontSize: 10 }}>{t("bazar.mehsul.reySayi", { say: tedarukcu.reySayi })}</p>
              </>
            ) : (
              <p className="text-xs" style={{ color: C.muted }}>
                {t("bazar.mehsul.reyYox")}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {mehsullar.length}
            </p>
            <p style={{ color: C.muted, fontSize: 10 }}>{t("bazar.tedarukcu.mehsullar")}</p>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {t("bazar.tedarukcu.ildenBeri", { il: tedarukcu.il })}
            </p>
            <p style={{ color: C.muted, fontSize: 10 }}>{t("bazar.tedarukcu.fealiyyet")}</p>
          </div>
        </div>
      </section>

      {/* Seqment: Məhsullar | Haqqında */}
      <div className="mt-3 flex rounded-xl p-1" role="tablist" style={{ backgroundColor: C.mist }}>
        {["mehsullar", "haqqinda"].map((b) => {
          const secili = bolme === b;
          return (
            <button
              key={b}
              type="button"
              role="tab"
              aria-selected={secili}
              onClick={() => setBolme(b)}
              className="basilir flex-1 rounded-lg text-sm font-bold"
              style={{ minHeight: 40, backgroundColor: secili ? C.card : "transparent", color: secili ? C.ink : C.muted, boxShadow: secili ? KOLGE.kart : "none" }}
            >
              {t(`bazar.tedarukcu.${b}`)}
            </button>
          );
        })}
      </div>

      {bolme === "mehsullar" ? (
        <div className="mt-3 space-y-2.5">
          {mehsullar.map((m, i) => (
            <MehsulKarti key={m.kod} mehsul={m} rayon={rayon} sira={Math.min(i, 8)} onAc={() => get.mehsul(m.kod)} />
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <section className="rounded-2xl p-4" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
            <p className="text-sm leading-relaxed" style={{ color: C.ink }}>
              {tedarukcu.haqqinda}
            </p>
            <p className="mt-3 flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: tedarukcu.tesdiqli ? C.fieldSoft : C.mist, color: tedarukcu.tesdiqli ? C.pine : C.muted }}>
              <Icon name={tedarukcu.tesdiqli ? "BadgeCheck" : "Info"} size={16} color={tedarukcu.tesdiqli ? C.field : C.muted} />
              {t(tedarukcu.tesdiqli ? "bazar.tedarukcu.tesdiqIzah" : "bazar.tedarukcu.tesdiqsizIzah", { app: { key: "app.name" } })}
            </p>
          </section>
          <section className="rounded-2xl p-4" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
            <p className="text-xs font-bold tracking-wide" style={{ color: C.muted }}>
              {t("bazar.tedarukcu.catdirilma")}
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: C.ink }}>
              {t("bazar.sifaris.gunAraligi", { min: tedarukcu.catdirilmaGun[0], max: tedarukcu.catdirilmaGun[1] })}
              {" · "}
              {tedarukcu.catdirilmaHaqqi === 0
                ? t("bazar.mehsul.catdirilmaPulsuz")
                : tedarukcu.pulsuzHedd > 0
                  ? t("bazar.mehsul.catdirilmaHedd", { haqq: formatQiymet(tedarukcu.catdirilmaHaqqi, lang), hedd: formatQiymet(tedarukcu.pulsuzHedd, lang) })
                  : formatQiymet(tedarukcu.catdirilmaHaqqi, lang)}
            </p>
            <p className="mt-3 text-xs font-bold tracking-wide" style={{ color: C.muted }}>
              {t("bazar.tedarukcu.rayonlar")}
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: C.ink }}>
              {rayonAdlari ? rayonAdlari.join(", ") : t("bazar.tedarukcu.butunRayonlar")}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
