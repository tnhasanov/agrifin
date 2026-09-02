import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { Toast } from "./components/Toast.jsx";
import { LocationSheet } from "./features/location/LocationSheet.jsx";
import { Onboarding } from "./features/onboarding/Onboarding.jsx";
import { SiqnalPaneli } from "./features/signals/SiqnalPaneli.jsx";
import { NeceIsleyir } from "./features/pano/NeceIsleyir.jsx";
import { BitkiSheet } from "./features/crop/BitkiSheet.jsx";
import { HesabSheet } from "./features/hesab/HesabSheet.jsx";
import { useHesab } from "./features/hesab/useHesab.js";
import { HomeScreen } from "./screens/HomeScreen.jsx";
import { useRouter } from "./lib/router.jsx";
import { useI18n } from "./i18n/index.jsx";
import { useStore } from "./state/store.jsx";
import { ROUTES, pathFor, routeForPath } from "./routes.js";
import { C, font } from "./theme/tokens.js";
import { useNdvi } from "./features/ndvi/useNdvi.js";
import { useQonsu } from "./features/ndvi/useQonsu.js";
import { useRadar } from "./features/ndvi/useRadar.js";
import { useIndeks } from "./features/score/useIndeks.js";
import { useKreditVeziyyeti } from "./features/loan/useKreditVeziyyeti.js";
import { useSiqnallar } from "./features/signals/useSiqnallar.js";
import { useTovsiyeler } from "./features/tovsiye/useTovsiyeler.js";
import { acigSiqnallar } from "./services/siqnal.js";
import { ehateliSiqnallar } from "./features/signals/siqnalEhate.js";
import { havaNoqtesi } from "./services/saheYeri.js";

// Ağır ekranlar və panellər yalnız istifadəçi onları açanda yüklənir.
// Fermer ilk açılışda xəritə, qrafik, kredit və çat kodunu daşımır.
const FieldDraw = lazy(() =>
  import("./features/field/FieldDraw.jsx").then((m) => ({ default: m.FieldDraw })),
);
const LoanSheet = lazy(() =>
  import("./features/loan/LoanSheet.jsx").then((m) => ({ default: m.LoanSheet })),
);
const AgronomChat = lazy(() =>
  import("./features/agronom/AgronomChat.jsx").then((m) => ({ default: m.AgronomChat })),
);
const SaheScreen = lazy(() =>
  import("./screens/SaheScreen.jsx").then((m) => ({ default: m.SaheScreen })),
);
const AdvisorScreen = lazy(() =>
  import("./screens/AdvisorScreen.jsx").then((m) => ({ default: m.AdvisorScreen })),
);
const MoneyScreen = lazy(() =>
  import("./screens/MoneyScreen.jsx").then((m) => ({ default: m.MoneyScreen })),
);
const MarketScreen = lazy(() =>
  import("./screens/MarketScreen.jsx").then((m) => ({ default: m.MarketScreen })),
);
const CarbonScreen = lazy(() =>
  import("./screens/CarbonScreen.jsx").then((m) => ({ default: m.CarbonScreen })),
);

const SCREENS = {
  home: HomeScreen,
  sahe: SaheScreen,
  advisor: AdvisorScreen,
  money: MoneyScreen,
  market: MarketScreen,
  carbon: CarbonScreen,
};

function ScreenFallback() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-48 items-center justify-center" role="status" aria-label={t("common.loading")}>
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-transparent border-t-current" style={{ color: C.field }} />
    </div>
  );
}

