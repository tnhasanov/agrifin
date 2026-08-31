import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { SaheIllustrasiyasi } from "./SaheIllustrasiyasi.jsx";

/**
 * İlk sahə dəvəti (hal A) — yeni fermerin gördüyü YEGANƏ böyük blok.
 *
 * PDF mockup-una uyğun: kart YOXDUR — illüstrasiya və mətn birbaşa açıq
 * fonda oturur, başlıq yaşıl display şriftlə. Bir aydın hərəkət + dürüst
 * vaxt gözləntisi. Nə bal, nə limit, nə uydurma göstərici.
 * Sahə çəkmə MÖVCUD axına gedir (FieldDraw) — davam edən cızma qorunur.
 */
export function BosSahe({ onDrawField, onNece }) {
  const { t } = useI18n();

  return (
    <div className="giris mt-2 text-center">
      <SaheIllustrasiyasi />
      <h2
        className="mt-3 text-2xl font-extrabold"
        style={{ color: C.field, fontFamily: font.display }}
      >
        {t("pano.bosBasliq")}
      </h2>
      <p
        className="mx-auto mt-2 max-w-[36ch] text-sm leading-relaxed"
        style={{ color: C.muted }}
      >
        {t("pano.bosMetn")}
      </p>
      <button
        type="button"
        onClick={onDrawField}
        className="mt-4 w-full rounded-2xl py-3.5 text-sm font-bold"
        style={{ backgroundColor: C.pine, color: "#fff", minHeight: 48 }}
      >
        {t("pano.bosCta")}
      </button>
      <button
        type="button"
        onClick={onNece}
        className="mt-2.5 w-full rounded-2xl py-3 text-sm font-bold"
        style={{ backgroundColor: "transparent", color: C.pine, border: `1.5px solid ${C.pine}`, minHeight: 48 }}
      >
        {t("pano.bosNece")}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: C.muted }}>
        <Icon name="Clock" size={13} color={C.muted} />
        {t("pano.bosVaxt")}
      </p>
    </div>
  );
}
