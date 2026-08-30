import { Icon } from "../components/Icon.jsx";
import { Aqronom } from "../components/Aqronom.jsx";
import { WeatherStrip } from "../features/weather/WeatherStrip.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { useRouter } from "../lib/router.jsx";
import { pathFor } from "../routes.js";
import { formatNumber } from "../lib/format.js";
import { FARM } from "../services/farm.js";
import { kreditImkani } from "../features/loan/useKredit.js";
import { DEFAULT_LOCATION } from "../services/location.js";
import { havaNoqtesi } from "../services/saheYeri.js";
import { necheGunEvvel, ortukFaizi } from "../services/ndvi.js";
import { Sparkline } from "../components/Sparkline.jsx";
import { IndeksKarti } from "../features/score/IndeksKarti.jsx";
import { esasHereket } from "../features/pano/esasHereket.js";
import { EsasHereketKarti } from "../features/pano/EsasHereketKarti.jsx";
import { KreditMiniKarti } from "../features/pano/MaliyyeKartlari.jsx";
import { BosSahe } from "../features/pano/BosSahe.jsx";

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

/**
 * ANA SƏHİFƏ — qərar səthidir, modul kataloqu deyil. Hər açılış üç suala
 * cavab verir: Sahəm necədir? Pul vəziyyətim necədir? İndi nə etməliyəm?
 *
 * "Nə etməliyəm" kartının məzmununu determinist həlledici seçir
 * (bax: features/pano/esasHereket.js) — kartlar müstəqildir, prioritet
 * təkdir. Sahə çəkilməmiş fermer NƏ bal, NƏ KPI, NƏ kredit görür (hal A):
 * uydurma rəqəm etibarı yalnız bir dəfə satır.
 */
