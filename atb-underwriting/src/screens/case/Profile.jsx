import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { Card, CardHeader } from "../../components/ui.jsx";
import { TextField, NumberField, SelectField, CheckField, TextArea } from "../../components/fields.jsx";
import { SECTORS, REGIONS } from "../../domain/seed.js";

export default function Profile({ caseFile }) {
  const { t } = useI18n();
  const { dispatch } = useStore();
  const b = caseFile.borrower;
  const r = caseFile.request;

  const setB = (patch) => dispatch({ type: "patchBorrower", id: caseFile.id, patch });
  const setR = (patch) => dispatch({ type: "patchRequest", id: caseFile.id, patch });

  const opts = (keys, prefix) => keys.map((k) => ({ value: k, label: t(`${prefix}.${k}`) }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={t("borrower.section")} />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField label={t("borrower.name")} value={b.name} onChange={(v) => setB({ name: v })} />
          </div>
          <TextField label={t("borrower.taxId")} value={b.taxId} onChange={(v) => setB({ taxId: v })} />
          <SelectField
            label={t("borrower.legalForm")}
            value={b.legalForm}
            onChange={(v) => setB({ legalForm: v })}
            options={opts(["llc", "jsc", "individual"], "legalForm")}
          />
          <SelectField
            label={t("borrower.sector")}
            value={b.sector}
            onChange={(v) => setB({ sector: v })}
            options={opts(SECTORS, "sector")}
          />
          <SelectField
            label={t("borrower.region")}
            value={b.region}
            onChange={(v) => setB({ region: v })}
            options={REGIONS.map((x) => ({ value: x, label: x }))}
          />
          <NumberField
            label={t("borrower.businessMonths")}
            value={b.businessMonths}
            onChange={(v) => setB({ businessMonths: v })}
            hint={b.businessMonths >= 12 ? `≈ ${Math.floor(b.businessMonths / 12)}` : undefined}
          />
          <NumberField
            label={t("borrower.employees")}
            value={b.employees}
            onChange={(v) => setB({ employees: v })}
          />
          <TextField label={t("borrower.owner")} value={b.owner} onChange={(v) => setB({ owner: v })} />
          <SelectField
            label={t("borrower.revenueCurrency")}
            value={b.revenueCurrency}
            onChange={(v) => setB({ revenueCurrency: v })}
            options={["AZN", "USD", "EUR"].map((x) => ({ value: x, label: x }))}
          />
          <div className="sm:col-span-2">
            <TextField
              label={t("borrower.subSector")}
              value={b.subSector}
              onChange={(v) => setB({ subSector: v })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <CheckField
              label={t("borrower.taxDebt")}
              checked={b.taxDebt}
              onChange={(v) => setB({ taxDebt: v })}
            />
            {b.taxDebt ? (
              <div className="w-40">
                <NumberField
                  label={t("borrower.taxDebtAmount")}
                  value={b.taxDebtAmount}
                  onChange={(v) => setB({ taxDebtAmount: v })}
                  suffix="AZN"
                />
              </div>
            ) : null}
            <CheckField
              label={t("borrower.litigation")}
              checked={b.litigation}
              onChange={(v) => setB({ litigation: v })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextArea label={t("borrower.note")} value={b.note} rows={3} onChange={(v) => setB({ note: v })} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("request.section")} />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <NumberField
            label={t("request.amount")}
            value={r.amount}
            onChange={(v) => setR({ amount: v })}
            suffix={r.currency}
          />
          <SelectField
            label={t("request.currency")}
            value={r.currency}
            onChange={(v) => setR({ currency: v })}
            options={["AZN", "USD", "EUR"].map((x) => ({ value: x, label: x }))}
          />
          <SelectField
            label={t("request.purpose")}
            value={r.purpose}
            onChange={(v) => setR({ purpose: v, product: v })}
            options={opts(["workingCapital", "investment", "refinancing"], "purpose")}
          />
          <SelectField
            label={t("request.repayment")}
            value={r.repayment}
            onChange={(v) => setR({ repayment: v })}
            options={[
              { value: "annuity", label: t("request.annuity") },
              { value: "equalPrincipal", label: t("request.equalPrincipal") },
            ]}
          />
          <NumberField label={t("request.months")} value={r.months} onChange={(v) => setR({ months: v })} />
          <NumberField
            label={t("request.graceMonths")}
            value={r.graceMonths}
            onChange={(v) => setR({ graceMonths: v })}
          />
          <NumberField
            label={t("request.rate")}
            value={r.rate}
            onChange={(v) => setR({ rate: v })}
            suffix="%"
            step="0.1"
          />
          <div className="sm:col-span-2">
            <TextArea label={t("request.note")} value={r.note} rows={3} onChange={(v) => setR({ note: v })} />
          </div>
        </div>
      </Card>
    </div>
  );
}
