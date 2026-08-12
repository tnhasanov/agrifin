import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { COLLATERAL_TYPE_KEYS, COLLATERAL_TYPES, newCollateral, isStale } from "../../domain/collateral.js";
import { Badge, Button, Card, CardHeader, Empty, Stat } from "../../components/ui.jsx";
import { amount, percent, times, date } from "../../lib/format.js";

export default function Collateral({ caseFile, result }) {
  const { t, locale } = useI18n();
  const { dispatch } = useStore();
  const { collateral } = result;
  const items = caseFile.collateral ?? [];

  const patch = (itemId, p) =>
    dispatch({ type: "patchCollateral", id: caseFile.id, itemId, patch: p });

  const inputClass =
    "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-200 focus:border-[var(--color-brand)] focus:bg-white focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("collateral.marketValue")} value={`${amount(collateral.marketTotal, locale)} AZN`} />
        <Stat label={t("collateral.lendingValue")} value={`${amount(collateral.lendingTotal, locale)} AZN`} />
        <Stat
          label={t("collateral.coverage")}
          value={times(collateral.coverage, locale)}
          sub={`${t("collateral.marketCoverage")}: ${times(collateral.marketCoverage, locale)}`}
          tone={
            collateral.coverage === null ? undefined
            : collateral.coverage >= 1.2 ? "good"
            : collateral.coverage >= 1 ? "fair"
            : "weak"
          }
        />
        <Stat label={t("collateral.hardTotal")} value={`${amount(collateral.hardTotal, locale)} AZN`} />
      </div>

      <Card>
        <CardHeader
          title={t("collateral.section")}
          hint={t("collateral.hint")}
          right={
            <Button
              className="no-print"
              onClick={() => dispatch({ type: "addCollateral", id: caseFile.id, item: newCollateral() })}
            >
              + {t("collateral.add")}
            </Button>
          }
        />

        {items.length === 0 ? (
          <Empty>{t("collateral.empty")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-xs text-[var(--color-muted)]">
                  <th className="px-3 py-2 text-left font-medium">{t("collateral.type")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("collateral.description")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("collateral.marketValue")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("collateral.ltv")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("collateral.lendingValue")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("collateral.valuationDate")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("collateral.insured")}</th>
                  <th className="px-3 py-2 text-center font-medium">{t("collateral.firstRank")}</th>
                  <th className="no-print px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {collateral.rows.map((row) => {
                  const spec = COLLATERAL_TYPES[row.type];
                  const stale = isStale(row.valuationDate);
                  return (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-3 py-1.5">
                        <select
                          aria-label={t("collateral.type")}
                          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-sm hover:border-slate-200 focus:border-[var(--color-brand)] focus:bg-white focus:outline-none"
                          value={row.type}
                          onChange={(e) => patch(row.id, { type: e.target.value })}
                        >
                          {COLLATERAL_TYPE_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {t(`collateral.types.${k}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="w-2/5 min-w-64 px-3 py-1.5">
                        <input
                          aria-label={t("collateral.description")}
                          className={inputClass}
                          value={row.description}
                          onChange={(e) => patch(row.id, { description: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          aria-label={t("collateral.marketValue")}
                          className={`tnum ${inputClass} text-right`}
                          value={row.marketValue}
                          onChange={(e) => patch(row.id, { marketValue: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="tnum px-3 py-1.5 text-right">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1"
                          aria-label={t("collateral.ltv")}
                          className={`tnum ${inputClass} text-right`}
                          value={row.ltvOverride ?? spec?.ltv ?? 0}
                          onChange={(e) => patch(row.id, { ltvOverride: Number(e.target.value) })}
                        />
                        <span className="block text-[10px] text-slate-400">
                          {t("collateral.types." + row.type)}: {percent(spec?.ltv ?? 0, locale, 0)}
                        </span>
                      </td>
                      <td className="tnum px-3 py-1.5 text-right font-medium">
                        {amount(row.lendingValue, locale)}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="date"
                          aria-label={t("collateral.valuationDate")}
                          className={`${inputClass} text-xs`}
                          value={row.valuationDate ?? ""}
                          onChange={(e) => patch(row.id, { valuationDate: e.target.value })}
                        />
                        {stale ? (
                          <Badge tone="amber" title={t("collateral.stale")}>
                            {date(row.valuationDate, locale)}
                          </Badge>
                        ) : (
                          <span className="block text-[10px] text-slate-400">{row.valuer}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${t("collateral.insured")} — ${row.description}`}
                          checked={!!row.insured}
                          onChange={(e) => patch(row.id, { insured: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${t("collateral.firstRank")} — ${row.description}`}
                          checked={!!row.firstRank}
                          onChange={(e) => patch(row.id, { firstRank: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="no-print px-3 py-1.5 text-right">
                        <button
                          type="button"
                          className="text-xs text-slate-400 hover:text-red-600"
                          onClick={() =>
                            dispatch({ type: "removeCollateral", id: caseFile.id, itemId: row.id })
                          }
                        >
                          {t("common.remove")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-medium">
                  <td className="px-3 py-2" colSpan={2}>
                    {t("collateral.total")}
                  </td>
                  <td className="tnum px-3 py-2 text-right">{amount(collateral.marketTotal, locale)}</td>
                  <td />
                  <td className="tnum px-3 py-2 text-right">{amount(collateral.lendingTotal, locale)}</td>
                  <td colSpan={4} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
