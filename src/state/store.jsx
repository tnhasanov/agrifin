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
import { isValidLocation, readLegacyLocation } from "../services/location.js";

export const PERSIST_KEY = "state";
// Saxlanan formanı dəyişəndə bu rəqəmi artırın — köhnə məlumat səssizcə atılır.
export const PERSIST_VERSION = 2;

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

// Yaddaşda saxlanan çat tarixçəsinin yuxarı həddi
const CHAT_LIMIT = 40;

export const initialState = {
  wallet: 7280,
  // null olduqda ilk açılışda yer seçimi paneli göstərilir
  location: null,
  // Aqronom çatı: mesajlar {role, content} və ya {role, errorKey}
  chat: { messages: [], crop: null, referral: false },
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

    case "chat/user": {
      const content = String(action.content ?? "").trim();
      if (!content) return state;
      return {
        ...state,
        chat: {
          ...state.chat,
          referral: false,
          messages: [...state.chat.messages, { role: "user", content }].slice(-CHAT_LIMIT),
        },
      };
    }

    case "chat/assistant":
      return {
        ...state,
        chat: {
          ...state.chat,
          referral: Boolean(action.referral),
          messages: [
            ...state.chat.messages,
            { role: "assistant", content: String(action.content ?? "") },
          ].slice(-CHAT_LIMIT),
        },
      };

    // Xəta mesajı açar kimi saxlanılır ki, dil dəyişəndə düzgün göstərilsin.
    // Bu mesajlar API-yə tarixçə kimi göndərilmir (bax: AgronomChat).
    case "chat/error":
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: [
            ...state.chat.messages,
            { role: "assistant", errorKey: action.errorKey },
          ].slice(-CHAT_LIMIT),
        },
      };

    case "chat/crop":
      return { ...state, chat: { ...state.chat, crop: action.crop } };

    case "chat/clear":
      return { ...state, chat: { ...initialState.chat, crop: state.chat.crop } };

    case "location/set": {
      if (!isValidLocation(action.location)) return state;
      return { ...state, location: action.location };
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
  // Toast efemer UI-dır — yenidən yüklənəndə göstərilməməlidir.
  const base =
    !saved || saved.version !== PERSIST_VERSION
      ? initialState
      : { ...initialState, ...saved.state, toast: null };

  // Köhnə prototipdə yer ayrı açarda saxlanılırdı — yenidən soruşmuruq
  if (!isValidLocation(base.location)) {
    const legacy = readLegacyLocation();
    if (legacy) return { ...base, location: legacy };
  }

  return base;
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
      setLocation: (location) => {
        dispatch({ type: "location/set", location });
        showToast("toast.locationSelected", { name: location.name });
      },
      chatUser: (content) => dispatch({ type: "chat/user", content }),
      chatAssistant: (content, referral) =>
        dispatch({ type: "chat/assistant", content, referral }),
      chatError: (errorKey) => dispatch({ type: "chat/error", errorKey }),
      chatSetCrop: (crop) => dispatch({ type: "chat/crop", crop }),
      chatClear: () => dispatch({ type: "chat/clear" }),
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
