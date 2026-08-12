import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
  test: {
    root: import.meta.dirname,
    environment: "jsdom",
    globals: true,
    setupFiles: [`${import.meta.dirname}/src/test/setup.js`],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
