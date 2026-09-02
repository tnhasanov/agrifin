import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { MOVSUM, bicineQalanAy, movsumGedisi } from "../../../lib/movsum.js";
import { kreditImkani } from "../loan/useKredit.js";

/**
 * Mövsüm pulu — Monzo-nun "maaşa qədər" xülasəsinin buradakı qarşılığı.
 *
 * Fermerin "maaş günü" biçindir: gəlir ildə bir dəfə, bir yerdə gəlir,
 * xərclər isə mövsümə səpələnib. Bank tətbiqinin aylıq dövrü burada
 * mövsümdür — kart səpindən biçinə qövsü, gözlənilən gəlir aralığını və
 * biçində ödənəcək borcu BİR yerdə göstərir.
 *
 * Rəqəmlər gəlir modelindən gəlir (lib/gelir.js) və ARALIQ kimi verilir:
 * kalibrlənməmiş modeldən tək rəqəm göstərmək onu olduğundan dəqiq
 * göstərərdi. Sahə/bitki yoxdursa kart ümumiyyətlə render olunmur —
 * uydurma mövsüm göstərilmir.
 */
export function MovsumPulu({ indeksHali = null, kreditHali = null }) {
  const { t, money } = useI18n();
  const { state } = useStore();
  const bitki = state.chat.crop;

  const kredit = kreditImkani({
    sahe: state.sahe,
    bitki,
    indeks: indeksHali?.indeks ?? null,
  });

  // Model işləmirsə kart yoxdur: dəvəti əsas ekran onsuz da verir
  if (!MOVSUM[bitki] || kredit.gelir?.hal !== "hazir") return null;

  const gedis = movsumGedisi(bitki);
  const qalanAy = bicineQalanAy(bitki);
  const { pessimist, optimist, baza } = kredit.gelir;

  // Aralığın ucları və orta ssenari. Orta HƏMİŞƏ uclar arasında saxlanılır:
  // model kənar dəyər versə nişan zolağın çölünə çıxardı.
  const asagiGelir = Math.max(0, pessimist.xalisGelir);
  const yuxariGelir = Math.max(asagiGelir, optimist.xalisGelir);
  const ortaGelir = Math.min(Math.max(baza.xalisGelir, asagiGelir), yuxariGelir);
  const ortaNisbet =
    yuxariGelir > asagiGelir ? (ortaGelir - asagiGelir) / (yuxariGelir - asagiGelir) : 0.5;

  // Intl deyil, i18n: bəzi brauzerlərdə az lokalı yoxdur (bax: LoanSheet)
  const ayAdi = (ay) => t(`ayQ.${ay}`);

  // Son tarixə (biçinə) qədər bağlanmalı əsas borc — SERVERDƏN.
  // Aktiv kredit varsa qalıq borc, yoxsa baxılan müraciətin məbləği.
  // Faiz aylıq ödənildiyi və qalığa hesablandığı üçün "yekun ödəniş"
  // rəqəmi yoxdur — kartda əsas borcun özü göstərilir.
  const aktivKredit = kreditHali?.kredit;
  const gozleyen = kreditHali?.muraciet;
  const kreditVar = aktivKredit?.hal === "active";
  const borc = kreditVar
    ? aktivKredit.qaliqBorc
    : gozleyen && ["submitted", "reviewing", "approved", "offer_issued"].includes(gozleyen.hal)
      ? gozleyen.mebleg
      : null;

  return (
    <div
      className="giris mt-3 rounded-2xl p-4"
      style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
          {t("movsumPulu.basliq", { bitki: t(`kbcrop.${bitki}`) })}
        </h3>
        <span
          className="text-xs font-semibold"
          style={{ color: gedis == null ? C.muted : C.field }}
        >
          {/* Biçin ayında "biçinə 12 ay" yazmaq olmaz — o, kredit müddətinin
              semantikasıdır (növbəti mövsüm). Mövsüm kartı bu ayı deyir.

              MÖVSÜMDƏN KƏNARDA GERİ SAYIM DA YAZILMIR: sentyabrda "Biçinə
              11 ay" yaşıl vurğu ilə yazmaq elə bil nəsə yaxınlaşır demək
              idi, halbuki elə altındakı sətir "mövsüm bağlıdır" deyirdi.
              İki cümlə bir-birini təkzib edirdi. İndi kart növbəti
              mövsümün BAŞLADIĞI ayı deyir — fermerin gözlədiyi tarix odur. */}
          {gedis == null
            ? t("movsumPulu.novbetiMovsum", { ay: ayAdi(MOVSUM[bitki].basla) })
            : gedis === 1
              ? t("movsumPulu.bicinAyi")
              : t("movsumPulu.qalan", { ay: qalanAy })}
        </span>
      </div>

      {/* Səpin → biçin qövsü. Mövsümdən kənardadırsa (biçindən sonra) zolaq
          dolu göstərilmir — "mövsüm bağlıdır" yazılır */}
      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.mist }}>
          {gedis != null && (
            <div
              className="bar-dolur h-2 rounded-full"
              style={{ width: `${Math.round(gedis * 100)}%`, backgroundColor: C.field }}
            />
          )}
        </div>
        <div className="mt-1 flex justify-between text-xs" style={{ color: C.muted }}>
          <span>
            {ayAdi(MOVSUM[bitki].basla)} · {t("movsumPulu.sepin")}
          </span>
          <span>
            {ayAdi(MOVSUM[bitki].bicin)} · {t("movsumPulu.bicin")}
          </span>
        </div>
        {gedis == null && (
          <p className="mt-1 text-xs" style={{ color: C.muted }}>
            {t("movsumPulu.movsumBagli")}
          </p>
        )}
      </div>

      {/* Pul sətirləri: gözlənilən gəlir ARALIQDIR, tək rəqəm deyil */}
      <div className="mt-3 border-t pt-1" style={{ borderColor: C.line }}>
        {/* GƏLİR ARALIĞI ZOLAQDIR, QALIN RƏQƏM DEYİL.
            Aralıq üç dəfədən çox fərqlənə bilər; onu ekranın ən güclü
            elementi kimi (qalın yaşıl) yazmaq modeli olduğundan dəqiq
            göstərirdi. İndi: sakit uc rəqəmləri + orta ssenarinin nişanı,
            yəni fermer həm gözləntini, həm qeyri-müəyyənliyi görür. */}
        <div className="py-1.5">
          <div className="flex items-baseline justify-between gap-2">
            {/* MÖVSÜMDƏN KƏNARDA RƏQƏMİN VAXTI DEYİLİR. Bağlı mövsümün
                üstündə vaxtı göstərilməyən "gözlənilən xalis gəlir" fermerə
                "bu pul indi gəlir" kimi oxunurdu — halbuki hesablama
                NÖVBƏTİ mövsüm üçündür. */}
            <span className="text-xs" style={{ color: C.muted }}>
              {t(gedis == null ? "movsumPulu.gelirNovbeti" : "movsumPulu.gelir")}
            </span>
            <span
              className="text-xs font-bold whitespace-nowrap"
              style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
            >
              ~{money(ortaGelir)}
            </span>
          </div>
          <div
            className="mt-1.5"
            role="img"
            aria-label={t("movsumPulu.aralikEtiket", {
              asagi: { money: asagiGelir },
              yuxari: { money: yuxariGelir },
              orta: { money: ortaGelir },
            })}
          >
            <div
              className="relative h-1.5 rounded-full"
              style={{ backgroundColor: C.fieldSoft }}
            >
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
                style={{
                  left: `calc(${Math.round(ortaNisbet * 100)}% - 6px)`,
                  backgroundColor: C.field,
                  border: "2px solid #fff",
                }}
              />
            </div>
            <div
              className="mt-1 flex justify-between"
              style={{ color: C.muted, fontSize: 10, fontVariantNumeric: "tabular-nums" }}
            >
              <span>{money(asagiGelir)}</span>
              <span>{money(yuxariGelir)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-2 py-1.5">
          <span className="text-xs" style={{ color: C.muted }}>
            {t("movsumPulu.xerc")}
          </span>
          <span
            className="text-xs font-bold whitespace-nowrap"
            style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
          >
            {money(baza.xerc)}
          </span>
        </div>
        {borc != null && (
          <div className="flex items-baseline justify-between gap-2 py-1.5">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
              <Icon name="Clock" size={16} color={C.goldDeep} />
              {t(kreditVar ? "movsumPulu.borcKredit" : "movsumPulu.borc")}
            </span>
            <span
              className="text-xs font-bold whitespace-nowrap"
              style={{ color: C.goldDeep, fontVariantNumeric: "tabular-nums" }}
            >
              −{money(borc)}
            </span>
          </div>
        )}
      </div>

      <p className="mt-1.5" style={{ color: C.muted, fontSize: 10, lineHeight: 1.4 }}>
        {t("movsumPulu.qeyd")}
      </p>
    </div>
  );
}
