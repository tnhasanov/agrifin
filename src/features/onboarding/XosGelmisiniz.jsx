import { Icon } from "../../components/Icon.jsx";
import { C, ARA, RADIUS, TIPO, TOXUNMA, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { SaheHero } from "./SaheHero.jsx";

/**
 * EKRAN 0 — XOŞ GƏLDİNİZ.
 *
 * Bu ekran SAYĞACIN İÇİNDƏ DEYİL: "1 / 3" fermerin görəcəyi işi sayır,
 * xoş gəldiniz isə iş deyil. Sayğaca salsaq üç addım dörd görünür və axın
 * uzun hiss olunur.
 *
 * DƏYƏR İCAZƏDƏN ƏVVƏLDİR: burada nə rayon, nə nömrə, nə də icazə
 * soruşulur — fermer nə alacağını bilir, sonra ilk sualı görür.
 *
 * Bir mobil viewport-a sığır: media kartı ekranın yarısı, mətn və iki
 * hərəkət altında. Karusel yoxdur — üç slaydlı "tanıtım" fermerin
 * qabağına üç ekran qoyub bir dənə də məlumat vermir.
 */
export function XosGelmisiniz({ onBasla, onGiris }) {
  const { t } = useI18n();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("onb.title")}
      className="absolute inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: C.ivory,
        fontFamily: font.body,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div
        className="flex shrink-0 items-center gap-2"
        style={{ paddingInline: ARA.kenar, paddingTop: 12, paddingBottom: 10 }}
      >
        <span className="rounded-xl p-1.5" style={{ backgroundColor: C.pine }}>
          <Icon name="Leaf" size={16} color={C.gold} />
        </span>
        <span className="font-extrabold" style={{ color: C.pine, fontFamily: font.display, ...TIPO.duyme }}>
          {t("app.name")}
        </span>
      </div>

      {/* Media kartı: künclər yumşaq, kənarları ivory fonda «nəfəs alır» */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ marginInline: ARA.kenar, borderRadius: 24 }}
      >
        <SaheHero />

        {/* Başlıq şəklin ÜSTÜNDƏ, pərdənin içində — jurnal qapağı kimi */}
        <div className="absolute right-0 bottom-0 left-0" style={{ padding: ARA.kart + 2 }}>
          <h1
            style={{
              color: "#FFFFFF",
              fontFamily: font.display,
              fontSize: 26,
              lineHeight: "32px",
              fontWeight: 800,
            }}
          >
            {t("onb.xos.basliq1")}
            <br />
            <span style={{ color: C.gold }}>{t("onb.xos.basliq2")}</span>
          </h1>
          <p className="mt-2" style={{ color: "rgba(255,255,255,0.88)", ...TIPO.metn }}>
            {t("onb.xos.izah")}
          </p>
        </div>
      </div>

      <div
        className="shrink-0"
        style={{
          paddingInline: ARA.kenar,
          paddingTop: 16,
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <button
          type="button"
          onClick={onBasla}
          className="basilir w-full font-bold"
          style={{
            backgroundColor: C.pine,
            color: "#FFFFFF",
            borderRadius: RADIUS.idare,
            minHeight: 52,
            ...TIPO.duyme,
          }}
        >
          {t("onb.xos.basla")}
        </button>

        {/* Hesab girişi İKİNCİDİR: qeydiyyat qapıda tələb olunmur, sahə
            saxlananda lazım olacaq (bax: FieldDraw → OTP axını) */}
        <button
          type="button"
          onClick={onGiris}
          className="mt-1 flex w-full items-center justify-center gap-2 font-semibold"
          style={{ color: C.field, minHeight: TOXUNMA, ...TIPO.duyme }}
        >
          <Icon name="User" size={16} color={C.field} />
          {t("onb.xos.giris")}
        </button>
      </div>
    </div>
  );
}
