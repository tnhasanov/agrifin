import { Card } from "../../components/Card.jsx";
import { Icon } from "../../components/Icon.jsx";
import { Aqronom } from "../../components/Aqronom.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";

/**
 * İlk sahə dəvəti (hal A) — yeni fermerin gördüyü YEGANƏ böyük kart.
 *
 * Bir aydın hərəkət + dürüst vaxt gözləntisi. Burada nə bal, nə limit,
 * nə uydurma göstərici var: sahə yoxdursa rəqəm də yoxdur.
 * Sahə çəkmə MÖVCUD axına gedir (FieldDraw) — davam edən cızma qorunur.
 */
export function BosSahe({ onDrawField, onNece }) {
  const { t } = useI18n();
  const { state } = useStore();

  return (
    <Card className="giris" style={{ marginTop: 12, textAlign: "center" }}>
      <div className="flex justify-center">
        <Aqronom hal="sakit" bitki={state.chat.crop} olcu={110} gorunus="tam" />
      </div>
      <p className="mt-1 text-base font-bold" style={{ color: C.ink, fontFamily: font.display }}>
        {t("pano.bosBasliq")}
      </p>
      <p
        className="mx-auto mt-1 max-w-[34ch] text-xs leading-relaxed"
        style={{ color: C.muted }}
      >
        {t("pano.bosMetn")}
      </p>
      <button
        type="button"
        onClick={onDrawField}
        className="mt-3 w-full rounded-xl py-3 text-sm font-bold"
        style={{ backgroundColor: C.pine, color: "#fff", minHeight: 44 }}
      >
        {t("pano.bosCta")}
      </button>
      <button
        type="button"
        onClick={onNece}
        className="mt-2 w-full rounded-xl py-2.5 text-xs font-bold"
        style={{ backgroundColor: C.mist, color: C.pine, minHeight: 44 }}
      >
        {t("pano.bosNece")}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1 text-xs" style={{ color: C.muted }}>
        <Icon name="Clock" size={12} color={C.muted} />
        {t("pano.bosVaxt")}
      </p>
    </Card>
  );
}
