import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Beş tablı qabıq üçün react-router artıq yükdür: bu ~50 sətir dərin keçid
// (/karbon kimi paylaşıla bilən linklər) və brauzerin "geri" düyməsini verir.
const RouterContext = createContext(null);

const currentPath = () => (typeof window === "undefined" ? "/" : window.location.pathname || "/");

export function RouterProvider({ children }) {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPopState = () => setPath(currentPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to === currentPath()) return;
    window.history[replace ? "replaceState" : "pushState"]({}, "", to);
    setPath(to);
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter yalnız <RouterProvider> içində işləyir");
  return ctx;
}
