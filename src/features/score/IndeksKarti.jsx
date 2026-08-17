import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useCountUp } from "../../lib/useCountUp.js";
import { EKIN_HEDDI } from "../../services/mehsuldarliq.js";

/** Bant rəngləri tünd şam fonu üçün seçilib — ağ mətnlə yanaşı oxunur */
const BANT_RENGI = {
  yuksek: "#7FD6A4",
  yaxsi: "#A8DDBC",
  orta: C.gold,
  zeif: "#F0A0A0",
};

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
 * Bir amilin sətri: ad + xal + dolan zolaq. Zolaq balın HARADAN gəldiyini
 * mətnsiz göstərir — 14/25 oxumaq hesab tələb edir, yarıya qədər dolu zolaq
 * isə bir baxışda görünür.
 */
function AmilSetri({ setir, sira, t }) {
  const nisbet = setir.xal == null ? null : setir.xal / setir.maxXal;
  const reng = nisbetRengi(nisbet);

  return (
    <div className="giris mb-2" style={{ "--i": sira }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.88)" }}>
          {setir.sebeb ? t(`indeks.sebeb.${setir.sebeb}`) : t("indeks.olculmeyib")}
        </span>
        <span
          className="text-xs font-semibold"
          style={{
            color: setir.xal == null ? "rgba(255,255,255,0.65)" : reng,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {setir.xal == null ? "—" : `${setir.xal}/${setir.maxXal}`}
        </span>
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
 * Məhsuldarlıq indeksi — əsas ekranın qövsünün yerinə.
 *
 * Üç qayda (bax: services/mehsuldarliq.js):
 *   1. Bu, KREDİT BALI DEYİL və elə adlandırılmır — aqronomik indeksdir.
 *   2. Hər amilin balı görünür: gizli düstur etibar yaratmır, düzəldilə də bilmir.
 *   3. Etibar gizlədilmir: az mövsüm = "ilkin qiymətləndirmə" nişanı.
 *
 * 300-850 aralıqlı FICO görünüşü QƏSDƏN atılıb: o miqyas "kredit balı" deyir.
 */
export function IndeksKarti({ indeksHali }) {
  const { t } = useI18n();
  const [acilib, setAcilib] = useState(false);
  const { hal, indeks, movsumler } = indeksHali;

  if (hal === "yoxdur") return null;

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

  const reng = BANT_RENGI[indeks.bant] ?? C.gold;
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
          `${t("indeks.basliq")}: ${indeks.bal}, ${t(`indeks.bant.${indeks.bant}`)}`,
          indeks.etibar !== "tam" ? t("indeks.ilkin") : null,
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
              {t(`indeks.bant.${indeks.bant}`)}
            </span>
            {indeks.etibar !== "tam" && (
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  color: C.gold,
                  backgroundColor: "rgba(233,181,74,0.14)",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {t("indeks.ilkin")}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            {t("indeks.movsum", { say: olculen })}
          </p>
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
          {indeks.setirler.map((setir, sira) => (
            <AmilSetri key={setir.key} setir={setir} sira={sira} t={t} />
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
