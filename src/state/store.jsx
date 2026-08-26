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
import { FARM } from "../services/farm.js";
import { CARBON, carbonPayout } from "../services/carbon.js";
import { isValidLocation, readLegacyLocation } from "../services/location.js";
import { duzgunSahe } from "../services/geo.js";

export const PERSIST_KEY = "state";
// Saxlanan formanı dəyişəndə bu rəqəmi artırın və MIQRASIYALAR-a keçid yazın.
// Keçid yoxdursa köhnə məlumat səssizcə atılır.
export const PERSIST_VERSION = 9;

/**
 * Köhnə versiyadan yeniyə keçid. Fermerdən onsuz da bildiyimiz şeyi
 * (rayonunu, söhbətini) yenidən soruşmaq pis təcrübədir.
 */
const MIQRASIYALAR = {
  // 2 → 3: ilk açılış axını əlavə olundu. Rayonu artıq seçmiş fermer
  // qeydiyyatı keçmiş sayılır — ona ilk açılış ekranı göstərilmir.
  2: (state) => ({ ...state, onboarded: isValidLocation(state.location) }),
  // 3 → 4: fermerin öz çəkdiyi sahə konturu əlavə olundu
  3: (state) => ({ ...state, sahe: null }),
  // 4 → 5: sahə siqnalları əlavə olundu; bağlananların siyahısı boş başlayır
  4: (state) => ({ ...state, bagliSiqnallar: [] }),
  // 5 → 6: nümunə tövsiyələr silindi (bax: services/siqnal.js) — onların
  // "tamamlandı" vəziyyəti də lazım deyil
  5: (state) => {
    const yeni = { ...state };
    delete yeni.completedRecs;
    return yeni;
  },
  // 6 → 7: telefon hesabı (Faza 1). Saxlanan telefon yalnız görüntü keşidir —
  // həqiqi sessiya httpOnly cookie-dədir və açılışda serverlə tutuşdurulur.
  6: (state) => ({ ...state, hesab: { telefon: null } }),
  // 7 → 8: dürüst kredit axını. Nümunə "aktiv kredit" söndürülür — real
  // müraciət axınının yanında uydurma 8000 ₼ borc göstərmək olmaz.
  7: (state) => ({ ...state, muraciet: null, loan: { ...state.loan, active: false } }),
  // 8 → 9: KREDİT VƏZİYYƏTİ SERVERƏ KEÇDİ (bax: api/kredit.js).
  //
  // Yerli `muraciet` obyektləri KÖÇÜRÜLMÜR, silinir. Səbəb: onlar sahibsizdir
  // (hesaba bağlı deyil), heç bir server anderraytinqindən keçməyib və
  // brauzerdə əl ilə dəyişilə bilən dəyərlərdir. Belə rəqəmləri maliyyə
  // qeydi kimi bazaya yazmaq uydurma borc yaratmaq olardı. Fermer müraciəti
  // server axını ilə yenidən göndərir — sahə, rayon, söhbət, dil qalır.
  8: (state) => {
    const yeni = { ...state };
    delete yeni.muraciet;
    delete yeni.loan;
    return yeni;
  },
};

function miqrasiyaEt(saved) {
  let { version, state } = saved;
  while (version < PERSIST_VERSION) {
    const keçid = MIQRASIYALAR[version];
    if (!keçid) return null;
    state = keçid(state);
    version += 1;
  }
  return state;
}

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
  // false olduqda ilk açılışda qeydiyyat axını göstərilir
  onboarded: false,
  location: null,
  // Fermerin peyk şəklində çəkdiyi sahə: {noqteler: [[lat,lon],...], hektar}
  sahe: null,
  // Telefon hesabı (Faza 1). telefon burada görüntü üçündür; giriş özü
  // httpOnly cookie-dədir və hər açılışda serverlə yoxlanılır (useHesab)
  hesab: { telefon: null },
  // Aqronom çatı: mesajlar {role, content} və ya {role, errorKey}
  chat: { messages: [], crop: null, referral: false },
  creditsSold: false,
  // Fermerin bağladığı sahə siqnallarının id-ləri. Id-də ölçmə/hadisə tarixi
  // var, ona görə növbəti şaxta və ya yeni ölçmə yenidən görünür.
  bagliSiqnallar: [],
  txns: INITIAL_TXNS,
  nextTxnId: 5,
  // KREDİT VƏZİYYƏTİ BURADA DEYİL. Müraciət, qərar, təklif və kredit
  // serverdədir (bax: api/kredit.js, features/loan/useKreditVeziyyeti.js):
  // brauzer maliyyə vəziyyətinin həqiqət mənbəyi ola bilməz.
  toast: null,
};

export function reducer(state, action) {
  switch (action.type) {
    case "siqnal/bagla": {
      if (!action.id || state.bagliSiqnallar.includes(action.id)) return state;
      // Siyahı sonsuz böyüməsin: id-lər tarixlidir, köhnələr bir daha
      // qurulmur, ona görə saxlamağın mənası yoxdur
      return { ...state, bagliSiqnallar: [...state.bagliSiqnallar, action.id].slice(-40) };
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

    case "onboarding/finish":
      return { ...state, onboarded: true };

    case "sahe/set":
      if (!duzgunSahe(action.sahe)) return state;
      return { ...state, sahe: action.sahe };

    case "sahe/clear":
      return { ...state, sahe: null };

    // Serverdən qayıdan sahə toast-sız qəbul edilir: fermer heç nə etməyib,
    // sadəcə köhnə cihazdakı konturu geri alır — "yadda saxlandı" demək yalandır
    case "sahe/qebul":
      if (!duzgunSahe(action.sahe)) return state;
      return { ...state, sahe: action.sahe };

    case "hesab/set":
      return { ...state, hesab: { telefon: action.telefon ?? null } };

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
  // Köhnə versiya miqrasiya olunur; alınmasa sıfırdan başlanır.
  const saxlanan =
    saved && saved.state
      ? saved.version === PERSIST_VERSION
        ? saved.state
        : miqrasiyaEt(saved)
      : null;

  // Toast efemer UI-dır — yenidən yüklənəndə göstərilməməlidir.
  const base = saxlanan ? { ...initialState, ...saxlanan, toast: null } : initialState;

  // Zədələnmiş sahə konturunu (əl ilə pozulmuş localStorage) yükləmirik
  if (base.sahe && !duzgunSahe(base.sahe)) base.sahe = null;
  if (!Array.isArray(base.bagliSiqnallar)) base.bagliSiqnallar = [];
  if (typeof base.hesab?.telefon !== "string") base.hesab = { telefon: null };

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
      sellCredits: () => {
        dispatch({ type: "carbon/sell" });
        showToast("toast.creditsSold", { amount: { money: carbonPayout() } });
      },
      siqnaliBagla: (id) => dispatch({ type: "siqnal/bagla", id }),
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
      finishOnboarding: () => dispatch({ type: "onboarding/finish" }),
      setSahe: (sahe) => {
        dispatch({ type: "sahe/set", sahe });
        showToast("toast.fieldSaved", { hektar: { number: sahe.hektar } });
      },
      clearSahe: () => dispatch({ type: "sahe/clear" }),
      saheQebulEt: (sahe) => dispatch({ type: "sahe/qebul", sahe }),
      hesabTelefon: (telefon) => dispatch({ type: "hesab/set", telefon }),
      hesabCixdi: () => dispatch({ type: "hesab/set", telefon: null }),
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
