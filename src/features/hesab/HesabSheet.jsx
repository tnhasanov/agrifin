import { useCallback, useRef, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { Sheet } from "../../components/Sheet.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { hesabdanCix, kodIste, kodTesdiqle } from "../../services/hesab.js";

/** Serverin xəta açarı → i18n. Tanınmayan hər şey ümumi "xeta"dır. */
const XETA_ACARLARI = new Set(["telefonYanlis", "hedd", "smsGetmedi", "yanlis", "bitib"]);
const xetaAcari = (error) => {
  if (error?.status === 501) return "qurulmayib";
  return XETA_ACARLARI.has(error?.acar) ? error.acar : "xeta";
};

/**
 * Telefonla giriş — iki addım: nömrə → SMS kodu.
 *
 * Parol yoxdur və olmayacaq: kənd istifadəçisi üçün parol = itirilmiş hesab.
 * Telefon nömrəsi HƏM identifikator, HƏM açardır (bank tətbiqlərindəki kimi).
 *
 * Giriş İSTƏYƏ BAĞLIDIR: tətbiq hesabsız tam işləyir. Hesab yalnız sahəni
 * cihazdan asılı olmaqdan çıxarır — bunu altyazı da deyir.
 */
export function HesabSheet({ acilib, onBagla }) {
  const { t } = useI18n();
  const { state, actions } = useStore();
  const [addim, setAddim] = useState("telefon"); // telefon | kod
  const [telefon, setTelefon] = useState("");
  const [kod, setKod] = useState("");
  const [gedir, setGedir] = useState(false);
  const [xeta, setXeta] = useState(null);
  const [rejim, setRejim] = useState(null);
  // Kod addımına keçəndə fokus kod xanasına düşsün
  const kodRef = useRef(null);

  const daxildir = state.hesab.telefon;

  const sifirla = useCallback(() => {
    setAddim("telefon");
    setKod("");
    setXeta(null);
    setRejim(null);
  }, []);

  // Sabit identifikator: hər render-də yeni funksiya versək Sheet-in
  // klaviatura effekti hər hərfdə yenidən qurulur (bax: components/Sheet.jsx)
  const bagla = useCallback(() => {
    sifirla();
    onBagla();
  }, [sifirla, onBagla]);

  const kodGonder = async (hadise) => {
    hadise.preventDefault();
    if (gedir) return;
    setGedir(true);
    setXeta(null);
    try {
      const cavab = await kodIste(telefon);
      setRejim(cavab.rejim);
      setAddim("kod");
      setKod("");
      setTimeout(() => kodRef.current?.focus(), 50);
    } catch (error) {
      setXeta(xetaAcari(error));
    } finally {
      setGedir(false);
    }
  };

  const tesdiqle = async (hadise) => {
    hadise.preventDefault();
    if (gedir) return;
    setGedir(true);
    setXeta(null);
    try {
      const cavab = await kodTesdiqle(telefon, kod);
      actions.hesabTelefon(cavab.telefon);
      actions.showToast("toast.hesabGirdi");
      bagla();
    } catch (error) {
      setXeta(xetaAcari(error));
      setKod("");
    } finally {
      setGedir(false);
    }
  };

  const cix = async () => {
    if (gedir) return;
    setGedir(true);
    try {
      await hesabdanCix();
    } catch {
      // Server çatmasa da yerli vəziyyət təmizlənir — cookie onsuz da bitəcək
    } finally {
      actions.hesabCixdi();
      actions.showToast("toast.hesabCixdi");
      setGedir(false);
      bagla();
    }
  };

  const duyme =
    "mt-3 w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50";
  const xana =
    "mt-1 w-full rounded-xl px-3.5 py-3 text-sm outline-none";
  const xanaStil = {
    backgroundColor: C.mist,
    border: `1px solid ${C.line}`,
    color: C.ink,
  };

  return (
    <Sheet
      acilib={acilib}
      onBagla={bagla}
      baslik={daxildir ? t("hesab.tesdiqlendi") : t("hesab.basliq")}
      // NİYƏ SAHƏYƏ GÖRƏ FƏRQLİ CÜMLƏ: hesab təbliği yalnız dəyər görünəndən
      // sonra mənalıdır. Sahə varsa qorunacaq konkret bir şey var və cümlə
      // onu adlandırır; sahəsiz halda ümumi izah qalır (bax: PDF 22).
      altYazi={daxildir ? null : state.sahe ? t("hesab.saheIzah") : t("hesab.altyazi")}
    >
      {daxildir ? (
        <div className="pb-2">
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: C.mist }}
          >
            <div className="rounded-full p-2" style={{ backgroundColor: "rgba(96,190,134,0.18)" }}>
              <Icon name="UserCheck" size={16} color={C.field} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
                {daxildir}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
                {t("hesab.qorunur")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cix}
            disabled={gedir}
            className={duyme}
            style={{ backgroundColor: C.mist, color: C.danger }}
          >
            {t("hesab.cix")}
          </button>
        </div>
      ) : addim === "telefon" ? (
        <form onSubmit={kodGonder} className="pb-2">
          <label className="text-xs font-semibold" style={{ color: C.muted }}>
            {t("hesab.telefonEtiket")}
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={telefon}
              onChange={(hadise) => setTelefon(hadise.target.value)}
              placeholder="050 123 45 67"
              className={xana}
              style={xanaStil}
            />
          </label>
          {xeta && (
            <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: C.danger }}>
              {t(`hesab.xeta.${xeta}`)}
            </p>
          )}
          <button
            type="submit"
            disabled={gedir || !telefon.trim()}
            className={duyme}
            style={{ backgroundColor: C.pine, color: "#fff", fontFamily: font.display }}
          >
            {gedir ? t("hesab.gonderilir") : t("hesab.kodGonder")}
          </button>
        </form>
      ) : (
        <form onSubmit={tesdiqle} className="pb-2">
          <p className="text-xs" style={{ color: C.muted }}>
            {t("hesab.kodGonderildi", { telefon })}
          </p>
          {/* Şlüz qoşulana qədər kod SMS-lə gəlmir — bunu gizlətmək fermeri
              boş yerə gözlətməkdir */}
          {rejim === "log" && (
            <p
              className="mt-2 rounded-xl px-3 py-2 text-xs"
              style={{ backgroundColor: "rgba(233,181,74,0.14)", color: "#8A6A1F" }}
            >
              {t("hesab.logQeyd")}
            </p>
          )}
          <label className="mt-3 block text-xs font-semibold" style={{ color: C.muted }}>
            {t("hesab.kodEtiket")}
            <input
              ref={kodRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={kod}
              onChange={(hadise) => setKod(hadise.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className={xana}
              style={{ ...xanaStil, letterSpacing: "0.3em", fontVariantNumeric: "tabular-nums" }}
            />
          </label>
          {xeta && (
            <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: C.danger }}>
              {t(`hesab.xeta.${xeta}`)}
            </p>
          )}
          <button
            type="submit"
            disabled={gedir || kod.length !== 6}
            className={duyme}
            style={{ backgroundColor: C.pine, color: "#fff", fontFamily: font.display }}
          >
            {gedir ? t("hesab.gonderilir") : t("hesab.tesdiqle")}
          </button>
          <button
            type="button"
            onClick={sifirla}
            className="mt-2 w-full py-2 text-xs font-semibold"
            style={{ color: C.muted }}
          >
            {t("hesab.geri")}
          </button>
        </form>
      )}
    </Sheet>
  );
}
