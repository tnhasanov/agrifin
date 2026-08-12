import { useState } from "react";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { Badge, Button, Card, CardHeader, Empty, Stat, Table, Row, Cell } from "../../components/ui.jsx";
import { NumberField } from "../../components/fields.jsx";
import { amount, times, date, rate as fmtRate } from "../../lib/format.js";

export default function Structure({ caseFile, result }) {
  const { t, locale } = useI18n();
  const { dispatch } = useStore();
  const [showSchedule, setShowSchedule] = useState(false);
  const cap = result.capacity;
  const cf = caseFile.cashflowInputs ?? {};
  const obligations = caseFile.obligations ?? [];

  const setCf = (patch) => dispatch({ type: "patchCashflow", id: caseFile.id, patch });
  const patchObligation = (itemId, patch) =>
    dispatch({ type: "patchObligation", id: caseFile.id, itemId, patch });

  const constraintLabel = {
    cashflow: t("structure.byCashflow"),
    collateral: t("structure.byCollateral"),
    turnover: t("structure.byTurnover"),
  };

  const inputClass =
    "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-200 focus:border-[var(--color-brand)] focus:bg-white focus:outline-none";

  const shortfall = cap.requestedAmount - cap.recommendedLimit;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t("structure.dscr")}
          value={times(cap.dscr, locale)}
          sub={`${t("structure.dscrStressed")}: ${times(cap.dscrStressed, locale)}`}
          tone={cap.dscrPass ? "good" : cap.dscr >= 1 ? "fair" : "weak"}
        />
        <Stat label={t("structure.monthlyPayment")} value={`${amount(cap.monthlyPayment, locale)} AZN`} />
        <Stat
          label={t("structure.recommended")}
          value={`${amount(cap.recommendedLimit, locale)} AZN`}
          sub={`${t("structure.binding")}: ${constraintLabel[cap.binding]}`}
          tone={cap.withinRecommended ? "good" : "weak"}
        />
        <Stat
          label={t("structure.requested")}
          value={
            result.fx.converted
              ? `${amount(result.fx.requested, locale)} ${result.fx.currency}`
              : `${amount(cap.requestedAmount, locale)} AZN`
          }
          sub={
            result.fx.converted
              ? t("request.aznEquivalent", {
                  amount: `${amount(cap.requestedAmount, locale)} AZN`,
                  rate: result.fx.rate,
                })
              : cap.withinRecommended
                ? t("structure.withinLimit")
                : t("structure.aboveLimit", { amount: `${amount(shortfall, locale)} AZN` })
          }
          tone={cap.withinRecommended ? "good" : "weak"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("structure.cashflow")} hint={t("structure.cashflowHint")} />
          <div className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                label={t("structure.maintenanceCapex")}
                value={cf.maintenanceCapex}
                onChange={(v) => setCf({ maintenanceCapex: v })}
              />
              <NumberField
                label={t("structure.ownerDrawings")}
                value={cf.ownerDrawings}
                onChange={(v) => setCf({ ownerDrawings: v })}
              />
              <NumberField
                label={t("structure.workingCapitalNeed")}
                value={cf.workingCapitalNeed}
                onChange={(v) => setCf({ workingCapitalNeed: v })}
              />
            </div>

            <table className="w-full text-sm">
              <tbody>
                {[
                  [t("fin.adjustedEbitda"), result.latest?.annualEbitda ?? 0],
                  [t("fin.tax"), -(result.latest?.tax ?? 0)],
                  [t("structure.maintenanceCapex"), -(Number(cf.maintenanceCapex) || 0)],
                  [t("structure.ownerDrawings"), -(Number(cf.ownerDrawings) || 0)],
                  [t("structure.workingCapitalNeed"), -(Number(cf.workingCapitalNeed) || 0)],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-slate-100">
                    <td className="py-1.5 text-[var(--color-muted)]">{label}</td>
                    <td className="tnum py-1.5 text-right">{amount(value, locale)}</td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-2">{t("structure.cashflow")}</td>
                  <td className="tnum py-2 text-right">{amount(cap.cashflow, locale)}</td>
                </tr>
                <tr className="border-t border-slate-100">
                  <td className="py-1.5 text-[var(--color-muted)]">{t("structure.existingDebtService")}</td>
                  <td className="tnum py-1.5 text-right">−{amount(cap.existingDebtService, locale)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-[var(--color-muted)]">
                    {t("structure.newDebtService")}
                    <span className="ml-1 text-xs">({t("structure.firstYear")})</span>
                  </td>
                  <td className="tnum py-1.5 text-right">−{amount(cap.newDebtService, locale)}</td>
                </tr>
                <tr className="border-t border-slate-200 font-medium">
                  <td className="py-2">{t("structure.totalDebtService")}</td>
                  <td className="tnum py-2 text-right">{amount(cap.totalDebtService, locale)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("structure.limits")} />
          <div className="space-y-3 p-4">
            {cap.constraints.map((c) => {
              const max = Math.max(...cap.constraints.map((x) => x.value), cap.requestedAmount, 1);
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      {constraintLabel[c.key]}
                      {c.key === cap.binding ? <Badge tone="amber">{t("structure.binding")}</Badge> : null}
                    </span>
                    <span className="tnum font-medium">{amount(c.value, locale)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${c.key === cap.binding ? "bg-[var(--color-accent)]" : "bg-[var(--color-brand)]"}`}
                      style={{ width: `${Math.max(2, (c.value / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{t("structure.requested")}</span>
                <span className="tnum">{amount(cap.requestedAmount, locale)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${cap.withinRecommended ? "bg-[var(--color-good)]" : "bg-[var(--color-weak)]"}`}
                  style={{
                    width: `${Math.max(2, (cap.requestedAmount / Math.max(...cap.constraints.map((x) => x.value), cap.requestedAmount, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={t("structure.obligations")}
          right={
            <Button
              className="no-print"
              onClick={() =>
                dispatch({
                  type: "addObligation",
                  id: caseFile.id,
                  item: {
                    id: `o${Math.random().toString(36).slice(2, 8)}`,
                    lender: "",
                    type: "term",
                    outstanding: 0,
                    monthlyPayment: 0,
                    rate: 0,
                    maturity: "",
                    revolving: false,
                  },
                })
              }
            >
              + {t("structure.addObligation")}
            </Button>
          }
        />
        {obligations.length === 0 ? (
          <Empty>{t("structure.noObligations")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-xs text-[var(--color-muted)]">
                  <th className="px-3 py-2 text-left font-medium">{t("structure.lender")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("structure.outstanding")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("structure.monthlyPaymentShort")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("request.rate")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("structure.maturity")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("structure.revolving")}</th>
                  <th className="no-print px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {obligations.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100">
                    <td className="px-3 py-1.5">
                      <input
                        aria-label={t("structure.lender")}
                        className={inputClass}
                        value={o.lender}
                        onChange={(e) => patchObligation(o.id, { lender: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        aria-label={t("structure.outstanding")}
                        className={`tnum ${inputClass} text-right`}
                        value={o.outstanding}
                        onChange={(e) => patchObligation(o.id, { outstanding: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        aria-label={t("structure.monthlyPaymentShort")}
                        className={`tnum ${inputClass} text-right`}
                        value={o.monthlyPayment}
                        onChange={(e) =>
                          patchObligation(o.id, { monthlyPayment: Number(e.target.value) || 0 })
                        }
                        disabled={o.revolving}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        step="0.1"
                        aria-label={t("request.rate")}
                        className={`tnum ${inputClass} text-right`}
                        value={o.rate}
                        onChange={(e) => patchObligation(o.id, { rate: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-xs text-[var(--color-muted)]">{date(o.maturity, locale)}</td>
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${t("structure.revolving")} — ${o.lender}`}
                        checked={!!o.revolving}
                        onChange={(e) => patchObligation(o.id, { revolving: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="no-print px-3 py-1.5 text-right">
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-red-600"
                        onClick={() => dispatch({ type: "removeObligation", id: caseFile.id, itemId: o.id })}
                      >
                        {t("common.remove")}
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-medium">
                  <td className="px-3 py-2">{t("structure.existingDebtService")}</td>
                  <td className="tnum px-3 py-2 text-right">
                    {amount(obligations.reduce((s, o) => s + (Number(o.outstanding) || 0), 0), locale)}
                  </td>
                  <td className="tnum px-3 py-2 text-right">
                    {amount(cap.existingDebtService, locale)} <span className="text-xs">{t("common.perYear")}</span>
                  </td>
                  <td colSpan={4} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t("structure.schedule")}
          right={
            <Button className="no-print" onClick={() => setShowSchedule((v) => !v)}>
              {showSchedule ? t("structure.hideSchedule") : t("structure.showSchedule")}
            </Button>
          }
        />
        {showSchedule ? (
          cap.schedule.length === 0 ? (
            <Empty>{t("common.na")}</Empty>
          ) : (
            <Table
              dense
              head={[
                t("structure.month"),
                t("structure.payment"),
                t("structure.interest"),
                t("structure.principalPart"),
                t("structure.balance"),
              ]}
            >
              {cap.schedule.map((row) => (
                <Row key={row.month} className={row.grace ? "bg-amber-50/50" : ""}>
                  <Cell align="left" className="text-xs">
                    {row.month}
                    {row.grace ? <span className="ml-1 text-amber-700">({t("structure.grace")})</span> : null}
                  </Cell>
                  <Cell>{amount(row.payment, locale, 2)}</Cell>
                  <Cell>{amount(row.interest, locale, 2)}</Cell>
                  <Cell>{amount(row.principal, locale, 2)}</Cell>
                  <Cell>{amount(row.balance, locale)}</Cell>
                </Row>
              ))}
            </Table>
          )
        ) : (
          <p className="px-4 py-3 text-sm text-[var(--color-muted)]">
            {caseFile.request.months} {t("common.months")} ·{" "}
            {fmtRate(caseFile.request.rate, locale)} {t("common.perYear")} ·{" "}
            {caseFile.request.graceMonths > 0
              ? `${caseFile.request.graceMonths} ${t("common.months")} ${t("structure.grace").toLowerCase()}`
              : ""}
          </p>
        )}
      </Card>
    </div>
  );
}
