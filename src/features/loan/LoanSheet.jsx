import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { Aqronom } from "../../components/Aqronom.jsx";
import { Sheet } from "../../components/Sheet.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { LOAN_TERMS } from "../../services/farm.js";
import { kreditImkani } from "./useKredit.js";

/**
 * Kredit axını — Nubank limit slayderinin buradakı qarşılığı.
 *
 * Üç dürüstlük qaydası:
 *   1. TAVANI SAHƏ QOYUR: slayderin maksimumu uydurma limit deyil, ödəniş
 *      qabiliyyətindən çıxan məbləğdir (bax: features/loan/useKredit.js).
 *      "Niyə bu qədər?" hər addımı rəqəmlə açır — Nubank-ın "Me explica"sı.
 *   2. ÖDƏNİŞ BİÇİNƏ BAĞLANIR: müddət sabit deyil, fermerin pulu OLACAĞI
 *      aya qədərdir.
 *   3. DƏRHAL PUL YOXDUR: axın müraciətlə bitir. Əvvəl "Qəbul et" düyməsi
 *      pulqabına dərhal pul yazırdı — real qərar mühərriki olmayan yerdə
 *      bu, yalan idi.
 *
 * Sheet primitivində qurulub: sürüşdürüb bağlama, fokus tələsi, Escape —
 * hamısı ordan gəlir (əvvəl bunların heç biri yox idi).
 */
