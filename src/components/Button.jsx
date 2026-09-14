import { Icon } from "./Icon.jsx";

/**
 * DÜYMƏ SİSTEMİ — bütün CTA-lar buradan keçir.
 *
 * Dörd variant, hər birinin beş halı (standart, basılı, yüklənir, sönük,
 * fokus) CSS-dədir (index.css → .btn): inline style ilə :active və
 * :focus-visible yazmaq mümkün deyil, ona görə hal sinifdən gəlir,
 * komponent yalnız sinifləri yığır.
 *
 *   primary   — ekranda BİR dənə: dolu, brend yaşılı (ton="mal" → bənövşəyi)
 *   secondary — konturlu; ikinci hərəkət
 *   ghost     — fonsuz mətn; üçüncü dərəcəli və "sonra" tipli hərəkətlər
 *   danger    — yalnız gecikmə/ləğv kimi geri dönməz və ya kritik hərəkət
 *
 * `loading`: düymə sönmür, amma klik qəbul etmir və spinner göstərir —
 * etiket yerində qalır ki, düzülüş sıçramasın. aria-busy oxuyucuya deyir.
 * `size`: md 48 (standart), lg 52 (alt CTA zolağı), sm 40 (sətir içi).
 */
export function Button({
  variant = "primary",
  ton = "pine",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  ikon = null,
  ikonSag = null,
  type = "button",
  className = "",
  children,
  onClick,
  ...rest
}) {
  const passiv = disabled || loading;
  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={passiv || undefined}
      onClick={loading ? undefined : onClick}
      {...rest}
      className={[
        "btn",
        `btn--${variant}`,
        `btn--ton-${ton}`,
        `btn--${size}`,
        fullWidth ? "btn--tam" : "",
        loading ? "btn--yuklenir" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {ikon && !loading && <Icon name={ikon} size={size === "sm" ? 16 : 18} color="currentColor" />}
      <span className="btn__etiket">{children}</span>
      {ikonSag && <Icon name={ikonSag} size={size === "sm" ? 16 : 18} color="currentColor" />}
    </button>
  );
}
