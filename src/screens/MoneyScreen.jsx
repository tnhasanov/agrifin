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
import { ayliqFaiz } from "../../lib/kreditOdenis.js";
import {
  AktivKreditXulasesi,
  GecikmeKarti,
  TeklifKarti,
} from "../features/pano/MaliyyeKartlari.jsx";

/**
 * MALİYYƏ EKRANI — kredit mərkəzli pilotda pulun həqiqi vəziyyəti.
 *
 * DEMO PULQABI, NÜMUNƏ ƏMƏLİYYATLAR, SIĞORTA/RESURS KARTLARI ÇIXARILDI:
 * onlar serverə bağlı deyildi və real kredit qalığının yanında uydurma
 * 7.280 ₼ balans göstərirdilər — təsirli görünən saxta məlumat əvəzinə
 * yoxlanılmış davranış (bax: store.jsx-dəki DEMO qeydi; wallet/txns store-da
 * qalır, sadəcə bu ekran onları artıq göstərmir).
 *
 * Bütün maliyyə dəyərləri SERVERDƏNDİR (kreditHali → api/kredit.js).
 * "Sonda ödəniləcək ümumi məbləğ" heç yerdə yoxdur.
 */
export function MoneyScreen({ onOpenLoan, indeksHali = null, kreditHali = null, onOpenChat }) {
  const { t } = useI18n();
  const { state } = useStore();
  const { navigate } = useRouter();

  const muraciet = kreditHali?.muraciet ?? null;
  const teklif = kreditHali?.teklif ?? null;
  const kredit = kreditHali?.kredit ?? null;
  const qerar = kreditHali?.qerar ?? null;
  const odenisler = kreditHali?.odenisler ?? [];

  const baxilir = muraciet && ["submitted", "reviewing", "approved"].includes(muraciet.hal);
  const teklifVar = muraciet?.hal === "offer_issued" && teklif?.hal === "issued";
  const aktiv = kredit?.hal === "active" ? kredit : null;
  const gecikib = Boolean(aktiv && aktiv.gecikmeGun > 0);
  // Aktiv borcalana yeni kredit sırınmır (aqressiv cross-sell qadağandır)
  const yeniMuracietOlar = !aktiv && !baxilir && !teklifVar;

  return (
    <div className="px-4 pb-4">
      <SectionTitle>{t("money.financing")}</SectionTitle>

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
          style={{ marginBottom: 8 }}
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

      {/* Yeni müraciət — yalnız açıq iş yoxdursa */}
      {yeniMuracietOlar && (
        <Card style={{ marginTop: 8 }} onClick={onOpenLoan} ariaLabel={t("maliyye.elaveVesait")}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ backgroundColor: C.fieldSoft }}>
              <Icon name="Sprout" size={16} color={C.field} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {t("maliyye.elaveVesait")}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                {t("maliyye.elaveVesaitIzah")}
              </p>
            </div>
            <Icon name="ChevronRight" size={16} color={C.muted} />
          </div>
        </Card>
      )}

      {/* Rədd olunmuş son müraciətin qeydi LoanSheet-dədir; burada səssizlik
          qərar deyil — sadəcə kart yoxdur. Server xətası/giriş halları da
          LoanSheet-də tam görünür (bax: features/loan/LoanSheet.jsx). */}
      {kreditHali?.hal === "girisYox" && (
        <Card style={{ marginTop: 8 }} onClick={onOpenLoan} ariaLabel={t("kredit.girisBasliq")}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ backgroundColor: C.mist }}>
              <Icon name="ShieldCheck" size={16} color={C.pine} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.ink }}>
                {t("kredit.girisBasliq")}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                {t("kredit.girisIzah")}
              </p>
            </div>
            <Icon name="ChevronRight" size={16} color={C.muted} />
          </div>
        </Card>
      )}

      {/* Demo pul çıxarıldığının işarəsi: wallet dəyəri artıq göstərilmir,
          amma tamamilə səssiz silmək çaşdırıcı olardı — köhnə istifadəçi
          balansını axtaranda bu qeydi görür. */}
      {state.wallet !== 0 && (
        <p className="mt-3 px-1 text-center text-xs" style={{ color: C.muted }}>
          {t("demo.banner")}
        </p>
      )}
    </div>
  );
}
