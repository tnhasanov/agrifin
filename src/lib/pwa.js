// Servis işçisi yalnız istehsal build-ində qeydiyyata alınır — dev serverdə
// keşlənmiş köhnə fayllar dəyişiklikləri gizlədir.
export function registerServiceWorker() {
  if (!import.meta.env?.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("[pwa] servis işçisi qeydiyyatdan keçmədi", error);
    });
  });
}
