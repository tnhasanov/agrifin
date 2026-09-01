import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { formatNumber } from "../../lib/format.js";

/**
 * "Təklif nədən asılıdır?" — Maliyyə ekranının boş halını dolduran kart.
 *
 * NİYƏ VAR: fermer şərtləri tamamlayandan sonra ekranda bir düymə və çoxlu
 * ağ boşluq qalırdı. Boşluq "səhifə yüklənməyib" kimi oxunur, üstəlik ən
 * çox verilən sual cavabsız qalırdı: "mənə nə qədər verəcəklər və niyə?"
 *
 * NƏ GÖSTƏRİR: yalnız SERVERİN HƏQİQƏTƏN BAXDIĞI girişlər
 * (bax: lib/kredit.js → anderraytinq): sahənin ölçüsü, bitki və peyk
 * tarixçəsinin dərinliyi. Dəyərlər fermerin öz məlumatlarıdır — burada
 * heç bir təxmin, bal və ya məbləğ hesablanmır.
 *
 * NƏ GÖSTƏRMİR: gözlənilən limit. Limiti server hesablayır və qərarı
 * anderraytinq verir; burada rəqəm yazsaq, təklif ondan aşağı gələndə
 * fermerə verilmiş söz pozulmuş olardı.
 */
export function TeklifAmilleri({ hektar = null, bitkiKey = null, movsumSayi = 0 }) {
  const { t, lang } = useI18n();

  const setirler = [
    {
      acar: "sahe",
      ikon: "MapPin",
      etiket: t("maliyye.amilSahe"),
      deyer: Number.isFinite(hektar) ? `${formatNumber(hektar, lang)} ha` : "—",
    },
    {
      acar: "bitki",
      ikon: "Leaf",
      etiket: t("maliyye.amilBitki"),
      deyer: bitkiKey ? t(`kbcrop.${bitkiKey}`) : "—",
    },
    {
      acar: "tarixce",
      ikon: "Satellite",
      etiket: t("maliyye.amilTarixce"),
      // Mövsüm yoxdursa "0 mövsüm" yazmaq soyuq və yanlış oxunur: tarixçə
      // yığılır, sadəcə hələ hazır deyil
      deyer: movsumSayi > 0 ? t("maliyye.amilMovsum", { say: movsumSayi }) : t("maliyye.amilTarixceYox"),
    },
  ];

  return (
    <div
      className="giris mt-3 rounded-2xl p-4"
      style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
    >
      <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
        {t("maliyye.amillerBasliq")}
      </h3>

      <div className="mt-2.5">
        {setirler.map((setir) => (
          <div
            key={setir.acar}
            className="flex items-center justify-between gap-3 border-t py-2.5 first:border-t-0 first:pt-0"
            style={{ borderColor: C.line }}
          >
            <span className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
              <Icon name={setir.ikon} size={14} color={C.field} />
              {setir.etiket}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
            >
              {setir.deyer}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2" style={{ color: C.muted, fontSize: 10, lineHeight: 1.45 }}>
        {t("maliyye.amillerQeyd")}
      </p>
    </div>
  );
}
