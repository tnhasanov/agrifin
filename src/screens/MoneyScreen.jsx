import { Card } from "../components/Card.jsx";
import { Chip } from "../components/Chip.jsx";
import { Icon } from "../components/Icon.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { C } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { useRouter } from "../lib/router.jsx";
import { pathFor } from "../routes.js";
import { MovsumPulu } from "../features/money/MovsumPulu.jsx";
import { novbetiSert } from "../features/money/sertler.js";
import { TeklifAmilleri } from "../features/money/TeklifAmilleri.jsx";
import { ayliqFaiz } from "../../lib/kreditOdenis.js";
import {
  AktivKreditXulasesi,
  GecikmeKarti,
  TeklifKarti,
} from "../features/pano/MaliyyeKartlari.jsx";

/**
 * Xətanın SƏBƏBİ üçün mətn (bax: useKreditVeziyyeti → xetaSebebi).
 * Hamısına "bağlantı kəsildi" demək fermeri öz internetini yoxlamağa
 * göndərir, halbuki problem bizim tərəfdə ola bilər.
 */
const XETA_IZAHI = {
  sebeke: "maliyye.xetaIzah",
  server: "maliyye.xetaIzahServer",
  sxem: "maliyye.xetaIzahSxem",
};

/**
 * MALİYYƏ EKRANI — kredit mərkəzli pilotda pulun həqiqi vəziyyəti.
 *
 * DEMO PULQABI, NÜMUNƏ ƏMƏLİYYATLAR, SIĞORTA/RESURS KARTLARI ÇIXARILDI:
 * onlar serverə bağlı deyildi və real kredit qalığının yanında uydurma
 * 7.280 ₼ balans göstərirdilər — təsirli görünən saxta məlumat əvəzinə
 * yoxlanılmış davranış (bax: store.jsx-dəki DEMO qeydi).
 *
 * DALAN YOXDUR: yeni müraciət düyməsi hər halda kredit panelini açmır —
 * ekranın özü növbəti əskik şərti həll edir (sahə → bitki → hesab → təklif,
 * bax: features/money/sertler.js) və düymə həmin addımı adlandırır.
 *
 * Bütün maliyyə dəyərləri SERVERDƏNDİR (kreditHali → api/kredit.js).
 * "Sonda ödəniləcək ümumi məbləğ" heç yerdə yoxdur.
 */
