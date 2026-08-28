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
import { ayliqFaiz } from "../../lib/kreditOdenis.js";

const QUICK_ACTIONS = [
  { id: "send", labelKey: "money.send", icon: "ArrowUpRight" },
  { id: "topUp", labelKey: "money.topUp", icon: "ArrowDownLeft" },
  { id: "card", labelKey: "money.card", icon: "CreditCard" },
];

export function MoneyScreen({ onOpenLoan, indeksHali = null, kreditHali = null }) {
  const { t, money, lang } = useI18n();
  const { state } = useStore();
  const { txns } = state;

  // Kredit vəziyyəti SERVERDƏN gəlir (bax: features/loan/useKreditVeziyyeti).
  // Əvvəl burada localStorage-dakı `muraciet` və nümunə `loan` obyekti vardı —
  // biri fermerin əl ilə dəyişə biləcəyi maliyyə vəziyyəti, digəri uydurma
  // 8.000 ₼ borc idi. İkisi də getdi.
  const muraciet = kreditHali?.muraciet ?? null;
  const teklif = kreditHali?.teklif ?? null;
  const kredit = kreditHali?.kredit ?? null;
  const baxilir = muraciet && ["submitted", "reviewing", "approved"].includes(muraciet.hal);
  const teklifVar = muraciet?.hal === "offer_issued" && teklif?.hal === "issued";

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
      <MovsumPulu indeksHali={indeksHali} kreditHali={kreditHali} />

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
      {(baxilir || teklifVar) && (
        <Card
          style={{ marginBottom: 8 }}
          onClick={onOpenLoan}
          ariaLabel={t(teklifVar ? "kredit.teklifBasliq" : "kredit.movcudBasliq")}
        >
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl p-2"
              style={{ backgroundColor: teklifVar ? C.fieldSoft : C.goldSoft }}
            >
              <Icon
                name={teklifVar ? "Check" : "Clock"}
                size={16}
                color={teklifVar ? C.field : C.goldDeep}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>
                {t("kredit.kartBasliq", {
                  mebleg: { money: teklifVar ? teklif.mebleg : muraciet.mebleg },
                })}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                {t(teklifVar ? "kredit.kartTeklifAltyazi" : "kredit.kartAltyazi")}
              </p>
            </div>
            <Chip
              label={t(teklifVar ? "kredit.teklifHazir" : "kredit.gozleyir")}
              color={teklifVar ? C.field : C.goldDeep}
              bg={teklifVar ? C.fieldSoft : C.goldSoft}
            />
          </div>
        </Card>
      )}

      {/* AKTİV KREDİT — həqiqi qalıq borc, nümunə rəqəm deyil. Faiz aylıq
          ödənilir və QALAN əsas borca hesablanır, ona görə "yekun ödəniş"
          sətri yoxdur (bax: lib/kreditOdenis.js). */}
      {kredit && kredit.hal === "active" && (
        <Card style={{ marginBottom: 8 }} onClick={onOpenLoan} ariaLabel={t("kredit.aktivBasliq")}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
              {t("money.cropLoan")}
            </h3>
            {/* Gecikmə varsa hər şeydən əvvəl o görünür; yoxdursa növbəti
                ayın faizi (əsas borc azaldıqca azalan rəqəm) */}
            {kredit.gecikmeGun > 0 ? (
              <Chip
                icon="AlertCircle"
                label={t("kredit.gecikme", { gun: kredit.gecikmeGun })}
                color={C.danger}
                bg="#FBEAE7"
              />
            ) : (
              <Chip
                icon="Calendar"
                label={t("kredit.qaliqCipi", {
                  faiz: { money: ayliqFaiz(kredit.qaliqBorc, kredit.illikFaiz) },
                })}
                color={C.goldDeep}
                bg={C.goldSoft}
              />
            )}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-xs" style={{ color: C.muted }}>
              {t("kredit.qaliqBorc")}
            </span>
            <span
              className="text-lg font-extrabold"
              style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
            >
              {money(kredit.qaliqBorc)}
            </span>
          </div>
          {/* Ödənilmiş pay: ilkin əsas borcdan nə qədəri bağlanıb */}
          <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.mist }}>
            <div
              className="bar-dolur h-2 rounded-full"
              style={{
                width: `${Math.round((1 - kredit.qaliqBorc / kredit.esasBorc) * 100)}%`,
                backgroundColor: C.field,
              }}
            />
          </div>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>
            {t("kredit.odenilib", {
              odenilen: { money: kredit.esasBorc - kredit.qaliqBorc },
              hamisi: { money: kredit.esasBorc },
            })}
          </p>
          {/* Növbəti ödəniş kartda görünür: fermer paneli açmadan bilməlidir */}
          {kredit.novbetiTarix && (
            <p className="mt-1 text-xs font-semibold" style={{ color: C.pine }}>
              {t("kredit.detal.novbeti")}:{" "}
              {t("kredit.detal.novbetiDeger", {
                mebleg: { money: kredit.novbetiMebleg },
                tarix: `${new Date(kredit.novbetiTarix).getUTCDate()} ${t(
                  `ay.${new Date(kredit.novbetiTarix).getUTCMonth() + 1}`,
                )}`,
              })}
            </p>
          )}
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
