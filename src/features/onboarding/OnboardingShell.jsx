import { Icon } from "../../components/Icon.jsx";
import { C, ARA, RADIUS, TIPO, TOXUNMA, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/**
 * ONBOARDING ÇƏRÇİVƏSİ — hər addımın eyni skeleti.
 *
 * Üç zolaq var və bu bölgü qəsdəndir:
 *   başlıq  — geri + irəliləyiş (sabit);
 *   gövdə   — SÜRÜŞƏN hissə;
 *   ətək    — bir dolu CTA + bir mətn keçidi (sabit).
 *
 * CTA-nın ətəkdə SABİT qalması vacibdir: bitki siyahısı uzundur, CTA
 * gövdənin içində olsaydı fermer onu tapmaq üçün sürüşdürməli olardı və
 * klaviatura qalxanda düymə ekrandan çıxardı.
 *
 * BİR VİEWPORT-DA BİR DOLU DÜYMƏ: ikinci hərəkət həmişə mətn/outline-dır.
 */
export function OnboardingShell({
  addim,
  cemi,
  onGeri,
  basliq,
  altYazi,
  children,
  cta,
  ctaSonek,
  ikinci,
  etiket,
}) {
  const { t } = useI18n();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={etiket ?? basliq}
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: C.mist,
        fontFamily: font.body,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <header
        className="flex shrink-0 items-center gap-3"
        style={{ paddingInline: ARA.kenar, paddingTop: 12, paddingBottom: 8 }}
      >
        {onGeri ? (
          <button
            type="button"
            onClick={onGeri}
            aria-label={t("onb.back")}
            className="basilir flex items-center justify-center rounded-full"
            style={{
              backgroundColor: C.card,
              border: `1px solid ${C.line}`,
              minWidth: TOXUNMA,
              minHeight: TOXUNMA,
            }}
          >
            <Icon name="ChevronLeft" size={20} color={C.ink} />
          </button>
        ) : (
          <span style={{ minWidth: TOXUNMA }} />
        )}

        {addim ? <StepProgress addim={addim} cemi={cemi} /> : <span className="flex-1" />}
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ paddingInline: ARA.kenar, paddingBottom: 8 }}
      >
        <h1 style={{ color: C.ink, fontFamily: font.display, ...TIPO.ekranBasliq }}>{basliq}</h1>
        {altYazi && (
          <p className="mt-1.5" style={{ color: C.muted, ...TIPO.metn }}>
            {altYazi}
          </p>
        )}
        <div style={{ marginTop: ARA.bolme - 8 }}>{children}</div>
      </div>

      <footer
        className="shrink-0"
        style={{
          paddingInline: ARA.kenar,
          paddingTop: 12,
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
          backgroundColor: C.mist,
          borderTop: `1px solid ${C.line}`,
        }}
      >
        {cta && (
          <button
            type="button"
            onClick={cta.onClick}
            disabled={cta.disabled}
            className="basilir w-full font-bold"
            style={{
              backgroundColor: C.pine,
              color: "#FFFFFF",
              borderRadius: RADIUS.idare,
              minHeight: 52,
              opacity: cta.disabled ? 0.45 : 1,
              ...TIPO.duyme,
            }}
          >
            {cta.label}
          </button>
        )}
        {ctaSonek && (
          <p className="mt-1.5 text-center" style={{ color: C.muted, ...TIPO.qeyd }}>
            {ctaSonek}
          </p>
        )}
        {ikinci && (
          <button
            type="button"
            onClick={ikinci.onClick}
            className="mt-1 w-full font-semibold"
            style={{ color: C.field, minHeight: TOXUNMA, ...TIPO.duyme }}
          >
            {ikinci.label}
          </button>
        )}
      </footer>
    </div>
  );
}

/**
 * İRƏLİLƏYİŞ — üç seqment və "1 / 3".
 *
 * Rəqəm mətn kimi də verilir: yalnız zolaqlara baxan fermer neçə addım
 * qaldığını dəqiq bilmir, ekran oxuyucusu isə zolağı heç görmür.
 */
export function StepProgress({ addim, cemi }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 items-center gap-3">
      <div
        className="flex flex-1 items-center gap-1.5"
        role="progressbar"
        aria-valuenow={addim}
        aria-valuemin={1}
        aria-valuemax={cemi}
        aria-label={t("onb.step", { current: addim, total: cemi })}
      >
        {Array.from({ length: cemi }, (_, index) => (
          <span
            key={index}
            className="h-1 flex-1 rounded-full"
            style={{ backgroundColor: index < addim ? C.field : C.line }}
          />
        ))}
      </div>
      <span aria-hidden="true" style={{ color: C.muted, ...TIPO.qeyd, fontWeight: 700 }}>
        {addim} / {cemi}
      </span>
    </div>
  );
}
