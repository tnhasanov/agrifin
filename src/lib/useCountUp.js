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
 * Rəqəmi hədəfə saydırır (easeOutCubic).
 *
 * İki incəlik:
 *   • Hədəf DƏYİŞƏNDƏ sıfırdan yox, GÖRÜNƏN dəyərdən davam edir. Əvvəl
 *     keşdən 95 göstərilib sonra cari mövsüm gələndə 92 olanda rəqəm
 *     95 → 0 → 92 "çökürdü" — indi 95-dən 92-yə sürüşür.
 *   • Hərəkət seçimi REAKTİVDİR: istifadəçi sessiya ortasında azaldılmış
 *     hərəkəti söndürsə, dəyər 0-da donub qalmır.
 *
 * DİQQƏT: aria-label-lərdə HƏMİŞƏ yekun dəyəri işlədin, bunu yox —
 * ekran oxuyucusu sayma prosesini eşitməməlidir.
 */
export function useCountUp(hedef, { muddet = 900, onluq = 0 } = {}) {
  const [az, setAz] = useState(herekatsiz);
  const [deyer, setDeyer] = useState(0);
  const sonRef = useRef(0);
  const cerceve = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const sorgu = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dinle = () => setAz(sorgu.matches);
    sorgu.addEventListener?.("change", dinle);
    return () => sorgu.removeEventListener?.("change", dinle);
  }, []);

  useEffect(() => {
    if (az) {
      sonRef.current = hedef;
      return undefined;
    }

    const basla = sonRef.current;
    const baslangic = performance.now();
    const addim = (indi) => {
      const t = Math.min(1, (indi - baslangic) / muddet);
      const yumsaq = 1 - (1 - t) ** 3;
      const d = Number((basla + (hedef - basla) * yumsaq).toFixed(onluq));
      sonRef.current = d;
      setDeyer(d);
      if (t < 1) cerceve.current = requestAnimationFrame(addim);
    };
    cerceve.current = requestAnimationFrame(addim);
    return () => cancelAnimationFrame(cerceve.current);
  }, [hedef, muddet, onluq, az]);

  return az ? hedef : deyer;
}
