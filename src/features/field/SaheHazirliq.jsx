import { Card } from "../../components/Card.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

function Addim({ ikon, basliq, izah, hal }) {
  const tamam = hal === "tamam";
  const aktiv = hal === "aktiv";
  const xeta = hal === "xeta";
  const reng = xeta ? C.danger : tamam ? C.field : aktiv ? C.goldDeep : C.muted;

  return (
    <li className="flex items-start gap-3 py-2">
      <span
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 30, height: 30, backgroundColor: tamam ? C.fieldSoft : C.mist }}
      >
        <Icon name={tamam ? "Check" : ikon} size={14} color={reng} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold" style={{ color: C.ink }}>
          {basliq}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: C.muted }}>
          {izah}
        </span>
      </span>
    </li>
  );
}

/** Yeni kontur saxlanandan sonra peyk nəticəsinin hansı mərhələdə olduğunu göstərir. */
export function SaheHazirliq({ peykHal, onBagla }) {
  const { t } = useI18n();
  const hazirdir = peykHal === "hazir";
  const gozleyir = peykHal === "olcmeYox";
  const xeta = peykHal === "xeta" || peykHal === "qurulmayib";

  return (
    <Card className="giris" style={{ marginTop: 12, backgroundColor: C.card }} role="status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {t("field.progressTitle")}
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
            {t("field.progressSubtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={onBagla}
          aria-label={t("common.close")}
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: 40, height: 40, backgroundColor: C.mist }}
        >
          <Icon name="X" size={15} color={C.muted} />
        </button>
      </div>

      <ol className="mt-2 divide-y" style={{ borderColor: C.line }}>
        <Addim
          ikon="MapPin"
          basliq={t("field.progressSaved")}
          izah={t("field.progressSavedText")}
          hal="tamam"
        />
        <Addim
          ikon={xeta ? "AlertCircle" : gozleyir ? "Clock" : "Satellite"}
          basliq={t(gozleyir ? "field.progressWaiting" : "field.progressSatellite")}
          izah={t(
            xeta
              ? "field.progressSatelliteError"
              : gozleyir
                ? "field.progressWaitingText"
                : hazirdir
                  ? "field.progressSatelliteDone"
                  : "field.progressSatelliteText",
          )}
          hal={xeta ? "xeta" : hazirdir ? "tamam" : "aktiv"}
        />
        <Addim
          ikon="Leaf"
          basliq={t("field.progressResult")}
          izah={t(hazirdir ? "field.progressResultDone" : "field.progressResultText")}
          hal={hazirdir ? "tamam" : "gozleyir"}
        />
      </ol>
    </Card>
  );
}
