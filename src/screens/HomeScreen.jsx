import { Icon } from "../components/Icon.jsx";
import { Aqronom } from "../components/Aqronom.jsx";
import { WeatherStrip } from "../features/weather/WeatherStrip.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { formatNumber } from "../lib/format.js";
import { FARM } from "../services/farm.js";
import { DEFAULT_LOCATION } from "../services/location.js";
import { havaNoqtesi } from "../services/saheYeri.js";
import { necheGunEvvel, ortukFaizi } from "../services/ndvi.js";
import { Sparkline } from "../components/Sparkline.jsx";
import { SaheXeritesi } from "../features/ndvi/SaheXeritesi.jsx";
import { QonsuMuqayisesi } from "../features/ndvi/QonsuMuqayisesi.jsx";
import { HesabatPaylas } from "../features/share/HesabatPaylas.jsx";
import { IndeksKarti } from "../features/score/IndeksKarti.jsx";

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
  radar = { hal: "yoxdur", xulase: null },
  indeksHali = { hal: "yoxdur", indeks: null, movsumler: [] },
  siqnallar = [],
  onOpenLoan,
  onPickLocation,
  onDrawField,
  onOpenChat,
  onOpenHesab,
}) {
  const { t, money, lang } = useI18n();
  const { state } = useStore();

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
  //
  // Sahə çəkilib, amma ölçmə gəlməyibsə NÜMUNƏ RƏQƏMİ göstərmirik. Əvvəl
  // burada FARM.ndvi qalırdı və ekranda "Bitki örtüyü 72%" ilə "bu dövrdə
  // təmiz ölçmə yoxdur" yan-yana dururdu — biri o birini yalanlayırdı.
  const olcmeVar = Number.isFinite(olculen?.ndvi);
  const faiz = ortukFaizi(olcmeVar ? olculen.ndvi : state.sahe ? null : FARM.ndvi);
  const gunEvvel = olculen ? necheGunEvvel(olculen.tarix) : null;

  // Ən vacib siqnal ARTIQ ƏSAS EKRANIN BAŞINA ÇIXMIR — başlıqdakı zəngin
  // arxasındadır (bax: features/signals/SiqnalPaneli.jsx). Səbəb: xəbərdarlıq
  // kartı hər açılışda salamlaşmanı və indeksi aşağı itələyirdi, yəni fermer
  // öz sahəsinin vəziyyətini görmək üçün əvvəlcə bildirişi oxumalı olurdu.
  // Zəngdəki qırmızı nişan onsuz da say verir; oxumaq qərarı fermerindir.
  //
  // `bas` yenə hesablanır: iki yerdə İŞ görür — Aqronun üzü və paylaşılan
  // hesabatın mətni. Yalnız kartın özü ekrandan çıxıb.
  const bas = siqnallar.find((s) => s.ciddilik !== "melumat");

  // ═══ AQRO ƏSAS EKRANDA KƏDƏRLƏNMİR ═══════════════════════════════════
  // Əvvəl açıq siqnal varsa üz "narahat" olurdu. İki səbəbdən səhv idi:
  //
  // 1. "Suvarma vaxtıdır" TƏCİLİ sayılır, amma pis xəbər deyil — adi,
  //    həll edilən iş. Ona kədərlənmək hava tətbiqinin yağış gördüyü üçün
  //    qaşqabaqlı olmasına bənzəyir. Ciddilik İŞİN TƏCİLİLİYİdir, xəbərin
  //    pisliyi deyil; üz isə ikincisini deyirdi.
  // 2. Siqnal kartı zəngin arxasına keçəndən sonra kədərli üzün YANINDA
  //    onu izah edən heç nə qalmadı — fermer səbəbsiz qaşqabaq görürdü.
  //
  // İndi: iş varsa sakit (Aqro sadəcə yanındadır), hər şey yaxşıdırsa
  // sevincli. Narahat ifadə məsləhət ekranındadır — orada siqnal kartları
  // onu izah edir (bax: screens/AdvisorScreen.jsx).
  const aqroHali = !bas && indeksHali.indeks?.bant === "yuksek" ? "sevincli" : "sakit";

  return (
    <div className="px-4 pb-4">
      <div
        className="mt-3 rounded-3xl px-4 pt-4 pb-3"
        style={{ background: `linear-gradient(160deg, ${C.pine} 0%, ${C.pineDeep} 70%)` }}
      >
        <div className="flex items-center gap-2.5">
          {/* AQRO əsas ekranda: bəzək deyil, İKİ iş görür.
              1) Aqronoma yeganə birbaşa yol — əvvəl çata yalnız siqnal
                 kartı üzərindən düşmək olurdu, siqnal yoxdursa yol yox idi.
              2) Üzü sahənin vəziyyətini daşıyır: xəbərdarlıq varsa narahat,
                 indeks yüksəkdirsə sevincli. Rəqəmə baxmadan oxunur.
              Başlığı fermerin seçdiyi bitkidir (bax: components/Aqronom.jsx). */}
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
              {t("home.greeting", { name: FARM.farmerName })}
            </p>
            <p className="text-sm font-bold text-white" style={{ fontFamily: font.display }}>
              {t("home.farmLine", {
                farm: { key: FARM.farmNameKey },
                ha: { number: hectares },
              })}
            </p>
          </div>
          {/* "Bu gün təsdiqlənib" çipi SİLİNDİ. İki səbəb:
              1) Sabit mətn idi — sahə çəkilməsə də, ölçmə köhnə olsa da
                 eyni şeyi deyirdi, yəni nümunə məlumat həqiqi məlumat
                 kimi geyinmişdi;
              2) aşağıdakı "Peyk ölçməsi · N gün əvvəl" sətri eyni şeyi
                 DƏQİQ deyir. Yer boşalanda salamlama da sətirlərə
                 bölünməkdən qurtardı. */}
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

        {/* Hesab: sahə cihazda yox, hesabda qalsın. Daxil olmuş fermer öz
            nömrəsini görür (bu, "sinxron işləyir" siqnalıdır), olmayan isə
            nə üçün lazım olduğunu bir cümlə ilə oxuyur. */}
        <button
          type="button"
          onClick={onOpenHesab}
          className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
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

        {/* Nümunə qövs (782) SİLİNİB: real indeksin yanında saxta bal ikiqat
            yalan görünür. Sahə çəkilibsə peyk tarixçəsindən hesablanan indeks,
            çəkilməyibsə nömrə YOX, nəyin gözlədiyini deyən bir sətir — dəvəti
            üstdəki "Sahəmi xəritədə çək" düyməsi onsuz da verir. */}
        {state.sahe ? (
          <IndeksKarti indeksHali={indeksHali} />
        ) : (
          <div
            className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          >
            <Icon name="Satellite" size={13} color="rgba(255,255,255,0.6)" />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.72)" }}>
              {t("indeks.saheYox")}
            </span>
          </div>
        )}

        <div className="mt-2 grid grid-cols-3 gap-2">
          <StatTile label={t("home.cropHealth")}>
            {faiz == null ? "—" : `${formatNumber(faiz, lang)}%`}{" "}
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

        {/* Kredit limiti hələ hesablanmır — bunu deməmək fermeri saxta rəqəmlə
            plan qurmağa aparır. Qövs silinsə də bu qeyd qalır. */}
        <p
          className="mt-1.5 text-center"
          style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, lineHeight: 1.4 }}
        >
          {t("home.scoreNote")}
        </p>

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

        {/* Radar: optik ölçmə buludun altında qalanda görünür. Bura fermerin
            "bu dövrdə təmiz ölçmə yoxdur" oxuduğu yerdir — indi ondan sonra
            ikinci peykin nə gördüyü yazılır. */}
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
        onDrawField={onDrawField}
        deqiq={noqte.deqiq}
        // Məsləhət ARTIQ SÖNDÜRÜLMÜR. Əvvəl siqnal kartı əsas ekranda idi və
        // eyni proqnozdan eyni cümləni deyirdi — təkrar olmasın deyə bu sətir
        // gizlədilirdi. Kart zəngin arxasına keçəndən sonra gizlətmək ekranı
        // tamam susdururdu: nə siqnal, nə məsləhət.
      />
    </div>
  );
}
