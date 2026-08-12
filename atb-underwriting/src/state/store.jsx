import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { seedCases } from "../domain/seed.js";
import { logEntry } from "../domain/workflow.js";

// Bütün vəziyyət burada. Ekranlar `useStore()` ilə oxuyur, `dispatch` ilə
// dəyişir. Saxlama `localStorage`-dadır və versiyalıdır: məlumatın forması
// dəyişəndə köhnə nüsxə səssizcə atılır, tətbiq boş ekranla açılmır.

const STORAGE_KEY = "atb.underwriting.v1";

const initialState = {
  cases: seedCases(),
  // Sistemdə kim kimi işləyir. Real qurulumda bu kataloqdan gələcək.
  user: { name: "N. Əliyeva", role: "officer" },
};

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cases: state.cases, user: state.user }));
  } catch {
    // Saxlama dolubsa iş dayanmır — sessiya daxilində hər şey işləyir.
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.cases)) return initialState;
    return { cases: parsed.cases, user: parsed.user ?? initialState.user };
  } catch {
    return initialState;
  }
}

/** İşi tapıb dəyişdirir, `updatedAt`-ı yeniləyir. */
function updateCase(state, id, change) {
  return {
    ...state,
    cases: state.cases.map((c) =>
      c.id === id ? { ...change(c), updatedAt: new Date().toISOString() } : c,
    ),
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case "setUser":
      return { ...state, user: { ...state.user, ...action.user } };

    case "createCase":
      return { ...state, cases: [action.caseFile, ...state.cases] };

    case "patchBorrower":
      return updateCase(state, action.id, (c) => ({
        ...c,
        borrower: { ...c.borrower, ...action.patch },
      }));

    case "patchRequest":
      return updateCase(state, action.id, (c) => ({
        ...c,
        request: { ...c.request, ...action.patch },
      }));

    case "patchCashflow":
      return updateCase(state, action.id, (c) => ({
        ...c,
        cashflowInputs: { ...c.cashflowInputs, ...action.patch },
      }));

    case "patchPeriod":
      return updateCase(state, action.id, (c) => ({
        ...c,
        periods: c.periods.map((p, i) =>
          i !== action.index
            ? p
            : {
                ...p,
                ...(action.group
                  ? { [action.group]: { ...p[action.group], ...action.patch } }
                  : action.patch),
              },
        ),
      }));

    case "addPeriod":
      return updateCase(state, action.id, (c) => ({ ...c, periods: [...c.periods, action.period] }));

    case "removePeriod":
      return updateCase(state, action.id, (c) => ({
        ...c,
        periods: c.periods.filter((_, i) => i !== action.index),
      }));

    case "addCollateral":
      return updateCase(state, action.id, (c) => ({
        ...c,
        collateral: [...(c.collateral ?? []), action.item],
      }));

    case "patchCollateral":
      return updateCase(state, action.id, (c) => ({
        ...c,
        collateral: c.collateral.map((item) =>
          item.id === action.itemId ? { ...item, ...action.patch } : item,
        ),
      }));

    case "removeCollateral":
      return updateCase(state, action.id, (c) => ({
        ...c,
        collateral: c.collateral.filter((item) => item.id !== action.itemId),
      }));

    case "addObligation":
      return updateCase(state, action.id, (c) => ({
        ...c,
        obligations: [...(c.obligations ?? []), action.item],
      }));

    case "patchObligation":
      return updateCase(state, action.id, (c) => ({
        ...c,
        obligations: c.obligations.map((o) =>
          o.id === action.itemId ? { ...o, ...action.patch } : o,
        ),
      }));

    case "removeObligation":
      return updateCase(state, action.id, (c) => ({
        ...c,
        obligations: c.obligations.filter((o) => o.id !== action.itemId),
      }));

    case "patchQualitative":
      return updateCase(state, action.id, (c) => ({
        ...c,
        qualitative: { ...c.qualitative, ...action.patch },
      }));

    case "patchMemo":
      return updateCase(state, action.id, (c) => ({ ...c, memo: { ...c.memo, ...action.patch } }));

    case "toggleCondition":
      return updateCase(state, action.id, (c) => {
        const list = c.conditions ?? [];
        return {
          ...c,
          conditions: list.includes(action.condition)
            ? list.filter((x) => x !== action.condition)
            : [...list, action.condition],
        };
      });

    case "setRatingOverride":
      // Düzəliş jurnala da düşür — sonradan "kim dəyişdi?" sualı qalmasın.
      return updateCase(state, action.id, (c) => ({
        ...c,
        ratingOverride: action.override,
        log: [
          ...(c.log ?? []),
          logEntry({
            actor: action.actor,
            role: action.role,
            from: null,
            to: null,
            kind: "rating",
            note: action.override
              ? `Reytinq düzəlişi → ${action.override.grade}: ${action.override.reason}`
              : "Reytinq düzəlişi ləğv edildi.",
          }),
        ],
      }));

    case "confirmRating":
      return updateCase(state, action.id, (c) => ({ ...c, ratingConfirmed: true }));

    case "moveStage":
      return updateCase(state, action.id, (c) => ({
        ...c,
        stage: action.to,
        log: [
          ...(c.log ?? []),
          logEntry({
            actor: action.actor,
            role: action.role,
            from: c.stage,
            to: action.to,
            note: action.note,
            kind: action.kind ?? "stage",
          }),
        ],
      }));

    case "reset":
      return { ...initialState, cases: seedCases(), user: state.user };

    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    persist(state);
  }, [state]);

  const value = useMemo(() => ({ ...state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore yalnız StoreProvider daxilində işləyir");
  return ctx;
}

/** Yeni iş nömrəsi: ATB-il-ardıcıl. */
export function nextCaseId(cases, now = new Date()) {
  const year = now.getFullYear();
  const prefix = `ATB-${year}-`;
  const last = cases
    .filter((c) => c.id.startsWith(prefix))
    .map((c) => Number(c.id.slice(prefix.length)))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => b - a)[0] ?? 0;
  return `${prefix}${String(last + 1).padStart(4, "0")}`;
}

/** Boş iş qaralaması. */
export function draftCase({ id, officer, branch }) {
  const now = new Date().toISOString();
  return {
    id,
    stage: "draft",
    officer,
    branch,
    createdAt: now,
    updatedAt: now,
    borrower: {
      name: "",
      taxId: "",
      legalForm: "llc",
      sector: "agriculture",
      subSector: "",
      region: "Bakı",
      businessMonths: 0,
      employees: 0,
      revenueCurrency: "AZN",
      owner: "",
      taxDebt: false,
      taxDebtAmount: 0,
      litigation: false,
      note: "",
    },
    request: {
      product: "workingCapital",
      purpose: "workingCapital",
      amount: 0,
      currency: "AZN",
      months: 24,
      graceMonths: 0,
      rate: 14,
      repayment: "annuity",
      note: "",
    },
    periods: [],
    obligations: [],
    collateral: [],
    cashflowInputs: { maintenanceCapex: 0, ownerDrawings: 0, workingCapitalNeed: 0 },
    qualitative: {},
    ratingOverride: null,
    ratingConfirmed: false,
    memo: { strengths: "", weaknesses: "", mitigants: "", recommendation: "" },
    conditions: [],
    log: [],
  };
}