export default function App() {
  const { path, navigate } = useRouter();
  const { state, actions } = useStore();
  const [loanOpen, setLoanOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSual, setChatSual] = useState(null);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [yeniSahe, setYeniSahe] = useState(false);
  // "Necə işləyir?" — hal A-nın üç addımlıq izahı (ümumi çat DEYİL)
  const [neceOpen, setNeceOpen] = useState(false);
  // Bitki seçimi — Maliyyədəki şərt zəncirinin ikinci addımı
  const [bitkiOpen, setBitkiOpen] = useState(false);
  // Bildirişlər paneli: zəng ekran dəyişmir, üstdə açılır
  const [siqnalOpen, setSiqnalOpen] = useState(false);
  // Yer seçimi paneli sonradan rayonu dəyişmək üçündür; ilk açılışda
  // qeydiyyat axını bu işi görür
  const [locationOpen, setLocationOpen] = useState(false);
  // Sahə çəkməyə rayon seçmədən gələn istifadəçi yer seçəndən sonra
  // avtomatik xəritəyə keçir — eyni CTA-ya ikinci dəfə toxunmur.
  const [fieldAfterLocation, setFieldAfterLocation] = useState(false);
  const [hesabOpen, setHesabOpen] = useState(false);
  const scrollRef = useRef(null);

  const route = routeForPath(path);
  const Screen = SCREENS[route.id];

  // Keçid istiqaməti tab sırasından: sağdakı taba keçəndə ekran sağdan
  // gəlir (bax: index.css, ekran-gel). İlk açılışda istiqamət yoxdur.
  // Ref YOX, render-zamanı vəziyyət uyğunlaşdırması (React-ın öz nümunəsi):
  // istiqamət animasiya boyu SABİT qalmalıdır — effektlə yazsaq CSS
  // dəyişəni animasiyanın ortasında sıfırlanardı.
  const tabSirasi = ROUTES.findIndex((r) => r.id === route.id);
  const [kecid, setKecid] = useState({ idx: tabSirasi, dir: 0 });
  if (kecid.idx !== tabSirasi) {
    setKecid({ idx: tabSirasi, dir: Math.sign(tabSirasi - kecid.idx) });
  }
  const istiqamet = kecid.idx === tabSirasi ? kecid.dir : Math.sign(tabSirasi - kecid.idx);

  // Peyk ölçməsi və siqnallar BURADA qurulur, ekranlarda yox: başlıqdakı zəng,
  // əsas ekran və məsləhət ekranı eyni siyahını göstərməlidir və hər biri
  // ayrıca Copernicus sorğusu göndərməməlidir (emal kvotası pulludur).
  const peyk = useNdvi(state.sahe);
  const qonsu = useQonsu(state.sahe, peyk.xulase);
  // Radar YALNIZ optik ölçmə buludun altında qalanda çağırılır (bax: useRadar)
  const radar = useRadar(state.sahe, peyk);
  // Məhsuldarlıq indeksi: çoxillik tarixçə + cari mövsüm
  const indeks = useIndeks(state.sahe, peyk.xulase, qonsu.muqayise);
  // Hesab sinxronu: sessiyanı yoxlayır, sahəni və indeksi hesaba yazır
  useHesab(indeks);
  // SERVER kredit vəziyyəti — bir yerdə gətirilir, ekranlara prop kimi gedir
  // (peyk/radar/indeks ilə eyni naxış). Giriş dəyişəndə yenidən yüklənir.
  const kreditHali = useKreditVeziyyeti(state.hesab.telefon);
  const noqte = havaNoqtesi({ location: state.location, sahe: state.sahe });
  const butunSiqnallar = useSiqnallar({
    lat: noqte.lat,
    lon: noqte.lon,
    xulase: peyk.xulase,
    muqayise: qonsu.muqayise,
    radar: radar.xulase,
  });
  // Sahə yoxdursa siyahıda YALNIZ hava xəbərdarlıqları qala bilər: peyk/radar
  // mənbəli siqnal sahəsiz mövcud ola bilməz, bu süzgəc isə niyyəti kodda
  // sabitləyir (bax: features/signals/siqnalEhate.js)
  const siqnallar = ehateliSiqnallar(
    acigSiqnallar(butunSiqnallar, state.bagliSiqnallar),
    Boolean(state.sahe),
  );
  const tovsiyeler = useTovsiyeler({
    sahe: state.sahe,
    bitki: state.chat.crop,
    lat: noqte.lat,
    lon: noqte.lon,
    ay: new Date().getMonth() + 1,
  });

  // Sabit identifikator: alt komponentlərdəki effektlər hər render-də
  // yenidən qurulmasın
  const closeChat = useCallback(() => setChatOpen(false), []);
  const closeSiqnal = useCallback(() => setSiqnalOpen(false), []);
  const closeField = useCallback(() => setFieldOpen(false), []);
  const closeNece = useCallback(() => setNeceOpen(false), []);
  const closeBitki = useCallback(() => setBitkiOpen(false), []);
  const closeLoan = useCallback(() => setLoanOpen(false), []);
  const closeLocation = useCallback(() => setLocationOpen(false), []);
  const closeHesab = useCallback(() => setHesabOpen(false), []);
  const openField = useCallback(() => {
    if (!state.location && !state.sahe) {
      setFieldAfterLocation(true);
      setLocationOpen(true);
      return;
    }
    setFieldOpen(true);
  }, [state.location, state.sahe]);

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
          <Onboarding
            onDrawField={() => setFieldOpen(true)}
            onOpenHesab={() => setHesabOpen(true)}
          />
        ) : (
          <>
            <AppHeader
              siqnalSayi={siqnallar.length}
              panelAcilib={siqnalOpen}
              onZeng={() => setSiqnalOpen(true)}
            />

            <main ref={scrollRef} className="flex-1 overflow-y-auto">
              {/* key ekran dəyişəndə remount edir — giriş animasiyası hər dəfə oynayır */}
              <div key={route.id} className="ekran-giris" style={{ "--dir": istiqamet }}>
                <Suspense fallback={<ScreenFallback />}>
                  <Screen
                    peyk={peyk}
                    qonsu={qonsu}
                    radar={radar}
                    indeksHali={indeks}
                    kreditHali={kreditHali}
                    siqnallar={siqnallar}
                    tovsiyeler={tovsiyeler}
                    onOpenLoan={() => setLoanOpen(true)}
                    onPickLocation={() => setLocationOpen(true)}
                    onOpenChat={(sual) => {
                      // onClick-dən çağırılanda arqument hadisə obyektidir — sual deyil
                      setChatSual(typeof sual === "string" ? sual : null);
                      setChatOpen(true);
                    }}
                    onDrawField={openField}
                    onOpenHesab={() => setHesabOpen(true)}
                    onOpenNece={() => setNeceOpen(true)}
                    onOpenBitki={() => setBitkiOpen(true)}
                    yeniSahe={yeniSahe}
                    onHazirliqBagla={() => setYeniSahe(false)}
                  />
                </Suspense>
              </div>
            </main>

            <Toast />
            <BottomNav />

            {loanOpen && (
              <Suspense fallback={null}>
                <LoanSheet
                  onClose={closeLoan}
                  indeksHali={indeks}
                  kreditHali={kreditHali}
                  onOpenHesab={() => setHesabOpen(true)}
                />
              </Suspense>
            )}

            <SiqnalPaneli
              acilib={siqnalOpen}
              siqnallar={siqnallar}
              saheVar={Boolean(state.sahe)}
              yerVar={Boolean(state.location || state.sahe)}
              rayon={state.location?.name ?? null}
              onBagla={closeSiqnal}
              onSiqnaliBagla={actions.siqnaliBagla}
              onHereket={() => setChatOpen(true)}
              onHamisi={() => {
                setSiqnalOpen(false);
                navigate(pathFor("advisor"));
              }}
              onYerSec={() => {
                setSiqnalOpen(false);
                setLocationOpen(true);
              }}
            />

            {chatOpen && (
              <Suspense fallback={null}>
                <AgronomChat peyk={peyk} qonsu={qonsu} ilkSual={chatSual} onClose={closeChat} />
              </Suspense>
            )}

            {/* Hal A izahı: üç addım + elə oradan sahə çəkməyə keçid */}
            <NeceIsleyir
              acilib={neceOpen}
              onBagla={closeNece}
              onDrawField={openField}
            />

            <BitkiSheet acilib={bitkiOpen} onBagla={closeBitki} />

            {locationOpen && (
              <LocationSheet
                current={state.location}
                onSelect={(location) => {
                  actions.setLocation(location);
                  if (fieldAfterLocation) {
                    setFieldAfterLocation(false);
                    setFieldOpen(true);
                  }
                }}
                onClose={() => {
                  setFieldAfterLocation(false);
                  closeLocation();
                }}
              />
            )}
          </>
        )}

        {/* GİRİŞ VƏRƏQİ də şərtdən kənardadır: xoş gəldiniz ekranındakı
            "Hesaba daxil ol" mövcud OTP axınını açır (auth yenidən
            yazılmır), sahəsi olan istifadəçi isə girişdən sonra axını
            keçir (bax: aşağıdakı serverProfiliUstundur effekti). */}
        <HesabSheet acilib={hesabOpen} onBagla={closeHesab} />

        {/* SAHƏ ÇƏKMƏ ONBOARDING-İN ÜÇÜNCÜ ADDIMIDIR, ona görə şərtin
            ikinci qolundan çıxarılıb: axının ən çətin işi elə buradadır və
            fermer onu "quraşdırma bitdi" hissindən əvvəl görməlidir. */}
        {fieldOpen && (
          <Suspense fallback={null}>
            <FieldDraw
              location={state.location}
              existing={state.sahe}
              onSave={(sahe, xeberdarlıqAcari) => {
                actions.setSahe(sahe);
                if (xeberdarlıqAcari) actions.showToast(xeberdarlıqAcari);
                setFieldOpen(false);
                if (!state.onboarded) {
                  actions.finishOnboarding();
                } else {
                  setYeniSahe(true);
                  navigate(pathFor("sahe"));
                }
              }}
              onClose={closeField}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
