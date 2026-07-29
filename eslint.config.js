import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist", "coverage", "node_modules"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.serviceworker },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
  {
    // Provayder + ona uyğun hook bir faylda saxlanılır (React-də adi qayda).
    // Bunun yeganə qiyməti həmin faylları redaktə edərkən tam yenilənmədir.
    files: ["src/state/**", "src/i18n/index.jsx", "src/lib/router.jsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["**/*.test.{js,jsx}", "src/test/**"],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
  {
    files: ["scripts/**"],
    languageOptions: { globals: globals.node },
  },
];
