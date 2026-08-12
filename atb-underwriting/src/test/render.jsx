import { render } from "@testing-library/react";
import { I18nProvider } from "../i18n/index.jsx";
import { StoreProvider } from "../state/store.jsx";

/**
 * Ekranı provayderlərlə birlikdə göstərir.
 *
 * Dil açıq şəkildə verilir: jsdom brauzer dilini "en-US" bildirir, real
 * istifadəçi isə əsasən azərbaycanca işləyir. Testin dili təsadüfə
 * buraxılsa, mühit dəyişəndə səbəbsiz qırılardı.
 */
export function renderApp(ui, { lang = "az" } = {}) {
  localStorage.setItem("atb.lang", lang);
  return render(
    <I18nProvider>
      <StoreProvider>{ui}</StoreProvider>
    </I18nProvider>,
  );
}
