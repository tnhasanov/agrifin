import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { hesabatSetirleri, paylas } from "../../services/paylas.js";
import { necheGunEvvel, ortukFaizi } from "../../services/ndvi.js";

/**
 * "Hesabatı paylaş" — ölçməni fermerin öz söhbətinə çıxarır.
 *
 * Aqronomla, oğlu ilə, alıcı ilə danışıq WhatsApp-dadır; hesabat orada
 * oxunmursa, ümumiyyətlə oxunmur. Mətnin sonundakı keçid tətbiqi tanıdır.
 *
 * Ölçmə yoxdursa düymə göstərilmir: boş hesabat paylaşmaq fermeri utandırır.
 */
export function HesabatPaylas({ hektar, bitkiKey, xulase, muqayise, siqnal }) {
  const { t } = useI18n();
  const [hal, setHal] = useState(null);

  const faiz = ortukFaizi(xulase?.ndvi);
  if (!Number.isFinite(faiz)) return null;

  const setirler = hesabatSetirleri({
    hektar,
    bitkiKey,
    faiz,
    medyanFaiz: ortukFaizi(muqayise?.medyan),
    suSeviyyesi: xulase?.suSeviyyesi,
    gun: xulase?.tarix ? necheGunEvvel(xulase.tarix) : null,
    siqnalKey: siqnal?.basliqKey,
  });

  const metniQur = () =>
    [
      t("paylas.basliq"),
      ...setirler.map((setir) => t(setir.key, setir.vars)),
      // Ünvan zamanla alınır: yayım domeni dəyişsə mətn öz-özünə düzəlir
      globalThis.location?.origin ?? "",
    ]
      .filter(Boolean)
      .join("\n");

  const basildi = async () => {
    const netice = await paylas({ metn: metniQur(), basliq: t("paylas.basliq") });
    // Vərəq açılıbsa fermer artıq oradadır — ekranda mesaj göstərməyin mənası
    // yoxdur. Yalnız görünməyən nəticələr deyilir.
    setHal(netice === "kopyalandi" || netice === "olmadi" ? netice : null);
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={basildi}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-bold"
        style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, color: C.pine }}
      >
        <Icon name="Share2" size={16} color={C.pine} /> {t("paylas.duyme")}
      </button>
      {hal && (
        <p className="mt-1.5 text-center text-xs" role="status" style={{ color: C.muted }}>
          {t(`paylas.${hal}`)}
        </p>
      )}
    </div>
  );
}
