// Kiçik hash marşrutlaşdırıcı.
//
// Hash seçildi ki, tətbiq istənilən statik ünvanda — daxili serverdə də —
// server konfiqurasiyası olmadan işləsin. Ünvan paylaşıla bilər: iş və açıq
// bölmə linkdə görünür.

import { useEffect, useState } from "react";

export const DEFAULT_TAB = "profile";

export function parseHash(hash = "") {
  const path = hash.replace(/^#\/?/, "").split("?")[0];
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);

  if (parts[0] === "case" && parts[1]) {
    return { name: "case", id: parts[1], tab: parts[2] ?? DEFAULT_TAB };
  }
  if (parts[0] === "new") return { name: "new" };
  return { name: "pipeline" };
}

export function formatRoute(route) {
  if (route.name === "case") {
    return `#/case/${encodeURIComponent(route.id)}/${route.tab ?? DEFAULT_TAB}`;
  }
  if (route.name === "new") return "#/new";
  return "#/";
}

export function useRoute() {
  const [route, setRoute] = useState(() =>
    parseHash(typeof window === "undefined" ? "" : window.location.hash),
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = (next) => {
    const target = formatRoute(next);
    if (window.location.hash === target) return;
    window.location.hash = target;
  };

  return [route, navigate];
}
