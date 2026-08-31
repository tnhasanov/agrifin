import { Icon } from "../../components/Icon.jsx";
import { Sheet } from "../../components/Sheet.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";

/**
 * "NECƏ İŞLƏYİR?" — ilk sahə halının (hal A) izah paneli.
 *
 * NİYƏ ÇAT DEYİL: bu düymə əvvəl ümumi Aqronom çatını açırdı. Fermer
 * "sahəni necə çəkim?" sualına cavab gözləyirdi, qarşısına isə boş yazı
 * xanası çıxırdı — sual verməyi bilməyən adam elə ona görə düyməyə basır.
 * İzah SABİT və qısadır: üç addım, sonra elə oradaca çəkməyə keçid.
 *
 * Addımlar FieldDraw-un faktiki davranışını deyir (bax: features/field):
 * künclərə toxun → ən azı 3 nöqtə → saxla. Uydurma addım yoxdur.
 */
const ADDIMLAR = [
  { ikon: "MapPin", basliqKey: "nece.addim1", metnKey: "nece.addim1Metn" },
  { ikon: "Crosshair", basliqKey: "nece.addim2", metnKey: "nece.addim2Metn" },
  { ikon: "Check", basliqKey: "nece.addim3", metnKey: "nece.addim3Metn" },
];

export function NeceIsleyir({ acilib, onBagla, onDrawField }) {
  const { t } = useI18n();

  return (
    <Sheet
      acilib={acilib}
      onBagla={onBagla}
      baslik={t("pano.bosNece")}
      altYazi={t("nece.altYazi")}
    >
      <ol className="pb-1">
        {ADDIMLAR.map((addim, sira) => (
          <li
            key={addim.basliqKey}
            className="giris mb-2 flex items-start gap-3 rounded-2xl px-3.5 py-3"
            style={{ backgroundColor: C.mist, "--i": sira }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-xl bg-white"
              style={{ width: 34, height: 34 }}
            >
              <Icon name={addim.ikon} size={16} color={C.field} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
                <span style={{ color: C.field }}>{sira + 1}.</span> {t(addim.basliqKey)}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: C.muted }}>
                {t(addim.metnKey)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {/* İzahın sonu boşluğa çıxmır: fermer elə buradan çəkməyə keçir */}
      <button
        type="button"
        onClick={() => {
          onBagla();
          onDrawField?.();
        }}
        className="mt-1 w-full rounded-2xl py-3.5 text-sm font-bold"
        style={{ backgroundColor: C.pine, color: "#fff", minHeight: 48 }}
      >
        {t("pano.bosCta")}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 pb-1 text-xs" style={{ color: C.muted }}>
        <Icon name="Clock" size={13} color={C.muted} />
        {t("pano.bosVaxt")}
      </p>
    </Sheet>
  );
}
