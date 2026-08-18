import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useCountUp } from "../../lib/useCountUp.js";
import { EKIN_HEDDI } from "../../../lib/mehsuldarliq.js";

/** Bant rəngləri tünd şam fonu üçün seçilib — ağ mətnlə yanaşı oxunur */
const BANT_RENGI = {
  yuksek: "#7FD6A4",
  yaxsi: "#A8DDBC",
  orta: C.gold,
  zeif: "#F0A0A0",
};

/**
 * Təxmini (proxy) və ehtiyat (fallback) metodologiyalar açıq işarələnir.
 * Həqiqi ölçmə ilə yaxınlaşdırma arasındakı fərq gizlədilməməlidir:
 * aqronom hansı sətrin mübahisə edilə biləcəyini görməlidir.
 */
const TEXMINI_METODLAR = new Set(["proxy-yerli-etraf", "zirveProxy", "xamFallback"]);

/** Amil zolağının rəngi qazanılmış payın nisbətindən gəlir */
function nisbetRengi(nisbet) {
  if (nisbet == null) return "rgba(255,255,255,0.25)";
  if (nisbet >= 0.75) return "#60BE86";
  if (nisbet >= 0.5) return C.gold;
  return "#E08076";
}

const RING = { olcu: 74, r: 30 };
const CEVRE = 2 * Math.PI * RING.r;

/**
 * Balın halqası — qövs rəqəmlə SİNXRON dolur: hər ikisi useCountUp-un eyni
 * dəyərindən çəkilir, ona görə say bitəndə qövs də bitir. Hərəkət azaldılıbsa
 * useCountUp dərhal yekunu verir və heç nə "oynamır".
 */
