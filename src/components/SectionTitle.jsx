import { C, font } from "../theme/tokens.js";

export function SectionTitle({ children, action, onAction }) {
  return (
    <div className="mt-5 mb-2 flex items-center justify-between px-1">
      <h2 className="text-sm font-bold tracking-wide" style={{ color: C.ink, fontFamily: font.display }}>
        {children}
      </h2>
      {action &&
        (onAction ? (
          <button type="button" onClick={onAction} className="text-xs font-semibold" style={{ color: C.field }}>
            {action}
          </button>
        ) : (
          <span className="text-xs font-semibold" style={{ color: C.field }}>
            {action}
          </span>
        ))}
    </div>
  );
}
