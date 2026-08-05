import { Chip } from "../components/Chip.jsx";
import { FarmScoreGauge } from "../components/FarmScoreGauge.jsx";
import { Icon } from "../components/Icon.jsx";
import { WeatherStrip } from "../features/weather/WeatherStrip.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { useRouter } from "../lib/router.jsx";
import { formatNumber } from "../lib/format.js";
import { pathFor } from "../routes.js";
import { FARM } from "../services/farm.js";
import { DEFAULT_LOCATION } from "../services/location.js";
import { havaNoqtesi } from "../services/saheYeri.js";
import { necheGunEvvel, ortukFaizi } from "../services/ndvi.js";
import { Sparkline } from "../components/Sparkline.jsx";
import { SaheXeritesi } from "../features/ndvi/SaheXeritesi.jsx";
import { QonsuMuqayisesi } from "../features/ndvi/QonsuMuqayisesi.jsx";
import { HesabatPaylas } from "../features/share/HesabatPaylas.jsx";
import { SiqnalKarti } from "../features/signals/SiqnalKarti.jsx";

function StatTile({ label, children }) {
  return (
    <div className="rounded-xl px-2 py-2" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
      <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
        {label}
      </p>
      <p className="text-sm font-bold whitespace-nowrap text-white">{children}</p>
    </div>
  );
}