export function HomeScreen({
  peyk = { hal: "yoxdur", seriya: [], xulase: null },
  radar = { hal: "yoxdur", xulase: null },
  indeksHali = { hal: "yoxdur", indeks: null, movsumler: [] },
  kreditHali = null,
  siqnallar = [],
  onOpenLoan,
  onPickLocation,
  onDrawField,
  onOpenChat,
  onOpenHesab,
}) {
  const { t, money, lang } = useI18n();
  const { state } = useStore();
  const { navigate } = useRouter();

  const location = state.location ?? DEFAULT_LOCATION;
  const noqte = havaNoqtesi({ location, sahe: state.sahe });

  const olculen = peyk.xulase;
  const olcmeVar = Number.isFinite(olculen?.ndvi);
  // Sahə çəkilməyibsə NÜMUNƏ RƏQƏMİ YOXDUR (hal A: uydurma KPI qadağandır)
  const faiz = olcmeVar ? ortukFaizi(olculen.ndvi) : null;
  const gunEvvel = olculen ? necheGunEvvel(olculen.tarix) : null;

  const bas = siqnallar.find((s) => s.ciddilik !== "melumat");
  const aqroHali = !bas && indeksHali.indeks?.bant === "yuksek" ? "sevincli" : "sakit";

  const aktivKredit = kreditHali?.kredit?.hal === "active" ? kreditHali.kredit : null;
  // Server cavabı gəlməyibsə (yüklənir/xəta) "açıq iş yoxdur" DEMƏK OLMAZ:
  // boşluq cavab deyil. Aktiv borcalana xəta anında yeni kredit təklif
  // etməmək üçün CTA yalnız cavab gələndə açılır.
  const kreditCavabi = ["hazir", "qurulmayib", "girisYox"].includes(kreditHali?.hal ?? "");
  const acıqIs =
    !kreditCavabi ||
    aktivKredit ||
    ["submitted", "reviewing", "approved", "offer_issued"].includes(
      kreditHali?.muraciet?.hal ?? "",
    );

  // Kredit imkanı (klient təxmini, qeydi ilə) — yalnız sahə çəkiləndə
  const kredit = kreditImkani({
    sahe: state.sahe,
    bitki: state.chat.crop,
    indeks: indeksHali.indeks,
  });

  // "Bu gün nə etməli?" — determinist prioritet zənciri
  const hereket = esasHereket({
    kredit: kreditHali?.kredit ?? null,
    teklif: kreditHali?.teklif ?? null,
    muraciet: kreditHali?.muraciet ?? null,
    serverHal: kreditHali?.hal ?? "yuklenir",
    siqnallar,
    sahe: state.sahe,
  });

  const hereketIcra = (h) => {
    if (h.hereket === "odenis" || h.hereket === "teklif") onOpenLoan?.();
    else if (h.hereket === "sahe") navigate(pathFor("sahe"));
    else if (h.hereket === "giris") onOpenHesab?.();
    else if (h.hereket === "saheCek") onDrawField?.();
    // Xəta halında yeganə mənalı hərəkət — məlumatı yenidən istəmək
    else if (h.hereket === "yenile") kreditHali?.yenile?.();
    // Sahə ekranında görünməyən siqnal (hava) — tam siyahı Kömək ekranındadır
    else if (h.hereket === "siqnalSiyahi") navigate(pathFor("advisor"));
    else navigate(pathFor("advisor"));
  };

  return (
    <div className="px-4 pb-4">
      <div
        className="mt-3 rounded-3xl px-4 pt-4 pb-3"
        style={{ background: `linear-gradient(160deg, ${C.pine} 0%, ${C.pineDeep} 70%)` }}
      >
        <div className="flex items-center gap-2.5">
          {/* AQRO: aqronoma birbaşa yol + üzü sahənin vəziyyətini daşıyır */}
          <button
            type="button"
            onClick={onOpenChat}
            aria-label={t("chat.open")}
            className="shrink-0 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.10)", padding: 3 }}
          >
            <Aqronom hal={aqroHali} bitki={state.chat.crop} olcu={40} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
              {state.sahe
                ? t("home.greeting", { name: FARM.farmerName })
                : t("pano.salam", { name: FARM.farmerName })}
            </p>
            <p className="text-sm font-bold text-white" style={{ fontFamily: font.display }}>
              {state.sahe
                ? t("home.farmLine", {
                    farm: { key: FARM.farmNameKey },
                    ha: { number: state.sahe.hektar },
                  })
                : t("pano.qurulus")}
            </p>
          </div>
        </div>

        {/* Sahə çəkilməyibsə dəvət; çəkilibsə Sahələr ekranına keçid */}
        <button
          type="button"
          onClick={state.sahe ? () => navigate(pathFor("sahe")) : onDrawField}
          className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", minHeight: 44 }}
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-white">
            <Icon name="MapPin" size={13} color={C.gold} />
            {state.sahe
              ? t("home.fieldDrawn", { hektar: { number: state.sahe.hektar } })
              : t("home.fieldCta")}
          </span>
          <Icon name="ChevronRight" size={14} color="rgba(255,255,255,0.6)" />
        </button>

        {/* Hesab: sahə cihazda yox, hesabda qalsın */}
        <button
          type="button"
          onClick={onOpenHesab}
          className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", minHeight: 44 }}
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-white">
            <Icon
              name={state.hesab.telefon ? "UserCheck" : "ShieldCheck"}
              size={13}
              color={state.hesab.telefon ? "#7FD6A4" : C.gold}
            />
            {state.hesab.telefon ?? t("hesab.cta")}
          </span>
          <Icon name="ChevronRight" size={14} color="rgba(255,255,255,0.6)" />
        </button>

        {/* Sahə varsa: indeks kartı (qapı ilə) + göstəricilər. Yoxdursa HEÇ NƏ —
            hal A-da bal, KPI, kredit rəqəmi göstərilmir (uydurma metrika yox). */}
        {state.sahe && (
          <>
            <IndeksKarti indeksHali={indeksHali} onSaheyeBax={() => navigate(pathFor("sahe"))} />

            <div className="mt-2 grid grid-cols-3 gap-2">
              <StatTile label={t("home.cropHealth")}>
                {faiz == null ? "—" : `${formatNumber(faiz, lang)}%`}{" "}
                {olculen && olculen.istiqamet !== "sabit" && (
                  <span style={{ color: olculen.istiqamet === "artir" ? "#7FD6A4" : "#F0A0A0" }}>
                    {olculen.istiqamet === "artir" ? "▲" : "▼"}
                  </span>
                )}
              </StatTile>
              {/* Aktiv borclu üçün "imkan" təxmini yanıldıcıdır (yeni müraciət
                  onsuz da bağlıdır) — real qalıq göstərilir */}
              {aktivKredit ? (
                <StatTile label={t("maliyye.aktiv")}>
                  <span style={{ color: C.gold }}>{money(aktivKredit.qaliqBorc)}</span>
                </StatTile>
              ) : (
                <StatTile label={t("home.kreditImkani")}>
                  <span style={{ color: C.gold }}>
                    {kredit.maxKredit != null ? money(kredit.maxKredit) : "—"}
                  </span>
                </StatTile>
              )}
              <StatTile label={t("pano.sonYenilenme")}>
                {gunEvvel == null
                  ? "—"
                  : gunEvvel === 0
                    ? t("pano.buGun")
                    : t("pano.gunEvvel", { gun: gunEvvel })}
              </StatTile>
            </div>
            <p
              className="mt-1.5 text-center"
              style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, lineHeight: 1.4 }}
            >
              {aktivKredit
                ? t("home.kreditQeydAktiv")
                : t(kredit.maxKredit != null ? "home.kreditQeyd" : "home.kreditQeydYox")}
            </p>

            {/* Peyk ölçməsinin vəziyyəti — hər hal öz cümləsini deyir */}
            {peyk.hal !== "yoxdur" && (
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

            {/* Radar: optik ölçmə buludun altında qalanda ikinci peyk danışır */}
            {radar.hal !== "yoxdur" && (
              <div
                className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2"
                style={{
                  backgroundColor: radar.xulase?.suVar
                    ? "rgba(74,144,226,0.20)"
                    : "rgba(255,255,255,0.08)",
                }}
                aria-live="polite"
              >
                <Icon
                  name={radar.hal === "yuklenir" ? "LoaderCircle" : "Radar"}
                  size={13}
                  color={radar.hal === "hazir" ? "#9AC8F0" : "rgba(255,255,255,0.6)"}
                />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.78)" }}>
                    {radar.hal === "yuklenir" && t("radar.loading")}
                    {radar.hal === "olcmeYox" && t("radar.noReading")}
                    {radar.hal === "qurulmayib" && t("ndvi.notConfigured")}
                    {radar.hal === "xeta" && t("radar.error")}
                    {radar.hal === "hazir" &&
                      (radar.xulase?.suVar
                        ? t("radar.suVar", { faiz: Math.round(radar.xulase.suPayi * 100) })
                        : t(`radar.${radar.xulase?.istiqamet ?? "sabit"}`))}
                  </p>
                  {radar.hal === "hazir" && (
                    <p className="mt-0.5" style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>
                      {t("radar.measured", { gun: necheGunEvvel(radar.xulase.tarix) ?? 0 })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Su vəziyyəti: NDVI "zəifdir" deyir, rütubət səbəbi ayırır */}
            {peyk.hal === "hazir" && olculen?.suSeviyyesi && (
              <div
                className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  backgroundColor:
                    olculen.suSeviyyesi === "az"
                      ? "rgba(233,181,74,0.16)"
                      : "rgba(255,255,255,0.08)",
                }}
              >
                <Icon
                  name="Droplets"
                  size={13}
                  color={olculen.suSeviyyesi === "az" ? C.gold : "#7FD6A4"}
                />
                <span className="flex-1 text-xs" style={{ color: "rgba(255,255,255,0.78)" }}>
                  {t(`ndvi.water.${olculen.suSeviyyesi}`)}
                </span>
              </div>
            )}

            {/* Kredit CTA yalnız açıq iş YOXDURSA: aktiv borcalana yeni kredit
                sırımaq olmaz — mövcud borc yuxarıdakı kartda onsuz da görünür */}
            {!acıqIs && (
              <>
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
              </>
            )}
          </>
        )}
      </div>

      {/* Hal A: yeni fermer — BİR aydın dəvət, ikinci "nə etməli" kartı yox
          (dəvətin özü elə bir nömrəli işdir; təkrar CTA diqqəti bölür) */}
      {!state.sahe && <BosSahe onDrawField={onDrawField} onNece={onOpenChat} />}

      {/* "Bu gün nə etməli?" — bir nömrəli iş */}
      {state.sahe && <EsasHereketKarti hereket={hereket} onHereket={hereketIcra} />}

      {/* Maliyyə xülasəsi: aktiv kredit varsa qalıq + növbəti ödəniş */}
      <KreditMiniKarti kredit={aktivKredit} onBax={() => navigate(pathFor("money"))} />

      {/* key yeri dəyişdikdə komponenti sıfırdan qurur — yeni proqnoz yüklənir */}
      <WeatherStrip
        key={`${noqte.lat},${noqte.lon}`}
        lat={noqte.lat}
        lon={noqte.lon}
        locationName={location.name}
        onPickLocation={onPickLocation}
        onDrawField={onDrawField}
        deqiq={noqte.deqiq}
      />
    </div>
  );
}
