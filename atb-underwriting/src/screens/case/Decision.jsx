import { useState } from "react";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import {
  availableTransitions,
  canTransition,
  STAGE_TONE,
  STANDARD_CONDITIONS,
  OPEN_STAGES,
} from "../../domain/workflow.js";
import { Badge, Button, Card, CardHeader, Empty } from "../../components/ui.jsx";
import { CheckField, TextArea } from "../../components/fields.jsx";
import { PolicyList } from "../../components/PolicyList.jsx";
import { dateTime } from "../../lib/format.js";

export default function Decision({ caseFile, result }) {
  const { t, locale } = useI18n();
  const { user, dispatch } = useStore();
  const [note, setNote] = useState("");

  const transitions = availableTransitions(caseFile.stage, user.role);
  const log = [...(caseFile.log ?? [])].reverse();

  const move = (to) => {
    dispatch({
      type: "moveStage",
      id: caseFile.id,
      to,
      actor: user.name,
      role: user.role,
      note,
      kind: ["approved", "conditional", "declined"].includes(to) ? "decision" : "stage",
    });
    setNote("");
  };

  const stageIdx = OPEN_STAGES.indexOf(caseFile.stage);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={t("policy.section")}
          right={
            result.policy.needsException ? (
              <Badge tone="red">{t("policy.needsException")}</Badge>
            ) : null
          }
        />
        <PolicyList findings={result.findings} t={t} locale={locale} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("decision.section")} hint={t("decision.actingAs", { role: t(`role.${user.role}`) })} />
          <div className="space-y-4 p-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs">
              {OPEN_STAGES.map((s, i) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      i < stageIdx
                        ? "bg-slate-100 text-slate-500"
                        : i === stageIdx
                          ? "bg-[var(--color-brand)] font-medium text-white"
                          : "bg-white text-slate-400 ring-1 ring-slate-200"
                    }`}
                  >
                    {t(`stage.${s}`)}
                  </span>
                  {i < OPEN_STAGES.length - 1 ? <span className="text-slate-300">→</span> : null}
                </li>
              ))}
              {!OPEN_STAGES.includes(caseFile.stage) ? (
                <li>
                  <Badge tone={STAGE_TONE[caseFile.stage]}>{t(`stage.${caseFile.stage}`)}</Badge>
                </li>
              ) : null}
            </ol>

            <TextArea
              label={t("decision.note")}
              value={note}
              rows={3}
              placeholder={t("decision.notePlaceholder")}
              onChange={setNote}
            />

            {transitions.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">{t("decision.noTransitions")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {transitions.map((tr) => {
                  const check = canTransition(caseFile, tr.to, user.role);
                  const missing = check.missing
                    .map((m) => t(`decision.requirement.${m}`))
                    .join(", ");
                  return (
                    <span key={tr.to} className="inline-flex flex-col">
                      <Button
                        variant={tr.to === "declined" ? "danger" : tr.decision ? "primary" : "default"}
                        disabled={!check.allowed}
                        title={check.allowed ? undefined : t("decision.missing", { items: missing })}
                        onClick={() => move(tr.to)}
                      >
                        {t(`stage.${tr.to}`)}
                      </Button>
                      {!check.allowed && missing ? (
                        <span className="mt-1 max-w-48 text-[11px] text-[var(--color-accent)]">
                          {t("decision.missing", { items: missing })}
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title={t("decision.conditions")} hint={t("decision.conditionsHint")} />
          <div className="space-y-2 p-4">
            {STANDARD_CONDITIONS.map((c) => (
              <CheckField
                key={c}
                label={t(`decision.condition.${c}`)}
                checked={(caseFile.conditions ?? []).includes(c)}
                onChange={() => dispatch({ type: "toggleCondition", id: caseFile.id, condition: c })}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={t("decision.log")} />
        {log.length === 0 ? (
          <Empty>{t("decision.logEmpty")}</Empty>
        ) : (
          <ol className="divide-y divide-slate-100">
            {log.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-3">
                <span className="tnum w-32 shrink-0 text-xs text-[var(--color-muted)]">
                  {dateTime(entry.at, locale)}
                </span>
                <span className="flex items-center gap-1.5">
                  {entry.from ? (
                    <>
                      <Badge tone={STAGE_TONE[entry.from]}>{t(`stage.${entry.from}`)}</Badge>
                      <span className="text-slate-400">→</span>
                    </>
                  ) : null}
                  {entry.to ? (
                    <Badge tone={STAGE_TONE[entry.to]}>{t(`stage.${entry.to}`)}</Badge>
                  ) : (
                    <Badge tone="slate">{t("score.override")}</Badge>
                  )}
                </span>
                <span className="min-w-40 flex-1 text-sm">
                  {entry.note}
                  <span className="block text-xs text-[var(--color-muted)]">
                    {t("decision.decidedBy", { actor: entry.actor, role: t(`role.${entry.role}`) })}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
