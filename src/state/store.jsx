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
import { districtByName, isValidLocation, nearestDistrict, readLegacyLocation } from "../services/location.js";
import { duzgunSahe } from "../services/geo.js";

export const PERSIST_KEY = "state";
// Saxlanan formanı dəyişəndə bu rəqəmi artırın və MIQRASIYALAR-a keçid yazın.
// Keçid yoxdursa köhnə məlumat səssizcə atılır.
export const PERSIST_VERSION = 10;

/**
 * İlk açılış axınının versiyası. Axının addımları dəyişəndə bu artır —
 * yarımçıq qalmış KÖHNƏ axını yeni addımlara sürükləmək olmaz, çünki
 * "2/3"-də dayanmış fermer yeni axında başqa yerdədir.
 */
export const ONBOARDING_VERSIYA = "2.1";

/** Axının addımları — sıra buradadır, komponent onu təkrar yazmır */
export const ONBOARDING_ADDIMLARI = ["rayon", "bitki", "sahe"];

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
  // 9 → 10: premium onboarding v2.1.
  //
  //  • Rayon artıq KODLA saxlanılır. Köhnə qeyddə yalnız göstərilən ad var
  //    ("Bərdə", bəzən "Bərdə (GPS)") — kod addan, alınmasa koordinatdan
  //    tapılır. Fermerdən rayonu yenidən soruşmuruq.
  //  • Axının hansı addımında qaldığı yazılır ki, yarımçıq qalan fermer
  //    başdan başlamasın. Quraşdırmanı bitirmiş fermer sonuncu addımda
  //    sayılır — ona axın bir daha açılmır.
  9: (state) => ({
    ...state,
    location: state.location
      ? {
          ...state.location,
          kod:
            state.location.kod ??
            districtByName(state.location.name)?.kod ??
            (isValidLocation(state.location)
              ? nearestDistrict(state.location.lat, state.location.lon).kod
              : null),
        }
      : state.location,
    onboarding: {
      versiya: ONBOARDING_VERSIYA,
      tamamlananAddim: state.onboarded ? "sahe" : null,
    },
  }),
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
  // ═══ DEMO PUL — REAL DEYİL, DAHA DƏYİŞMİR ══════════════════════════
  // wallet və txns PROTOTİP VİTRİNİDİR: heç bir server hesabına bağlı deyil,
  // heç bir kredit axını onları oxumur və ya yazmır (yoxlanılıb: api/kredit.js
  // bu sahələrə toxunmur) və HEÇ BİR EKRAN ONLARI GÖSTƏRMİR.
  //
  // ARTIQ HEÇ BİR HƏRƏKƏT ONLARI DƏYİŞMİR: karbon "sat" düyməsi əvvəl
  // görünməyən pulqabı 360 ₼ artırır və nümunə əməliyyat sətri yazırdı —
  // istifadəçinin görmədiyi balansı dəyişən düymə audit olunmayan pul
  // hərəkətidir. Karbon ekranı indi yalnız oxunur (bax: CarbonScreen.jsx).
  // Sahələr yalnız köhnə yaddaşın miqrasiyası üçün qalır.
  wallet: 7280,
  // false olduqda ilk açılışda qeydiyyat axını göstərilir
  onboarded: false,
  /**
   * İlk açılış axınının gedişi.
   *
   * `tamamlananAddim` SON BİTMİŞ addımdır (null = heç nə). Axın ondan
   * sonrakı addımdan davam edir — "başdan başla" ekranı fermerin artıq
   * verdiyi cavabı ikinci dəfə soruşurdu.
   *
   * ƏSAS BİTKİ AYRICA SAXLANMIR: o, `chat.crop`-dur. İkinci mağaza
   * yaratmaq iki həqiqət mənbəyi deməkdir.
   */
  onboarding: { versiya: ONBOARDING_VERSIYA, tamamlananAddim: null },
  location: null,
  /**
   * Son seçilmiş rayonların KODLARI, ən yenisi əvvəldə.
   *
   * "Ən çox əkilən rayon" kimi bir sıra uydurmuruq — əlimizdə belə məlumat
   * yoxdur. Bu siyahı fermerin ÖZ tarixçəsidir: bir neçə sahəsi olan fermer
   * eyni iki-üç rayon arasında gedib-gəlir.
   */
  sonRayonlar: [],
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
      const kod = action.location.kod ?? null;
      return {
        ...state,
        location: action.location,
        // Ən çox üç çip göstərilir, ona görə dördüncüsünü saxlamağın mənası yoxdur
        sonRayonlar: kod
          ? [kod, ...state.sonRayonlar.filter((k) => k !== kod)].slice(0, 3)
          : state.sonRayonlar,
      };
    }

    case "onboarding/addim": {
      if (!ONBOARDING_ADDIMLARI.includes(action.addim)) return state;
      return {
        ...state,
        onboarding: { versiya: ONBOARDING_VERSIYA, tamamlananAddim: action.addim },
      };
    }

    case "onboarding/finish":
      return {
        ...state,
        onboarded: true,
        onboarding: { versiya: ONBOARDING_VERSIYA, tamamlananAddim: "sahe" },
      };

    case "sahe/set":
      if (!duzgunSahe(action.sahe)) return state;
      return { ...state, sahe: action.sahe };

    case "sahe/clear":
      return { ...state, sahe: null };

    // Serverdən qayıdan sahə toast-sız qəbul edilir: fermer heç nə etməyib,
    // sadəcə köhnə cihazdakı konturu geri alır — "yadda saxlandı" demək yalandır.
    //
    // SERVER PROFİLİ KÖHNƏ YERLİ VƏZİYYƏTİ ÜSTƏLƏYİR: hesabında sahəsi olan
    // fermer bu cihazda quraşdırmanı KEÇİR. Əks halda köhnə telefonundakı
    // sahəsi olan fermer yeni cihazda "ilk sahənizi əlavə edin" ekranını
    // görürdü — halbuki sahəsi var və serverdən elə indicə gəldi.
    case "sahe/qebul":
      if (!duzgunSahe(action.sahe)) return state;
      return {
        ...state,
        sahe: action.sahe,
        onboarded: true,
        onboarding: { versiya: ONBOARDING_VERSIYA, tamamlananAddim: "sahe" },
      };

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
  if (!Array.isArray(base.sonRayonlar)) base.sonRayonlar = [];
  if (typeof base.hesab?.telefon !== "string") base.hesab = { telefon: null };

  // Başqa versiyanın yarımçıq axını yeni addımlara sürüklənmir: sayğac
  // uyğun gəlmirsə gediş sıfırlanır, verilmiş cavablar (rayon, bitki) qalır
  const gedis = base.onboarding;
  if (gedis?.versiya !== ONBOARDING_VERSIYA || !ONBOARDING_ADDIMLARI.includes(gedis?.tamamlananAddim)) {
    base.onboarding = {
      versiya: ONBOARDING_VERSIYA,
      tamamlananAddim: base.onboarded ? "sahe" : null,
    };
  }

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
      onboardingAddim: (addim) => dispatch({ type: "onboarding/addim", addim }),
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
