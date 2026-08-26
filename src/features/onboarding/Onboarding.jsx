import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon.jsx";
import { Aqronom } from "../../components/Aqronom.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { searchDistricts } from "../../services/location.js";
import { CROP_KEYS } from "../../services/crops.js";
import { useGps } from "../location/useGps.js";
import { track } from "../../lib/analytics.js";

const ADDIMLAR = ["yer", "bitki"];

// Bitki seçiləndən axının bağlanmasına qədər fasilə: personajın seçilən
// bitkini "geyinib" tullanması görünsün (tullanma 1.1s-dir, yarısı bəsdir —
// fermer nəticəni gözləyir, tamaşanı yox)
const SEVINC_MS = 850;

/** Personajın danışıq qabarcığı — sual başlığı personajın SÖZÜDÜR */
function AqroSual({ hal, bitki, basliq, izah }) {
  return (
    <div className="giris mb-2 flex items-end gap-2" style={{ "--i": 0 }}>
      <Aqronom hal={hal} bitki={bitki} olcu={116} gorunus="tam" className="shrink-0" />
      <div
        className="mb-2 flex-1 rounded-2xl rounded-bl-sm p-3"
        style={{ backgroundColor: "#EAF4EC", border: "1px solid #CFE6D7" }}
      >
        <h2 className="text-base font-bold" style={{ color: "#1C5733", fontFamily: font.display }}>
          {basliq}
        </h2>
        {izah && (
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "#256B41" }}>
            {izah}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * İlk açılış axını — anonim və qısa.
 *
 * Quruluşun səbəbi ölçülərdir: fermerlərin böyük hissəsi 3 dəqiqədən uzun
 * qeydiyyatı yarımçıq atır. Ona görə burada nə hesab, nə nömrə, nə də
 * şəxsiyyət soruşulur — iki toxunuş və fermer tətbiqin içindədir.
 * Hər addım keçilə bilir: rayon seçilməsə standart rayon işlədilir.
 */
export function Onboarding() {
  const { t } = useI18n();
  const { state, actions } = useStore();
  const [addim, setAddim] = useState(0);
  const [query, setQuery] = useState("");
  // Seçilən bitki: personaj onu dərhal "geyinir" — seçimin təsdiqi
  // mətnlə yox, üzlə verilir
  const [secilen, setSecilen] = useState(null);
  const sevincTimer = useRef(null);

  useEffect(() => () => clearTimeout(sevincTimer.current), []);

  const indiki = ADDIMLAR[addim];

  const irele = (haradan) => {
    track("onb.step.done", { addim: haradan });
    if (addim + 1 >= ADDIMLAR.length) {
      actions.finishOnboarding();
      return;
    }
    setAddim((n) => n + 1);
  };

  const { gps, requestGps, busy } = useGps({
    adYarat: (district) => t("location.gpsName", { district }),
    onSelect: (location) => {
      actions.setLocation(location);
      irele("yer");
    },
  });

  const yerSec = (district) => {
    actions.setLocation({ ...district, gps: false });
    irele("yer");
  };

  const bitkiSec = (key) => {
    actions.chatSetCrop(key);
    setSecilen(key);
    // Dərhal bağlamırıq: personaj seçilən bitkini geyinib tullanır, sonra
    // axın bitir. Təkrar toxunuş sayğacı sıfırlayır — son seçim qalır.
    clearTimeout(sevincTimer.current);
    sevincTimer.current = setTimeout(() => irele("bitki"), SEVINC_MS);
  };

  const districts = searchDistricts(query);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("onb.title")}
      className="absolute inset-0 z-50 flex flex-col"
      style={{ backgroundColor: C.mist, fontFamily: font.body }}
    >
      {/* Başlıq: geri + irəliləyiş */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {addim > 0 ? (
          <button
            type="button"
            onClick={() => {
              // Sevinc fasiləsində geri qayıdılsa taymer axını bağlamasın
              clearTimeout(sevincTimer.current);
              setSecilen(null);
              setAddim((n) => n - 1);
            }}
            aria-label={t("onb.back")}
            className="rounded-full p-1.5"
            style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
          >
            <Icon name="ChevronLeft" size={16} color={C.ink} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="rounded-xl p-1.5" style={{ backgroundColor: C.pine }}>
              <Icon name="Leaf" size={13} color={C.gold} />
            </div>
            <span
              className="text-sm font-extrabold"
              style={{ color: C.pine, fontFamily: font.display }}
            >
              {t("app.name")}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5" aria-hidden="true">
          {ADDIMLAR.map((key, index) => (
            <span
              key={key}
              className="h-1.5 rounded-full"
              style={{
                width: index === addim ? 18 : 6,
                backgroundColor: index <= addim ? C.field : C.line,
              }}
            />
          ))}
        </div>
      </div>
      <p className="px-4 pb-2 text-xs" style={{ color: C.muted }}>
        {t("onb.step", { current: addim + 1, total: ADDIMLAR.length })}
      </p>

      {indiki === "yer" && (
        <div className="flex flex-1 flex-col overflow-hidden px-4">
          {/* Sualı personaj verir: quru forma başlığı əvəzinə qapıda
              qarşılayan aqronom. GPS axtarışı gedərkən düşünür — fikir
              nöqtələri "işləyirəm" deyir, ayrıca spinner lazım olmur. */}
          <AqroSual
            hal={busy ? "dusunur" : "danisir"}
            basliq={t("onb.location.title")}
            izah={t("onb.location.subtitle")}
          />

          <button
            type="button"
            onClick={requestGps}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
            style={{ backgroundColor: C.pine, color: "#FFFFFF", opacity: busy ? 0.65 : 1 }}
          >
            <Icon name={busy ? "LoaderCircle" : "Crosshair"} size={16} color={C.gold} />
            {busy ? t("location.gpsBusy") : t("location.gpsCta")}
          </button>

          {gps.status === "error" && (
            <p
              role="alert"
              className="mt-2 flex items-center gap-1.5 text-xs"
              style={{ color: C.danger }}
            >
              <Icon name="AlertCircle" size={13} color={C.danger} /> {t(gps.errorKey)}
            </p>
          )}

          <div
            className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
          >
            <Icon name="Search" size={15} color={C.muted} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("location.searchPlaceholder")}
              aria-label={t("location.searchPlaceholder")}
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: C.ink }}
            />
          </div>

          <div className="mt-1 flex-1 overflow-y-auto py-1">
            {districts.length === 0 && (
              <p className="py-6 text-center text-xs" style={{ color: C.muted }}>
                {t("location.notFound")}
              </p>
            )}
            {districts.map((district) => (
              <button
                key={district.name}
                type="button"
                onClick={() => yerSec(district)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3"
              >
                <span className="text-sm font-semibold" style={{ color: C.ink }}>
                  {district.name}
                </span>
                <Icon name="ChevronRight" size={15} color={C.muted} />
              </button>
            ))}
          </div>

          {/* Heç bir addım məcburi deyil — rayon seçilməsə standart rayon işlədilir */}
          <button
            type="button"
            onClick={() => irele("yer")}
            className="py-3 text-xs font-semibold"
            style={{ color: C.muted }}
          >
            {t("location.later")}
          </button>
        </div>
      )}

      {indiki === "bitki" && (
        <div className="flex flex-1 flex-col overflow-hidden px-4">
          {/* Seçim personajın özündə təsdiqlənir: bitkiyə toxunan kimi onu
              "geyinir" və sevincdən tullanır — mətn təsdiqinə ehtiyac yoxdur,
              qabarcıq da alqışa keçir. Sonra axın öz-özünə bağlanır. */}
          <AqroSual
            hal={secilen ? "sevincli" : "danisir"}
            bitki={secilen}
            basliq={
              secilen
                ? t("onb.crop.alqis", { bitki: t(`kbcrop.${secilen}`) })
                : t("onb.crop.title")
            }
            izah={secilen ? null : t("onb.crop.subtitle", { district: state.location?.name ?? "" })}
          />

          <div className="mt-2 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {CROP_KEYS.map((key, index) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => bitkiSec(key)}
                  className="giris rounded-xl px-3 py-3 text-sm font-semibold"
                  style={{
                    "--i": index + 1,
                    backgroundColor: C.card,
                    border: `1px solid ${state.chat.crop === key ? C.field : C.line}`,
                    color: C.ink,
                  }}
                >
                  {t(`kbcrop.${key}`)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              clearTimeout(sevincTimer.current);
              irele("bitki");
            }}
            className="py-3 text-xs font-semibold"
            style={{ color: C.muted }}
          >
            {t("onb.crop.skip")}
          </button>
        </div>
      )}

    </div>
  );
}
