import { Sheet } from "../../components/Sheet.jsx";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { BitkiSebekesi } from "./BitkiSebekesi.jsx";

/**
 * BİTKİ SEÇİCİSİ — qeydiyyatdan sonra bitkini dəyişmək/seçmək üçün panel.
 *
 * Niyə lazımdır: Maliyyə ekranındakı şərt zənciri (sahə → bitki → hesab →
 * təklif) "Bitkini seç" deyəndə fermeri BİR yerə aparmalıdır. Əvvəl bitki
 * yalnız qeydiyyatda və çatın içindəki çiplərdə seçilirdi — qeydiyyatı
 * keçmiş fermer üçün bu, dalan idi.
 *
 * Siyahı qeydiyyatdakı ilə EYNİ KOMPONENTDƏNDİR (BitkiSebekesi) — iki yerdə
 * iki fərqli bitki dəsti, iki fərqli kart görünüşü olmasın. Fermer eyni
 * məhsulu iki cür görəndə "bu başqa siyahıdır?" sualı yaranır.
 */
export function BitkiSheet({ acilib, onBagla }) {
  const { t } = useI18n();
  const { state, actions } = useStore();

  return (
    <Sheet
      acilib={acilib}
      onBagla={onBagla}
      baslik={t("onb.bitki.basliq")}
      altYazi={t("bitki.altYazi")}
    >
      <div className="pb-2">
        <BitkiSebekesi
          secilen={state.chat.crop}
          onSec={(kod) => {
            actions.chatSetCrop(kod);
            onBagla();
          }}
        />
      </div>
    </Sheet>
  );
}
