import { LOAN_TERMS } from "../../services/farm.js";
import { bicinTarixi, bicineQalanAy } from "../../services/movsum.js";
import { ayliqFaiz } from "../../../lib/kreditOdenis.js";
import { gelirModeli } from "../../../lib/gelir.js";
import { odenisQabiliyyeti } from "../../../lib/odenis.js";
import { cariVeziyyetHali } from "../../../lib/mehsuldarliq.js";

/** Slayder addımı — 100 ₼-dən xırda məbləğ kredit söhbətində səs-küydür */
const ADDIM = 100;
/** Bundan kiçik tavan "imkan var" adlandırılmır */
export const MIN_KREDIT = 500;

/**
 * Kredit imkanının BÜTÜN rəqəmləri bir yerdə.
 *
 * Zəncir: aqro indeks → gəlir modeli → ödəniş qabiliyyəti → kredit tavanı.
 * Tavan PESSİMİST ssenaridən çıxır (bax: lib/odenis.js).
 *
 * ═══ UNDERWRİTİNQ ≠ FAKTİKİ ÖDƏNİŞ ═══════════════════════════════════
 * Limit KONSERVATİV hesablanır: kredit tam müddət boyu heç azaldılmasa
 * belə əsas + faiz qabiliyyətə sığmalıdır —
 *
 *   maxKredit = qabiliyyət / (1 + illik faiz × müddət/12)
 *
 * Bu, yalnız limitin ölçüsüdür. Faktiki ödəniş qaydası ayrıdır və
 * lib/kreditOdenis.js-dədir: faiz aylıq ödənilir, yalnız QALAN əsas
 * borca hesablanır, əsas borc mövsüm ərzində çevik azaldıla bilər.
 * "Sonda bir ödəniş" məhsul modeli deyil və UI-də göstərilmir.
 *
 * Müddət sabit 5 ay DEYİL — biçinə qalan aydır: son tarix (əsas borcun
 * tam bağlanması) fermerin pulu OLACAĞI aya bağlanır. Bu, Nubank limit
 * slayderinin buradakı qarşılığıdır: tavanı bank yox, sahənin özü qoyur
 * və fermer onun altında istədiyini seçir.
 *
 * Hook DEYİL, adi funksiyadır: heç bir vəziyyət saxlamır, yalnız hesab.
 * Komponentlər onu render zamanı çağırır — girişlər dəyişəndə nəticə də
 * özü yenilənir.
 */
export function kreditImkani({ sahe, bitki, indeks, indi = new Date() } = {}) {
  const cari = cariVeziyyetHali(indeks);
  const gelir = gelirModeli({
    bitki,
    hektar: sahe?.hektar,
    bant: indeks?.bant ?? null,
    cariRisk: cari.risk,
  });
  const odenis = odenisQabiliyyeti({ gelir });

  if (odenis.hal !== "hazir") {
    return {
      hal: "olculmur",
      // Səbəb fermerə deyilir: "sahə çək" ilə "bitki seç" fərqli işlərdir.
      // Hər ikisi yoxdursa əvvəl sahə istənilir — tətbiqin axını da belədir
      sebeb: !Number.isFinite(sahe?.hektar) ? "saheYoxdur" : (gelir.sebeb ?? "melumatYoxdur"),
      gelir,
      odenis,
      maxKredit: null,
      muddetAy: null,
      odemeTarixi: null,
    };
  }

  const muddetAy = bicineQalanAy(bitki, indi);
  const odemeTarixi = bicinTarixi(bitki, indi);
  const faizEmsali = 1 + (LOAN_TERMS.annualRate / 100) * (muddetAy / 12);
  const maxKredit = Math.floor(odenis.qabiliyyet / faizEmsali / ADDIM) * ADDIM;

  // Tavan çox kiçikdirsə bunu GİZLƏTMİRİK: "sahəniz bu mövsüm nağd kredit
  // daşımır" da bir cavabdır və saxta limitdən qat-qat dürüstdür
  if (maxKredit < MIN_KREDIT) {
    return { hal: "imkanYoxdur", gelir, odenis, maxKredit, muddetAy, odemeTarixi };
  }

  return {
    hal: "hazir",
    gelir,
    odenis,
    maxKredit,
    muddetAy,
    odemeTarixi,
    addim: ADDIM,
    minKredit: MIN_KREDIT,
    // Seçilmiş əsas borc üçün İLK aylıq faiz. Sonrakı ayların faizi
    // fermerin əsas borcu nə qədər azaltdığından asılıdır — öncədən
    // "yekun məbləğ" yoxdur (bax: lib/kreditOdenis.js)
    ayliqFaiz1: (mebleg) => ayliqFaiz(mebleg, LOAN_TERMS.annualRate),
  };
}
