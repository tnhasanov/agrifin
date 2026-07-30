import { Icon } from "./Icon.jsx";
import { C } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";

export function Toast() {
  const { t } = useI18n();
  const { state } = useStore();

  return (
    <div
      className="absolute right-0 left-0 z-40 flex justify-center"
      style={{ bottom: 92 }}
      aria-live="polite"
      aria-atomic="true"
    >
      {state.toast && (
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
          style={{
            backgroundColor: C.pine,
            color: "#fff",
            boxShadow: "0 8px 24px rgba(16,32,22,0.3)",
          }}
        >
          <Icon name="Check" size={13} color={C.gold} />
          {t(state.toast.key, state.toast.vars ?? undefined)}
        </div>
      )}
    </div>
  );
}