export function HomeScreen({
  peyk = { hal: "yoxdur", seriya: [], xulase: null },
  qonsu = { hal: "yoxdur", muqayise: null },
  siqnallar = [],
  onOpenLoan,
  onPickLocation,
  onDrawField,
  onOpenChat,
}) {
  const { t, money, lang } = useI18n();
  const { state, actions } = useStore();
  const { navigate } = useRouter();

  // Yer seçilməyibsə default rayonun proqnozu göstərilir
  const location = state.location ?? DEFAULT_LOCATION;
  // Fermer öz sahəsini çəkibsə həqiqi hektar göstərilir, yoxsa nümunə
  const hectares = state.sahe?.hektar ?? FARM.hectares;
  // Proqnoz sahənin öz koordinatı üçün alınır — çatla eyni nöqtə olsun deyə
  const noqte = havaNoqtesi({ location, sahe: state.sahe });

  // Peyk ölçməsi App-də qurulur (bax: App.jsx) — burada yalnız göstərilir
  const olculen = peyk.xulase;
  // "NDVI 0,68" texniki termindir; fermer "68%" oxuyur. Çevirmə eyni ölçmədir,
  // onluqsuz — bax: services/ndvi.js
  const faiz = ortukFaizi(olculen?.ndvi ?? FARM.ndvi);
  const gunEvvel = olculen ? necheGunEvvel(olculen.tarix) : null;

  // Yalnız ən vacib siqnal əsas ekrana çıxır. Fermer telefonu açanda bir iş
  // görməlidir, siyahı oxumamalıdır — qalanı məsləhət ekranındadır.
  const bas = siqnallar.find((s) => s.ciddilik !== "melumat");
  const qalan = siqnallar.length - (bas ? 1 : 0);

  return (
    <div className="px-4 pb-4">
      {bas && (
        <div className="mt-3" aria-live="polite">
          <SiqnalKarti
            siqnal={bas}
            onBagla={actions.siqnaliBagla}
            onHereket={onOpenChat}
            style={{ "--i": 1 }}
          />
          {qalan > 0 && (
            <button
              type="button"
              onClick={() => navigate(pathFor("advisor"))}
              className="mt-1.5 w-full py-1 text-xs font-semibold"
              style={{ color: C.muted }}
            >
              {t("siqnal.qalan", { count: qalan })}
            </button>
          )}
        </div>
      )}

      <div
        className="mt-3 rounded-3xl px-4 pt-4 pb-3"
        style={{ background: `linear-gradient(160deg, ${C.pine} 0%, ${C.pineDeep} 70%)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
              {t("home.greeting", { name: FARM.farmerName })}
            </p>
            <p className="text-sm font-bold text-white" style={{ fontFamily: font.display }}>
              {t("home.farmLine", {
                farm: { key: FARM.farmNameKey },
                ha: { number: hectares },
              })}
            </p>
          </div>
          <Chip
            icon="Satellite"
            label={t("home.satelliteChip")}
            color="#BFE8CF"
            bg="rgba(96,190,134,0.18)"
          />
        </div>

        {/* Sahə çəkilməyibsə açıq dəvət; çəkilibsə redaktə keçidi */}
        <button
          type="button"
          onClick={onDrawField}
          className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-white">
            <Icon name="MapPin" size={13} color={C.gold} />
            {state.sahe
              ? t("home.fieldDrawn", { hektar: { number: state.sahe.hektar } })
              : t("home.fieldCta")}
          </span>
          <Icon name="ChevronRight" size={14} color="rgba(255,255,255,0.6)" />
        </button>

        <div className="-mb-1 flex justify-center">
          {/* Qövs ÖLÇÜLMÜŞ NDVI-dən çəkilir. Əvvəl nümunə 0.72 idi və yanındakı
              xana həqiqi 0,33 göstərəndə qövs dolu görünürdü — eyni kartda iki
              fərqli NDVI. Ölçmə yoxdursa qövs ümumiyyətlə çəkilmir. */}
          <FarmScoreGauge
            score={FARM.farmScore}
            ndvi={olculen?.ndvi ?? 0}
            label={t("home.farmscore")}
          />
        </div>

        {/* FarmScore və kredit limiti hələ hesablanmır. Fermer bunları peykdən
            çıxarılmış təklif kimi oxuya bilər — açıq deyilməlidir. */}
        <p
          className="mt-1 text-center"
          style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, lineHeight: 1.4 }}
        >
          {t("home.scoreNote")}
        </p>

        <div className="mt-1 grid grid-cols-3 gap-2">
          <StatTile label={t("home.cropHealth")}>
            {formatNumber(faiz, lang)}%{" "}
            {olculen && olculen.istiqamet !== "sabit" && (
              <span style={{ color: olculen.istiqamet === "artir" ? "#7FD6A4" : "#F0A0A0" }}>
                {olculen.istiqamet === "artir" ? "▲" : "▼"}
              </span>
            )}
          </StatTile>
          <StatTile label={t("home.creditLimit")}>
            <span style={{ color: C.gold }}>{money(FARM.creditLimit)}</span>
          </StatTile>
          <StatTile label={t("home.wallet")}>{money(state.wallet)}</StatTile>
        </div>

        {/* Peyk ölçməsinin vəziyyəti. Hər hal ayrı cümlə deyir: peyk məlumatı
            havadan fərqli olaraq həmişə mövcud olmur və "yoxdur" ilə "xəta"
            fermer üçün tamamilə fərqli mənalardır. */}
        {state.sahe && peyk.hal !== "yoxdur" && (
          <div
            className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            aria-live="polite"
          >
            <Icon
              name={peyk.hal === "yuklenir" ? "LoaderCircle" : "Satellite"}
              size={13}
              color={peyk.hal === "hazir" ? "#7FD6A4" : "rgba(255,255,255,0.6)"}
            />
            <span className="flex-1 text-xs" style={{ color: "rgba(255,255,255,0.72)" }}>
              {peyk.hal === "yuklenir" && t("ndvi.loading")}
              {peyk.hal === "hazir" &&
                (peyk.kohne
                  ? t("ndvi.cached", { gun: gunEvvel ?? 0 })
                  : t("ndvi.measured", { gun: gunEvvel ?? 0, say: olculen.olcmeSayi }))}
              {peyk.hal === "olcmeYox" && t("ndvi.noReading")}
              {peyk.hal === "qurulmayib" && t("ndvi.notConfigured")}
              {peyk.hal === "xeta" && t("ndvi.error")}
            </span>
            {peyk.hal === "hazir" && peyk.seriya.length > 1 && (
              <Sparkline
                points={peyk.seriya.map((n) => n.ndvi)}
                up={olculen.istiqamet !== "azalir"}
                width={56}
                height={20}
              />
            )}
          </div>
        )}

        {/* Su vəziyyəti ayrıca göstərilir: NDVI "zəifdir" deyir, rütubət isə
            səbəbin su olub-olmadığını — suvarma qərarı buna bağlıdır. */}
        {peyk.hal === "hazir" && olculen?.suSeviyyesi && (
          <div
            className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              backgroundColor:
                olculen.suSeviyyesi === "az" ? "rgba(233,181,74,0.16)" : "rgba(255,255,255,0.08)",
            }}
          >
            <Icon
              name="Droplets"
              size={13}
              color={olculen.suSeviyyesi === "az" ? C.gold : "#7FD6A4"}
            />
            {/* Xam NDMI rəqəmi ("NDMI 0,30") burada idi və heç nəyə xidmət
                etmirdi: fermer onu nə ilə müqayisə edəcəyini bilmir, cümlə
                isə qərarı onsuz da deyir. Nəmlik faizə çevrilmir — NDMI quru
                torpaqda mənfi olur, "0%" quru ilə çox quru arasındakı fərqi
                itirər. Rəng xəritəsi bunu ayırd edir. */}
            <span className="flex-1 text-xs" style={{ color: "rgba(255,255,255,0.78)" }}>
              {t(`ndvi.water.${olculen.suSeviyyesi}`)}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenLoan}
          className="mt-3 w-full rounded-xl py-3 text-sm font-bold"
          style={{ backgroundColor: C.gold, color: C.pine, fontFamily: font.display }}
        >
          {t("home.loanCta")}
        </button>
        <p className="mt-2 text-center text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
          {t("home.loanNote")}
        </p>
      </div>

      {/* Sahə çəkilibsə: problemin HARADA olduğunu göstərən xəritə */}
      {state.sahe && <SaheXeritesi sahe={state.sahe} />}

      {/* "NDVI 0,68" mücərrəddir; "qonşulardan yaxşıdır" isə dərhal aydındır */}
      <QonsuMuqayisesi qonsu={qonsu} ndvi={olculen?.ndvi} illik={peyk.illik} />

      {/* Ölçmə WhatsApp-a çıxsın deyə: aqronomla söhbət orada gedir */}
      <HesabatPaylas
        hektar={state.sahe?.hektar}
        bitkiKey={state.chat.crop ? `kbcrop.${state.chat.crop}` : null}
        xulase={olculen}
        muqayise={qonsu.muqayise}
        siqnal={bas}
      />

      {/* key yeri dəyişdikdə komponenti sıfırdan qurur — yeni proqnoz yüklənir */}
      <WeatherStrip
        key={`${noqte.lat},${noqte.lon}`}
        lat={noqte.lat}
        lon={noqte.lon}
        locationName={location.name}
        onPickLocation={onPickLocation}
        meslehetGoster={siqnallar.length === 0}
      />
    </div>
  );
}
