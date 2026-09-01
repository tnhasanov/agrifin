import { useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { C, ARA, RADIUS, TIPO } from "../../theme/tokens.js";
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
 * ═══ QURULUŞ ══════════════════════════════════════════════════════════
 *   xosgeldin → rayon (1/3) → bitki (2/3) → sahə (3/3)
 * Xoş gəldiniz sayğaca daxil deyil (bax: XosGelmisiniz.jsx).
 *
 * ═══ DAVAM ETMƏ ═══════════════════════════════════════════════════════
 * Yarımçıq qalan fermer BAŞDAN BAŞLAMIR: mağazadakı `onboarding
 * .tamamlananAddim` son bitmiş addımı saxlayır və axın ondan sonrakından
 * açılır. Verdiyi cavablar (rayon, bitki) yerində qalır və görünür.
 *
 * ═══ HEÇ NƏ MƏCBURİ DEYİL ═════════════════════════════════════════════
 * Rayon keçilsə `location` null qalır, bitki keçilsə `chat.crop` null
 * qalır. NULL DƏYƏR SÜNİ DOLDURULMUR: standart rayon "seçilmiş" kimi
 * göstərilmir və heç bir tövsiyə boş bitkiyə görə qurulmur.
 */
export function Onboarding({ onDrawField, onOpenHesab }) {
  const { t } = useI18n();
  const { state, actions } = useStore();

  // Davam etmə: son bitmiş addımdan SONRAKI addım açılır
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

  // ── 1 / 3 — rayon ────────────────────────────────────────────────
  if (addim === "rayon") {
    return (
      <OnboardingShell
        etiket={t("onb.title")}
        addim={1}
        cemi={cemi}
        onGeri={geri}
        basliq={t("onb.rayon.basliq")}
        altYazi={t("onb.rayon.izah")}
        cta={{
          label: t("onb.rayon.davam"),
          disabled: !state.location,
          onClick: () => irele("rayon"),
        }}
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

  // ── 2 / 3 — bitki ────────────────────────────────────────────────
  if (addim === "bitki") {
    return (
      <OnboardingShell
        etiket={t("onb.title")}
        addim={2}
        cemi={cemi}
        onGeri={geri}
        basliq={t("onb.bitki.basliq")}
        altYazi={t("onb.bitki.izah")}
        cta={{
          label: t("onb.bitki.davam"),
          disabled: !state.chat.crop,
          onClick: () => irele("bitki"),
        }}
        ikinci={{
          label: t("onb.bitki.qerarsiz"),
          onClick: () => {
            // "Hələ qərar verməmişəm" BOŞ DƏYƏRDİR, ehtimal deyil: heç bir
            // bitkiyə xas tövsiyə bu haldan qurulmur
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

  // ── 3 / 3 — ilk sahə ─────────────────────────────────────────────
  return (
    <OnboardingShell
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

      <ul style={{ marginTop: ARA.kart, display: "grid", gap: ARA.yaxin }}>
        {[
          { ikon: "Sprout", acar: "onb.sahe.fayda1" },
          { ikon: "CloudRain", acar: "onb.sahe.fayda2" },
          { ikon: "BarChart3", acar: "onb.sahe.fayda3" },
        ].map(({ ikon, acar }, index) => (
          <li
            key={acar}
            className="giris flex items-center gap-3 px-3 py-2.5"
            style={{
              "--i": index + 1,
              backgroundColor: C.card,
              borderRadius: RADIUS.kart,
              border: `1px solid ${C.line}`,
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: C.fieldSoft, width: 32, height: 32 }}
            >
              <Icon name={ikon} size={16} color={C.field} />
            </span>
            <span style={{ color: C.ink, ...TIPO.qeyd }}>{t(acar)}</span>
          </li>
        ))}
      </ul>
    </OnboardingShell>
  );
}
