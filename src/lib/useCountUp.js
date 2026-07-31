import { useEffect, useRef, useState } from "react";

/**
 * Hərəkət azaldılıbsa (əlçatanlıq seçimi) və ya matchMedia yoxdursa
 * (test mühiti) saydırmırıq — dəyər dərhal yekundur.
 */
function herekatsiz() {
  return (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Rəqəmi 0-dan hədəfə saydırır (easeOutCubic). FarmScore və karbon kimi
 * "hesablanmış" rəqəmlər üçün — sayma onları statik yazıdan fərqləndirir.
 *
 * DİQQƏT: aria-label-lərdə HƏMİŞƏ yekun dəyəri işlədin, bunu yox —
 * ekran oxuyucusu sayma prosesini eşitməməlidir.
 */
export function useCountUp(hedef, { muddet = 900, onluq = 0 } = {}) {
  const [deyer, setDeyer] = useState(0);
  const cerceve = useRef(null);

  useEffect(() => {
    if (herekatsiz()) return undefined;

    const baslangic = performance.now();
    const addim = (indi) => {
      const t = Math.min(1, (indi - baslangic) / muddet);
      const yumsaq = 1 - (1 - t) ** 3;
      setDeyer(Number((hedef * yumsaq).toFixed(onluq)));
      if (t < 1) cerceve.current = requestAnimationFrame(addim);
    };
    cerceve.current = requestAnimationFrame(addim);
    return () => cancelAnimationFrame(cerceve.current);
  }, [hedef, muddet, onluq]);

  // Hərəkətsiz rejimdə dəyər dərhal yekundur — state-ə ehtiyac yoxdur
  return herekatsiz() ? hedef : deyer;
}
