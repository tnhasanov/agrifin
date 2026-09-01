import { Card } from "../components/Card.jsx";
import { Chip } from "../components/Chip.jsx";
import { Icon } from "../components/Icon.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { useRouter } from "../lib/router.jsx";
import { pathFor } from "../routes.js";
import { necheGunEvvel, ortukFaizi } from "../services/ndvi.js";
import { SaheXeritesi } from "../features/ndvi/SaheXeritesi.jsx";
import { QonsuMuqayisesi } from "../features/ndvi/QonsuMuqayisesi.jsx";
import { VegetasiyaQrafiki } from "../features/ndvi/VegetasiyaQrafiki.jsx";
import { SaheLenti } from "../features/lent/SaheLenti.jsx";
import { HesabatPaylas } from "../features/share/HesabatPaylas.jsx";
import { BosSahe } from "../features/pano/BosSahe.jsx";
import { SaheXebardarligi } from "../features/pano/SaheXebardarligi.jsx";
import { EtibarNisani } from "../features/pano/EtibarNisani.jsx";
import { SAHE_SIQNALLARI } from "../features/pano/saheSiqnallari.js";

/**
 * SAHƏLƏR EKRANI — sahənin detal görünüşü: xəritə, xəbərdarlıq, tarixçə.
 *
 * Əsas səhifə "sahəm necədir?" sualına BİR SƏTİRLƏ cavab verir; bura isə
 * sübutun özüdür: peyk şəkli, ölçmə xronologiyası, ətraf müqayisəsi.
 *
 * Sahə siqnalları burada BİR xəbərdarlıq kartı kimi görünür (ən vacibi) —
 * tam siyahı Kömək ekranındadır. Hava siqnalları (şaxta, isti) sahə kartı
 * deyil — onlar zəngdə qalır.
 */
