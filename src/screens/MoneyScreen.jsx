import { Amount } from "../components/Amount.jsx";
import { FaktSetri, MenbeQeydi } from "../components/Ayirici.jsx";
import { Button } from "../components/Button.jsx";
import { Card } from "../components/Card.jsx";
import { Chip } from "../components/Chip.jsx";
import { Icon } from "../components/Icon.jsx";
import { SectionTitle } from "../components/SectionTitle.jsx";
import { C, TIPO, font } from "../theme/tokens.js";
import { useI18n } from "../i18n/index.jsx";
import { useStore } from "../state/store.jsx";
import { useRouter } from "../lib/router.jsx";
import { gunAdi } from "../lib/tarix.js";
import { pathFor } from "../routes.js";
import { MovsumPulu } from "../features/money/MovsumPulu.jsx";
import { SubsidiyaKarti } from "../features/money/SubsidiyaKarti.jsx";
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

/** "14:05" — serverdən son uğurlu cavabın vaxtı (mənbə qeydi üçün) */
function saatMetni(deyer) {
  if (!deyer) return "";
  const d = deyer instanceof Date ? deyer : new Date(deyer);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * VƏZİYYƏT NİŞANI — ekranın yuxarısında BİR söz: Baxılır / Təsdiqlənib /
 * Aktiv / Gecikib. Fermer rəqəmlərdən əvvəl bunu oxuyur.
 */
function HalNisani({ hal }) {
  const { t } = useI18n();
  const GORUNUS = {
    baxilir: { ikon: "Clock", reng: C.goldDeep, bg: C.goldSoft },
    ilkin: { ikon: "Info", reng: C.muted, bg: C.mist },
    tesdiq: { ikon: "ShieldCheck", reng: C.mal, bg: C.malSoft },
    aktiv: { ikon: "CheckCircle2", reng: C.field, bg: C.fieldSoft },
    gecikib: { ikon: "AlertCircle", reng: C.danger, bg: C.dangerSoft },
  };
  const g = GORUNUS[hal] ?? GORUNUS.ilkin;
  return <Chip icon={g.ikon} label={t(`maliyye.hal.${hal}`)} color={g.reng} bg={g.bg} />;
}

/**
 * MÜRACİƏTİN GEDİŞİ — dörd addım, hər birinin tarixi serverdən.
 * Tarixi olmayan addım "gözlənilir" oxunur; uydurma tarix yoxdur.
 */
function ZamanXetti({ addimlar }) {
  const { t } = useI18n();
  return (
    <ol className="mt-2" aria-label={t("maliyye.zamanXetti")}>
      {addimlar.map((a, i) => {
        const son = i === addimlar.length - 1;
        const olub = Boolean(a.olub);
        return (
          <li key={a.acar} className="relative flex gap-3" style={{ paddingBottom: son ? 0 : 14 }}>
            {/* xətt + nöqtə */}
            <span className="relative flex w-4 shrink-0 justify-center" aria-hidden="true">
              {!son && (
                <span
                  className="absolute"
                  style={{ top: 14, bottom: -14, width: 2, backgroundColor: olub ? C.field : C.line }}
                />
              )}
              <span
                className="relative mt-1 flex items-center justify-center rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: olub ? C.field : C.card,
                  border: `2px solid ${olub ? C.field : C.line}`,
                }}
              >
                {olub && <Icon name="Check" size={9} color="#fff" strokeWidth={3} />}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p style={{ ...TIPO.metn, color: olub ? C.ink : C.muted, fontWeight: olub ? 600 : 500 }}>
                {t(`maliyye.zx.${a.acar}`)}
              </p>
              <p style={{ ...TIPO.qeyd, color: C.muted }}>
                {a.tarix ? gunAdi(t, a.tarix) : olub ? "" : t("maliyye.zx.gozlenilir")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * MALİYYƏ EKRANI — kredit mərkəzli pilotda pulun həqiqi vəziyyəti.
 *
 * ═══ MƏLUMAT İYERARXİYASI (fintech) ══════════════════════════════════
 *   1) vəziyyət nişanı + ekranın ƏSAS rəqəmi (uyğun limit / aktiv borc)
 *   2) fakt siyahısı — kartsız, sətir-sətir, hairline ilə (bax: Ayirici):
 *      faiz, ümumi qaytarılacaq / bu gün bağlama məbləği, biçin tarixi,
 *      növbəti ödəniş, gecikmiş məbləğ
 *   3) hər hesablanan rəqəmin MƏNBƏYİ və yenilənmə vaxtı (MenbeQeydi)
 *   4) müraciətin gedişi — dörd addımlı zaman xətti
 *   5) BİR dolu düymə — vəziyyətə görə: ödə / təklifə bax / növbəti addım
 *
 * Bütün maliyyə dəyərləri SERVERDƏNDİR (kreditHali → api/kredit.js).
 * Yeganə klient hesablaması "ümumi qaytarılacaq" TƏXMİNİDİR (təklif üçün:
 * əsas + faiz × müddət) və açıq şəkildə "təxmini" işarələnir; aktiv
 * kreditdə isə serverin bu günə hesabladığı `payoffMebleg` göstərilir.
 *
 * DALAN YOXDUR: yeni müraciət düyməsi hər halda kredit panelini açmır —
 * ekranın özü növbəti əskik şərti həll edir (sahə → bitki → hesab → təklif,
 * bax: features/money/sertler.js) və düymə həmin addımı adlandırır.
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

  const menbeVaxti = saatMetni(kreditHali?.yenilenib);
  const menbe = menbeVaxti ? t("maliyye.menbe", { vaxt: menbeVaxti }) : null;

  // Təklifin ümumi qaytarılacaq məbləği — TƏXMİNİ: faiz hər ay, əsas biçində
  const teklifUmumi =
    teklifVar && Number.isFinite(teklif.mebleg) && Number.isFinite(teklif.illikFaiz)
      ? Math.round((teklif.mebleg + (teklif.mebleg * teklif.illikFaiz * (teklif.muddetAy ?? 0)) / 100 / 12) * 100) / 100
      : null;

  // Müraciətin gedişi — hər addımın tarixi serverdən, yoxdursa "gözlənilir"
  const zamanXetti = muraciet
    ? [
        { acar: "muraciet", olub: true, tarix: muraciet.tarix },
        { acar: "qerar", olub: Boolean(qerar) || teklifVar || Boolean(aktiv), tarix: null },
        { acar: "teklif", olub: teklifVar || Boolean(aktiv), tarix: teklif?.tarix ?? null },
        { acar: "kredit", olub: Boolean(aktiv), tarix: aktiv?.verilme ?? aktiv?.tarix ?? null },
      ]
    : null;

  return (
    <div className="px-4 pb-4">
      <SectionTitle level={1}>{t("money.financing")}</SectionTitle>

      {/* Yüklənmə: uydurma rəqəm yox, sadəcə gözləmə sətri */}
      {hal === "yuklenir" && (
        <div className="flex items-center gap-2 py-3" aria-live="polite">
          <Icon name="LoaderCircle" size={16} color={C.muted} />
          <p style={{ ...TIPO.metn, color: C.muted }}>{t("maliyye.yuklenir")}</p>
        </div>
      )}

      {/* Xəta: SÜKUT YALANDIR — borcalan ekranı boş görüb "borcum yoxdur"
          nəticəsi çıxarmamalıdır. Açıq deyilir və təkrar cəhd verilir.
          Bu halda ekranın yeganə dolu düyməsi "Yenidən cəhd et"dir. */}
      {hal === "xeta" && (
        <Card style={{ marginBottom: 12, borderColor: C.danger }} role="alert">
          <div className="flex items-center gap-2">
            <Icon name="AlertCircle" size={16} color={C.danger} />
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {t("maliyye.xetaBasliq")}
            </p>
          </div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
            {t(XETA_IZAHI[kreditHali?.xetaNovu] ?? "maliyye.xetaIzah")}
          </p>
          <Button fullWidth className="mt-3" onClick={() => kreditHali?.yenile?.()}>
            {t("maliyye.yenidenCehd")}
          </Button>
        </Card>
      )}

      {/* ── Hal E: gecikmə — hörmətli ton; ekranın YEGANƏ dolu düyməsi burada */}
      {gecikib && (
        <GecikmeKarti kredit={aktiv} onOdenis={onOpenLoan} onDestek={onOpenChat} onEtrafli={onOpenLoan} />
      )}

      {/* ── Hal D: aktiv kredit — server dəyərləri; gecikmə varsa dolu düyməsiz */}
      {aktiv && (
        <AktivKreditXulasesi
          kredit={aktiv}
          odenisler={odenisler}
          onOdenis={onOpenLoan}
          onQrafik={onOpenLoan}
          esasDuyme={!gecikib}
        />
      )}

      {/* Aktiv kreditin FAKT SİYAHISI — kartsız, sətir-sətir. Kartda artıq
          olan rəqəmlər (növbəti ödəniş, gecikmiş məbləğ) TƏKRARLANMIR:
          burada kartın deməDİYİ dəqiqlik var — faiz dərəcəsi, biçin tarixi,
          bu günə tam bağlama məbləği və rəqəmlərin mənbəyi. */}
      {aktiv && (
        <section className="mt-1 mb-4" aria-label={t("maliyye.faktlar")}>
          <div className="flex items-center justify-between gap-3 pb-1">
            <p className="font-bold" style={{ ...TIPO.metn, color: C.ink, fontFamily: font.display }}>
              {t("maliyye.faktlar")}
            </p>
            <HalNisani hal={gecikib ? "gecikib" : "aktiv"} />
          </div>
          <FaktSetri etiket={t("maliyye.aktivBorc")}>
            <Amount value={aktiv.qaliqBorc} size="md" qepik="hec" />
          </FaktSetri>
          {Number.isFinite(aktiv.illikFaiz) && (
            <FaktSetri etiket={t("teklifKart.faiz")} qeyd={t("maliyye.faizQeyd")}>
              {aktiv.illikFaiz}%
            </FaktSetri>
          )}
          {aktiv.sonTarix && <FaktSetri etiket={t("maliyye.bicinTarixi")}>{gunAdi(t, aktiv.sonTarix)}</FaktSetri>}
          {Number.isFinite(aktiv.payoffMebleg) && (
            <FaktSetri etiket={t("maliyye.buGunBaglasan")} son>
              <Amount value={aktiv.payoffMebleg} size="md" />
            </FaktSetri>
          )}
          {menbe && (
            <MenbeQeydi className="mt-2">
              <Icon name="ShieldCheck" size={14} color={C.field} />
              {menbe}
            </MenbeQeydi>
          )}
        </section>
      )}

      {/* ── Hal C: server təklifi — uyğun limit + faktlar + kart */}
      {teklifVar && (
        <section className="mb-4" aria-label={t("maliyye.uygunLimit")}>
          <div className="flex items-center justify-between gap-3">
            <p style={{ ...TIPO.metn, color: C.muted }}>{t("maliyye.uygunLimit")}</p>
            <HalNisani hal="tesdiq" />
          </div>
          <Amount value={teklif.mebleg} size="xl" ton="mal" qepik="hec" className="mt-0.5" />
          {menbe && (
            <MenbeQeydi className="mt-1">
              <Icon name="ShieldCheck" size={14} color={C.field} />
              {menbe}
            </MenbeQeydi>
          )}

          {/* Müddət və faiz TƏKLİF KARTINDADIR (aşağıda) — burada yalnız
              kartın demədiyi: istənilən məbləğ, biçin tarixi, ümumi təxmin */}
          <div className="mt-3">
            {qerar?.sebebler?.includes("limitAsagiSalinib") && muraciet?.mebleg != null && (
              <FaktSetri etiket={t("maliyye.istenilenMebleg")}>
                <Amount value={muraciet.mebleg} size="md" ton="muted" qepik="hec" />
              </FaktSetri>
            )}
            {teklif.sonTarix && <FaktSetri etiket={t("maliyye.bicinTarixi")}>{gunAdi(t, teklif.sonTarix)}</FaktSetri>}
            {teklifUmumi != null && (
              <FaktSetri etiket={t("maliyye.umumiQaytar")} qeyd={t("maliyye.menbeTexmini")} son>
                <Amount value={teklifUmumi} size="md" texmini />
              </FaktSetri>
            )}
          </div>
        </section>
      )}

      {teklifVar && (
        <TeklifKarti
          teklif={teklif}
          ayliqFaizTexmini={ayliqFaiz(teklif.mebleg, teklif.illikFaiz)}
          azaldilib={Boolean(qerar?.sebebler?.includes("limitAsagiSalinib"))}
          istenilen={muraciet?.mebleg ?? null}
          meblegsiz
          onBax={onOpenLoan}
          onSonra={() => navigate(pathFor("home"))}
        />
      )}

      {/* ── Baxılan müraciət: dərhal pul yoxdur, qərar serverdə veriləcək */}
      {baxilir && (
        <section className="mb-3" aria-label={t("kredit.movcudBasliq")}>
          <div className="flex items-center justify-between gap-3">
            <p style={{ ...TIPO.metn, color: C.muted }}>{t("maliyye.istenilenMebleg")}</p>
            <HalNisani hal="baxilir" />
          </div>
          <Amount value={muraciet.mebleg} size="xl" qepik="hec" className="mt-0.5" />
          {menbe && (
            <MenbeQeydi className="mt-1">
              <Icon name="ShieldCheck" size={14} color={C.field} />
              {menbe}
            </MenbeQeydi>
          )}
          <Card
            style={{ marginTop: 12 }}
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
              <Icon name="ChevronRight" size={16} color={C.muted} />
            </div>
          </Card>
        </section>
      )}

      {/* ── Müraciətin gedişi — hər addımın serverdəki tarixi ilə */}
      {zamanXetti && (
        <section className="mt-2 mb-2">
          <p className="font-bold" style={{ ...TIPO.metn, color: C.ink, fontFamily: font.display }}>
            {t("maliyye.zamanXetti")}
          </p>
          <ZamanXetti addimlar={zamanXetti} />
        </section>
      )}

      {/* Mövsüm pulu — fermerin "maaş dövrü" (bax: features/money/MovsumPulu) */}
      <MovsumPulu indeksHali={indeksHali} kreditHali={kreditHali} />

      {/* Gözlənilən subsidiya — eyni cədvəl kredit tavanına da gedir (lib/subsidiya.js) */}
      {state.sahe && <SubsidiyaKarti bitki={state.chat.crop} hektar={state.sahe.hektar} />}

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
          {/* Kart özü düymədir: içində ikinci <button> ola bilməz, ona görə
              düymə SİSTEMİNİN sinifləri span-a verilir — görünüş eynidir */}
          <span className="btn btn--primary btn--ton-pine btn--md btn--tam mt-3" aria-hidden="true">
            <span className="btn__etiket">{t(sert.ctaKey)}</span>
            <Icon name="ChevronRight" size={18} color="currentColor" />
          </span>
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
