import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { Toast } from "./components/Toast.jsx";
import { LoanSheet } from "./features/loan/LoanSheet.jsx";
import { LocationSheet } from "./features/location/LocationSheet.jsx";
import { Onboarding } from "./features/onboarding/Onboarding.jsx";

// Xəritə (Leaflet) yalnız sahə çəkiləndə yüklənir — əsas paketə düşmür
const FieldDraw = lazy(() =>
  import("./features/field/FieldDraw.jsx").then((m) => ({ default: m.FieldDraw })),
);
import { AgronomChat } from "./features/agronom/AgronomChat.jsx";
import { HomeScreen } from "./screens/HomeScreen.jsx";
import { AdvisorScreen } from "./screens/AdvisorScreen.jsx";
import { MoneyScreen } from "./screens/MoneyScreen.jsx";
import { MarketScreen } from "./screens/MarketScreen.jsx";
import { CarbonScreen } from "./screens/CarbonScreen.jsx";
import { useRouter } from "./lib/router.jsx";
import { useStore } from "./state/store.jsx";
import { routeForPath } from "./routes.js";
import { C, font } from "./theme/tokens.js";
import { useNdvi } from "./features/ndvi/useNdvi.js";
import { useQonsu } from "./features/ndvi/useQonsu.js";
import { useSiqnallar } from "./features/signals/useSiqnallar.js";
import { acigSiqnallar } from "./services/siqnal.js";
import { havaNoqtesi } from "./services/saheYeri.js";
import { DEFAULT_LOCATION } from "./services/location.js";

const SCREENS = {
  home: HomeScreen,
  advisor: AdvisorScreen,
  money: MoneyScreen,
  market: MarketScreen,
  carbon: CarbonScreen,
};

export default function App() {
  const { path } = useRouter();
  const { state, actions } = useStore();
  const [loanOpen, setLoanOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  // Yer seçimi paneli sonradan rayonu dəyişmək üçündür; ilk açılışda
  // qeydiyyat axını bu işi görür
  const [locationOpen, setLocationOpen] = useState(false);
  const scrollRef = useRef(null);

  const route = routeForPath(path);
  const Screen = SCREENS[route.id];

  // Peyk ölçməsi və siqnallar BURADA qurulur, ekranlarda yox: başlıqdakı zəng,
  // əsas ekran və məsləhət ekranı eyni siyahını göstərməlidir və hər biri
  // ayrıca Copernicus sorğusu göndərməməlidir (emal kvotası pulludur).
  const peyk = useNdvi(state.sahe);
  const qonsu = useQonsu(state.sahe, peyk.xulase);
  const noqte = havaNoqtesi({ location: state.location ?? DEFAULT_LOCATION, sahe: state.sahe });
  const butunSiqnallar = useSiqnallar({
    lat: noqte.lat,
    lon: noqte.lon,
    xulase: peyk.xulase,
    muqayise: qonsu.muqayise,
  });
  const siqnallar = acigSiqnallar(butunSiqnallar, state.bagliSiqnallar);

  // Sabit identifikator: alt komponentlərdəki effektlər hər render-də
  // yenidən qurulmasın
  const closeChat = useCallback(() => setChatOpen(false), []);
  const closeField = useCallback(() => setFieldOpen(false), []);
  const closeLoan = useCallback(() => setLoanOpen(false), []);
  const closeLocation = useCallback(() => setLocationOpen(false), []);

  // Ekran dəyişəndə əvvəlki sürüşdürmə mövqeyində qalmaq çaşdırıcıdır
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [route.id]);

  return (
    <div
      className="az-outer flex w-full items-center justify-center py-6"
      style={{ fontFamily: font.body }}
    >
      <div
        className="az-frame relative flex w-full flex-col overflow-hidden"
        style={{ backgroundColor: C.mist }}
      >
        {/* İlk açılışda tətbiq ALTDA render olunmur: rayon seçilməmiş hava
            sorğusu göndərmək mənasızdır və ekran oxuyucu iki dəfə eyni
            düymələri görür. */}
        {!state.onboarded ? (
          <Onboarding />
        ) : (
          <>
            <AppHeader siqnalSayi={siqnallar.length} />

            <main ref={scrollRef} className="flex-1 overflow-y-auto">
              {/* key ekran dəyişəndə remount edir — giriş animasiyası hər dəfə oynayır */}
              <div key={route.id} className="ekran-giris">
                <Screen
                peyk={peyk}
                qonsu={qonsu}
                siqnallar={siqnallar}
                onOpenLoan={() => setLoanOpen(true)}
                onPickLocation={() => setLocationOpen(true)}
                onOpenChat={() => setChatOpen(true)}
                onDrawField={() => setFieldOpen(true)}
                />
              </div>
            </main>

            <Toast />
            <BottomNav />

            {loanOpen && <LoanSheet onClose={closeLoan} />}

            {chatOpen && <AgronomChat peyk={peyk} qonsu={qonsu} onClose={closeChat} />}

            {fieldOpen && (
              <Suspense fallback={null}>
                <FieldDraw
                  location={state.location}
                  existing={state.sahe}
                  onSave={(sahe, xeberdarlıqAcari) => {
                    actions.setSahe(sahe);
                    if (xeberdarlıqAcari) actions.showToast(xeberdarlıqAcari);
                    setFieldOpen(false);
                  }}
                  onClose={closeField}
                />
              </Suspense>
            )}

            {locationOpen && (
              <LocationSheet
                current={state.location}
                onSelect={actions.setLocation}
                onClose={closeLocation}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