export function SaheScreen({
  peyk = { hal: "yoxdur", seriya: [], xulase: null },
  qonsu = { hal: "yoxdur", muqayise: null },
  radar = { hal: "yoxdur", xulase: null },
  indeksHali = { hal: "yoxdur", indeks: null, movsumler: [] },
  siqnallar = [],
  onDrawField,
  onOpenChat,
  onOpenNece,
}) {
  const { t } = useI18n();
  const { state } = useStore();
  const { navigate } = useRouter();

  // ── Hal A: sahə yoxdur — bir aydın dəvət, uydurma göstərici yox ─────
  // Ana səhifə ilə eyni komponentdir (hero təkrarlanmır), "Necə işləyir?"
  // də eyni izah panelini açır.
  if (!state.sahe) {
    return (
      <div className="px-4 pb-4">
        <BosSahe onDrawField={onDrawField} onNece={onOpenNece} />
      </div>
    );
  }

  const indeks = indeksHali.indeks;
  const tarixceYigilir = indeksHali.hal === "hazir" && indeks?.hal === "kifayetsiz";
  const xulase = peyk.xulase;
  const cariFaiz = Number.isFinite(xulase?.ndvi) ? ortukFaizi(xulase.ndvi) : null;
  // Son ölçmənin bulud payı (0-1) — seriyanın son elementindən
  const sonOlcme = peyk.seriya?.[peyk.seriya.length - 1];
  const buludPayi = Number.isFinite(sonOlcme?.ortulu) ? sonOlcme.ortulu : null;
  const gunEvvel = xulase ? necheGunEvvel(xulase.tarix) : null;

  // Ən vacib SAHƏ siqnalı (mühərrik onsuz da ciddiliyə görə sıralayıb)
  const saheSiqnali = siqnallar.find((s) => SAHE_SIQNALLARI.has(s.nov)) ?? null;

  return (
    <div className="px-4 pb-4">
      {/* Başlıq (mock 04): geri oxu + sahənin adı + "N ha · rayon" */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(pathFor("home"))}
          aria-label={t("sahe.geri")}
          className="flex items-center justify-center rounded-full"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          <Icon name="ChevronLeft" size={20} color={C.ink} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {t(state.chat.crop ? `kbcrop.${state.chat.crop}` : "sahe.adsiz")}
          </h2>
          <p className="text-xs" style={{ color: C.muted }}>
            {t("sahe.altSetir", {
              ha: { number: state.sahe.hektar },
              rayon: state.location?.name ?? "—",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={onDrawField}
          className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold"
          style={{ backgroundColor: C.card, color: C.pine, border: `1px solid ${C.line}`, minHeight: 44 }}
        >
          <Icon name="MapPin" size={13} color={C.pine} />
          {t("sahe.deyis")}
        </button>
      </div>

      {/* Peyk xəritəsi: problemin HARADA olduğunu göstərir. Xəbərdarlıq
          aktivdirsə kontur narıncıdır (mock 04, hal F) */}
      <SaheXeritesi
        sahe={state.sahe}
        konturRengi={saheSiqnali ? "#C97A28" : undefined}
        // Əsas hərəkət hala görədir: xəbərdarlıq varsa "Yoxlamaya başla"
        // (xəbərdarlıq kartındadır), yoxdursa "Xəritədə bax" (PDF 15)
        tamCta={!saheSiqnali}
      />

      {/* MƏLUMAT KEYFİYYƏTİ — ölçmənin özü qədər vacibdir: köhnə/oflayn/xəta
          halları son-yenilənmə vaxtı ilə açıq deyilir. "Yüklənmədi" ilə
          "buludlu idi" fərqli mənalardır və fermer fərqi görməlidir. */}
      {(peyk.hal !== "yoxdur" || radar.hal !== "yoxdur") && (
        <SectionTitle>{t("sahe.melumatKeyfiyyeti")}</SectionTitle>
      )}
      {peyk.hal !== "yoxdur" && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
          aria-live="polite"
        >
          <Icon
            name={peyk.hal === "yuklenir" ? "LoaderCircle" : "Satellite"}
            size={13}
            color={peyk.hal === "hazir" ? C.field : C.muted}
          />
          <span className="flex-1 text-xs" style={{ color: C.muted }}>
            {peyk.hal === "yuklenir" && t("ndvi.loading")}
            {peyk.hal === "hazir" &&
              (peyk.kohne
                ? t("ndvi.cached", { gun: gunEvvel ?? 0 })
                : t("ndvi.measured", { gun: gunEvvel ?? 0, say: xulase?.olcmeSayi ?? 0 }))}
            {peyk.hal === "olcmeYox" && t("ndvi.noReading")}
            {peyk.hal === "qurulmayib" && t("ndvi.notConfigured")}
            {peyk.hal === "xeta" && t("ndvi.error")}
          </span>
        </div>
      )}

      {/* Radar: optik ölçmə buludun altında qalanda ikinci peyk danışır.
          (Əvvəl ana səhifədə idi — sübutun evi buradır) */}
      {radar.hal !== "yoxdur" && (
        <div
          className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2"
          style={{
            backgroundColor: radar.xulase?.suVar ? "rgba(74,144,226,0.12)" : C.card,
            border: `1px solid ${C.line}`,
          }}
          aria-live="polite"
        >
          <Icon
            name={radar.hal === "yuklenir" ? "LoaderCircle" : "Radar"}
            size={13}
            color={radar.hal === "hazir" ? "#4A90E2" : C.muted}
          />
          <div className="flex-1">
            <p className="text-xs" style={{ color: C.muted }}>
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
              <p className="mt-0.5" style={{ color: C.muted, fontSize: 10 }}>
                {t("radar.measured", { gun: necheGunEvvel(radar.xulase.tarix) ?? 0 })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Su vəziyyəti: NDVI "zəifdir" deyir, rütubət səbəbi ayırır */}
      {peyk.hal === "hazir" && xulase?.suSeviyyesi && (
        <div
          className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            backgroundColor: xulase.suSeviyyesi === "az" ? C.goldSoft : C.card,
            border: `1px solid ${C.line}`,
          }}
        >
          <Icon
            name="Droplets"
            size={13}
            color={xulase.suSeviyyesi === "az" ? C.goldInk : C.field}
          />
          <span className="flex-1 text-xs" style={{ color: C.muted }}>
            {t(`ndvi.water.${xulase.suSeviyyesi}`)}
          </span>
        </div>
      )}

      {/* Vəziyyət sətri: xəbərdarlıq yoxdursa yaxşı xəbər açıq deyilir */}
      {!saheSiqnali && peyk.hal === "hazir" && (
        <Card className="giris" style={{ marginTop: 12, marginBottom: 12 }}>
          <div className="flex items-center gap-2">
            <div className="rounded-full p-1.5" style={{ backgroundColor: C.fieldSoft }}>
              <Icon name="Check" size={14} color={C.field} />
            </div>
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {t("pano.saheYaxsi")}
            </p>
          </div>
        </Card>
      )}

      {/* Hal F: sahə xəbərdarlığı — dəlil, addımlar, mövcud kanallar */}
      {saheSiqnali && (
        <div className="mt-3">
          <SaheXebardarligi
            siqnal={saheSiqnali}
            etibar={indeks?.etibar ?? null}
            movsumSayi={indeks?.movsumSayi ?? null}
            qonsuFerq={qonsu.muqayise?.ferq ?? null}
            onChat={onOpenChat}
          />
        </div>
      )}

      {/* Hal B: tarixçə yığılır — bal YOXDUR, olan faktlar dürüst göstərilir */}
      {tarixceYigilir && (
        <Card className="giris" style={{ marginBottom: 12 }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
              {t("indeks.tarixceAz")}
            </p>
            <Chip label={t("pano.tarixceChip")} color={C.goldInk} bg={C.goldSoft} />
          </div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
            {t("indeks.tarixceAzIzah")}
          </p>
          <p className="mt-2 text-xs font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
            {t("pano.tarixceSay", { say: indeks.movsumSayi })}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.mist }}>
            <div
              className="bar-dolur h-2 rounded-full"
              style={{
                width: `${Math.min(100, Math.round((indeks.movsumSayi / 3) * 100))}%`,
                backgroundColor: C.gold,
              }}
            />
          </div>

          <p className="mt-3 text-xs font-bold" style={{ color: C.ink }}>
            {t("pano.bilirik")}
          </p>
          {/* Üç fakt (mock 04): "Bulud örtüyü" da REALDIR — son ölçmənin
              `ortulu` sahəsi buludun payıdır (api/ndvi.js), uydurma deyil */}
          <div className="mt-1 grid grid-cols-3 gap-2">
            <div className="rounded-xl px-2 py-2" style={{ backgroundColor: C.mist }}>
              <p style={{ color: C.muted, fontSize: 10 }}>{t("pano.cariVeg")}</p>
              <p className="text-sm font-bold" style={{ color: C.ink }}>
                {cariFaiz != null ? `${cariFaiz}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl px-2 py-2" style={{ backgroundColor: C.mist }}>
              <p style={{ color: C.muted, fontSize: 10 }}>{t("pano.buludOrtuyu")}</p>
              <p className="text-sm font-bold" style={{ color: C.ink }}>
                {buludPayi == null
                  ? "—"
                  : t(`pano.bulud.${buludPayi <= 0.2 ? "asagi" : buludPayi <= 0.5 ? "orta" : "yuksek"}`)}
              </p>
            </div>
            <div className="rounded-xl px-2 py-2" style={{ backgroundColor: C.mist }}>
              <p style={{ color: C.muted, fontSize: 10 }}>{t("pano.sonYenilenme")}</p>
              <p className="text-sm font-bold" style={{ color: C.ink }}>
                {gunEvvel == null ? "—" : gunEvvel === 0 ? t("pano.buGun") : t("pano.gunEvvel", { gun: gunEvvel })}
              </p>
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
            <Icon name="Info" size={12} color={C.muted} />
            {t("pano.tarixceXeber")}
          </p>
        </Card>
      )}

      {/* Bal varsa etibar sətri kartların altında oxunur.
          Xəbərdarlıq kartı onu ÖZÜ daşıyır — təkrarlamırıq */}
      {!saheSiqnali && indeksHali.hal === "hazir" && indeks?.hal === "hazir" && (
        <div className="mt-1 mb-2 px-1">
          <EtibarNisani etibar={indeks.etibar} say={indeks.movsumSayi} setir />
        </div>
      )}

      {/* Vegetasiya dinamikası: rəqəm "haradayıq"ı deyir, əyri "hara
          gedirik"i. Ölçmə ikidən azdırsa qrafik çəkilmir. */}
      <VegetasiyaQrafiki peyk={peyk} muqayise={qonsu.muqayise} />

      {/* Ətraf müqayisəsi: "NDVI 0,68" mücərrəddir, qonşularla müqayisə aydın */}
      <QonsuMuqayisesi qonsu={qonsu} ndvi={xulase?.ndvi} illik={peyk.illik} />

      {/* Ölçmə xronologiyası — sahənin "bank çıxarışı" */}
      <SaheLenti peyk={peyk} radar={radar} />

      {/* Hesabatı WhatsApp-a çıxar — aqronomla söhbət orada gedir */}
      <HesabatPaylas
        hektar={state.sahe?.hektar}
        bitkiKey={state.chat.crop ? `kbcrop.${state.chat.crop}` : null}
        xulase={xulase}
        muqayise={qonsu.muqayise}
        siqnal={saheSiqnali}
      />
    </div>
  );
}
