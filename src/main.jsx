import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { I18nProvider } from "./i18n/index.jsx";
import { StoreProvider } from "./state/store.jsx";
import { RouterProvider } from "./lib/router.jsx";
import { registerServiceWorker } from "./lib/pwa.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nProvider>
      <StoreProvider>
        <RouterProvider>
          <App />
        </RouterProvider>
      </StoreProvider>
    </I18nProvider>
  </React.StrictMode>,
);

registerServiceWorker();
