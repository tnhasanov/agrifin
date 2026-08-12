import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: { "react-hooks": reactHooks, react },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // JSX-də istifadə olunan komponent adı "istifadə olunmayan" sayılmasın.
      "react/jsx-uses-vars": "error",
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.test.{js,jsx}", "src/test/**"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.vitest, beforeEach: "readonly" },
    },
  },
];
