import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { Badge, Button, Card, CardHeader, GradeChip } from "../../components/ui.jsx";
import { TextArea } from "../../components/fields.jsx";
import { PolicyList } from "../../components/PolicyList.jsx";
import { amount, percent, times, date, rate as fmtRate } from "../../lib/format.js";

const SECTIONS = ["strengths", "weaknesses", "mitigants", "recommendation"];

export default function Memo({ caseFile, result }) {
  const { t, locale } = useI18n();
  const { dispatch } = useStore();
  const memo = caseFile.memo ?? {};
  const { capacity, collateral, score, latest } = result;
  const r = caseFile.request;
  const b = caseFile.borrower;

  const figures = [
    [
      t("request.amount"),
      result.fx.converted
        ? `${amount(r.amount, locale)} ${r.currency} · ${amount(result.fx.exposureAzn, locale)} AZN`
        : `${amount(r.amount, locale)} ${r.currency}`,
    ],
    [t("request.months"), `${r.months} ${t("common.months")}${r.graceMonths ? ` (${r.graceMonths} ${t("structure.grace").toLowerCase()})` : ""}`],
    [t("request.rate"), fmtRate(r.rate, locale)],
    [t("structure.monthlyPayment"), `${amount(capacity.monthlyPayment, locale)} AZN`],
    [t("fin.adjustedRevenue"), `${amount(latest?.annualRevenue ?? 0, locale)} AZN`],
    [t("fin.adjustedEbitda"), `${amount(latest?.annualEbitda ?? 0, locale)} AZN`],
    [t("structure.cashflow"), `${amount(capacity.cashflow, locale)} AZN`],
    [t("structure.totalDebtService"), `${amount(capacity.totalDebtService, locale)} AZN`],
    [t("structure.dscr"), times(capacity.dscr, locale)],
    [t("structure.dscrStressed"), times(capacity.dscrStressed, locale)],
    [t("collateral.lendingValue"), `${amount(collateral.lendingTotal, locale)} AZN`],
    [t("collateral.coverage"), times(collateral.coverage, locale)],
    [t("score.grade"), `${score.grade} · ${t(`score.stance.${score.stance}`)}`],
    [t("score.pd"), percent(score.pd, locale, 2)],
    [t("structure.recommended"), `${amount(capacity.recommendedLimit, locale)} AZN`],
    [t("ratios.equityRatio"), percent(result.ratios.equityRatio?.value, locale)],
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={t("memo.section")}
          hint={t("memo.hint")}
          right={
            <Button className="no-print" onClick={() => window.print()}>
              {t("memo.print")}
            </Button>
          }
        />

        <div className="space-y-5 p-5">
          <header className="border-b border-[var(--color-line)] pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{b.name}</h3>
                <p className="text-sm text-[var(--color-muted)]">
                  {t(`legalForm.${b.legalForm}`)} · {t("borrower.taxId")} {b.taxId} ·{" "}
                  {t(`sector.${b.sector}`)} · {b.region}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{b.subSector}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <GradeChip grade={score.grade} stance={t(`score.stance.${score.stance}`)} />
                <Badge tone={capacity.dscrPass ? "green" : "red"}>
                  DSCR {times(capacity.dscr, locale)}
                </Badge>
                <span className="text-xs text-[var(--color-muted)]">{caseFile.id}</span>
              </div>
            </div>
            {b.note ? <p className="mt-3 text-sm leading-relaxed">{b.note}</p> : null}
          </header>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              {t("memo.keyFigures")}
            </h4>
            <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {figures.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-2 border-b border-slate-100 py-1">
                  <dt className="text-xs text-[var(--color-muted)]">{label}</dt>
                  <dd className="tnum text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            {SECTIONS.map((key) => (
              <div key={key}>
                <TextArea
                  label={t(`memo.${key}`)}
                  value={memo[key]}
                  rows={key === "recommendation" ? 4 : 5}
                  placeholder={t("memo.placeholder")}
                  onChange={(v) => dispatch({ type: "patchMemo", id: caseFile.id, patch: { [key]: v } })}
                />
              </div>
            ))}
          </section>

          {(caseFile.conditions ?? []).length > 0 ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                {t("decision.conditions")}
              </h4>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {caseFile.conditions.map((c) => (
                  <li key={c}>{t(`decision.condition.${c}`)}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              {t("policy.section")}
            </h4>
            <div className="rounded-md border border-[var(--color-line)]">
              <PolicyList
                findings={result.findings.filter((f) => f.severity !== "info")}
                t={t}
                locale={locale}
                compactView
              />
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-muted)]">
            <span>
              {t("memo.preparedBy")}: {caseFile.officer} · {caseFile.branch}
            </span>
            <span>{t("memo.generated", { date: date(new Date().toISOString(), locale) })}</span>
          </footer>
        </div>
      </Card>
    </div>
  );
}
