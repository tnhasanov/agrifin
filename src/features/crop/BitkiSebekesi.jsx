import { C, RADIUS, TIPO } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { Icon } from "../../components/Icon.jsx";
import { bitkileriSirala } from "../../services/bitkiGorunus.js";
import { BitkiSekli } from "./BitkiSekli.jsx";

/**
 * FOTO-SOLLU BİTKİ KARTI.
 *
 * Şəkil SOLDA, ad SAĞDA: göz sol kənarda şaquli oxuyur, ona görə iki
 * sütunda on məhsulu tapmaq kataloq şəbəkəsindən (şəkil üstdə, ad altda)
 * sürətlidir. Ad kiçilmir — uzun ad ("Payızlıq buğda") iki sətrə keçir,
 * şrift 14px-dən aşağı düşmür.
 *
 * SEÇİM YALNIZ RƏNGLƏ BİLDİRİLMİR: haşiyə + yumşaq fon + çek nişanı
 * birlikdə işləyir. Rəng görməyən və ya günəş altında ekranı zorla oxuyan
 * fermer üçün çek nişanı həlledicidir.
 */
const KART_HUND = 76;
const SEKIL = 52;

function BitkiKarti({ kod, secilib, onSec, sira }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => onSec(kod)}
      aria-pressed={secilib}
      className="giris basilir relative flex items-center gap-3 px-3 text-left"
      style={{
        "--i": sira,
        minHeight: KART_HUND,
        borderRadius: RADIUS.kart,
        backgroundColor: secilib ? C.fieldSoft : C.card,
        border: `1.5px solid ${secilib ? C.field : C.line}`,
      }}
    >
      <BitkiSekli kod={kod} olcu={SEKIL} />
      <span
        className="min-w-0 flex-1 font-semibold"
        style={{ color: C.ink, fontSize: 14, lineHeight: "19px" }}
      >
        {t(`kbcrop.${kod}`)}
      </span>
      {secilib && (
        <span
          className="absolute flex items-center justify-center rounded-full"
          style={{ top: 8, right: 8, width: 20, height: 20, backgroundColor: C.field }}
        >
          <Icon name="Check" size={16} color="#FFFFFF" />
        </span>
      )}
    </button>
  );
}

/**
 * @param {object} p
 * @param {string|null} p.secilen  Seçilmiş bitkinin kodu (null = seçilməyib)
 * @param {Function} p.onSec
 */
export function BitkiSebekesi({ secilen, onSec }) {
  // Mövsümdə olan bitkilər əvvələ keçir — sıra hər render-də sabitdir
  const sira = bitkileriSirala();
  return (
    <div className="grid grid-cols-2 gap-3">
      {sira.map((kod, index) => (
        <BitkiKarti
          key={kod}
          kod={kod}
          sira={index + 1}
          secilib={secilen === kod}
          onSec={onSec}
        />
      ))}
    </div>
  );
}
