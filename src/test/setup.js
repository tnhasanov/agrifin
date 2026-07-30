import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// Store və dil seçimi localStorage-da saxlanır — testlər bir-birinə sızmamalıdır.
beforeEach(() => {
  window.localStorage.clear();
});

// jsdom bu metodu vermir; çat avtomatik sürüşdürmə üçün istifadə edir
if (typeof window !== "undefined" && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
