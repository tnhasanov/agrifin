import { useState } from "react";
import { useI18n } from "../i18n/index.jsx";
import { useStore, nextCaseId, draftCase } from "../state/store.jsx";
import { SECTORS, REGIONS } from "../domain/seed.js";
import { Button, Card, CardHeader } from "../components/ui.jsx";
import { TextField, NumberField, SelectField } from "../components/fields.jsx";
import { logEntry } from "../domain/workflow.js";

export default function NewCase({ navigate }) {
  const { t } = useI18n();
  const { cases, user, dispatch } = useStore();
  const [form, setForm] = useState({
    name: "",
    taxId: "",
    sector: "agriculture",
    region: "Bakı",
    legalForm: "llc",
    businessMonths: 24,
    amount: 0,
    currency: "AZN",
    months: 24,
    purpose: "workingCapital",
    branch: "Bakı — Nizami filialı",
  });
  const [error, setError] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const opts = (keys, prefix) => keys.map((k) => ({ value: k, label: t(`${prefix}.${k}`) }));

  const create = () => {
    if (!form.name.trim()) return setError(t("newCase.nameRequired"));
    if (!(form.amount > 0)) return setError(t("newCase.amountRequired"));

    const id = nextCaseId(cases);
    const draft = draftCase({ id, officer: user.name, branch: form.branch });
    const caseFile = {
      ...draft,
      borrower: {
        ...draft.borrower,
        name: form.name.trim(),
        taxId: form.taxId.trim(),
        sector: form.sector,
        region: form.region,
        legalForm: form.legalForm,
        businessMonths: Number(form.businessMonths) || 0,
      },
      request: {
        ...draft.request,
        amount: Number(form.amount) || 0,
        currency: form.currency,
        months: Number(form.months) || 24,
        purpose: form.purpose,
        product: form.purpose,
      },
      log: [
        logEntry({
          actor: user.name,
          role: user.role,
          from: null,
          to: "draft",
          note: t("newCase.title"),
        }),
      ],
    };

    dispatch({ type: "createCase", caseFile });
    navigate({ name: "case", id, tab: "profile" });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        type="button"
        className="text-xs text-[var(--color-muted)] hover:text-[var(--color-brand)]"
        onClick={() => navigate({ name: "pipeline" })}
      >
        ← {t("nav.pipeline")}
      </button>

      <Card>
        <CardHeader title={t("newCase.title")} hint={t("newCase.hint")} />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField label={t("borrower.name")} value={form.name} onChange={(v) => set({ name: v })} />
          </div>
          <TextField label={t("borrower.taxId")} value={form.taxId} onChange={(v) => set({ taxId: v })} />
          <SelectField
            label={t("borrower.legalForm")}
            value={form.legalForm}
            onChange={(v) => set({ legalForm: v })}
            options={opts(["llc", "jsc", "individual"], "legalForm")}
          />
          <SelectField
            label={t("borrower.sector")}
            value={form.sector}
            onChange={(v) => set({ sector: v })}
            options={opts(SECTORS, "sector")}
          />
          <SelectField
            label={t("borrower.region")}
            value={form.region}
            onChange={(v) => set({ region: v })}
            options={REGIONS.map((x) => ({ value: x, label: x }))}
          />
          <NumberField
            label={t("borrower.businessMonths")}
            value={form.businessMonths}
            onChange={(v) => set({ businessMonths: v })}
          />
          <SelectField
            label={t("newCase.branch")}
            value={form.branch}
            onChange={(v) => set({ branch: v })}
            options={[
              "Bakı — Nizami filialı",
              "Bakı — Xətai filialı",
              "Gəncə filialı",
              "Şirvan filialı",
              "Naxçıvan filialı",
              "Sumqayıt filialı",
            ].map((x) => ({ value: x, label: x }))}
          />
          <NumberField
            label={t("request.amount")}
            value={form.amount}
            onChange={(v) => set({ amount: v })}
            suffix={form.currency}
          />
          <SelectField
            label={t("request.currency")}
            value={form.currency}
            onChange={(v) => set({ currency: v })}
            options={["AZN", "USD", "EUR"].map((x) => ({ value: x, label: x }))}
          />
          <SelectField
            label={t("request.purpose")}
            value={form.purpose}
            onChange={(v) => set({ purpose: v })}
            options={opts(["workingCapital", "investment", "refinancing"], "purpose")}
          />
          <NumberField label={t("request.months")} value={form.months} onChange={(v) => set({ months: v })} />

          {error ? <p className="sm:col-span-2 text-sm text-[var(--color-weak)]">{error}</p> : null}

          <div className="flex gap-2 sm:col-span-2">
            <Button variant="primary" onClick={create}>
              {t("newCase.create")}
            </Button>
            <Button onClick={() => navigate({ name: "pipeline" })}>{t("common.cancel")}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
