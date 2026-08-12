import { useMemo, useState } from "react";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { summary } from "../domain/analyse.js";
import { OPEN_STAGES, STAGE_TONE, CLOSED_STAGES } from "../domain/workflow.js";
import { SECTORS } from "../domain/seed.js";
import { Badge, Button, Card, Empty, GradeChip, Stat, Table, Row, Cell } from "../components/ui.jsx";
import { amount, compact, date, times } from "../lib/format.js";

export default function Pipeline({ navigate }) {
  const { t, locale } = useI18n();
  const { cases, dispatch } = useStore();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [sector, setSector] = useState("");

  // Xülasə bir dəfə hesablanır — hər işin tam təhlili ucuz deyil.
  const rows = useMemo(() => cases.map(summary), [cases]);

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (cases.find((c) => c.id === r.id)?.borrower?.taxId ?? "").includes(q);
    return matchQuery && (!stage || r.stage === stage) && (!sector || r.sector === sector);
  });

  const open = rows.filter((r) => OPEN_STAGES.includes(r.stage));
  const requested = open.reduce((s, r) => s + r.amount, 0);
  const graded = open.filter((r) => Number.isFinite(r.grade));
  const avgGrade = graded.length
    ? Math.round((graded.reduce((s, r) => s + r.grade, 0) / graded.length) * 10) / 10
    : null;
  const flagged = open.filter((r) => r.stops > 0).length;

  const perStage = OPEN_STAGES.map((s) => ({
    stage: s,
    count: rows.filter((r) => r.stage === s).length,
    amount: rows.filter((r) => r.stage === s).reduce((sum, r) => sum + r.amount, 0),
  }));

  const selectClass =
    "rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("pipeline.title")}</h1>
          <p className="text-sm text-[var(--color-muted)]">{t("pipeline.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              if (window.confirm(t("common.resetConfirm"))) dispatch({ type: "reset" });
            }}
          >
            {t("common.reset")}
          </Button>
          <Button variant="primary" onClick={() => navigate({ name: "new" })}>
            + {t("nav.newCase")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("pipeline.openCases")} value={open.length} />
        <Stat label={t("pipeline.requested")} value={`${compact(requested, locale)} AZN`} />
        <Stat
          label={t("pipeline.avgGrade")}
          value={avgGrade === null ? "—" : amount(avgGrade, locale, 1)}
          tone={avgGrade === null ? undefined : avgGrade <= 5 ? "good" : avgGrade <= 7 ? "fair" : "weak"}
        />
        <Stat
          label={t("pipeline.needsAttention")}
          value={flagged}
          tone={flagged > 0 ? "weak" : "good"}
        />
      </div>

      <Card className="p-3">
        <div className="mb-2 text-xs font-medium text-[var(--color-muted)]">{t("pipeline.stageBoard")}</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {perStage.map((s) => (
            <button
              key={s.stage}
              type="button"
              onClick={() => setStage(stage === s.stage ? "" : s.stage)}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                stage === s.stage
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)]"
                  : "border-[var(--color-line)] bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <Badge tone={STAGE_TONE[s.stage]}>{t(`stage.${s.stage}`)}</Badge>
                <span className="tnum text-sm font-semibold">{s.count}</span>
              </div>
              <div className="tnum mt-1 text-xs text-[var(--color-muted)]">
                {compact(s.amount, locale)} AZN
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-line)] p-3">
          <input
            type="search"
            className="min-w-56 flex-1 rounded-md border border-[var(--color-line)] px-2.5 py-1.5 text-sm focus:border-[var(--color-brand)] focus:outline-none"
            placeholder={t("pipeline.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("pipeline.search")}
          />
          <select
            className={selectClass}
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            aria-label={t("pipeline.allStages")}
          >
            <option value="">{t("pipeline.allStages")}</option>
            {[...OPEN_STAGES, ...CLOSED_STAGES].map((s) => (
              <option key={s} value={s}>
                {t(`stage.${s}`)}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            aria-label={t("pipeline.allSectors")}
          >
            <option value="">{t("pipeline.allSectors")}</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {t(`sector.${s}`)}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <Empty>{t("pipeline.empty")}</Empty>
        ) : (
          <Table
            head={[
              t("pipeline.columns.borrower"),
              t("pipeline.columns.amount"),
              t("pipeline.columns.stage"),
              t("pipeline.columns.grade"),
              t("pipeline.columns.dscr"),
              t("pipeline.columns.coverage"),
              t("pipeline.columns.flags"),
              t("pipeline.columns.updated"),
            ]}
          >
            {filtered.map((r) => (
              <Row key={r.id} className="cursor-pointer hover:bg-slate-50">
                <Cell align="left">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => navigate({ name: "case", id: r.id, tab: "profile" })}
                  >
                    <span className="font-medium text-[var(--color-brand)]">{r.name}</span>
                    <span className="block text-xs text-[var(--color-muted)]">
                      {r.id} · {t(`sector.${r.sector}`)} · {r.region}
                    </span>
                  </button>
                </Cell>
                <Cell>
                  <span className="font-medium">{amount(r.amount, locale)}</span>
                  <span className="block text-xs text-[var(--color-muted)]">
                    {r.currency} · {r.months} {t("common.months")}
                  </span>
                </Cell>
                <Cell>
                  <Badge tone={STAGE_TONE[r.stage]}>{t(`stage.${r.stage}`)}</Badge>
                </Cell>
                <Cell>
                  <GradeChip grade={r.grade} />
                </Cell>
                <Cell>{times(r.dscr, locale)}</Cell>
                <Cell>{times(r.coverage, locale)}</Cell>
                <Cell>
                  <span className="flex justify-end gap-1">
                    {r.stops > 0 ? <Badge tone="red">{r.stops}</Badge> : null}
                    {r.warns > 0 ? <Badge tone="amber">{r.warns}</Badge> : null}
                    {r.stops === 0 && r.warns === 0 ? <span className="text-slate-400">—</span> : null}
                  </span>
                </Cell>
                <Cell>
                  <span className="text-xs text-[var(--color-muted)]">
                    {date(r.updatedAt, locale)}
                    <span className="block">{r.officer}</span>
                  </span>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
