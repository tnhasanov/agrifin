import { useState } from "react";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { QUAL_FACTORS, RATING_SCALE } from "../../domain/scorecard.js";
import { PERCENT_RATIOS, DAY_RATIOS } from "../../domain/ratios.js";
import { Badge, Button, Card, CardHeader, GradeChip, Stat } from "../../components/ui.jsx";
import { SelectField, TextArea } from "../../components/fields.jsx";
import { percent, times, ratioValue, amount, rate as fmtRate } from "../../lib/format.js";

export default function Score({ caseFile, result }) {
  const { t, locale } = useI18n();
  const { user, dispatch } = useStore();
  const score = result.score;
  const [reason, setReason] = useState(score.override?.reason ?? "");
  const [grade, setGrade] = useState(String(score.override?.grade ?? score.grade));

  const quant = score.lines.filter((l) => l.kind === "quant");
  const qual = score.lines.filter((l) => l.kind === "qual");

  const formatValue = (line) => {
    if (!line.available) return t("score.noData");
    if (line.kind === "qual") return t(`score.option.${line.value}`);
    if (line.format === "%") return percent(line.value, locale);
    return times(line.value, locale);
  };

  const applyOverride = () => {
    dispatch({
      type: "setRatingOverride",
      id: caseFile.id,
      actor: user.name,
      role: user.role,
      override: { grade: Number(grade), reason, by: user.name, at: new Date().toISOString() },
    });
  };

  const clearOverride = () => {
    setReason("");
    dispatch({
      type: "setRatingOverride",
      id: caseFile.id,
      actor: user.name,
      role: user.role,
      override: null,
    });
  };

  const barWidth = (line) => (line.available ? `${line.score}%` : "0%");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t("score.total")}
          value={amount(score.total, locale, 1)}
          sub={`${t("score.quant")}: ${score.quantScore === null ? "—" : Math.round(score.quantScore)} · ${t("score.qual")}: ${score.qualScore === null ? "—" : Math.round(score.qualScore)}`}
          tone={score.total >= 64 ? "good" : score.total >= 43 ? "fair" : "weak"}
        />
        <div className="rounded-lg border border-[var(--color-line)] bg-white px-4 py-3">
          <div className="text-xs text-[var(--color-muted)]">{t("score.grade")}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="tnum text-xl font-semibold">{score.grade}</span>
            <GradeChip grade={score.grade} stance={t(`score.stance.${score.stance}`)} />
          </div>
          {score.overridden ? (
            <div className="mt-1 text-xs text-[var(--color-accent)]">
              {t("score.overridden", { grade: score.modelGrade })}
            </div>
          ) : null}
        </div>
        <Stat label={t("score.pd")} value={percent(score.pd, locale, 2)} />
        <Stat
          label={t("score.completeness")}
          value={percent(score.completeness, locale, 0)}
          tone={score.completeness >= 0.8 ? "good" : "fair"}
        />
      </div>

      <Card>
        <CardHeader title={t("score.section")} hint={t("score.hint")} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-xs text-[var(--color-muted)]">
                <th className="px-4 py-2 text-left font-medium">{t("score.quant")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("score.value")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("score.weight")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("score.points")}</th>
                <th className="w-40 px-4 py-2 text-right font-medium">{t("score.contribution")}</th>
              </tr>
            </thead>
            <tbody>
              {quant.map((line) => (
                <tr key={line.key} className="border-b border-slate-100">
                  <td className="px-4 py-2">{t(`score.factor.${line.key}`)}</td>
                  <td className="tnum px-3 py-2 text-right">{formatValue(line)}</td>
                  <td className="tnum px-3 py-2 text-right text-[var(--color-muted)]">{line.weight}</td>
                  <td className="tnum px-3 py-2 text-right font-medium">
                    {line.available ? line.score : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="flex items-center justify-end gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-[var(--color-brand)]"
                          style={{ width: barWidth(line) }}
                        />
                      </span>
                      <span className="tnum w-10 text-right text-xs">{amount(line.contribution, locale, 1)}</span>
                    </span>
                  </td>
                </tr>
              ))}

              <tr className="border-b border-[var(--color-line)] bg-slate-50 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                <td className="px-4 py-1.5" colSpan={5}>
                  {t("score.qual")}
                </td>
              </tr>

              {qual.map((line) => {
                const factor = QUAL_FACTORS.find((f) => f.key === line.key);
                return (
                  <tr key={line.key} className="border-b border-slate-100">
                    <td className="px-4 py-2">{t(`score.factor.${line.key}`)}</td>
                    <td className="px-3 py-2 text-right">
                      <select
                        aria-label={t(`score.factor.${line.key}`)}
                        className="rounded-md border border-[var(--color-line)] bg-white px-2 py-1 text-sm focus:border-[var(--color-brand)] focus:outline-none"
                        value={line.value ?? ""}
                        onChange={(e) =>
                          dispatch({
                            type: "patchQualitative",
                            id: caseFile.id,
                            patch: { [line.key]: e.target.value },
                          })
                        }
                      >
                        <option value="">{t("score.noData")}</option>
                        {factor.options.map((o) => (
                          <option key={o.key} value={o.key}>
                            {t(`score.option.${o.key}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="tnum px-3 py-2 text-right text-[var(--color-muted)]">{line.weight}</td>
                    <td className="tnum px-3 py-2 text-right font-medium">
                      {line.available ? line.score : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className="flex items-center justify-end gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-[var(--color-brand)]"
                            style={{ width: barWidth(line) }}
                          />
                        </span>
                        <span className="tnum w-10 text-right text-xs">{amount(line.contribution, locale, 1)}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("score.override")} hint={t("score.overrideHint")} />
          <div className="space-y-3 p-4">
            <SelectField
              label={t("score.overrideGrade")}
              value={grade}
              onChange={setGrade}
              options={RATING_SCALE.map((r) => ({
                value: String(r.grade),
                label: `${r.grade} · ${t(`score.stance.${r.stance}`)} · ${percent(r.pd, locale, 2)}`,
              }))}
            />
            <TextArea
              label={t("score.overrideReason")}
              value={reason}
              rows={3}
              onChange={setReason}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={applyOverride} disabled={!reason.trim()}>
                {t("score.overrideApply")}
              </Button>
              {score.overridden ? (
                <Button variant="danger" onClick={clearOverride}>
                  {t("score.overrideClear")}
                </Button>
              ) : null}
              {caseFile.ratingConfirmed ? (
                <Badge tone="green">{t("score.confirmed")}</Badge>
              ) : (
                <Button onClick={() => dispatch({ type: "confirmRating", id: caseFile.id })}>
                  {t("score.confirm")}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t("structure.pricing")} />
          <div className="grid grid-cols-2 gap-3 p-4">
            <Stat label={t("structure.suggestedRate")} value={fmtRate(result.pricing.suggested, locale)} />
            <Stat
              label={t("structure.requestedRate")}
              value={fmtRate(result.pricing.requested, locale)}
              tone={result.pricing.requested >= result.pricing.suggested ? "good" : "fair"}
            />
            {result.pricing.requested < result.pricing.suggested ? (
              <p className="col-span-2 text-xs text-[var(--color-accent)]">
                {t("structure.priceBelow", {
                  diff: fmtRate(result.pricing.suggested - result.pricing.requested, locale),
                })}
              </p>
            ) : null}
            <div className="col-span-2 border-t border-slate-100 pt-3">
              <div className="text-xs text-[var(--color-muted)]">DSCR</div>
              <div className="tnum text-sm font-medium">
                {ratioValue("dscr", result.capacity.dscr, locale, PERCENT_RATIOS, DAY_RATIOS)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
