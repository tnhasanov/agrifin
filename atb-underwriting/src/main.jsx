import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { I18nProvider } from "./i18n/index.jsx";
import { StoreProvider } from "./state/store.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </I18nProvider>
  </StrictMode>,
);
