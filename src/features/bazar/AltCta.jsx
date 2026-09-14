import { Button } from "../../components/Button.jsx";
import { C } from "../../theme/tokens.js";

/**
 * ALT CTA ZOLAĞI — sürüşən məzmunun İÇİNDƏ yapışqan (sticky) ətək.
 *
 * Niyə `position: fixed` deyil: tətbiqin gövdəsi `<main>`-də sürüşür, alt
 * naviqasiya isə onun altındadır. Sticky zolaq main-in dibinə yapışır,
 * naviqasiyanın ÜSTÜNDƏ qalır və düzülüşdə yer tutur — məzmunun son sətri
 * düymənin altında itmir (brief: "fixed CTAs do not cover content").
 *
 * İYERARXİYA SABİTDİR: `esas` həmişə primary (dolu), `ikinci` həmişə
 * secondary (konturlu, NEYTRAL rəng). Əvvəl ikinci düymə bənövşəyi kontur
 * ala bilirdi və əsas düymə ilə rəqabət edirdi; indi rəng yalnız əsas
 * düymənin tonunu seçir (maliyyə hərəkəti → bənövşəyi).
 */
export function AltCta({ esas, ikinci, ust }) {
  return (
    <div
      className="sticky bottom-0 z-10 -mx-4 px-4 pt-2"
      style={{
        paddingBottom: 12,
        background: `linear-gradient(to bottom, rgba(244,247,242,0) 0%, ${C.mist} 22%)`,
      }}
    >
      {ust}
      <div className="flex gap-2">
        {ikinci && (
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={ikinci.onClick}
            disabled={ikinci.disabled}
            loading={ikinci.loading}
          >
            {ikinci.label}
          </Button>
        )}
        {esas && (
          <Button
            variant="primary"
            ton={esas.reng === C.mal ? "mal" : "pine"}
            size="lg"
            className="flex-1"
            onClick={esas.onClick}
            disabled={esas.disabled}
            loading={esas.loading}
          >
            {esas.label}
          </Button>
        )}
      </div>
    </div>
  );
}
