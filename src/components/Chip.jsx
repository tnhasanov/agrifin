import { Icon } from "./Icon.jsx";
import { font } from "../theme/tokens.js";

export function Chip({ icon, label, color, bg }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
      style={{ color, backgroundColor: bg, fontFamily: font.body }}
    >
      {icon && <Icon name={icon} size={16} strokeWidth={2.5} color={color} />}
      {label}
    </span>
  );
}
