// Forma sahələri.
//
// Rəqəm sahəsi ayrıca yazılıb: bank formasında boş xana ilə sıfır fərqli
// şeylərdir, ona görə boş sətir sıfıra çevrilmir, yazıldığı kimi qalır və
// yalnız `onChange` zamanı rəqəmə çevrilir.

import { useId } from "react";

export function Label({ htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-[var(--color-muted)]">
      {children}
      {hint ? <span className="ml-1 font-normal text-slate-400">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-ink)] placeholder:text-slate-400 focus:border-[var(--color-brand)] focus:outline-none";

export function TextField({ label, value, onChange, placeholder, hint, ...rest }) {
  const id = useId();
  return (
    <div>
      {label ? <Label htmlFor={id} hint={hint}>{label}</Label> : null}
      <input
        id={id}
        type="text"
        className={inputClass}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}

export function NumberField({ label, value, onChange, suffix, hint, step = "any", min, align = "right" }) {
  const id = useId();
  return (
    <div>
      {label ? <Label htmlFor={id} hint={hint}>{label}</Label> : null}
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          className={`tnum ${inputClass} ${align === "right" ? "text-right" : ""} ${suffix ? "pr-10" : ""}`}
          value={Number.isFinite(Number(value)) ? value : ""}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? 0 : Number(raw));
          }}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SelectField({ label, value, onChange, options, hint }) {
  const id = useId();
  return (
    <div>
      {label ? <Label htmlFor={id} hint={hint}>{label}</Label> : null}
      <select
        id={id}
        className={inputClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CheckField({ label, checked, onChange }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function TextArea({ label, value, onChange, rows = 4, placeholder, hint }) {
  const id = useId();
  return (
    <div>
      {label ? <Label htmlFor={id} hint={hint}>{label}</Label> : null}
      <textarea
        id={id}
        rows={rows}
        className={`${inputClass} leading-relaxed`}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Cədvəl içində redaktə olunan rəqəm — çərçivəsiz, sıx. */
export function CellInput({ value, onChange, label }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={label}
      className="tnum w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-right text-sm hover:border-slate-200 focus:border-[var(--color-brand)] focus:bg-white focus:outline-none"
      value={Number.isFinite(Number(value)) ? value : ""}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? 0 : Number(raw));
      }}
    />
  );
}
