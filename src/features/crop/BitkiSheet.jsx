import { Sheet } from "../../components/Sheet.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { CROP_KEYS } from "../../services/crops.js";

/**
 * BİTKİ SEÇİCİSİ — qeydiyyatdan sonra bitkini dəyişmək/seçmək üçün panel.
 *
 * Niyə lazımdır: Maliyyə ekranındakı şərt zənciri (sahə → bitki → hesab →
 * təklif) "Bitkini seç" deyəndə fermeri BİR yerə aparmalıdır. Əvvəl bitki
 * yalnız qeydiyyatda və çatın içindəki çiplərdə seçilirdi — qeydiyyatı
 * keçmiş fermer üçün bu, dalan idi.
 *
 * Siyahı qeydiyyatdakı ilə eyni mənbədəndir (services/crops.js) — iki yerdə
 * iki fərqli bitki dəsti olmasın.
 */
export function BitkiSheet({ acilib, onBagla }) {
  const { t } = useI18n();
  const { state, actions } = useStore();

  return (
    <Sheet
      acilib={acilib}
      onBagla={onBagla}
      baslik={t("onb.crop.title")}
      altYazi={t("bitki.altYazi")}
    >
      <div className="flex flex-wrap gap-2 pb-2">
        {CROP_KEYS.map((key) => {
          const secilib = state.chat.crop === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                actions.chatSetCrop(key);
                onBagla();
              }}
              aria-pressed={secilib}
              className="rounded-2xl px-3.5 text-sm font-semibold"
              style={{
                backgroundColor: secilib ? C.fieldSoft : C.card,
                border: `1px solid ${secilib ? C.field : C.line}`,
                color: secilib ? C.field : C.ink,
                fontFamily: font.body,
                minHeight: 44,
              }}
            >
              {t(`kbcrop.${key}`)}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
