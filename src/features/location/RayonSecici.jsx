import { useMemo, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, RADIUS, TIPO, TOXUNMA } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { DISTRICTS, districtByKod } from "../../services/location.js";
import { useGps } from "./useGps.js";
import { RayonVereqi } from "./RayonVereqi.jsx";

/**
 * RAYON SEÇİCİSİ — bağlı hal.
 *
 * Bu ekranda TAM SİYAHI GÖSTƏRİLMİR. 47 sətir açılışda ekranı doldururdu və
 * fermer nə axtaracağını qərar verməmiş sürüşdürməyə başlayırdı. Burada üç
 * qısa yol var: GPS, yazmaq, son seçdiyi rayon. Siyahının özü vərəqdədir.
 *
 * RAYON SAHƏ SƏRHƏDİ DEYİL: o, hava və mövsüm kontekstidir. Sahəyə aid
 * iddia (suvarma, peyk) rayon seçimindən çıxarılmır — onun mənbəyi
 * poliqondur.
 */

/** Pilotun başladığı rayonlar — ilk açılışda qısa yol kimi göstərilir */
const PILOT_RAYONLARI = ["berde", "quba", "xacmaz"];

/** GPS xətası hansı ikinci addımı təklif edir */
const XETA_IKONU = { redd: "MapPin", vaxt: "RotateCcw", oflayn: "WifiOff", siqnal: "RotateCcw" };

export function RayonSecici({ secilen, sonKodlar = [], onSec, avtoFokus = false }) {
  const { t } = useI18n();
  const [vereq, setVereq] = useState(false);

  const { gps, requestGps, legvEt, busy, tekrarOlar } = useGps({
    adYarat: (district) => t("location.gpsName", { district }),
    onSelect: onSec,
  });

  /**
   * Çiplər: fermerin ÖZ TARİXÇƏSİ, ən çox üç.
   *
   * İlk açılışda tarixçə yoxdur, ona görə pilotun başladığı üç rayon qısa
   * yol kimi göstərilir (maketdə də bunlardır). Bunlar bir SIRALAMA
   * İDDİASI DAŞIMIR — «ən çox əkilən» və ya «ən populyar» demirlər; sadəcə
   * pilotun ilk rayonlarıdır. Fermer bir dəfə seçən kimi siyahı onun öz
   * tarixçəsi ilə əvəzlənir.
   */
  const cipler = useMemo(() => {
    const tarixce = sonKodlar.map(districtByKod).filter(Boolean);
    if (tarixce.length > 0) return tarixce.slice(0, 3);
    return PILOT_RAYONLARI.map(districtByKod).filter(Boolean);
  }, [sonKodlar]);

  const secilenAd = secilen?.name ?? null;

  return (
    <div>
      {/* GPS AYRI VƏ KOMPAKT: icazə yalnız bu düyməyə toxunandan sonra
          istənilir — ekran açılan kimi sistem dialoqu çıxarmaq fermerə
          nə üçün soruşulduğunu izah etmədən icazə istəməkdir */}
      <button
        type="button"
        onClick={busy ? legvEt : requestGps}
        className="basilir flex w-full items-center gap-3 px-3 text-left"
        style={{
          backgroundColor: C.fieldSoft,
          borderRadius: 16,
          minHeight: 64,
          paddingBlock: 10,
        }}
      >
        <span
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ border: `1.5px solid ${C.ink}`, width: 38, height: 38 }}
        >
          <Icon name={busy ? "LoaderCircle" : "Crosshair"} size={20} color={C.ink} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold" style={{ color: C.ink, ...TIPO.duyme }}>
            {busy ? t("onb.rayon.gpsGedir") : t("onb.rayon.gpsCta")}
          </span>
          <span className="block" style={{ color: C.muted, ...TIPO.qeyd }}>
            {busy ? t("onb.rayon.gpsLegv") : t("onb.rayon.gpsIzah")}
          </span>
        </span>
      </button>

      {gps.status === "error" && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-2 px-3 py-2"
          style={{ backgroundColor: C.warnSoft, borderRadius: RADIUS.idare }}
        >
          <Icon name={XETA_IKONU[gps.sebeb] ?? "AlertCircle"} size={16} color={C.warn} />
          <div className="min-w-0 flex-1">
            <p style={{ color: C.warnInk, ...TIPO.qeyd }}>{t(gps.errorKey)}</p>
            {tekrarOlar && (
              <button
                type="button"
                onClick={requestGps}
                className="mt-0.5 font-bold underline"
                style={{ color: C.warnInk, ...TIPO.qeyd, minHeight: 32 }}
              >
                {t("onb.rayon.gpsTekrar")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Yazmaq və siyahı EYNİ idarəetmədir: xanaya toxunmaq vərəqi açır */}
      <button
        type="button"
        onClick={() => setVereq(true)}
        autoFocus={avtoFokus}
        aria-haspopup="dialog"
        aria-expanded={vereq}
        className="basilir mt-3 flex w-full items-center gap-2 px-3 text-left"
        style={{
          backgroundColor: C.card,
          border: `1px solid ${secilenAd ? C.field : C.line}`,
          borderRadius: 16,
          minHeight: 54,
        }}
      >
        <Icon name="Search" size={16} color={C.muted} />
        <span className="flex-1 truncate" style={{ color: secilenAd ? C.ink : C.muted, ...TIPO.metn }}>
          {secilenAd ?? t("onb.rayon.axtar")}
        </span>
        {secilenAd ? (
          <Icon name="Check" size={16} color={C.field} />
        ) : (
          <Icon name="ChevronRight" size={16} color={C.muted} />
        )}
      </button>

      {cipler.length > 0 && (
        <p className="mt-4 mb-2" style={{ color: C.ink, ...TIPO.qeyd, fontWeight: 700 }}>
          {t("onb.rayon.tezTez")}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {cipler.map((rayon) => {
          const secilib = rayon.kod === secilen?.kod;
          return (
            <button
              key={rayon.kod}
              type="button"
              onClick={() => onSec({ ...rayon, gps: false })}
              aria-pressed={secilib}
              className="basilir px-3"
              style={{
                backgroundColor: secilib ? C.fieldSoft : C.card,
                border: `1px solid ${secilib ? C.field : C.line}`,
                borderRadius: RADIUS.tam,
                color: secilib ? C.field : C.ink,
                minHeight: TOXUNMA,
                ...TIPO.duyme,
              }}
            >
              {rayon.name}
            </button>
          );
        })}
      </div>

      <RayonVereqi
        acilib={vereq}
        onBagla={() => setVereq(false)}
        secilenKod={secilen?.kod ?? null}
        sonKodlar={sonKodlar}
        onSec={(rayon) => onSec({ ...rayon, gps: false })}
      />
    </div>
  );
}

export { DISTRICTS };
