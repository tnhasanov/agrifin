import { WeatherStrip } from "../features/weather/WeatherStrip.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { useRouter } from "../lib/router.jsx";
import { pathFor } from "../routes.js";
import { FARM } from "../services/farm.js";
import { havaNoqtesi } from "../services/saheYeri.js";
import { necheGunEvvel, ortukFaizi } from "../services/ndvi.js";
import { esasHereket } from "../features/pano/esasHereket.js";
import { EsasHereketKarti } from "../features/pano/EsasHereketKarti.jsx";
import { KreditMiniKarti } from "../features/pano/MaliyyeKartlari.jsx";
import { FarmScoreKarti } from "../features/pano/FarmScoreKarti.jsx";
import { BosSahe } from "../features/pano/BosSahe.jsx";

/**
 * ANA SƏHİFƏ — qərar səthidir, modul kataloqu deyil. Hər açılış üç suala
 * cavab verir: Sahəm necədir? Pul vəziyyətim necədir? İndi nə etməliyəm?
 *
 * PDF dizaynına uyğun quruluş: AÇIQ FON, sadə salamlama, sonra yaşıl
 * FarmScore kartı → "nə etməli" → kredit xülasəsi → hava. Köhnə tünd hero
 * (çeklist sətirləri, peyk status sətirləri, kredit CTA) getdi:
 *   • hesab girişi Kömək ekranındakı "Açıq tapşırıqlar"a köçdü;
 *   • peyk/radar statusu Sahələr ekranındadır (sübutun evi oradır);
 *   • yeni kredit yolu Maliyyədəki "Əlavə vəsait lazımdır?" kartıdır —
 *     ana səhifə kredit satmır, vəziyyət göstərir.
 *
 * Hal A: sahə yoxdursa NƏ bal, NƏ KPI, NƏ kredit — bir dəvət (BosSahe).
 */
export function HomeScreen({
  peyk = { hal: "yoxdur", seriya: [], xulase: null },
  indeksHali = { hal: "yoxdur", indeks: null, movsumler: [] },
  kreditHali = null,
  siqnallar = [],
  onOpenLoan,
  onPickLocation,
  onDrawField,
  onOpenHesab,
  onOpenNece,
}) {
  const { t } = useI18n();
  const { state } = useStore();
  const { navigate } = useRouter();

  const location = state.location;
  const noqte = havaNoqtesi({ location, sahe: state.sahe });
  const havaYeriVar = Number.isFinite(noqte.lat) && Number.isFinite(noqte.lon);

  const olculen = peyk.xulase;
  // Sahə çəkilməyibsə NÜMUNƏ RƏQƏMİ YOXDUR (hal A: uydurma KPI qadağandır)
  const faiz = Number.isFinite(olculen?.ndvi) ? ortukFaizi(olculen.ndvi) : null;
  const gunEvvel = olculen ? necheGunEvvel(olculen.tarix) : null;

  const aktivKredit = kreditHali?.kredit?.hal === "active" ? kreditHali.kredit : null;

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
      {/* Salamlama — mock-dakı kimi açıq fonda sadə mətn */}
      <div className="mt-3">
        <h1 className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: font.display }}>
          {state.sahe
            ? `${t("home.greeting", { name: FARM.farmerName })} 👋`
            : `${t("pano.salam", { name: FARM.farmerName })} 👋`}
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: C.muted }}>
          {state.sahe ? t("pano.salamAlt") : t("pano.qurulus")}
        </p>
      </div>

      {/* Hal A: yeni fermer — BİR aydın dəvət, başqa heç nə.
          "Necə işləyir?" ÜÇ ADDIMLIQ İZAH panelini açır, ümumi çatı yox:
          sahə çəkməyi bilməyən fermerə boş sual xanası kömək etmir
          (bax: features/pano/NeceIsleyir.jsx). */}
      {!state.sahe && <BosSahe onDrawField={onDrawField} onNece={onOpenNece} />}

      {/* Sahə varsa: yaşıl FarmScore kartı (bal və ya hal B qapısı içindədir) */}
      {state.sahe && (
        <FarmScoreKarti
          /* Başlıq UYDURMA TƏSƏRRÜFAT ADI DAŞIMIR. Əvvəl "Yaşıl Vadi
             Təsərrüfatı" yazılırdı — heç kimin qoymadığı ad, prototip
             qalığı. İndi fermerin ÖZ SEÇDİYİ bitki yazılır (mock-dakı
             "Alma bağı · 4.2 ha" quruluşu), bitki seçilməyibsə neytral
             "Sahəniz" qalır. */
          farmLine={t("home.farmLine", {
            farm: { key: state.chat.crop ? `kbcrop.${state.chat.crop}` : "sahe.adsiz" },
            ha: { number: state.sahe.hektar },
          })}
          indeksHali={indeksHali}
          faiz={faiz}
          istiqamet={olculen?.istiqamet ?? null}
          suSeviyyesi={peyk.hal === "hazir" ? (olculen?.suSeviyyesi ?? null) : null}
          gunEvvel={gunEvvel}
          onBax={() => navigate(pathFor("sahe"))}
        />
      )}

      {/* "Bu gün nə etməli?" — bir nömrəli iş */}
      {state.sahe && <EsasHereketKarti hereket={hereket} onHereket={hereketIcra} />}

      {/* Maliyyə xülasəsi: aktiv kredit varsa qalıq + növbəti ödəniş */}
      {state.sahe && <KreditMiniKarti kredit={aktivKredit} onBax={() => navigate(pathFor("money"))} />}

      {/* Rayon seçilməyibsə standart rayon uydurmuruq. Sahə konturu da
          yoxdursa hava üçün həqiqi koordinat yoxdur — CTA göstərilir. */}
      <div className={state.sahe ? undefined : "mt-10"}>
        {havaYeriVar ? (
          <WeatherStrip
            key={`${noqte.lat},${noqte.lon}`}
            lat={noqte.lat}
            lon={noqte.lon}
            locationName={location?.name}
            onPickLocation={onPickLocation}
            onDrawField={onDrawField}
            deqiq={noqte.deqiq}
          />
        ) : (
          <section className="mt-5 rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
            <h2 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
              {t("weather.locationMissingTitle")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("weather.locationMissingText")}
            </p>
            <button
              type="button"
              onClick={onPickLocation}
              className="mt-3 w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.pine, color: "#fff", minHeight: 44 }}
            >
              {t("location.pick")}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
