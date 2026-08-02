import { Card } from "../components/Card.jsx";
import { Chip } from "../components/Chip.jsx";
import { FarmScoreGauge } from "../components/FarmScoreGauge.jsx";
import { Icon } from "../components/Icon.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { WeatherStrip } from "../features/weather/WeatherStrip.jsx";
import { C, font, tone as TONES } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { useRouter } from "../lib/router.jsx";
import { formatNumber } from "../lib/format.js";
import { pathFor } from "../routes.js";
import { withCompletion } from "../services/advisor.js";
import { FARM } from "../services/farm.js";
import { DEFAULT_LOCATION } from "../services/location.js";
import { havaNoqtesi } from "../services/saheYeri.js";
import { necheGunEvvel } from "../services/ndvi.js";
import { useNdvi } from "../features/ndvi/useNdvi.js";
import { Sparkline } from "../components/Sparkline.jsx";
import { SaheXeritesi } from "../features/ndvi/SaheXeritesi.jsx";

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

export function HomeScreen({ onOpenLoan, onPickLocation, onDrawField }) {
  const { t, money, lang } = useI18n();
  const { state } = useStore();
  const { navigate } = useRouter();

  // Yer seçilməyibsə default rayonun proqnozu göstərilir
  const location = state.location ?? DEFAULT_LOCATION;
  // Fermer öz sahəsini çəkibsə həqiqi hektar göstərilir, yoxsa nümunə
  const hectares = state.sahe?.hektar ?? FARM.hectares;
  // Proqnoz sahənin öz koordinatı üçün alınır — çatla eyni nöqtə olsun deyə
  const noqte = havaNoqtesi({ location, sahe: state.sahe });

  const pending = withCompletion(state.completedRecs)
    .filter((rec) => !rec.done)
    .slice(0, 2);

  // Peyk ölçməsi sahədən asılıdır; sahə yoxdursa hook "yoxdur" qaytarır
  const peyk = useNdvi(state.sahe);
  const olculen = peyk.xulase;
  const ndvi = formatNumber(olculen?.ndvi ?? FARM.ndvi, lang, {
    minimumFractionDigits: 2,
    // Üç onluq ölçmədə olmayan dəqiqlik iddia edir — NDVI iki onluqla oxunur
    maximumFractionDigits: 2,
  });
  const gunEvvel = olculen ? necheGunEvvel(olculen.tarix) : null;

  return (
    <div className="px-4 pb-4">
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
          <FarmScoreGauge score={FARM.farmScore} ndvi={FARM.ndvi} label={t("home.farmscore")} />
        </div>

        <div className="mt-1 grid grid-cols-3 gap-2">
          <StatTile label={t("home.cropHealth")}>
            NDVI {ndvi}{" "}
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

      {/* key yeri dəyişdikdə komponenti sıfırdan qurur — yeni proqnoz yüklənir */}
      <WeatherStrip
        key={`${noqte.lat},${noqte.lon}`}
        lat={noqte.lat}
        lon={noqte.lon}
        locationName={location.name}
        onPickLocation={onPickLocation}
      />

      <SectionTitle action={t("home.openAdvisor")} onAction={() => navigate(pathFor("advisor"))}>
        {t("home.todaySteps")}
      </SectionTitle>

      {pending.length === 0 ? (
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ backgroundColor: C.fieldSoft }}>
              <Icon name="Check" size={16} color={C.field} />
            </div>
            <p className="text-sm font-semibold" style={{ color: C.ink }}>
              {t("home.allDone")}
            </p>
          </div>
        </Card>
      ) : (
        pending.map((rec) => {
          const palette = TONES[rec.tone];
          return (
            <Card
              key={rec.id}
              style={{ marginBottom: 8 }}
              onClick={() => navigate(pathFor("advisor"))}
              ariaLabel={t(rec.titleKey)}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl p-2" style={{ backgroundColor: palette.bg }}>
                  <Icon name={rec.icon} size={16} color={palette.color} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: C.ink }}>
                    {t(rec.titleKey)}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
                    {t(rec.sourceKey)}
                  </p>
                </div>
                <Icon name="ChevronRight" size={16} color={C.muted} />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
