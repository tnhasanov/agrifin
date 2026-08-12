import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { emptyPeriod } from "../../domain/financials.js";
import { Badge, Button, Card, CardHeader, Empty } from "../../components/ui.jsx";
import { CellInput } from "../../components/fields.jsx";
import { amount, percent } from "../../lib/format.js";

const BALANCE_ROWS = [
  ["cash", "asset"],
  ["receivables", "asset"],
  ["inventory", "asset"],
  ["otherCurrentAssets", "asset"],
  ["fixedAssets", "asset"],
  ["otherLongTermAssets", "asset"],
  ["payables", "liability"],
  ["shortTermDebt", "liability"],
  ["otherCurrentLiabilities", "liability"],
  ["longTermDebt", "liability"],
  ["equity", "equity"],
];

const INCOME_ROWS = [
  "revenue",
  "cogs",
  "opex",
  "depreciation",
  "otherIncome",
  "interestExpense",
  "tax",
];

const ADJUSTMENT_ROWS = ["unrecordedRevenue", "ownerAddBacks", "nonRecurring"];

const DERIVED_ROWS = [
  ["totalAssets", (s) => s.totalAssets],
  ["currentAssets", (s) => s.currentAssets],
  ["currentLiabilities", (s) => s.currentLiabilities],
  ["totalLiabilities", (s) => s.totalLiabilities],
  ["workingCapital", (s) => s.workingCapital],
  ["netDebt", (s) => s.netDebt],
  ["grossProfit", (s) => s.grossProfit],
  ["ebitda", (s) => s.ebitda],
  ["ebit", (s) => s.ebit],
  ["netProfit", (s) => s.netProfit],
  ["adjustedRevenue", (s) => s.adjustedRevenue],
  ["adjustedEbitda", (s) => s.adjustedEbitda],
];

