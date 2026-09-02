import { C, KOLGE } from "../theme/tokens.js";

/**
 * onClick verilibsə həqiqi <button> kimi render olunur — klaviatura və
 * ekran oxuyucusu ilə işləməsi üçün div-ə onClick qoymaq kifayət etmir.
 *
 * SƏTHLƏRİ KÖLGƏ AYIRIR, HAŞİYƏ YOX. Əvvəl hər kartın 1 piksellik boz
 * haşiyəsi vardı və ekran vayrfreym kimi görünürdü. İndi standart kart
 * yumşaq kölgə ilə qalxır; haşiyə YALNIZ çağıran onu açıq verəndə qalır
 * (gecikmə, xəbərdarlıq — orada rəngli kənar məna daşıyır).
 */
export function Card({ children, style, onClick, ariaLabel, role, className = "" }) {
  const kenarVar = style?.border || style?.borderColor;
  const base = {
    backgroundColor: C.card,
    ...(kenarVar ? { border: `1px solid ${C.line}` } : { boxShadow: KOLGE.kart }),
    ...style,
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`basilir w-full rounded-2xl p-4 text-left ${className}`}
        style={base}
      >
        {children}
      </button>
    );
  }

  // `role` ÖTÜRÜLÜR: təcili kartlar (gecikmə, təcili sahə xəbərdarlığı)
  // role="alert" verir — prop udulsaydı ekran oxuyucusu onları elan etməzdi.
  return (
    <div className={`rounded-2xl p-4 ${className}`} style={base} role={role}>
      {children}
    </div>
  );
}
