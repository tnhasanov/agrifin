import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { formatNumber } from "../../lib/format.js";
import { IndeksKarti } from "../score/IndeksKarti.jsx";

/**
 * FARMSCORE KARTI — ana səhifənin yaşıl mərkəzi (PDF mockup: 02 Visual ref).
 *
 * Yastı yaşıl kart (#245B3A) üç şey daşıyır:
 *   1. Sahənin adı və ölçüsü — Sahələr ekranına keçid;
 *   2. Balın özü (və ya hal B qapısı) — İÇİNDƏKİ IndeksKarti dəyişməyib:
 *      qapı mətnləri, halqa, mövsüm qrafiki hamısı oradadır. Bu kart yalnız
 *      ÇƏRÇİVƏDİR — qapı məntiqini təkrarlamaq iki həqiqət yaradardı;
 *   3. Ağ lövhə: üç dürüst fakt — Bitki örtüyü / Torpaq rütubəti /
 *      Son yenilənmə. Mock "Bitki sağlamlığı" yazır, biz "Bitki örtüyü"
 *      saxlayırıq: NDVI örtüyü ölçür, sağlamlığı yox — ad da düz olmalıdır.
 *
 * Ölçmə yoxdursa lövhədə "—" durur: uydurma rəqəm qadağandır.
 */
export function FarmScoreKarti({
  farmLine,
  indeksHali,
  faiz = null,
  istiqamet = null,
  suSeviyyesi = null,
  gunEvvel = null,
  onBax,
}) {
  const { t, lang } = useI18n();

  return (
    <div
      className="giris mt-3 rounded-3xl px-4 pt-3.5 pb-4"
      style={{ backgroundColor: C.scoreCard }}
    >
      {/* Sahə adı + keçid — mock-dakı sağ chevron */}
      <button
        type="button"
        onClick={onBax}
        className="flex w-full items-center justify-between gap-2"
        style={{ minHeight: 44 }}
      >
        <span className="text-base font-bold text-white" style={{ fontFamily: font.display }}>
          {farmLine}
        </span>
        <Icon name="ChevronRight" size={16} color="rgba(255,255,255,0.7)" />
      </button>

      {/* Bal və ya hal B qapısı — mövcud komponent, tünd fon üçün onsuz da uyğundur */}
      <IndeksKarti indeksHali={indeksHali} />

      {/* Ağ fakt lövhəsi — mock-dakı üç sütun */}
      <div className="mt-3 grid grid-cols-3 gap-0 rounded-2xl bg-white px-1 py-2.5">
        <FaktSutunu ikon="Leaf" etiket={t("home.cropHealth")}>
          {faiz == null ? "—" : `${formatNumber(faiz, lang)}%`}
          {istiqamet && istiqamet !== "sabit" && (
            <span
              className="ml-0.5 text-xs"
              style={{ color: istiqamet === "artir" ? C.field : C.danger }}
            >
              {istiqamet === "artir" ? "▲" : "▼"}
            </span>
          )}
        </FaktSutunu>
        <FaktSutunu ikon="Droplets" etiket={t("pano.torpaqRutubeti")} orta>
          {suSeviyyesi == null ? "—" : t(`pano.su.${suSeviyyesi}`)}
        </FaktSutunu>
        <FaktSutunu ikon="Calendar" etiket={t("pano.sonYenilenme")}>
          {gunEvvel == null
            ? "—"
            : gunEvvel === 0
              ? t("pano.buGun")
              : t("pano.gunEvvel", { gun: gunEvvel })}
        </FaktSutunu>
      </div>
    </div>
  );
}

function FaktSutunu({ ikon, etiket, orta = false, children }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 px-1 text-center"
      style={orta ? { borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}` } : undefined}
    >
      <span className="flex items-center gap-1" style={{ color: C.muted, fontSize: 10 }}>
        <Icon name={ikon} size={11} color={C.muted} />
        {etiket}
      </span>
      <span className="text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
        {children}
      </span>
    </div>
  );
}
