import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { Toast } from "./components/Toast.jsx";
import { LoanSheet } from "./features/loan/LoanSheet.jsx";
import { LocationSheet } from "./features/location/LocationSheet.jsx";
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
  // Yer heç vaxt seçilməyibsə panel ilk açılışda özü qalxır
  const [locationOpen, setLocationOpen] = useState(() => state.location === null);
  const scrollRef = useRef(null);

  const route = routeForPath(path);
  const Screen = SCREENS[route.id];

  // Sabit identifikator: alt komponentlərdəki effektlər hər render-də
  // yenidən qurulmasın
  const closeChat = useCallback(() => setChatOpen(false), []);
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
        <AppHeader />

        <main ref={scrollRef} className="flex-1 overflow-y-auto">
          <Screen
            onOpenLoan={() => setLoanOpen(true)}
            onPickLocation={() => setLocationOpen(true)}
            onOpenChat={() => setChatOpen(true)}
          />
        </main>

        <Toast />
        <BottomNav />

        {loanOpen && <LoanSheet onClose={closeLoan} />}

        {chatOpen && <AgronomChat onClose={closeChat} />}

        {locationOpen && (
          <LocationSheet
            current={state.location}
            onSelect={actions.setLocation}
            onClose={closeLocation}
          />
        )}
      </div>
    </div>
  );
}
