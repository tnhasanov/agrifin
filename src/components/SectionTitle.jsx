import { C, font } from "../theme/tokens.js";

export function SectionTitle({ children, action, onAction, level = 2 }) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="mt-5 mb-2 flex items-center justify-between px-1">
      <Heading className="text-sm font-bold tracking-wide" style={{ color: C.ink, fontFamily: font.display }}>
        {children}
      </Heading>
      {action &&
        (onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: C.field }}
          >
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
