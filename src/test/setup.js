import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { beforeEach } from "vitest";

// Ekranlar istehsalda ayrı hissələr kimi yüklənir. Tam paralel test paketində
// dinamik importlar bir saniyəni aşa bildiyi üçün istifadəçinin real gözləmə
// pəncərəsinə daha yaxın, sabit hədd saxlayırıq.
configure({ asyncUtilTimeout: 3000 });

// Store və dil seçimi localStorage-da saxlanır — testlər bir-birinə sızmamalıdır.
beforeEach(() => {
  window.localStorage.clear();
});

// jsdom bu metodu vermir; çat avtomatik sürüşdürmə üçün istifadə edir
if (typeof window !== "undefined" && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
