import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon.jsx";
import { C, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";

/**
 * Aşağıdan qalxan panel (bottom sheet) — tətbiqin bütün pop-uplarının bazası.
 *
 * NİYƏ AYRI EKRAN DEYİL: fermer siqnala baxmaq üçün olduğu yeri itirməməlidir.
 * Ekran dəyişəndə kontekst də dəyişir — geri qayıdanda sürüşdürmə mövqeyi,
 * açıq gün, hər şey sıfırlanır. Panel isə üstdə açılır: arxadakı ekran yerində
 * qalır və bağlananda fermer eyni nöqtədədir.
 *
 * Telefonda gözlənilən davranışlar (hamısı burada):
 *   • aşağı sürüşdürüb bağlamaq — sürətə görə qərar verilir, məsafəyə görə də
 *   • kənara toxunanda bağlanmaq, Escape ilə bağlanmaq
 *   • bağlanma animasiyası bitənədək DOM-da qalmaq (yoxsa panel "sıçrayır")
 *   • arxadakı siyahının sürüşməməsi
 *   • fokusun panelin içində qalması və bağlananda açan düyməyə qayıtması
 *   • hərəkəti azaldılmış rejimdə animasiyasız işləmək
 */

const ACILMA_MS = 260;
const BAGLANMA_MS = 200;
// Bu məsafədən çox çəkilibsə və ya bu sürətdən sürətli buraxılıbsa bağlanır.
// Yalnız məsafəyə baxsaq sürətli "flick" işləmir, yalnız sürətə baxsaq yavaş
// və uzun çəkmə işləmir — telefon panelləri hər ikisini yoxlayır.
const BAGLA_PIKSEL = 90;
const BAGLA_SURET = 0.5; // piksel/ms

const azHereket = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

/**
 * @param {object} p
 * @param {React.ReactNode} [p.sabitUst]  Başlıqla siyahı arasında SÜRÜŞMƏYƏN
 *   zolaq (axtarış xanası kimi). Adi `children` sürüşür; axtarış sürüşsə
 *   fermer yazdığı sözü görmür.
 * @param {"uygun"|"tam"} [p.boy]  "tam" paneli sabit hündürlükdə saxlayır —
 *   uzun siyahılarda panelin boyu axtarışla dəyişib "sıçramır".
 */
export function Sheet({ acilib, onBagla, baslik, altYazi, children, etiket, sabitUst, boy = "uygun" }) {
  const { t } = useI18n();
  const panelRef = useRef(null);
  const acanRef = useRef(null);
  const cekmeRef = useRef(null);
  const [cixir, setCixir] = useState(false);
  const [surusme, setSurusme] = useState(0);
  // Barmaq panelin üstündədirsə keçid söndürülür — yoxsa hərəkət gecikir.
  // Ref render zamanı reaktiv olmadığı üçün bu, ayrıca vəziyyətdir.
  const [cekilir, setCekilir] = useState(false);

  const sakit = azHereket();

  // Bağlanma animasiyası bitəndən sonra sökülür
  const bagla = useCallback(() => {
    if (sakit) {
      onBagla();
      return;
    }
    setCixir(true);
    setTimeout(onBagla, BAGLANMA_MS);
  }, [onBagla, sakit]);

  // FOKUS VƏ SÜRÜŞDÜRMƏ KİLİDİ yalnız açılıb-bağlanmadan asılıdır.
  //
  // Bu, klaviatura ilə əlaqəli əsl xəta idi: effekt `bagla` ilə birlikdə
  // yenidən işləyirdi, `bagla` isə çağıran komponentdə hər render-də yeni
  // funksiya kimi yaranırdı. Nəticədə panelin içindəki xanaya yazılan HƏR
  // hərfdən sonra effekt təkrar işləyib fokusu xanadan panelə qaytarırdı —
  // fermer nömrənin hər rəqəmindən sonra yenidən xanaya toxunmalı olurdu.
  // Ona görə fokus/kilid ilə klaviatura dinləyicisi AYRILIB.
  useEffect(() => {
    if (!acilib) return undefined;

    // Bağlananda fokus açan düyməyə qayıdır — klaviatura istifadəçisi
    // siyahının başına atılmır
    acanRef.current = document.activeElement;
    panelRef.current?.focus();

    const kohneOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = kohneOverflow;
      acanRef.current?.focus?.();
    };
  }, [acilib]);

  // Klaviatura: bu effektin təkrar qoşulması zərərsizdir (yalnız dinləyici
  // dəyişir), ona görə `bagla` asılılığı burada qalır
  useEffect(() => {
    if (!acilib) return undefined;

    const basildi = (hadise) => {
      if (hadise.key === "Escape") {
        hadise.preventDefault();
        bagla();
        return;
      }
      if (hadise.key !== "Tab") return;

      // Fokus tələsi: panel modaldır, arxadakı düymələrə keçmək olmaz
      const fokuslananlar = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!fokuslananlar || fokuslananlar.length === 0) return;
      const ilk = fokuslananlar[0];
      const son = fokuslananlar[fokuslananlar.length - 1];

      if (hadise.shiftKey && document.activeElement === ilk) {
        hadise.preventDefault();
        son.focus();
      } else if (!hadise.shiftKey && document.activeElement === son) {
        hadise.preventDefault();
        ilk.focus();
      }
    };

    window.addEventListener("keydown", basildi);
    return () => window.removeEventListener("keydown", basildi);
  }, [acilib, bagla]);

  if (!acilib) return null;

  const toxunmaBasladi = (hadise) => {
    cekmeRef.current = { y: hadise.touches[0].clientY, vaxt: Date.now() };
    setCekilir(true);
  };

  const toxunmaGedir = (hadise) => {
    if (!cekmeRef.current) return;
    const ferq = hadise.touches[0].clientY - cekmeRef.current.y;
    // Yuxarı çəkmə rezin kimi müqavimət göstərir — panel yapışıb qalmır,
    // amma yuxarı da qaçmır
    setSurusme(ferq > 0 ? ferq : ferq / 4);
  };

  const toxunmaBitdi = () => {
    const cekme = cekmeRef.current;
    cekmeRef.current = null;
    setCekilir(false);
    if (!cekme) return;

    const suret = surusme / Math.max(1, Date.now() - cekme.vaxt);
    if (surusme > BAGLA_PIKSEL || suret > BAGLA_SURET) {
      bagla();
      return;
    }
    // Həddi keçmirsə yerinə qayıdır
    setSurusme(0);
  };

  return (
    <div className="absolute inset-0 z-[1100] flex flex-col justify-end" style={{ fontFamily: font.body }}>
      <button
        type="button"
        onClick={bagla}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(12,24,16,0.45)",
          animation: sakit ? "none" : `perde-gel ${ACILMA_MS}ms ease`,
          opacity: cixir ? 0 : 1,
          transition: sakit ? "none" : `opacity ${BAGLANMA_MS}ms ease`,
        }}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={etiket ?? baslik}
        className="relative flex flex-col rounded-t-3xl"
        style={{
          backgroundColor: C.card,
          maxHeight: "85%",
          ...(boy === "tam" ? { height: "82%" } : null),
          // Ekranın alt kənarındakı jest zolağı düymələri örtməsin
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          animation: sakit ? "none" : `panel-qalx ${ACILMA_MS}ms cubic-bezier(0.22, 0.9, 0.35, 1)`,
          transform: cixir ? "translateY(100%)" : `translateY(${Math.max(0, surusme)}px)`,
          transition: cekilir || sakit ? "none" : `transform ${BAGLANMA_MS}ms ease`,
        }}
        onTouchStart={toxunmaBasladi}
        onTouchMove={toxunmaGedir}
        onTouchEnd={toxunmaBitdi}
      >
        {/* Tutacaq: "bunu aşağı çəkmək olar" işarəsi — mətnsiz başa düşülür */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span
            aria-hidden="true"
            style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.line }}
          />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pt-1 pb-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold" style={{ color: C.ink, fontFamily: font.display }}>
              {baslik}
            </h2>
            {altYazi && (
              <p className="mt-0.5 text-xs" style={{ color: C.muted }}>
                {altYazi}
              </p>
            )}
          </div>

          {/* Tutacaq telefonda kifayətdir, amma masaüstündə aşağı çəkmək
              jesti yoxdur — görünən bağla düyməsi hər iki halda işləyir */}
          <button
            type="button"
            onClick={bagla}
            aria-label={t("common.close")}
            // 40px hədəf: bağlama düyməsi ən çox basılan düymədir və barmaq
            // üçün 27px az idi (audit tapıntısı)
            className="-mt-1 -mr-1 flex shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: C.mist, minWidth: 40, minHeight: 40 }}
          >
            <Icon name="X" size={16} color={C.muted} />
          </button>
        </div>

        {/* Sürüşməyən zolaq: klaviatura qalxanda da yerində qalır */}
        {sabitUst && <div className="shrink-0 px-4 pb-2">{sabitUst}</div>}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
