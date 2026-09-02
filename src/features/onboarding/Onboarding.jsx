import { useState } from "react";
import { useI18n } from "../../i18n/index.jsx";
import { useStore, ONBOARDING_ADDIMLARI } from "../../state/store.jsx";
import { RayonSecici } from "../location/RayonSecici.jsx";
import { BitkiSebekesi } from "../crop/BitkiSebekesi.jsx";
import { SaheIllustrasiyasi } from "../pano/SaheIllustrasiyasi.jsx";
import { track } from "../../lib/analytics.js";
import { OnboardingShell } from "./OnboardingShell.jsx";
import { XosGelmisiniz } from "./XosGelmisiniz.jsx";

/**
 * İLK AÇILIŞ AXINI — dəyər, sonra bir ekranda bir qərar.
 *
 * xosgeldin → rayon (1/3) → bitki (2/3) → sahə (3/3)
 * Xoş gəldiniz sayğaca daxil deyil. Yarımçıq qalan fermer son tamamlanan
 * addımdan davam edir. Keçilən seçimlər null qalır; standart dəyər uydurulmur.
 */
export function Onboarding({ onDrawField, onOpenHesab }) {
  const { t } = useI18n();
  const { state, actions } = useStore();

  const [addim, setAddim] = useState(() => {
    const bitmis = state.onboarding?.tamamlananAddim ?? null;
    if (!bitmis) return "xosgeldin";
    const sira = ONBOARDING_ADDIMLARI.indexOf(bitmis);
    return ONBOARDING_ADDIMLARI[sira + 1] ?? "sahe";
  });

  const sira = ONBOARDING_ADDIMLARI.indexOf(addim);
  const cemi = ONBOARDING_ADDIMLARI.length;

  const irele = (haradan) => {
    track("onb.step.done", { addim: haradan });
    actions.onboardingAddim(haradan);
    const novbeti = ONBOARDING_ADDIMLARI[ONBOARDING_ADDIMLARI.indexOf(haradan) + 1];
    if (!novbeti) {
      actions.finishOnboarding();
      return;
    }
    setAddim(novbeti);
  };

  const geri = () => {
    if (sira <= 0) {
      setAddim("xosgeldin");
      return;
    }
    setAddim(ONBOARDING_ADDIMLARI[sira - 1]);
  };

  if (addim === "xosgeldin") {
    return (
      <XosGelmisiniz
        onBasla={() => {
          track("onb.step.done", { addim: "xosgeldin" });
          setAddim("rayon");
        }}
        onGiris={() => onOpenHesab?.()}
      />
    );
  }

  if (addim === "rayon") {
    return (
      <OnboardingShell
        key="rayon"
        etiket={t("onb.title")}
        addim={1}
        cemi={cemi}
        onGeri={geri}
        basliq={t("onb.rayon.basliq")}
        altYazi={t("onb.rayon.izah")}
        cta={{ label: t("onb.rayon.davam"), disabled: !state.location, onClick: () => irele("rayon") }}
        ikinci={{ label: t("onb.rayon.indiYox"), onClick: () => irele("rayon") }}
      >
        <RayonSecici
          secilen={state.location}
          sonKodlar={state.sonRayonlar}
          onSec={(rayon) => actions.setLocation(rayon)}
        />
      </OnboardingShell>
    );
  }

  if (addim === "bitki") {
    return (
      <OnboardingShell
        key="bitki"
        etiket={t("onb.title")}
        addim={2}
        cemi={cemi}
        onGeri={geri}
        basliq={t("onb.bitki.basliq")}
        altYazi={t("onb.bitki.izah")}
        cta={{ label: t("onb.bitki.davam"), disabled: !state.chat.crop, onClick: () => irele("bitki") }}
        ikinci={{
          label: t("onb.bitki.qerarsiz"),
          onClick: () => {
            actions.chatSetCrop(null);
            irele("bitki");
          },
        }}
      >
        <BitkiSebekesi
          secilen={state.chat.crop}
          onSec={(kod) => actions.chatSetCrop(state.chat.crop === kod ? null : kod)}
        />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      key="sahe"
      etiket={t("onb.title")}
      addim={3}
      cemi={cemi}
      onGeri={geri}
      basliq={t("onb.sahe.basliq")}
      altYazi={t("onb.sahe.izah")}
      cta={{
        label: t("onb.sahe.cek"),
        onClick: () => {
          track("onb.step.done", { addim: "sahe" });
          onDrawField?.();
        },
      }}
      ctaSonek={t("onb.sahe.muddet")}
      ikinci={{ label: t("onb.sahe.kec"), onClick: () => irele("sahe") }}
    >
      <SaheIllustrasiyasi className="mx-auto" />
    </OnboardingShell>
  );
}
