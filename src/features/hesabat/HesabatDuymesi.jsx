import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { FARM } from "../../services/farm.js";
import { fetchSaheSekli } from "../../services/ndvi.js";
import { kreditImkani } from "../loan/useKredit.js";
import { formatNumber } from "../../lib/format.js";
import { hesabatMelumati } from "./hesabatMelumati.js";

/**
 * "Sahə pasportu" — PDF hesabat düyməsi.
 *
 * NİYƏ PDF: ölçmə tətbiqin içində qalanda yalnız fermer görür. Kredit
 * mütəxəssisi qovluğuna sənəd qoyur, alıcı müqaviləyə əlavə edir, aqronom
 * WhatsApp-da açır. Sübutu binadan çıxaran budur.
 *
 * NİYƏ MÜŞTƏRİ TƏRƏFİNDƏ QURULUR:
 *   • Vercel Hobby-də funksiya limiti 12-dir, 11-i doludur — PDF ucu son
 *     yeri yeyərdi;
 *   • gələcəkdə fermerin öz şəkilləri sənədə cihazdan çıxmadan düşə bilər.
 *
 * AĞIR HİSSƏLƏR YALNIZ BASILANDA YÜKLƏNİR: jsPDF və şrift (~110 KB) dinamik
 * idxaldadır, ona görə tətbiqin ilk açılışına təsiri yoxdur.
 */
export function HesabatDuymesi({ peyk, qonsu, indeksHali, kreditHali }) {
  const { t, lang, money } = useI18n();
  const { state } = useStore();
  const [hal, setHal] = useState("hazir"); // hazir | gedir | xeta

  // Ölçmə yoxdursa sənəd boş çıxar — düymə də göstərilmir
  if (!state.sahe || peyk?.hal !== "hazir" || !peyk?.xulase) return null;

  const yarat = async () => {
    setHal("gedir");
    try {
      // Sahənin peyk şəkli: keşdən gəlirsə sorğu getmir (bax: services/ndvi.js)
      const sekilNeticesi = await fetchSaheSekli({ noqteler: state.sahe.noqteler }).catch(() => null);

      const [{ pdfQur }] = await Promise.all([import("./pdfQur.js")]);

      const melumat = hesabatMelumati({
        sahe: state.sahe,
        bitkiKey: state.chat.crop,
        location: state.location,
        hesab: state.hesab,
        fermerAdi: FARM.farmerName,
        peyk,
        qonsu,
        indeksHali,
        kredit: kreditImkani({
          sahe: state.sahe,
          bitki: state.chat.crop,
          indeks: indeksHali?.indeks ?? null,
        }),
        kreditHali,
        sekil: sekilNeticesi?.sekil ?? null,
      });

      const doc = pdfQur({ melumat, t, money, formatNumber, lang });
      const ad = `AgriFin-${(melumat.fermer.rayon ?? "sahe").replace(/\s/g, "-")}-${melumat.yaradilib.slice(0, 10)}.pdf`;
      const blob = doc.output("blob");
      const fayl = new File([blob], ad, { type: "application/pdf" });

      // Telefonun paylaşma vərəqi faylı qəbul edirsə oradan gedir (WhatsApp,
      // e-poçt, Fayllar) — yoxsa adi endirmə
      const paylasilaBiler =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [fayl] });

      if (paylasilaBiler) {
        await navigator.share({ files: [fayl], title: t("pdf.basliq") });
      } else {
        const unvan = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = unvan;
        a.download = ad;
        a.click();
        URL.revokeObjectURL(unvan);
      }
      setHal("hazir");
    } catch (xeta) {
      // Fermer vərəqi bağladısa bu xəta deyil
      if (xeta?.name === "AbortError") {
        setHal("hazir");
        return;
      }
      console.warn("[hesabat] PDF alınmadı:", xeta?.message);
      setHal("xeta");
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={yarat}
        disabled={hal === "gedir"}
        className="basilir flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
        style={{ backgroundColor: C.pine, color: "#fff", minHeight: 48, opacity: hal === "gedir" ? 0.7 : 1 }}
      >
        <Icon name={hal === "gedir" ? "LoaderCircle" : "FileText"} size={16} color={C.gold} />
        {t(hal === "gedir" ? "pdf.qurulur" : "pdf.duyme")}
      </button>
      {hal === "xeta" && (
        <p className="mt-1.5 text-center text-xs" role="alert" style={{ color: C.danger }}>
          {t("pdf.xeta")}
        </p>
      )}
      <p className="mt-1.5 text-center" style={{ color: C.muted, fontSize: 10 }}>
        {t("pdf.izah")}
      </p>
    </div>
  );
}
