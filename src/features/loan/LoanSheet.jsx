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
  const { t, money, lang } = useI18n();
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

  const ayAdi = (tarix) =>
    tarix ? new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" }).format(tarix) : "";

  const gonder = () => {
    actions.muracietGonder({
      mebleg,
      odenis: kredit.odenis1(mebleg),
      muddetAy: kredit.muddetAy,
      odemeTarixi: kredit.odemeTarixi.toISOString(),
      bitki: state.chat.crop,
      hektar: state.sahe?.hektar,
      tavan: kredit.maxKredit,
      tarix: new Date().toISOString(),
    });
    setAddim(2);
  };

  // "Niyə bu qədər?" — tavanın hər addımı rəqəmlə (Nubank "Me explica")
  const pessimist = kredit.odenis?.ssenariler?.find((s) => s.ad === "pessimist");
  const izahSetirleri = hazir
    ? [
        ["kredit.izah.xalis", kredit.gelir.pessimist.xalisGelir],
        ["kredit.izah.serbest", pessimist.serbestGelir],
        ["kredit.izah.tavan", pessimist.tavan],
        ["kredit.izah.esas", kredit.maxKredit],
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
            <p
              className="mb-1 text-center text-3xl font-extrabold"
              style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
            >
              {money(mebleg)}
            </p>
            <p className="mb-3 text-center text-xs" style={{ color: C.muted }}>
              {t("kredit.odenisSetri", {
                odenis: { money: kredit.odenis1(mebleg) },
                tarix: ayAdi(kredit.odemeTarixi),
              })}
            </p>

            <input
              type="range"
              min={kredit.minKredit}
              max={kredit.maxKredit}
              step={kredit.addim}
              value={mebleg}
              onChange={(e) => setMebleg(Number(e.target.value))}
              aria-label={t("loan.amountLabel")}
              className="w-full"
              style={{ accentColor: C.field }}
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
            {[
              [t("kredit.setr.mebleg"), money(mebleg)],
              [
                t("loan.term.single"),
                t("kredit.setr.odenisDeger", {
                  tarix: ayAdi(kredit.odemeTarixi),
                  odenis: { money: kredit.odenis1(mebleg) },
                }),
              ],
              [t("kredit.setr.muddet"), t("kredit.setr.muddetDeger", { ay: kredit.muddetAy })],
              [t("loan.term.rate"), `${LOAN_TERMS.annualRate}%`],
              [t("loan.term.collateral"), t("loan.term.collateralValue")],
            ].map(([ad, deger]) => (
              <div
                key={ad}
                className="flex justify-between gap-3 py-2.5"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <span className="text-xs" style={{ color: C.muted }}>
                  {ad}
                </span>
                <span className="max-w-[60%] text-right text-xs font-bold" style={{ color: C.ink }}>
                  {deger}
                </span>
              </div>
            ))}

            {/* Ödəniş biçinə bağlıdır — şərt cədvəlin altında izah olunur */}
            <p className="mt-2.5 text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.bicinIzah", { tarix: ayAdi(kredit.odemeTarixi) })}
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
            <div className="mx-auto mb-2 inline-block">
              <Aqronom hal="sevincli" bitki={state.chat.crop} olcu={76} />
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