export default function Financials({ caseFile, result }) {
  const { t, locale } = useI18n();
  const { dispatch } = useStore();
  const periods = caseFile.periods ?? [];
  const spreads = result.spreads;

  const patch = (index, group, p) =>
    dispatch({ type: "patchPeriod", id: caseFile.id, index, group, patch: p });

  const addPeriod = () => {
    const lastLabel = Number(periods[periods.length - 1]?.label);
    const label = Number.isFinite(lastLabel) ? String(lastLabel + 1) : String(new Date().getFullYear());
    dispatch({ type: "addPeriod", id: caseFile.id, period: emptyPeriod(label) });
  };

  const headCell = "px-3 py-2 text-right text-xs font-medium text-[var(--color-muted)]";
  const labelCell = "px-3 py-1.5 text-left text-sm";
  const groupRow = "bg-slate-50 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={t("fin.section")}
          hint={t("fin.hint")}
          right={
            <Button onClick={addPeriod} className="no-print">
              + {t("fin.addPeriod")}
            </Button>
          }
        />

        {periods.length === 0 ? (
          <Empty>{t("fin.noPeriods")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-muted)]">
                    {t("fin.period")}
                  </th>
                  {periods.map((p, i) => (
                    <th key={i} className={headCell}>
                      <input
                        className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-sm font-semibold text-[var(--color-ink)] hover:border-slate-200 focus:border-[var(--color-brand)] focus:outline-none"
                        value={p.label}
                        aria-label={`${t("fin.period")} ${i + 1}`}
                        onChange={(e) => patch(i, null, { label: e.target.value })}
                      />
                      <span className="mt-0.5 flex items-center justify-end gap-1 font-normal">
                        <input
                          type="number"
                          className="tnum w-10 rounded border border-transparent bg-transparent px-1 text-right hover:border-slate-200 focus:border-[var(--color-brand)] focus:outline-none"
                          value={p.months}
                          aria-label={`${t("fin.months")} ${p.label}`}
                          onChange={(e) => patch(i, null, { months: Number(e.target.value) || 12 })}
                        />
                        {t("common.months")}
                        {p.audited ? <Badge tone="green">{t("fin.audited")}</Badge> : null}
                      </span>
                      <button
                        type="button"
                        className="no-print mt-1 text-xs font-normal text-slate-400 hover:text-red-600"
                        onClick={() => dispatch({ type: "removePeriod", id: caseFile.id, index: i })}
                      >
                        {t("fin.removePeriod")}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <tr className={groupRow}>
                  <td className="px-3 py-1.5" colSpan={periods.length + 1}>
                    {t("fin.balanceSheet")}
                  </td>
                </tr>
                {BALANCE_ROWS.map(([key, kind]) => (
                  <tr key={key} className="border-b border-slate-100">
                    <td className={`${labelCell} ${kind === "equity" ? "font-medium" : ""}`}>
                      <span className={kind === "liability" ? "text-[var(--color-muted)]" : ""}>
                        {t(`fin.${key}`)}
                      </span>
                    </td>
                    {periods.map((p, i) => (
                      <td key={i} className="px-2 py-0.5">
                        <CellInput
                          label={`${t(`fin.${key}`)} ${p.label}`}
                          value={p.balance[key]}
                          onChange={(v) => patch(i, "balance", { [key]: v })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <td className={`${labelCell} font-medium`}>{t("fin.balanced")}</td>
                  {spreads.map((s, i) => (
                    <td key={i} className="px-3 py-1.5 text-right">
                      {s.balanced ? (
                        <Badge tone="green">✓</Badge>
                      ) : (
                        <Badge tone="red" title={t("fin.imbalance", { amount: amount(s.imbalance, locale) })}>
                          {amount(s.imbalance, locale)}
                        </Badge>
                      )}
                    </td>
                  ))}
                </tr>

                <tr className={groupRow}>
                  <td className="px-3 py-1.5" colSpan={periods.length + 1}>
                    {t("fin.incomeStatement")}
                  </td>
                </tr>
                {INCOME_ROWS.map((key) => (
                  <tr key={key} className="border-b border-slate-100">
                    <td className={labelCell}>{t(`fin.${key}`)}</td>
                    {periods.map((p, i) => (
                      <td key={i} className="px-2 py-0.5">
                        <CellInput
                          label={`${t(`fin.${key}`)} ${p.label}`}
                          value={p.income[key]}
                          onChange={(v) => patch(i, "income", { [key]: v })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className={groupRow}>
                  <td className="px-3 py-1.5" colSpan={periods.length + 1}>
                    {t("fin.adjustments")}
                  </td>
                </tr>
                {ADJUSTMENT_ROWS.map((key) => (
                  <tr key={key} className="border-b border-slate-100">
                    <td className={labelCell}>{t(`fin.${key}`)}</td>
                    {periods.map((p, i) => (
                      <td key={i} className="px-2 py-0.5">
                        <CellInput
                          label={`${t(`fin.${key}`)} ${p.label}`}
                          value={p.adjustments?.[key] ?? 0}
                          onChange={(v) => patch(i, "adjustments", { [key]: v })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className={groupRow}>
                  <td className="px-3 py-1.5" colSpan={periods.length + 1}>
                    {t("fin.derived")}
                  </td>
                </tr>
                {DERIVED_ROWS.map(([key, pick]) => (
                  <tr key={key} className="border-b border-slate-100">
                    <td className={labelCell}>{t(`fin.${key}`)}</td>
                    {spreads.map((s, i) => (
                      <td key={i} className="tnum px-3 py-1.5 text-right">
                        {amount(pick(s), locale)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-slate-50/60">
                  <td className={`${labelCell} font-medium`}>{t("ratios.ebitdaMargin")}</td>
                  {spreads.map((s, i) => (
                    <td key={i} className="tnum px-3 py-1.5 text-right font-medium">
                      {percent(s.adjustedRevenue > 0 ? s.adjustedEbitda / s.adjustedRevenue : null, locale)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {periods.length > 0 ? (
        <Card>
          <CardHeader title={t("fin.adjustments")} hint={t("fin.adjustmentsHint")} />
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {periods.map((p, i) => (
              <div key={i}>
                <label className="block text-xs font-medium text-[var(--color-muted)]" htmlFor={`note-${i}`}>
                  {p.label} — {t("fin.adjustmentNote")}
                </label>
                <textarea
                  id={`note-${i}`}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-[var(--color-line)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
                  value={p.adjustments?.note ?? ""}
                  onChange={(e) => patch(i, "adjustments", { note: e.target.value })}
                />
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
