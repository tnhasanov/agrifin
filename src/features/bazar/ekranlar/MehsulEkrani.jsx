import { useState } from "react";
import { Icon } from "../../../components/Icon.jsx";
import { SectionTitle } from "../../../components/SectionTitle.jsx";
import { C, KOLGE, font } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { formatQiymet } from "../../../lib/format.js";
import { MEHSULLAR, mehsulTap, pulsuzCatdirilma, rayonaCatdirilir, tedarukcuTap } from "../../../../lib/bazar/kataloq.js";
import { qepik } from "../../../../lib/bazar/sifaris.js";
import { sirala } from "../../../../lib/bazar/axtaris.js";
import { AltCta } from "../AltCta.jsx";
import { BazarBasliq, IkonDuymesi } from "../BazarBasliq.jsx";
import { MaliyyeKarti, MaliyyeVereqi } from "../MaliyyeKarti.jsx";
import { MehsulKarti } from "../MehsulKarti.jsx";
import { MehsulSekli } from "../MehsulSekli.jsx";
import { MiqdarSecici } from "../MiqdarSecici.jsx";
import { MaliyyeNisani, OrijinalNisani, PulsuzCatdirilmaNisani, StokNisani, TedarukcuNisani } from "../Nisanlar.jsx";
import { QiymetMenbeyi } from "../QiymetMenbeyi.jsx";

function MelumatSetri({ etiket, deger }) {
  if (!deger) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
      <span className="shrink-0 text-xs" style={{ color: C.muted, minWidth: 96 }}>
        {etiket}
      </span>
      <span className="text-right text-xs font-semibold" style={{ color: C.ink }}>
        {deger}
      </span>
    </div>
  );
}

/**
 * MƏHSUL SƏHİFƏSİ — şəkil (qalereya yuvası), ad, qiymət, tədarükçü, nişanlar,
 * vacib məlumat, miqdar, maliyyə kartı, oxşar məhsullar; altda yapışqan CTA.
 *
 * İKİ ALIŞ YOLU: "Səbətə əlavə et" (dolu) və maliyyələşdirilə bilən məhsulda
 * "Maliyyələşdirmə imkanını yoxla" (kontur). Uyğunluq hələ hesablanmayıb,
 * ona görə düymə "yoxla" deyir, "al" yox — vərəq nəticəni göstərəndən sonra
 * davam düyməsi "səbətə əlavə et və sifarişə keç" olur.
 */
