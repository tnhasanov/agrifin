import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// Store və dil seçimi localStorage-da saxlanır — testlər bir-birinə sızmamalıdır.
beforeEach(() => {
  window.localStorage.clear();
});
