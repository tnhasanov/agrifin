import { Card } from "../components/Card.jsx";
import { Chip } from "../components/Chip.jsx";
import { Icon } from "../components/Icon.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { formatSignedMoney } from "../lib/format.js";
import { FARM } from "../services/farm.js";
import { MovsumPulu } from "../features/money/MovsumPulu.jsx";

const QUICK_ACTIONS = [
  { id: "send", labelKey: "money.send", icon: "ArrowUpRight" },
  { id: "topUp", labelKey: "money.topUp", icon: "ArrowDownLeft" },
  { id: "card", labelKey: "money.card", icon: "CreditCard" },
];

export function MoneyScreen({ onOpenLoan, indeksHali = null }) {
  const { t, money, lang } = useI18n();
  const { state } = useStore();
  const { loan, txns } = state;

  return (
    <div className="px-4 pb-4">
      <div
        className="relative mt-3 overflow-hidden rounded-3xl p-4"
        style={{ background: `linear-gradient(150deg, ${C.pine}, #1E4A2E 60%, ${C.field})` }}
      >
        <div className="flex items-start justify-between">
          <p
            className="text-xs font-bold"
            style={{ color: "rgba(255,255,255,0.8)", letterSpacing: "0.15em" }}
          >
            {t("money.cardLabel")}
          </p>
          <Icon name="Leaf" size={18} color={C.gold} />
        </div>
        <p className="mt-4 text-2xl font-extrabold text-white" style={{ fontFamily: font.display }}>
          {money(state.wallet)}
        </p>
        <div className="mt-4 flex items-end justify-between">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)", letterSpacing: "0.2em" }}>
            •••• {FARM.card.last4}
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            {FARM.cardHolder}
          </p>
        </div>
      </div>

      {/* Mövsüm pulu — fermerin "maaş dövrü" (bax: features/money/MovsumPulu) */}
      <MovsumPulu indeksHali={indeksHali} />

      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="flex flex-col items-center gap-1 rounded-xl py-3"
            style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
          >
            <Icon name={action.icon} size={16} color={C.pine} />
            <span className="text-xs font-semibold" style={{ color: C.ink }}>
              {t(action.labelKey)}
            </span>
          </button>
        ))}
      </div>

      <SectionTitle>{t("money.financing")}</SectionTitle>

      {/* Gözləyən kredit müraciəti — dərhal pul YOXDUR, qərar ayrıca veriləcək
          (bax: features/loan/LoanSheet.jsx). Kart müraciətin yaşadığını
          göstərir; ləğv panelin içindədir ki, təsadüfi toxunuş silməsin. */}
      {state.muraciet && (
        <Card style={{ marginBottom: 8 }} onClick={onOpenLoan} ariaLabel={t("kredit.movcudBasliq")}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ backgroundColor: C.goldSoft }}>
              <Icon name="Clock" size={16} color={C.goldDeep} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {t("kredit.kartBasliq", { mebleg: { money: state.muraciet.mebleg } })}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                {t("kredit.kartAltyazi")}
              </p>
            </div>
            <Chip label={t("kredit.gozleyir")} color={C.goldDeep} bg={C.goldSoft} />
          </div>
        </Card>
      )}

      {loan.active && (
        <Card style={{ marginBottom: 8 }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
              {t("money.cropLoan")}
            </h3>
            <Chip
              icon="Calendar"
              label={t("money.due", { date: t("date.aug15.short") })}
              color={C.goldDeep}
              bg={C.goldSoft}
            />
          </div>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>
            {t("money.loanSummary", {
              amount: { money: loan.amount },
              repay: { money: loan.repay },
            })}
          </p>
          <div className="mt-3 h-2 rounded-full" style={{ backgroundColor: C.mist }}>
            <div
              className="bar-dolur h-2 rounded-full"
              style={{ width: `${loan.seasonProgress}%`, backgroundColor: C.field }}
            />
          </div>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>
            {t("money.seasonProgress", { pct: loan.seasonProgress })}
          </p>
        </Card>
      )}

      <Card style={{ marginBottom: 8 }} onClick={onOpenLoan} ariaLabel={t("money.inputLoan")}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2" style={{ backgroundColor: C.goldSoft }}>
            <Icon name="Zap" size={16} color={C.goldDeep} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: C.ink }}>
              {t("money.inputLoan")}
            </p>
            <p className="text-xs" style={{ color: C.muted }}>
              {t("money.inputLoanDesc")}
            </p>
          </div>
          <Icon name="ChevronRight" size={16} color={C.muted} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2" style={{ backgroundColor: C.fieldSoft }}>
            <Icon name="ShieldCheck" size={16} color={C.field} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: C.ink }}>
              {t("money.insurance")}
            </p>
            <p className="text-xs" style={{ color: C.muted }}>
              {t("money.insuranceDesc")}
            </p>
          </div>
          <Chip label={t("money.parametric")} color={C.field} bg={C.fieldSoft} />
        </div>
      </Card>

      <SectionTitle>{t("money.recentTxns")}</SectionTitle>
      <Card style={{ padding: "6px 16px" }}>
        {txns.map((txn, index) => {
          const incoming = txn.amount > 0;
          return (
            <div
              key={txn.id}
              className="giris flex items-center gap-3 py-3"
              style={{
                "--i": index,
                borderBottom: index < txns.length - 1 ? `1px solid ${C.line}` : "none",
              }}
            >
              <div
                className="rounded-full p-2"
                style={{ backgroundColor: incoming ? C.fieldSoft : C.mist }}
              >
                <Icon
                  name={incoming ? "ArrowDownLeft" : "ArrowUpRight"}
                  size={14}
                  color={incoming ? C.field : C.muted}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: C.ink }}>
                  {t(txn.nameKey)}
                </p>
                <p className="text-xs" style={{ color: C.muted }}>
                  {t(txn.metaKey, txn.metaVars ?? undefined)}
                </p>
              </div>
              <p className="text-sm font-bold" style={{ color: incoming ? C.field : C.ink }}>
                {formatSignedMoney(txn.amount, lang)}
              </p>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
