import { Icon } from "./Icon.jsx";

/**
 * İKON DÜYMƏSİ — başlıq və alət sətirləri üçün (geri, bağla, səbət, zəng).
 *
 * Etiket MƏCBURİDİR: ikon tək başına ekran oxuyucusu üçün heç nə demir.
 * Toxunma hədəfi həmişə 44 px-dir (görünən dairə 40 ola bilər, hədəf yox).
 * `say` nişanı — səbət/bildiriş sayğacı üçün.
 *
 *   ghost     — şəffaf, aktiv halda mint (başlıq)
 *   secondary — ağ dairə, yumşaq kölgə (məzmun üstündə: bağla, səbət)
 */
export function IconButton({
  ikon,
  label,
  variant = "ghost",
  ton = "pine",
  size = 40,
  aktiv = false,
  say = null,
  strokeWidth = 2,
  className = "",
  ...rest
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={rest["aria-pressed"]}
      {...rest}
      className={["ikon-btn", `ikon-btn--${variant}`, `ikon-btn--ton-${ton}`, aktiv ? "ikon-btn--aktiv" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size, ...rest.style }}
    >
      <Icon name={ikon} size={size >= 44 ? 20 : 18} color="currentColor" strokeWidth={strokeWidth} />
      {say != null && say > 0 && (
        <span className="ikon-btn__nisan" aria-hidden="true">
          {say > 99 ? "99+" : say}
        </span>
      )}
    </button>
  );
}
