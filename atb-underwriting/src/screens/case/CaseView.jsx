import { useMemo } from "react";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { analyse } from "../../domain/analyse.js";
import { STAGE_TONE } from "../../domain/workflow.js";
import { Badge, Button, GradeChip, Card } from "../../components/ui.jsx";
import { amount, times } from "../../lib/format.js";
import Profile from "./Profile.jsx";
import Financials from "./Financials.jsx";
import Analysis from "./Analysis.jsx";
import Score from "./Score.jsx";
import Collateral from "./Collateral.jsx";
import Structure from "./Structure.jsx";
import Memo from "./Memo.jsx";
import Decision from "./Decision.jsx";

const TABS = [
  ["profile", Profile],
  ["financials", Financials],
  ["analysis", Analysis],
  ["score", Score],
  ["collateral", Collateral],
  ["structure", Structure],
  ["memo", Memo],
  ["decision", Decision],
];

export default function CaseView({ route, navigate }) {
  const { t, locale } = useI18n();
  const { cases } = useStore();
  const caseFile = cases.find((c) => c.id === route.id);

  // Təhlil bir dəfə hesablanır və bütün bölmələrə verilir — memorandumdakı
  // rəqəmlə struktur ekranındakı rəqəm eyni mənbədən gəlsin.
  const result = useMemo(() => (caseFile ? analyse(caseFile) : null), [caseFile]);

  if (!caseFile) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-[var(--color-muted)]">{route.id}</p>
        <Button className="mt-3" onClick={() => navigate({ name: "pipeline" })}>
          ← {t("nav.pipeline")}
        </Button>
      </Card>
    );
  }

  const active = TABS.find(([key]) => key === route.tab) ?? TABS[0];
  const Screen = active[1];
  const { policy } = result;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="no-print text-xs text-[var(--color-muted)] hover:text-[var(--color-brand)]"
            onClick={() => navigate({ name: "pipeline" })}
          >
            ← {t("nav.pipeline")}
          </button>
          <h1 className="mt-1 text-lg font-semibold">{caseFile.borrower.name}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {caseFile.id} · {t(`sector.${caseFile.borrower.sector}`)} · {caseFile.borrower.region} ·{" "}
            {caseFile.branch}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STAGE_TONE[caseFile.stage]}>{t(`stage.${caseFile.stage}`)}</Badge>
          <GradeChip grade={result.score.grade} stance={t(`score.stance.${result.score.stance}`)} />
          <Badge tone={result.capacity.dscrPass ? "green" : "red"}>
            DSCR {times(result.capacity.dscr, locale)}
          </Badge>
          <Badge tone="brand">
            {amount(caseFile.request.amount, locale)} {caseFile.request.currency}
          </Badge>
          {policy.stopCount > 0 ? <Badge tone="red">{policy.stopCount} ⨯</Badge> : null}
          {policy.warnCount > 0 ? <Badge tone="amber">{policy.warnCount} !</Badge> : null}
        </div>
      </div>

      <nav className="no-print flex flex-wrap gap-1 border-b border-[var(--color-line)]">
        {TABS.map(([key]) => (
          <button
            key={key}
            type="button"
            aria-current={key === active[0] ? "page" : undefined}
            onClick={() => navigate({ name: "case", id: caseFile.id, tab: key })}
            className={`-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm transition ${
              key === active[0]
                ? "border-[var(--color-brand)] font-medium text-[var(--color-brand)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </nav>

      <Screen caseFile={caseFile} result={result} navigate={navigate} />
    </div>
  );
}
