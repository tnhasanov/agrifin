import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Fermerlərin çoxu kənd yerlərində mobil internetdən istifadə edir —
    // paketin ölçüsü burada məhsul tələbidir, sadəcə gigiyena deyil.
    chunkSizeWarningLimit: 300,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}", "api/**/*.test.js"],
  },
});