export function MehsulEkrani({ kod, get, geri, sebet, rayon, bitki, onMaliyyeIleDavam, onOpenHesab }) {
  const { t, lang } = useI18n();
  const mehsul = mehsulTap(kod);
  const [say, setSay] = useState(mehsul?.minSay ?? 1);
  const [maliyyeAcilib, setMaliyyeAcilib] = useState(false);
  // Qalereya: hazırda bir şəkil; massiv gələcək foto dəsti üçün yuvadır
  const [aktivSekil, setAktivSekil] = useState(0);

  if (!mehsul) {
    return (
      <div className="px-4 pb-4">
        <BazarBasliq basliq={t("bazar.mehsul.tapilmadi")} onGeri={geri} />
      </div>
    );
  }

  const tedarukcu = tedarukcuTap(mehsul.tedarukcu);
  const saticiNumune = mehsul.qiymetNovu === "bazar";
  const saticiTesdiqli = !saticiNumune && tedarukcu?.tesdiqli;
  const TedarukcuSetri = saticiNumune ? "div" : "button";
  const q = (v) => formatQiymet(v, lang);
  const vahid = t(`bazar.vahid.${mehsul.vahidKey}`);
  const cemi = qepik(mehsul.qiymet * say);
  const sebetde = sebet.setirler.find((s) => s.mehsul.kod === kod)?.say ?? 0;
  const rayonaGedir = rayon?.kod ? rayonaCatdirilir(mehsul, rayon.kod) : null;
  const rayonSayi = mehsul.rayonlar === "*" ? (tedarukcu?.rayonlar === "*" ? null : tedarukcu.rayonlar.length) : mehsul.rayonlar.length;
  const sekiller = [mehsul];
  const oxsarlar = sirala(
    MEHSULLAR.filter((m) => m.kateqoriya === mehsul.kateqoriya && m.kod !== mehsul.kod),
    "tovsiye",
    { bitki },
  ).slice(0, 3);
  const stokYox = mehsul.stok === "yoxdur";

  const catdirilmaSerti = tedarukcu
    ? t("bazar.mehsul.catdirilmaSert", {
        min: tedarukcu.catdirilmaGun[0],
        max: tedarukcu.catdirilmaGun[1],
        haqq:
          tedarukcu.catdirilmaHaqqi === 0
            ? t("bazar.mehsul.catdirilmaPulsuz")
            : tedarukcu.pulsuzHedd > 0
              ? t("bazar.mehsul.catdirilmaHedd", { haqq: q(tedarukcu.catdirilmaHaqqi), hedd: q(tedarukcu.pulsuzHedd) })
              : q(tedarukcu.catdirilmaHaqqi),
      })
    : null;

  return (
    <div className="px-4 pb-2">
      <BazarBasliq
        onGeri={geri}
        basliq={t(`bazar.kat.${mehsul.kateqoriya}`)}
        sag={<IkonDuymesi ikon="ShoppingCart" say={sebet.sayCemi} etiket={t("bazar.sebet")} onClick={() => get.sebet()} />}
      />

      {/* Əsas şəkil — 1:1, tam en; qalereya nöqtələri yalnız 2+ şəkildə */}
      <div className="mt-3 overflow-hidden" style={{ borderRadius: 20, boxShadow: KOLGE.kart, backgroundColor: C.card }}>
        <div className="flex justify-center" style={{ padding: 8 }}>
          <MehsulSekli mehsul={sekiller[aktivSekil]} olcu={Math.min(320, 280)} radius={16} ikonOlcu={56} />
        </div>
        {sekiller.length > 1 && (
          <div className="flex justify-center pb-1">
            {sekiller.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}`}
                aria-pressed={i === aktivSekil}
                onClick={() => setAktivSekil(i)}
                // Nöqtə 8 px-dir, toxunma hədəfi 40 px — ikisi ayrıdır
                className="flex items-center justify-center"
                style={{ width: 40, height: 40 }}
              >
                <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: i === aktivSekil ? C.pine : C.line }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <TedarukcuNisani tesdiqli={saticiTesdiqli} />
        <MaliyyeNisani maliyye={mehsul.maliyye} />
        <OrijinalNisani orijinal={mehsul.orijinal} />
        <PulsuzCatdirilmaNisani pulsuz={pulsuzCatdirilma(mehsul)} />
        <StokNisani stok={mehsul.stok} />
      </div>

      <h1 className="mt-2 text-xl font-extrabold" style={{ color: C.ink, fontFamily: font.display, lineHeight: "26px" }}>
        {mehsul.ad}
      </h1>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}>
          {q(mehsul.qiymet)}
        </span>
        <span className="text-sm" style={{ color: C.muted }}>
          {t("bazar.vahidBasina", { vahid })}
        </span>
      </p>
      <QiymetMenbeyi mehsul={mehsul} />
      {mehsul.qiymetNovu === "bazar" && (
        <p className="mt-1.5 text-[11px] leading-4" style={{ color: C.muted }}>
          {t("bazar.qiymet.sifarisQeyd")}
        </p>
      )}

      {/* Tədarükçü sətri — səhifəsinə keçid */}
      <TedarukcuSetri
        {...(!saticiNumune ? { type: "button", onClick: () => get.tedarukcu(mehsul.tedarukcu) } : {})}
        className={`${saticiNumune ? "" : "basilir"} mt-3 flex w-full items-center gap-3 rounded-2xl p-3 text-left`}
        style={{ backgroundColor: C.card, boxShadow: KOLGE.kart, minHeight: 56 }}
      >
        <span className="flex shrink-0 items-center justify-center rounded-xl font-extrabold" style={{ width: 36, height: 36, backgroundColor: C.fieldSoft, color: C.pine, fontFamily: font.display }}>
          {tedarukcu?.ad?.charAt(0) ?? "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs" style={{ color: C.muted }}>
            {t(saticiNumune ? "bazar.qiymet.saticiNumune" : "bazar.mehsul.tedarukcu")}
          </span>
          <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: C.ink }}>
            <span className="truncate">{tedarukcu?.ad}</span>
            <TedarukcuNisani tesdiqli={saticiTesdiqli} tam kicik />
          </span>
        </span>
        {!saticiNumune && <Icon name="ChevronRight" size={18} color={C.muted} />}
      </TedarukcuSetri>

      {rayonaGedir != null && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: rayonaGedir ? C.field : C.warn }}>
          <Icon name="Truck" size={14} color={rayonaGedir ? C.field : C.warn} />
          {t(rayonaGedir ? "bazar.catdirilirRayon" : "bazar.catdirilmirRayon", { rayon: rayon.name })}
        </p>
      )}

      {mehsul.tesvir && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: C.ink }}>
          {mehsul.tesvir}
        </p>
      )}

      {/* Vacib məlumat */}
      <SectionTitle>{t("bazar.mehsul.melumat")}</SectionTitle>
      <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
        <MelumatSetri etiket={t("bazar.mehsul.brend")} deger={mehsul.brend} />
        <MelumatSetri etiket={t("bazar.mehsul.qablasma")} deger={mehsul.qablasma} />
        <MelumatSetri etiket={t("bazar.mehsul.tetbiq")} deger={mehsul.tetbiq} />
        <MelumatSetri etiket={t("bazar.mehsul.rayonlar")} deger={rayonSayi == null ? t("bazar.mehsul.butunRayonlar") : t("bazar.mehsul.rayonSayi", { say: rayonSayi })} />
        <MelumatSetri etiket={t("bazar.mehsul.catdirilma")} deger={catdirilmaSerti} />
        <MelumatSetri etiket={t("bazar.mehsul.minSifaris")} deger={t("bazar.mehsul.minSay", { say: mehsul.minSay, vahid })} />
        <div className="flex items-start justify-between gap-4 py-2">
          <span className="shrink-0 text-xs" style={{ color: C.muted, minWidth: 96 }}>
            {t("bazar.mehsul.stok")}
          </span>
          <span className="text-xs font-semibold" style={{ color: stokYox ? C.danger : mehsul.stok === "az" ? C.goldInk : C.field }}>
            {t(`bazar.stok.${mehsul.stok}`)}
          </span>
        </div>
      </div>

      {/* Miqdar + canlı hesab */}
      <SectionTitle>{t("bazar.mehsul.miqdar")}</SectionTitle>
      <div className="flex items-center justify-between gap-3 rounded-2xl p-3" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
        <MiqdarSecici say={say} min={mehsul.minSay} max={mehsul.maxSay} onDeyis={setSay} />
        <div className="min-w-0 text-right">
          <p className="text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
            {t("bazar.mehsul.hesab", { say, vahid, qiymet: q(mehsul.qiymet) })}
          </p>
          <p className="text-base font-extrabold" style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}>
            {t("bazar.mehsul.yekun", { cemi: q(cemi) })}
          </p>
          {sebetde > 0 && (
            <p className="text-xs font-semibold" style={{ color: C.field }}>
              {t("bazar.mehsul.artiqSebetde", { say: sebetde })}
            </p>
          )}
        </div>
      </div>

      {mehsul.maliyye && (
        <div className="mt-3">
          <MaliyyeKarti mebleg={cemi} maliyyeMeblegi={cemi} onYoxla={() => setMaliyyeAcilib(true)} />
        </div>
      )}

      {oxsarlar.length > 0 && (
        <>
          <SectionTitle>{t("bazar.mehsul.oxsar")}</SectionTitle>
          <div className="space-y-2.5">
            {oxsarlar.map((m, i) => (
              <MehsulKarti key={m.kod} mehsul={m} rayon={rayon} sira={i} onAc={() => get.mehsul(m.kod)} />
            ))}
          </div>
        </>
      )}

      <div className="h-3" />
      <AltCta
        esas={{
          label: t("bazar.mehsul.sebeteElave"),
          disabled: stokYox,
          onClick: () => sebet.elave(mehsul.kod, say),
        }}
        ikinci={
          mehsul.maliyye && !stokYox
            ? { label: t("bazar.mehsul.maliyyeYoxla"), reng: C.mal, onClick: () => setMaliyyeAcilib(true) }
            : null
        }
      />

      <MaliyyeVereqi
        acilib={maliyyeAcilib}
        onBagla={() => setMaliyyeAcilib(false)}
        setirler={[{ kod: mehsul.kod, say }]}
        mebleg={cemi}
        maliyyeMeblegi={cemi}
        onOpenHesab={onOpenHesab}
        onDavam={() => {
          sebet.elave(mehsul.kod, say);
          onMaliyyeIleDavam();
        }}
      />
    </div>
  );
}
