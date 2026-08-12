import { useI18n } from "../../i18n/index.jsx";
import { RATIO_GROUPS, PERCENT_RATIOS, DAY_RATIOS, computeRatios } from "../../domain/ratios.js";
import { Card, CardHeader, BandDot, Bars, Empty } from "../../components/ui.jsx";
import { ratioValue, compact, percent } from "../../lib/format.js";

/** Əvvəlki dövrlərin eyni əmsalı — dinamikanı görmək üçün. */
function historyFor(spreads, key) {
  return spreads.map((s, i) => {
    const r = computeRatios(s, i > 0 ? spreads[i - 1] : null);
    return { label: s.label, value: r[key]?.value ?? null };
  });
}

export default function Analysis({ result }) {
  const { t, locale } = useI18n();
  const { ratios, spreads } = result;

  if (!spreads.length) return <Empty>{t("fin.noPeriods")}</Empty>;

  const show = (key, value) => ratioValue(key, value, locale, PERCENT_RATIOS, DAY_RATIOS);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("ratios.trend")} />
          <div className="space-y-4 p-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-[var(--color-muted)]">
                {t("fin.adjustedRevenue")}
              </div>
              <Bars
                values={spreads.map((s) => s.annualRevenue)}
                labels={spreads.map((s) => s.label)}
                format={(v) => `${compact(v, locale)} AZN`}
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-[var(--color-muted)]">
                {t("fin.adjustedEbitda")}
              </div>
              <Bars
                values={spreads.map((s) => s.annualEbitda)}
                labels={spreads.map((s) => s.label)}
                format={(v) => `${compact(v, locale)} AZN`}
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-[var(--color-muted)]">
                {t("ratios.ebitdaMargin")}
              </div>
              <Bars
                values={spreads.map((s) => (s.adjustedRevenue > 0 ? s.adjustedEbitda / s.adjustedRevenue : 0))}
                labels={spreads.map((s) => s.label)}
                format={(v) => percent(v, locale)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("ratios.balanceTrend")} />
          <div className="space-y-4 p-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-[var(--color-muted)]">
                {t("fin.equity")}
              </div>
              <Bars
                values={spreads.map((s) => s.equity)}
                labels={spreads.map((s) => s.label)}
                format={(v) => `${compact(v, locale)} AZN`}
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-[var(--color-muted)]">
                {t("fin.netDebt")}
              </div>
              <Bars
                values={spreads.map((s) => s.netDebt)}
                labels={spreads.map((s) => s.label)}
                format={(v) => `${compact(v, locale)} AZN`}
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-[var(--color-muted)]">
                {t("fin.workingCapital")}
              </div>
              <Bars
                values={spreads.map((s) => s.workingCapital)}
                labels={spreads.map((s) => s.label)}
                format={(v) => `${compact(v, locale)} AZN`}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {RATIO_GROUPS.map((group) => (
          <Card key={group.key}>
            <CardHeader title={t(`ratios.${group.key}`)} />
            <table className="w-full text-sm">
              <tbody>
                {group.ratios.map((key) => {
                  const r = ratios[key];
                  if (!r) return null;
                  const history = historyFor(spreads, key).filter((h) => h.value !== null);
                  return (
                    <tr key={key} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-2">
                          <BandDot band={r.band} />
                          <span>{t(`ratios.${key}`)}</span>
                        </span>
                        <span className="ml-4 block text-xs text-[var(--color-muted)]">{r.formula}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="tnum font-medium">{show(key, r.value)}</span>
                        {history.length > 1 ? (
                          <span className="tnum block text-xs text-[var(--color-muted)]">
                            {history
                              .slice(0, -1)
                              .map((h) => `${h.label}: ${show(key, h.value)}`)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`text-xs ${
                            r.band === "good"
                              ? "text-[var(--color-good)]"
                              : r.band === "fair"
                                ? "text-[var(--color-fair)]"
                                : r.band === "weak"
                                  ? "text-[var(--color-weak)]"
                                  : "text-slate-400"
                          }`}
                        >
                          {t(`ratios.${r.band === "na" ? "na" : r.band}`)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </div>
  );
}