export function MoneyScreen({
  onOpenLoan,
  indeksHali = null,
  kreditHali = null,
  onOpenChat,
  onDrawField,
  onOpenBitki,
  onOpenHesab,
}) {
  const { t } = useI18n();
  const { state } = useStore();
  const { navigate } = useRouter();

  const muraciet = kreditHali?.muraciet ?? null;
  const teklif = kreditHali?.teklif ?? null;
  const kredit = kreditHali?.kredit ?? null;
  const qerar = kreditHali?.qerar ?? null;
  const odenisler = kreditHali?.odenisler ?? [];

  const hal = kreditHali?.hal ?? "yuklenir";
  // Server cavabı gəlməyibsə BOŞLUQ "kredit yoxdur" demək DEYİL: yüklənmə və
  // xəta hallarında muraciet/teklif/kredit hamısı null olur, ona görə bütün
  // qərarlar cavabın gəldiyinə şərtlənir (bax: useKreditVeziyyeti).
  const cavabGeldi = hal === "hazir" || hal === "qurulmayib";
  const baxilir = muraciet && ["submitted", "reviewing", "approved"].includes(muraciet.hal);
  const teklifVar = muraciet?.hal === "offer_issued" && teklif?.hal === "issued";
  const aktiv = kredit?.hal === "active" ? kredit : null;
  const gecikib = Boolean(aktiv && aktiv.gecikmeGun > 0);
  // Aktiv borcalana yeni kredit sırınmır (aqressiv cross-sell qadağandır).
  // Vəziyyət bilinmirsə də sırınmır: xəta anında borcalana "əlavə vəsait"
  // təklif etmək onun borcunu görməzdən gəlmək olardı.
  //
  // "girisYox" (401) da bitmiş cavabdır: serverin dediyi budur ki, əvvəl
  // hesaba girmək lazımdır — şərt zənciri elə bunu göstərəcək.
  const sertCavabi = cavabGeldi || hal === "girisYox";
  const yeniMuracietOlar = sertCavabi && !aktiv && !baxilir && !teklifVar;

  // Növbəti əskik addım — düymənin adı da, hərəkəti də bundan çıxır
  const sert = novbetiSert({ sahe: state.sahe, bitki: state.chat.crop, serverHal: hal });
  const sertIcra = () => {
    if (sert.hereket === "saheCek") onDrawField?.();
    else if (sert.hereket === "bitkiSec") onOpenBitki?.();
    else if (sert.hereket === "hesab") onOpenHesab?.();
    else onOpenLoan?.();
  };

  return (
    <div className="px-4 pb-4">
      <SectionTitle>{t("money.financing")}</SectionTitle>

      {/* Yüklənmə: uydurma rəqəm yox, sadəcə gözləmə sətri */}
      {hal === "yuklenir" && (
        <Card style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2" aria-live="polite">
            <Icon name="LoaderCircle" size={16} color={C.muted} />
            <p className="text-xs" style={{ color: C.muted }}>
              {t("maliyye.yuklenir")}
            </p>
          </div>
        </Card>
      )}

      {/* Xəta: SÜKUT YALANDIR — borcalan ekranı boş görüb "borcum yoxdur"
          nəticəsi çıxarmamalıdır. Açıq deyilir və təkrar cəhd verilir. */}
      {hal === "xeta" && (
        <Card style={{ marginBottom: 12, borderColor: C.danger }} role="alert">
          <div className="flex items-center gap-2">
            <Icon name="AlertCircle" size={16} color={C.danger} />
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {t("maliyye.xetaBasliq")}
            </p>
          </div>
          {/* Səbəb düzgün adlandırılır: server 500 qaytarıbsa "bağlantı
              kəsildi" demək fermeri öz internetini yoxlamağa göndərir,
              halbuki problem bizdədir (bax: useKreditVeziyyeti → xetaSebebi) */}
          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
            {t(XETA_IZAHI[kreditHali?.xetaNovu] ?? "maliyye.xetaIzah")}
          </p>
          <button
            type="button"
            onClick={() => kreditHali?.yenile?.()}
            className="mt-2.5 w-full rounded-xl py-2.5 text-sm font-bold"
            style={{ backgroundColor: C.pine, color: "#fff", minHeight: 44 }}
          >
            {t("maliyye.yenidenCehd")}
          </button>
        </Card>
      )}

      {/* Hal E: gecikmə — hörmətli ton, ödə/dəstək yolları */}
      {gecikib && (
        <GecikmeKarti
          kredit={aktiv}
          onOdenis={onOpenLoan}
          onDestek={onOpenChat}
          onEtrafli={onOpenLoan}
        />
      )}

      {/* Hal D: aktiv kredit — server dəyərləri, yekun məbləğsiz */}
      {aktiv && (
        <AktivKreditXulasesi
          kredit={aktiv}
          odenisler={odenisler}
          onOdenis={onOpenLoan}
          onQrafik={onOpenLoan}
        />
      )}

      {/* Hal C: server təklifi — səbəblər + yekun-baxış qeydi ilə */}
      {teklifVar && (
        <TeklifKarti
          teklif={teklif}
          ayliqFaizTexmini={ayliqFaiz(teklif.mebleg, teklif.illikFaiz)}
          azaldilib={Boolean(qerar?.sebebler?.includes("limitAsagiSalinib"))}
          istenilen={muraciet?.mebleg ?? null}
          onBax={onOpenLoan}
          onSonra={() => navigate(pathFor("home"))}
        />
      )}

      {/* Baxılan müraciət: dərhal pul yoxdur, qərar serverdə veriləcək */}
      {baxilir && (
        <Card
          style={{ marginBottom: 12 }}
          onClick={onOpenLoan}
          ariaLabel={t("kredit.movcudBasliq")}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ backgroundColor: C.goldSoft }}>
              <Icon name="Clock" size={16} color={C.goldDeep} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: C.ink }}>
                {t("kredit.kartBasliq", { mebleg: { money: muraciet.mebleg } })}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                {t("kredit.kartAltyazi")}
              </p>
            </div>
            <Chip label={t("kredit.gozleyir")} color={C.goldDeep} bg={C.goldSoft} />
          </div>
        </Card>
      )}

      {/* Mövsüm pulu — fermerin "maaş dövrü" (bax: features/money/MovsumPulu) */}
      <MovsumPulu indeksHali={indeksHali} kreditHali={kreditHali} />

      {/* Yeni müraciət — yalnız açıq iş yoxdursa. Kart NÖVBƏTİ ƏSKİK ADDIMI
          göstərir: sahə yoxdursa "Sahə əlavə et", bitki yoxdursa "Bitkini
          seç", giriş yoxdursa "Hesab yarat", hamısı hazırdırsa "Təklifi
          yoxla". Panelin içində "əvvəl sahə çək" demək dalandır. */}
      {yeniMuracietOlar && (
        <Card
          style={{ marginTop: 12, backgroundColor: C.fieldSoft, border: "none" }}
          onClick={sertIcra}
          // Kart özü düymədir, ona görə aria-label MƏTNİ ƏVƏZ EDİR: başlıq,
          // növbəti addımın izahı və CTA — üçü də oxunmalıdır
          ariaLabel={`${t(sert.kartBasliqKey)} — ${t(sert.basliqKey)} ${t(sert.ctaKey)}`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white p-2">
              <Icon name={sert.ikon} size={16} color={C.field} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: C.ink }}>
                {t(sert.kartBasliqKey)}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
                {t(sert.basliqKey)}
              </p>
            </div>
          </div>
          {/* Mock-dakı tam enli tünd yaşıl düymə (kart özü düymədir) */}
          <p
            className="mt-3 flex items-center justify-center gap-1 rounded-xl py-3 text-sm font-bold"
            style={{ backgroundColor: C.pine, color: "#fff" }}
          >
            {t(sert.ctaKey)}
            <Icon name="ChevronRight" size={16} color="#fff" />
          </p>
        </Card>
      )}

      {/* Şərtlər tamamlanandan sonra ekranda bir düymə və çoxlu boşluq
          qalırdı. Boşluq "yüklənməyib" kimi oxunur, üstəlik ən çox verilən
          sual cavabsız idi: "niyə bu qədər?" Kart serverin HƏQİQƏTƏN
          baxdığı girişləri sadalayır — məbləğ vəd etmədən. */}
      {yeniMuracietOlar && sert.tip === "hazir" && (
        <TeklifAmilleri
          hektar={state.sahe?.hektar ?? null}
          bitkiKey={state.chat.crop}
          movsumSayi={
            indeksHali?.movsumler?.filter((m) => Number.isFinite(m.zirve)).length ?? 0
          }
        />
      )}
    </div>
  );
}
