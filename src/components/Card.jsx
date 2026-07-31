import { C } from "../theme/tokens.js";

/**
 * onClick verilibsə həqiqi <button> kimi render olunur — klaviatura və
 * ekran oxuyucusu ilə işləməsi üçün div-ə onClick qoymaq kifayət etmir.
 */
export function Card({ children, style, onClick, ariaLabel, className = "" }) {
  const base = {
    backgroundColor: C.card,
    border: `1px solid ${C.line}`,
    ...style,
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`w-full rounded-2xl p-4 text-left ${className}`}
        style={base}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={`rounded-2xl p-4 ${className}`} style={base}>
      {children}
    </div>
  );
}