export function LoanSheet({ onClose, indeksHali = null }) {
  const { t, money } = useI18n();
  const { state, actions } = useStore();
  const [addim, setAddim] = useState(0);
  const [izahAcilib, setIzahAcilib] = useState(false);

  const kredit = kreditImkani({
    sahe: state.sahe,
    bitki: state.chat.crop,
    indeks: indeksHali?.indeks ?? null,
  });

  const hazir = kredit.hal === "hazir";
  // Slayder tavana sıçramasın deyə başlanğıc tavanın yarısıdır
  const [mebleg, setMebleg] = useState(() =>
    hazir ? Math.max(kredit.minKredit, Math.round(kredit.maxKredit / 2 / 100) * 100) : 0,
  );

  // Intl işlədilmir: Chromium-un bir çox quruluşunda az lokalı yoxdur və
  // "İyun 2027" əvəzinə "M06 2027" çıxırdı — adlar i18n-dən gəlir
  const ayAdi = (tarix) =>
    tarix ? `${t(`ay.${tarix.getMonth() + 1}`)} ${tarix.getFullYear()}` : "";

  const gonder = () => {
    actions.muracietGonder({
      mebleg,
      ayliqFaiz: kredit.ayliqFaiz1(mebleg),
      muddetAy: kredit.muddetAy,
      odemeTarixi: kredit.odemeTarixi.toISOString(),
      bitki: state.chat.crop,
      hektar: state.sahe?.hektar,
      tavan: kredit.maxKredit,
      tarix: new Date().toISOString(),
    });
    setAddim(2);
  };

  // "Niyə bu qədər?" — tavanın hər addımı rəqəmlə (Nubank "Me explica").
  // xalisGelir HƏQİQƏTƏN xalisdir: lib/gelir.js-də satış gəliri + subsidiya
  // cəmindən istehsal xərcləri (toxum, gübrə, yanacaq, əmək) çıxılıb.
  const pessimist = kredit.odenis?.ssenariler?.find((s) => s.ad === "pessimist");
  const izahSetirleri = hazir
    ? [
        ["kredit.izah.xalis", kredit.gelir.pessimist.xalisGelir],
        ["kredit.izah.serbest", pessimist.serbestGelir],
        ["kredit.izah.tavan", pessimist.tavan],
        ["kredit.izah.limit", kredit.maxKredit],
      ]
    : [];

  return (
    <Sheet
      acilib
      onBagla={onClose}
      baslik={addim === 2 ? t("kredit.gonderildiBasliq") : t("loan.title")}
      altYazi={addim === 2 ? null : t("kredit.altYazi")}
    >
      <div className="px-4 pb-4">
        {/* ── Artıq gözləyən müraciət var: ikincisi göndərilmir ─────── */}
        {state.muraciet && addim !== 2 && (
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Icon name="Clock" size={15} color={C.goldDeep} />
              <p className="text-sm font-bold" style={{ color: C.ink }}>
                {t("kredit.movcudBasliq")}
              </p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.movcudIzah", {
                mebleg: { money: state.muraciet.mebleg },
                tarix: ayAdi(new Date(state.muraciet.odemeTarixi)),
              })}
            </p>
            <button
              type="button"
              onClick={() => actions.muracietLegv()}
              className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold"
              style={{ backgroundColor: C.mist, color: C.danger }}
            >
              {t("kredit.legvCta")}
            </button>
          </div>
        )}

        {/* ── Sahə/bitki yoxdur: imkan hesablana bilmir ─────────────── */}
        {!state.muraciet && kredit.hal === "olculmur" && (
          <div className="py-2 text-center">
            <Icon name="Satellite" size={22} color={C.muted} />
            <p className="mt-2 text-sm font-bold" style={{ color: C.ink }}>
              {t("kredit.olculmurBasliq")}
            </p>
            <p className="mx-auto mt-1 max-w-[30ch] text-xs leading-relaxed" style={{ color: C.muted }}>
              {t(
                kredit.sebeb === "saheYoxdur"
                  ? "kredit.olculmurSahe"
                  : "kredit.olculmurBitki",
              )}
            </p>
          </div>
        )}

        {/* ── Tavan çox kiçikdir: bunu demək də dürüstlükdür ────────── */}
        {!state.muraciet && kredit.hal === "imkanYoxdur" && (
          <div className="py-2">
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {t("kredit.imkanYoxBasliq")}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.imkanYoxIzah", {
                hektar: { number: state.sahe?.hektar ?? 0 },
                xalis: { money: Math.max(0, kredit.gelir.pessimist.xalisGelir) },
              })}
            </p>
            <p
              className="mt-2 rounded-lg px-2.5 py-2 text-xs leading-relaxed"
              style={{ backgroundColor: C.goldSoft, color: C.goldDeep }}
            >
              {t("kredit.imkanYoxMeslehet")}
            </p>
          </div>
        )}

        {/* ── Addım 0: məbləği seç ──────────────────────────────────── */}
        {!state.muraciet && hazir && addim === 0 && (
          <div>
            {/* Aqro slaydere REAKSİYA VERİR (Leo kimi): tavana yaxınlaşanda
                fikirləşir — "çox götürürsən, ödəyə biləcəksən?" sözsüz deyilir.
                Qadağa deyil, üz ifadəsidir: seçim fermerindir. */}
            <div className="mb-1 flex items-end justify-center gap-3">
              <Aqronom
                hal={mebleg >= kredit.maxKredit * 0.85 ? "dusunur" : "sakit"}
                bitki={state.chat.crop}
                olcu={44}
              />
              <p
                className="text-center text-3xl font-extrabold"
                style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
              >
                {money(mebleg)}
              </p>
            </div>
            {/* "Bir ödəniş: X ₼ · Avqust" SİLİNİB — məhsul o deyil.
                Rəqəm İLK ayın faizidir, sabit aylıq ödəniş DEYİL: əsas borc
                azaldıqca faiz də azalır və məhsulun əsas üstünlüyü elə budur.
                "Hər ay 45 ₼" yazmaq o üstünlüyü gizlədirdi. */}
            <p
              className="text-center text-xs font-semibold"
              style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
            >
              {t("kredit.faizSetri", { faiz: { money: kredit.ayliqFaiz1(mebleg) } })}
            </p>
            <p className="text-center text-xs" style={{ color: C.muted }}>
              {t("kredit.faizAzalir")}
            </p>
            <p className="mb-3 text-center text-xs" style={{ color: C.muted }}>
              {t("kredit.sonTarixSetri", { tarix: ayAdi(kredit.odemeTarixi) })}
            </p>

            <input
              type="range"
              min={kredit.minKredit}
              max={kredit.maxKredit}
              step={kredit.addim}
              value={mebleg}
              onChange={(e) => setMebleg(Number(e.target.value))}
              aria-label={t("loan.amountLabel")}
              className="kredit-slayder w-full"
              // Dolu hissə qradiyentlə: standart boz zolaq brendsiz idi
              style={{
                backgroundImage: `linear-gradient(to right, ${C.field} ${
                  ((mebleg - kredit.minKredit) / (kredit.maxKredit - kredit.minKredit)) * 100
                }%, ${C.mist} 0)`,
              }}
            />
            <div className="mt-1 flex justify-between text-xs" style={{ color: C.muted }}>
              <span>{money(kredit.minKredit)}</span>
              <span className="font-semibold" style={{ color: C.ink }}>
                {money(kredit.maxKredit)}
              </span>
            </div>

            {/* Tavan izah olunur — gizli düstur etibar yaratmır */}
            <button
              type="button"
              onClick={() => setIzahAcilib(!izahAcilib)}
              aria-expanded={izahAcilib}
              className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2.5"
              style={{ backgroundColor: C.mist }}
            >
              <span className="text-xs font-semibold" style={{ color: C.pine }}>
                {t("kredit.niyeBuQeder", { max: { money: kredit.maxKredit } })}
              </span>
              <Icon name={izahAcilib ? "ChevronDown" : "ChevronRight"} size={14} color={C.muted} />
            </button>
            {izahAcilib && (
              <div className="mt-1 rounded-xl px-3 py-1" style={{ backgroundColor: C.mist }}>
                {izahSetirleri.map(([acar, deger]) => (
                  <div
                    key={acar}
                    className="flex items-baseline justify-between gap-2 py-2"
                    style={{ borderBottom: `1px solid ${C.line}` }}
                  >
                    <span className="text-xs" style={{ color: C.muted }}>
                      {t(acar)}
                    </span>
                    <span
                      className="text-xs font-bold whitespace-nowrap"
                      style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
                    >
                      {money(deger)}
                    </span>
                  </div>
                ))}
                <p className="py-2 text-xs leading-relaxed" style={{ color: C.muted }}>
                  {t("kredit.izahQeyd")}
                </p>
              </div>
            )}

            {/* Ödəniş prinsipi bir cümlə ilə: çevik əsas borc + qalığa faiz.
                Texniki dil yox — model-governance qeydləri müştəri ekranında
                deyil (bax: lib/odenis.js, ODENIS_TESDIQ). */}
            <p
              className="mt-3 rounded-lg px-2.5 py-2 text-xs leading-relaxed"
              style={{ backgroundColor: C.mist, color: C.pine }}
            >
              {t("kredit.cevikQeyd")}
            </p>

            <button
              type="button"
              onClick={() => setAddim(1)}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.pine, color: "#fff" }}
            >
              {t("loan.reviewCta")}
            </button>
          </div>
        )}

        {/* ── Addım 1: şərtlər ──────────────────────────────────────── */}
        {!state.muraciet && hazir && addim === 1 && (
          <div>
            {/* "Bir ödəniş" sətri yoxdur: faiz aylıqdır, əsas borc çevikdir,
                son tarix əsas borcun TAM bağlanması üçündür.
                SIRALAMA GÖZLƏ OXUNUR: məbləğ ən iridir (fermer əvvəl onu
                axtarır), ilk ay faizi + əsas borc + son tarix normal, illik
                faiz/girov/sahə isə ikinci dərəcəli sətirlərdir — hamısı eyni
                çəkidə olanda heç biri seçilmirdi. */}
            {[
              { ad: t("kredit.setr.mebleg"), deger: money(mebleg), vurgu: true },
              {
                ad: t("kredit.setr.ilkFaiz"),
                deger: t("kredit.setr.ilkFaizDeger", {
                  faiz: { money: kredit.ayliqFaiz1(mebleg) },
                }),
                // Sabit aylıq ödəniş TƏSƏVVÜRÜ burada qırılır
                alt: t("kredit.faizAzalir"),
              },
              { ad: t("kredit.setr.esasBorc"), deger: t("kredit.setr.esasBorcDeger") },
              {
                ad: t("kredit.setr.sonTarix"),
                deger: t("kredit.setr.sonTarixDeger", { tarix: ayAdi(kredit.odemeTarixi) }),
              },
              { ad: t("kredit.setr.muddet"), deger: t("kredit.setr.muddetDeger", { ay: kredit.muddetAy }) },
              { ad: t("loan.term.rate"), deger: `${LOAN_TERMS.annualRate}%`, ikinci: true },
              {
                ad: t("loan.term.collateral"),
                deger: t("loan.term.collateralValue"),
                ikinci: true,
              },
              // Peyk təsdiqi GİROVUN ƏVƏZİ DEYİL: ayrı sətirdir, çünki
              // "əkininiz girov kimi kifayətdir" hüquqi olaraq yanlışdır.
              // "Peyklə təsdiqlənib" yalnız ölçmə HƏQİQƏTƏN varsa yazılır —
              // indeks yoxdursa sahə sadəcə xəritədə çəkilmiş sahədir.
              {
                ad: t("kredit.setr.sahe"),
                deger: indeksHali?.indeks
                  ? t("kredit.setr.saheDeger")
                  : t("kredit.setr.saheDegerCizilib", { hektar: { number: state.sahe.hektar } }),
                ikinci: true,
              },
            ].map(({ ad, deger, alt, vurgu, ikinci }) => (
              <div key={ad} className="py-2.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div className="flex justify-between gap-3">
                  <span className={ikinci ? "text-xs" : "text-xs"} style={{ color: C.muted }}>
                    {ad}
                  </span>
                  <span
                    className={`max-w-[60%] text-right ${
                      vurgu ? "text-lg font-extrabold" : "text-xs font-bold"
                    }`}
                    style={{
                      color: ikinci ? C.muted : C.ink,
                      fontFamily: vurgu ? font.display : undefined,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {deger}
                  </span>
                </div>
                {alt && (
                  <p className="mt-0.5 text-right text-xs leading-snug" style={{ color: C.muted }}>
                    {alt}
                  </p>
                )}
              </div>
            ))}

            {/* Son tarix biçinə bağlıdır və erkən ödəniş faizi azaldır */}
            <p className="mt-2.5 text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.bicinIzah")}
            </p>

            <button
              type="button"
              onClick={gonder}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.gold, color: C.pine }}
            >
              {t("kredit.gonderCta", { mebleg: { money: mebleg } })}
            </button>
          </div>
        )}

        {/* ── Addım 2: müraciət göndərildi (pul köçürülmür!) ────────── */}
        {addim === 2 && (
          <div className="py-2 text-center">
            <div className="relative mx-auto mb-2 inline-block">
              {/* Konfeti brend rəngləridir və BİR DƏFƏ düşür — sonsuz bayram
                  yorucudur (bax: index.css, .konfeti) */}
              {[
                ["8%", "0ms", C.gold],
                ["24%", "120ms", C.field],
                ["40%", "40ms", "#B79BE0"],
                ["56%", "180ms", C.gold],
                ["72%", "80ms", "#D9483B"],
                ["88%", "150ms", C.field],
                ["16%", "220ms", "#4A90E2"],
                ["64%", "260ms", C.goldDeep],
              ].map(([sol, gecikme, reng]) => (
                <span
                  key={`${sol}-${gecikme}`}
                  className="konfeti"
                  style={{ left: sol, animationDelay: gecikme, backgroundColor: reng }}
                />
              ))}
              <Aqronom hal="sevincli" bitki={state.chat.crop} olcu={150} />
            </div>
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {t("kredit.gonderildiSetir", { mebleg: { money: mebleg } })}
            </p>
            <p className="mx-auto mt-1 mb-4 max-w-[32ch] text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.gonderildiQeyd", { tarix: ayAdi(kredit.odemeTarixi) })}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.pine, color: "#fff" }}
            >
              {t("common.close")}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
