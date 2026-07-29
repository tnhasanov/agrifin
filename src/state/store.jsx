import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import * as storage from "../lib/storage.js";
import { FARM, LOAN_TERMS, computeRepayment } from "../services/farm.js";
import { CARBON, carbonPayout } from "../services/carbon.js";

const PERSIST_KEY = "state";
// Saxlanan formanı dəyişəndə bu rəqəmi artırın — köhnə məlumat səssizcə atılır.
const PERSIST_VERSION = 2;

const INITIAL_TXNS = [
  { id: "t1", nameKey: "txn.grainSale.name", metaKey: "txn.grainSale.meta", amount: 3150 },
  {
    id: "t2",
    nameKey: "txn.agroSupply.name",
    metaKey: "txn.agroSupply.meta",
    metaVars: { card: FARM.card.last4 },
    amount: -530,
  },
  {
    id: "t3",
    nameKey: "txn.fuel.name",
    metaKey: "txn.fuel.meta",
    metaVars: { card: FARM.card.last4 },
    amount: -160,
  },
  { id: "t4", nameKey: "txn.insurance.name", metaKey: "txn.insurance.meta", amount: -70 },
];

export const initialState = {
  wallet: 7280,
  creditsSold: false,
  completedRecs: [],
  txns: INITIAL_TXNS,
  nextTxnId: 5,
  loan: { active: true, amount: 8000, repay: 8380, seasonProgress: 62 },
  toast: null,
};

export function reducer(state, action) {
  switch (action.type) {
    case "rec/complete": {
      if (state.completedRecs.includes(action.id)) return state;
      return { ...state, completedRecs: [...state.completedRecs, action.id] };
    }

    case "carbon/sell": {
      if (state.creditsSold) return state;
      const amount = carbonPayout();
      return {
        ...state,
        creditsSold: true,
        wallet: state.wallet + amount,
        nextTxnId: state.nextTxnId + 1,
        txns: [
          {
            id: `t${state.nextTxnId}`,
            nameKey: "txn.carbon.name",
            metaKey: "txn.carbon.meta",
            metaVars: { count: CARBON.creditsReady },
            amount,
          },
          ...state.txns,
        ],
      };
    }

    case "loan/take": {
      const amount = Number(action.amount) || 0;
      if (amount <= 0) return state;
      return {
        ...state,
        wallet: state.wallet + amount,
        nextTxnId: state.nextTxnId + 1,
        loan: { ...state.loan, active: true, amount, repay: computeRepayment(amount, LOAN_TERMS) },
        txns: [
          {
            id: `t${state.nextTxnId}`,
            nameKey: "txn.loan.name",
            metaKey: "txn.loan.meta",
            amount,
          },
          ...state.txns,
        ],
      };
    }

    case "toast/show":
      return { ...state, toast: { key: action.key, vars: action.vars ?? null } };

    case "toast/clear":
      return { ...state, toast: null };

    case "demo/reset":
      return { ...initialState };

    default:
      return state;
  }
}

function loadPersisted() {
  const saved = storage.read(PERSIST_KEY);
  if (!saved || saved.version !== PERSIST_VERSION) return initialState;
  // Toast efemer UI-dır — yenidən yüklənəndə göstərilməməlidir.
  return { ...initialState, ...saved.state, toast: null };
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadPersisted);
  const toastTimer = useRef(null);

  useEffect(() => {
    const { toast: _toast, ...persistable } = state;
    storage.write(PERSIST_KEY, { version: PERSIST_VERSION, state: persistable });
  }, [state]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((key, vars) => {
    dispatch({ type: "toast/show", key, vars });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => dispatch({ type: "toast/clear" }), 2600);
  }, []);

  const actions = useMemo(
    () => ({
      showToast,
      clearToast: () => dispatch({ type: "toast/clear" }),
      completeRec: (id) => {
        dispatch({ type: "rec/complete", id });
        showToast("toast.recAdded");
      },
      sellCredits: () => {
        dispatch({ type: "carbon/sell" });
        showToast("toast.creditsSold", { amount: { money: carbonPayout() } });
      },
      takeLoan: (amount) => dispatch({ type: "loan/take", amount }),
      resetDemo: () => dispatch({ type: "demo/reset" }),
    }),
    [showToast],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore yalnız <StoreProvider> içində işləyir");
  return ctx;
}