function BalHalqasi({ bal, reng }) {
  const gorunen = useCountUp(bal);
  const dolu = CEVRE * (1 - gorunen / 100);

  return (
    <div className="relative" style={{ width: RING.olcu, height: RING.olcu }} aria-hidden="true">
      <svg width={RING.olcu} height={RING.olcu} viewBox={`0 0 ${RING.olcu} ${RING.olcu}`}>
        <circle
          cx={RING.olcu / 2}
          cy={RING.olcu / 2}
          r={RING.r}
          fill="none"
          stroke="rgba(255,255,255,0.13)"
          strokeWidth={5}
        />
        <circle
          cx={RING.olcu / 2}
          cy={RING.olcu / 2}
          r={RING.r}
          fill="none"
          stroke={reng}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={CEVRE}
          strokeDashoffset={dolu}
          transform={`rotate(-90 ${RING.olcu / 2} ${RING.olcu / 2})`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-white"
        style={{ fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
      >
        {gorunen}
      </span>
    </div>
  );
}

/**
 * Bir amilin sətri: AD + izah + xal + dolan zolaq.
 *
 * Amilin adı indi ayrıca göstərilir (əvvəl yalnız izah vardı): altı amil
 * çəkisi ilə birlikdə görünməlidir ki, aqronom hansı sətri mübahisə etdiyini
 * bilsin. Ölçülməyən amil "—" ilə qalır və zolağı boşdur — xal qazanmır,
 * amma maksimumu da cədvəldən çıxmır (bax: lib/mehsuldarliq.js, qayda 4).
 */
function AmilSetri({ setir, sira, t }) {
  const nisbet = setir.xal == null ? null : setir.xal / setir.maxXal;
  const reng = nisbetRengi(nisbet);
  const texmini = TEXMINI_METODLAR.has(setir.metodologiya);

  return (
    <div className="giris mb-2.5" style={{ "--i": sira }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
          {t(`indeks.amil.${setir.id}`)}
        </span>
        <span
          className="text-xs font-semibold"
          style={{
            color: setir.xal == null ? "rgba(255,255,255,0.5)" : reng,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {setir.xal == null ? "—" : `${setir.xal}`}
          <span style={{ color: "rgba(255,255,255,0.45)" }}>/{setir.maxXal}</span>
        </span>
      </div>

      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 10.5, lineHeight: 1.4 }}>
          {setir.sebeb ? t(`indeks.sebeb.${setir.sebeb}`) : t("indeks.olculmeyib")}
        </span>
        {texmini && (
          <span
            className="shrink-0 rounded px-1"
            style={{ color: C.gold, backgroundColor: "rgba(233,181,74,0.14)", fontSize: 9 }}
            title={t(`indeks.metod.${setir.metodologiya}`)}
          >
            {t("indeks.texmini")}
          </span>
        )}
      </div>

      <div
        className="mt-1 overflow-hidden rounded-full"
        style={{ height: 4, backgroundColor: "rgba(255,255,255,0.12)" }}
      >
        {nisbet != null && (
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round(nisbet * 100)}%`, backgroundColor: reng }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Mövsüm qrafiki: hər il bir sütun, HÜNDÜRLÜK zirvə NDVI-dir. Əvvəl bərabər
 * ölçülü rəngli xanalar idi — rəqəm gizli qalırdı. İndi yaxşı il hündür,
 * zəif il alçaq, boş il qırmızı kötük kimi görünür: tarixçə qrafik kimi oxunur.
 */
function MovsumQrafiki({ movsumler, t }) {
  const MAX_H = 34;
  const cariIl = new Date().getFullYear();

  const olculenler = movsumler.filter((m) => Number.isFinite(m.zirve));
  const bosSayi = olculenler.filter((m) => m.zirve < EKIN_HEDDI && m.il !== cariIl).length;

  return (
    <div
      className="mt-3 flex items-end gap-1"
      style={{ height: MAX_H + 14 }}
      // Qrafik yalnız rəng və hündürlükdür — ekran oxuyucusuna xülasəsi verilir
      role="img"
      aria-label={t("indeks.qrafik", {
        say: olculenler.length,
        ekili: olculenler.length - bosSayi,
        bos: bosSayi,
      })}
    >
      {movsumler.map((m) => {
        // Cari il hələ bitməyib: zirvə həddin altındadırsa bu, "boş qalıb"
        // deyil, "mövsüm davam edir"dir — qırmızı yox, neytral göstərilir
        const davamEdir = m.il === cariIl && m.zirve != null && m.zirve < EKIN_HEDDI;
        const bos = !davamEdir && m.zirve != null && m.zirve < EKIN_HEDDI;
        const ustde = m.etrafMedyan != null && m.zirve != null && m.zirve > m.etrafMedyan;
        const h =
          m.zirve == null
            ? 2
            : Math.max(4, Math.round((Math.min(m.zirve, 0.85) / 0.85) * MAX_H));

        return (
          <div key={m.il} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${m.il}`}>
            <div
              className="w-full rounded-t"
              style={{
                height: h,
                maxWidth: 22,
                backgroundColor:
                  m.zirve == null || davamEdir
                    ? "rgba(255,255,255,0.2)"
                    : bos
                      ? "rgba(224,128,118,0.75)"
                      : ustde
                        ? "#60BE86"
                        : "rgba(96,190,134,0.55)",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 9 }}>
              {String(m.il).slice(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Aqronomik performans indeksi — əsas ekranın qövsünün yerinə.
 *
 * Qaydalar (bax: lib/mehsuldarliq.js):
 *   1. Bu, KREDİT BALI DEYİL və elə adlandırılmır — aqronomik indeksdir.
 *   2. Hər amilin balı görünür: gizli düstur etibar yaratmır.
 *   3. MƏLUMAT KEYFİYYƏTİ QAPISI: 3 mövsümdən az tarixçə ilə rəqəm də,
 *      bant da göstərilmir — "94 / Yüksək" bir mövsümdən çıxmamalıdır.
 *   4. ETİBAR BALDAN AYRI göstərilir: iki fərqli şeydir və qarışdırılsa
 *      "aşağı bal" ilə "az bilirik" eyni görünür.
 *
 * 300-850 aralıqlı FICO görünüşü QƏSDƏN atılıb: o miqyas "kredit balı" deyir.
 */
export function IndeksKarti({ indeksHali }) {
  const { t } = useI18n();
  const [acilib, setAcilib] = useState(false);
  const { hal, indeks, movsumler } = indeksHali;

  if (hal === "yoxdur") return null;

  // ── Məlumat keyfiyyəti qapısı: bal yoxdur, səbəb var ───────────────
  if (hal === "hazir" && indeks?.hal === "kifayetsiz") {
    return (
      <div
        className="mt-2 rounded-2xl px-3.5 py-3"
        style={{
          background: "linear-gradient(150deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 100%)",
          border: "1px solid rgba(255,255,255,0.13)",
        }}
      >
        <div className="flex items-start gap-2.5">
          <Icon name="Info" size={15} color={C.gold} />
          <div className="min-w-0 flex-1">
            <p
              className="text-sm font-bold text-white"
              style={{ fontFamily: font.display, letterSpacing: "0.01em" }}
            >
              {t("indeks.tarixceAz")}
            </p>
            <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              {t("indeks.tarixceAzIzah")}
            </p>
            <p className="mt-1.5" style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>
              {t("indeks.movsum", { say: indeks.movsumSayi })}
            </p>
          </div>
        </div>
        <MovsumQrafiki movsumler={movsumler} t={t} />
      </div>
    );
  }

  if (hal !== "hazir" || !indeks) {
    return (
      <div
        className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <Icon
          name={hal === "yuklenir" ? "LoaderCircle" : "Info"}
          size={13}
          color="rgba(255,255,255,0.6)"
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.72)" }}>
          {hal === "yuklenir" && t("indeks.yuklenir")}
          {hal === "olcmeYox" && t("indeks.olcmeYox")}
          {hal === "qurulmayib" && t("ndvi.notConfigured")}
          {hal === "xeta" && t("indeks.xeta")}
          {hal === "hazir" && !indeks && t("indeks.olcmeYox")}
        </span>
      </div>
    );
  }

  // Bant yoxdursa halqa neytral qalır: rəng özü bant kimi oxunur, ona görə
  // "müdafiə edilə bilməyən" nəticəyə yaşıl/qırmızı vermək olmaz
  const reng = indeks.bant ? (BANT_RENGI[indeks.bant] ?? C.gold) : "rgba(255,255,255,0.45)";
  const olculen = movsumler.filter((m) => Number.isFinite(m.zirve)).length;

  return (
    <div
      className="mt-2 rounded-2xl px-3.5 py-3"
      style={{
        background: "linear-gradient(150deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 100%)",
        border: "1px solid rgba(255,255,255,0.13)",
      }}
    >
      <button
        type="button"
        onClick={() => setAcilib(!acilib)}
        aria-expanded={acilib}
        // Yekun bal — sayma prosesi ekran oxuyucusuna düşməsin (bax: useCountUp).
        // "İlkin" nişanı da buradadır: görən istifadəçi şərtli bal görürsə,
        // eşidən istifadəçi şərtsiz eşitməməlidir (qayda 3 — etibar gizlədilmir)
        aria-label={[
          `${t("indeks.basliq")}: ${indeks.bal}`,
          indeks.bant ? t(`indeks.bant.${indeks.bant}`) : t("indeks.bantYoxdur"),
          `${t("indeks.etibarEtiket")}: ${t(`indeks.etibar.${indeks.etibar}`)}`,
          indeks.natamam ? t("indeks.natamam", { xal: indeks.elcatanXal }) : null,
          t("indeks.movsum", { say: olculen }),
        ]
          .filter(Boolean)
          .join(", ")}
        className="flex w-full items-center gap-3.5 text-left"
      >
        <BalHalqasi bal={indeks.bal} reng={reng} />

        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-bold text-white"
            style={{ fontFamily: font.display, letterSpacing: "0.01em" }}
          >
            {t("indeks.basliq")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-bold"
              style={{ color: reng, backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              {indeks.bant ? t(`indeks.bant.${indeks.bant}`) : t("indeks.bantYoxdur")}
            </span>
            {/* ETİBAR AYRICA NİŞANDIR: bal "sahə necədir", etibar "nə qədər
                bilirik" deməkdir. Birləşdirilsə az məlumat pis nəticə kimi
                oxunur — halbuki bala heç bir təsiri yoxdur. */}
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                color: indeks.etibar === "yuksek" ? "#A8DDBC" : C.gold,
                backgroundColor:
                  indeks.etibar === "yuksek" ? "rgba(127,214,164,0.14)" : "rgba(233,181,74,0.14)",
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {t("indeks.etibarEtiket")}: {t(`indeks.etibar.${indeks.etibar}`)}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            {t("indeks.movsum", { say: olculen })}
          </p>
          {/* Natamam nəticə: ölçülməyən amillər 100-ə miqyaslanmır, ona görə
              əlçatan maksimum 100-dən azdır. Bunu deməsək bal haqsız aşağı
              görünər (bax: lib/mehsuldarliq.js, qayda 4). */}
          {indeks.natamam && (
            <p className="mt-0.5" style={{ color: C.gold, fontSize: 10, lineHeight: 1.4 }}>
              {t("indeks.natamam", { xal: indeks.elcatanXal })}
            </p>
          )}
        </div>

        <Icon
          name={acilib ? "ChevronDown" : "ChevronRight"}
          size={15}
          color="rgba(255,255,255,0.55)"
        />
      </button>

      {acilib && (
        <div
          className="mt-3 border-t pt-3"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
        >
          {/* Kritik məlumat (müqayisə) yoxdursa nəticəyə ad verilmir — səbəbi
              rəqəmin yanında deyil, açılan hissədə tam cümlə ilə izah olunur */}
          {indeks.bantYoxdurSebebi === "muqayiseYoxdur" && (
            <p
              className="mb-2.5 rounded-lg px-2.5 py-2"
              style={{
                backgroundColor: "rgba(233,181,74,0.12)",
                color: "rgba(255,255,255,0.82)",
                fontSize: 10.5,
                lineHeight: 1.45,
              }}
            >
              {t("indeks.bantYoxdurIzah")}
            </p>
          )}

          {indeks.setirler.map((setir, sira) => (
            <AmilSetri key={setir.id} setir={setir} sira={sira} t={t} />
          ))}

          <MovsumQrafiki movsumler={movsumler} t={t} />

          <p
            className="mt-2.5"
            style={{ color: "rgba(255,255,255,0.62)", fontSize: 10, lineHeight: 1.5 }}
          >
            {t("indeks.izah")}
          </p>
        </div>
      )}
    </div>
  );
}
