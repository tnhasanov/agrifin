// Ümumi görüntü elementləri. Məntiq yoxdur — yalnız göstərmə.

const TONES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  violet: "bg-violet-50 text-violet-800 ring-violet-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  teal: "bg-teal-50 text-teal-800 ring-teal-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  brand: "bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-slate-300",
};

export function Badge({ tone = "slate", children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone] ?? TONES.slate}`}
    >
      {children}
    </span>
  );
}

export function Card({ children, className = "", as: Tag = "section" }) {
  return (
    <Tag className={`print-plain rounded-lg border border-[var(--color-line)] bg-white shadow-sm ${className}`}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, hint, right }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h2>
        {hint ? <p className="mt-0.5 max-w-2xl text-xs text-[var(--color-muted)]">{hint}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function Stat({ label, value, sub, tone }) {
  const toneClass =
    tone === "good" ? "text-[var(--color-good)]"
    : tone === "fair" ? "text-[var(--color-fair)]"
    : tone === "weak" ? "text-[var(--color-weak)]"
    : "text-[var(--color-ink)]";
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-white px-4 py-3">
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className={`tnum mt-1 text-xl font-semibold ${toneClass}`}>{value}</div>
      {sub ? <div className="tnum mt-0.5 text-xs text-[var(--color-muted)]">{sub}</div> : null}
    </div>
  );
}

export function Button({ variant = "default", className = "", ...props }) {
  const styles = {
    default: "border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-slate-50",
    primary: "border-transparent bg-[var(--color-brand)] text-white hover:bg-[#0d2c4a]",
    danger: "border-red-200 bg-white text-red-700 hover:bg-red-50",
    ghost: "border-transparent bg-transparent text-[var(--color-muted)] hover:bg-slate-100",
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

/** Bant rəngi — əmsalın oxunuşu. */
export function BandDot({ band }) {
  const color =
    band === "good" ? "bg-[var(--color-good)]"
    : band === "fair" ? "bg-[var(--color-fair)]"
    : band === "weak" ? "bg-[var(--color-weak)]"
    : "bg-slate-300";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

/** Sadə üfüqi zolaq — dövrlər üzrə müqayisə üçün. */
export function Bars({ values = [], labels = [], format = (v) => v }) {
  const max = Math.max(1, ...values.map((v) => Math.abs(v) || 0));
  return (
    <div className="space-y-1.5">
      {values.map((v, i) => (
        <div key={labels[i] ?? i} className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-xs text-[var(--color-muted)]">{labels[i]}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className={`block h-full rounded-full ${v < 0 ? "bg-[var(--color-weak)]" : "bg-[var(--color-brand)]"}`}
              style={{ width: `${Math.max(2, (Math.abs(v) / max) * 100)}%` }}
            />
          </span>
          <span className="tnum w-24 shrink-0 text-right text-xs text-[var(--color-ink)]">{format(v)}</span>
        </div>
      ))}
    </div>
  );
}

/** Reytinq sinfi 1–10: aşağı rəqəm daha yaxşıdır. */
export function GradeChip({ grade, stance, label }) {
  const tone =
    grade <= 2 ? "green"
    : grade <= 5 ? "teal"
    : grade <= 7 ? "amber"
    : "red";
  return (
    <Badge tone={tone} title={label}>
      <span className="tnum font-semibold">{grade}</span>
      {stance ? <span className="font-normal">· {stance}</span> : null}
    </Badge>
  );
}

export function Table({ head, children, dense = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left text-xs text-[var(--color-muted)]">
            {head.map((h, i) => (
              <th
                key={typeof h === "string" ? h : i}
                className={`${dense ? "px-3 py-1.5" : "px-4 py-2"} font-medium ${i > 0 ? "text-right" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children, className = "" }) {
  return <tr className={`border-b border-slate-100 last:border-0 ${className}`}>{children}</tr>;
}

export function Cell({ children, align = "right", className = "", ...rest }) {
  return (
    <td
      className={`tnum px-4 py-2 ${align === "right" ? "text-right" : "text-left"} ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}

export function Empty({ children }) {
  return <p className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">{children}</p>;
}
