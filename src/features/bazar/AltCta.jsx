import { C, RADIUS, TIPO } from "../../theme/tokens.js";

/**
 * ALT CTA ZOLAĞI — sürüşən məzmunun İÇİNDƏ yapışqan (sticky) ətək.
 *
 * Niyə `position: fixed` deyil: tətbiqin gövdəsi `<main>`-də sürüşür, alt
 * naviqasiya isə onun altındadır. Sticky zolaq main-in dibinə yapışır,
 * naviqasiyanın ÜSTÜNDƏ qalır və düzülüşdə yer tutur — məzmunun son sətri
 * düymənin altında itmir (brief: "fixed CTAs do not cover content").
 *
 * BİR EKRANDA BİR DOLU DÜYMƏ: ikinci hərəkət həmişə konturludur.
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
          <button
            type="button"
            onClick={ikinci.onClick}
            disabled={ikinci.disabled}
            className="basilir flex-1 font-bold"
            style={{
              minHeight: 52,
              borderRadius: RADIUS.idare,
              backgroundColor: C.card,
              color: ikinci.reng ?? C.pine,
              border: `1px solid ${ikinci.reng ?? C.pine}`,
              opacity: ikinci.disabled ? 0.5 : 1,
              ...TIPO.duyme,
            }}
          >
            {ikinci.label}
          </button>
        )}
        {esas && (
          <button
            type="button"
            onClick={esas.onClick}
            disabled={esas.disabled}
            className="basilir flex-1 font-bold"
            style={{
              minHeight: 52,
              borderRadius: RADIUS.idare,
              backgroundColor: esas.disabled ? C.mist : (esas.reng ?? C.pine),
              color: esas.disabled ? C.muted : "#fff",
              border: `1px solid ${esas.disabled ? C.line : (esas.reng ?? C.pine)}`,
              ...TIPO.duyme,
            }}
          >
            {esas.label}
          </button>
        )}
      </div>
    </div>
  );
}
