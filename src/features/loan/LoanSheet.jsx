import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { Aqronom } from "../../components/Aqronom.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { FARM, LOAN_TERMS, computeRepayment } from "../../services/farm.js";

export function LoanSheet({ onClose }) {
  const { t, money } = useI18n();
  const { state, actions } = useStore();
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState(5000);
  const sheetRef = useRef(null);

  const repay = computeRepayment(amount, LOAN_TERMS);

  useEffect(() => {
    sheetRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const terms = [
    [t("loan.term.transfer"), t("loan.term.transferValue")],
    [
      t("loan.term.single"),
      t("loan.term.singleValue", { date: t("date.aug15.long"), repay: { money: repay } }),
    ],
    [t("loan.term.rate"), t("loan.term.rateValue", { rate: LOAN_TERMS.annualRate })],
    [t("loan.term.collateral"), t("loan.term.collateralValue")],
  ];

  const accept = () => {
    actions.takeLoan(amount);
    setStep(2);
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center"
      style={{ backgroundColor: "rgba(10,20,14,0.55)" }}
      onClick={onClose}
    >
      {/* Fon kliki bağlayır, panelin özündəki klik yuxarı qalxmamalıdır */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={step === 2 ? t("loan.doneTitle") : t("loan.title")}
        className="w-full rounded-t-3xl p-5 pb-6"
        style={{ backgroundColor: C.card }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold" style={{ color: C.ink, fontFamily: font.display }}>
            {step === 2 ? t("loan.doneTitle") : t("loan.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("loan.closeSheet")}
            className="rounded-full p-1.5"
            style={{ backgroundColor: C.mist }}
          >
            <Icon name="X" size={16} color={C.ink} />
          </button>
        </div>

        {step === 0 && (
          <div>
            <p className="mb-4 text-xs" style={{ color: C.muted }}>
              {t("loan.intro", {
                rate: LOAN_TERMS.annualRate,
                max: { money: FARM.creditLimit },
              })}
            </p>
            <p
              className="mb-2 text-center text-3xl font-extrabold"
              style={{ color: C.ink, fontFamily: font.display }}
            >
              {money(amount)}
            </p>
            <input
              type="range"
              min={LOAN_TERMS.min}
              max={FARM.creditLimit}
              step={LOAN_TERMS.step}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              aria-label={t("loan.amountLabel")}
              className="w-full"
              style={{ accentColor: C.field }}
            />
            <div className="mt-1 flex justify-between text-xs" style={{ color: C.muted }}>
              <span>{money(LOAN_TERMS.min)}</span>
              <span>{money(FARM.creditLimit)}</span>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-5 w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.pine, color: "#fff" }}
            >
              {t("loan.reviewCta")}
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            {terms.map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-3 py-2.5"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <span className="text-xs" style={{ color: C.muted }}>
                  {label}
                </span>
                <span className="text-right text-xs font-bold" style={{ color: C.ink }}>
                  {value}
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={accept}
              className="mt-5 w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.gold, color: C.pine }}
            >
              {t("loan.acceptCta", { amount: { money: amount } })}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="py-4 text-center">
            {/* Uğur anı: statik "check" işarəsi heç nə hiss etdirmirdi.
                Personaj iki dəfə tullanır və dayanır — Leobank-ın uğur
                ekranındakı kimi, amma sonsuz deyil (sonsuz sevinc yorur). */}
            <div className="mx-auto mb-2 inline-block">
              <Aqronom hal="sevincli" bitki={state.chat.crop} olcu={76} />
            </div>
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {t("loan.successLine", { amount: { money: amount } })}
            </p>
            <p className="mt-1 mb-4 text-xs" style={{ color: C.muted }}>
              {t("loan.successNote", {
                date: t("date.aug15.long"),
                repay: { money: repay },
              })}
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
    </div>
  );
}
