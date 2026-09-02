import { Icon } from "../../components/Icon.jsx";
import { C, ARA, RADIUS, TIPO, TOXUNMA, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import heroSekli from "../../assets/hero/sahe.webp";

/**
 * EKRAN 0 — XOŞ GƏLDİNİZ.
 *
 * ═══ KOMPOZİSİYA ══════════════════════════════════════════════════════
 * Şəkil TAM ENDƏDİR (kart deyil) və aşağıya doğru fona qarışır; başlıq
 * şəklin ÜSTÜNDƏ deyil, o işığın içində, TÜND rənglə oturur. Əvvəl tünd
 * pərdə üzərində ağ mətn vardı — o, reklam banneri kimi görünürdü;
 * jurnal qapağının yetkinliyi kontrastdan yox, işıqdan gəlir.
 *
 * ═══ ŞƏKİL YUVASI ═════════════════════════════════════════════════════
 * Fon `src/assets/hero/sahe.webp` faylıdır. Lisenziyalı aerofoto gələndə
 * yalnız həmin fayl əvəz olunur — burada heç nə dəyişmir (bax:
 * scripts/hero-render.py).
 *
 * Bu ekran SAYĞACIN İÇİNDƏ DEYİL: "1 / 3" fermerin görəcəyi işi sayır,
 * xoş gəldiniz isə iş deyil. Karusel yoxdur — üç slaydlı "tanıtım"
 * fermerin qabağına üç ekran qoyub bir dənə də məlumat vermir.
 */
export function XosGelmisiniz({ onBasla, onGiris }) {
  const { t } = useI18n();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("onb.title")}
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{
        backgroundColor: C.ivory,
        fontFamily: font.body,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div
        className="relative z-10 flex shrink-0 items-center gap-2"
        style={{ paddingInline: ARA.kenar, paddingTop: 12, paddingBottom: 10 }}
      >
        <span
          className="flex items-center justify-center rounded-full"
          style={{ backgroundColor: C.pine, width: 30, height: 30 }}
        >
          <Icon name="Leaf" size={16} color={C.gold} />
        </span>
        <span
          className="font-extrabold"
          style={{ color: C.ink, fontFamily: font.display, fontSize: 17 }}
        >
          {t("app.name")}
        </span>
      </div>

      {/* Şəkil sənədin fonudur: mətn onun ardınca gəlir, üstündə yox */}
      <img
        src={heroSekli}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 select-none"
        style={{ top: 52, height: "62%", width: "100%", objectFit: "cover", objectPosition: "center top" }}
      />

      <div className="min-h-0 flex-1" />

      <div
        className="relative z-10 shrink-0"
        style={{
          paddingInline: ARA.kenar,
          paddingBottom: "max(14px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <h1
          style={{
            fontFamily: font.display,
            fontSize: 30,
            lineHeight: "37px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          <span style={{ color: C.pine }}>{t("onb.xos.basliq1")}</span>
          <br />
          <span style={{ color: C.goldDeep }}>{t("onb.xos.basliq2")}</span>
        </h1>

        <p className="mt-3" style={{ color: C.muted, ...TIPO.metn, maxWidth: "31ch" }}>
          {t("onb.xos.izah")}
        </p>

        <button
          type="button"
          onClick={onBasla}
          className="basilir mt-5 w-full font-bold"
          style={{
            backgroundColor: C.pine,
            color: "#FFFFFF",
            borderRadius: RADIUS.idare,
            minHeight: 54,
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
          style={{ color: C.ink, minHeight: TOXUNMA, ...TIPO.duyme }}
        >
          <Icon name="User" size={16} color={C.muted} />
          {t("onb.xos.giris")}
        </button>
      </div>
    </div>
  );
}
