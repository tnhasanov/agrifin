import { useRef, useState } from "react";
import { Chip } from "../../components/Chip.jsx";
import { Icon } from "../../components/Icon.jsx";
import { Aqronom } from "../../components/Aqronom.jsx";
import { Sheet } from "../../components/Sheet.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { useStore } from "../../state/store.jsx";
import { KREDIT_SERTLERI } from "../../../lib/kreditSertler.js";
import { ayliqFaiz } from "../../../lib/kreditOdenis.js";
import { kreditImkani } from "./useKredit.js";

/**
 * Kredit axını — Nubank limit slayderinin buradakı qarşılığı.
 *
 * Üç dürüstlük qaydası:
 *   1. TAVANI SAHƏ QOYUR: slayderin maksimumu uydurma limit deyil, ödəniş
 *      qabiliyyətindən çıxan məbləğdir (bax: features/loan/useKredit.js).
 *      "Niyə bu qədər?" hər addımı rəqəmlə açır — Nubank-ın "Me explica"sı.
 *   2. ÖDƏNİŞ BİÇİNƏ BAĞLANIR: müddət sabit deyil, fermerin pulu OLACAĞI
 *      aya qədərdir.
 *   3. DƏRHAL PUL YOXDUR: axın müraciətlə bitir. Əvvəl "Qəbul et" düyməsi
 *      pulqabına dərhal pul yazırdı — real qərar mühərriki olmayan yerdə
 *      bu, yalan idi.
 *
 * Sheet primitivində qurulub: sürüşdürüb bağlama, fokus tələsi, Escape —
 * hamısı ordan gəlir (əvvəl bunların heç biri yox idi).
 */
export function LoanSheet({ onClose, indeksHali = null, kreditHali, onOpenHesab }) {
  const { t, money } = useI18n();
  const { state } = useStore();
  const [addim, setAddim] = useState(0);
  const [izahAcilib, setIzahAcilib] = useState(false);
  // İdempotentlik açarı: panel bir dəfə açılanda bir açar. Şəbəkə itsə və
  // fermer təkrar toxunsa server İKİNCİ müraciət yaratmır.
  // (Açar render zamanı YOX, ilk göndərişdə yaradılır: Date.now/Math.random
  // render içində qadağandır — react-hooks/purity.)
  const acarRef = useRef(null);
  // Ödənişin idempotentlik açarı: uğurlu ödənişdən sonra sıfırlanır ki,
  // növbəti ödəniş YENİ əməl kimi getsin
  const odeAcarRef = useRef(null);
  const [odenisMebleg, setOdenisMebleg] = useState("");

  // SERVER vəziyyəti — müraciət, qərar, təklif, kredit (bax: useKreditVeziyyeti)
  const serverHal = kreditHali?.hal ?? "yuklenir";
  const muraciet = kreditHali?.muraciet ?? null;
  const teklif = kreditHali?.teklif ?? null;
  const aktivKredit = kreditHali?.kredit ?? null;
  const qerar = kreditHali?.qerar ?? null;
  const hadiseler = kreditHali?.hadiseler ?? [];
  const odenisler = kreditHali?.odenisler ?? [];
  const acıqMuraciet =
    muraciet && ["submitted", "reviewing", "approved"].includes(muraciet.hal) ? muraciet : null;
  const teklifVar = muraciet?.hal === "offer_issued" && teklif?.hal === "issued";
  const reddedilib = muraciet?.hal === "rejected" && addim === 2;
  // Slayder axını yalnız açıq iş yoxdursa görünür
  const axinAcıq =
    serverHal === "hazir" && !acıqMuraciet && !teklifVar && !aktivKredit && !reddedilib;

  const kredit = kreditImkani({
    sahe: state.sahe,
    bitki: state.chat.crop,
    indeks: indeksHali?.indeks ?? null,
  });

  const hazir = kredit.hal === "hazir";
  // Slayder tavana sıçramasın deyə başlanğıc tavanın yarısıdır
  const [mebleg, setMebleg] = useState(() =>
    hazir ? Math.max(kredit.minKredit, Math.round(kredit.maxKredit / 2 / 100) * 100) : 0,
  );

  // Intl işlədilmir: Chromium-un bir çox quruluşunda az lokalı yoxdur və
  // "İyun 2027" əvəzinə "M06 2027" çıxırdı — adlar i18n-dən gəlir
  const ayAdi = (tarix) =>
    tarix ? `${t(`ay.${tarix.getMonth() + 1}`)} ${tarix.getFullYear()}` : "";

  /** Gün dəqiqliyi ilə: "10 Aprel" — ödəniş tarixləri üçün */
  const gunAdi = (deyer) => {
    if (!deyer) return "";
    const tarix = new Date(deyer);
    if (Number.isNaN(tarix.getTime())) return "";
    return `${tarix.getUTCDate()} ${t(`ay.${tarix.getUTCMonth() + 1}`)}`;
  };

  // Serverə YALNIZ MƏBLƏĞ gedir. Müddət, dərəcə, limit, bal və qərar
  // serverdə hesablanır — klientin hesabladığı rəqəm bağlayıcı deyil
  // (bax: api/kredit.js, lib/kredit.js).
  const gonder = async () => {
    acarRef.current ??= `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const netice = await kreditHali.muracietEt(mebleg, acarRef.current);
    if (netice.ok) setAddim(2);
  };

  // Jurnal sətirləri: ödənişlər qruplaşdırılmış (serverdən `odenisler`),
  // qalan hadisələr olduğu kimi; hamısı yenidən köhnəyə doğru
  const jurnalSetirleri = [
    ...hadiseler
      .filter((h) => h.nov !== "interest_payment" && h.nov !== "principal_repayment")
      .map((h) => ({
        acar: `h-${h.id}`,
        tarix: h.tarix,
        ad: t(`kredit.tarixce.${h.nov}`),
        mebleg: h.mebleg,
        alt:
          h.esasSonra != null
            ? t("kredit.tarixce.qaliqSonra", { mebleg: { money: h.esasSonra } })
            : null,
        vurgu: h.nov === "interest_charge",
      })),
    ...odenisler.map((odenis) => ({
      acar: `o-${odenis.tarix}`,
      tarix: odenis.tarix,
      ad: t("kredit.tarixce.odenis"),
      mebleg: odenis.mebleg,
      alt: t("kredit.tarixce.bolgu", {
        faiz: { money: odenis.faizHissesi },
        esas: { money: odenis.esasHissesi },
        qaliq: { money: odenis.esasQaliq ?? 0 },
      }),
      vurgu: false,
    })),
  ].sort((a, b) => new Date(b.tarix) - new Date(a.tarix));

  // Ödəniş: məbləğ serverə gedir, bölgünü (əvvəl faiz, sonra əsas borc)
  // server aparır — klient nə bölür, nə də balansı özü hesablayır
  const ode = async () => {
    const mebleg = Number(odenisMebleg);
    if (!(mebleg > 0)) return;
    odeAcarRef.current ??= `o-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const netice = await kreditHali.odeEt(mebleg, odeAcarRef.current);
    if (netice.ok) {
      odeAcarRef.current = null;
      setOdenisMebleg("");
    }
  };

  // "Niyə bu qədər?" — tavanın hər addımı rəqəmlə (Nubank "Me explica").
  // xalisGelir HƏQİQƏTƏN xalisdir: lib/gelir.js-də satış gəliri + subsidiya
  // cəmindən istehsal xərcləri (toxum, gübrə, yanacaq, əmək) çıxılıb.
  const pessimist = kredit.odenis?.ssenariler?.find((s) => s.ad === "pessimist");
  const izahSetirleri = hazir
    ? [
        ["kredit.izah.xalis", kredit.gelir.pessimist.xalisGelir],
        ["kredit.izah.serbest", pessimist.serbestGelir],
        ["kredit.izah.tavan", pessimist.tavan],
        ["kredit.izah.limit", kredit.maxKredit],
      ]
    : [];

  return (
    <Sheet
      acilib
      onBagla={onClose}
      baslik={t("loan.title")}
      altYazi={t("kredit.altYazi")}
    >
      <div className="px-4 pb-4">
        {/* ── Server vəziyyəti: yüklənir / giriş yoxdur / xəta ───────── */}
        {serverHal === "yuklenir" && (
          <div className="py-4">
            <div className="skelet mx-auto h-8 w-40 rounded-xl" />
            <div className="skelet mt-3 h-3 w-full rounded" />
            <div className="skelet mt-2 h-3 w-2/3 rounded" />
          </div>
        )}

        {/* Kredit hesaba bağlıdır: sahibsiz maliyyə qeydi ola bilməz.
            Qalan ekranlar əvvəlki kimi qeydiyyatsız işləyir. */}
        {serverHal === "girisYox" && (
          <div className="py-2 text-center">
            <Icon name="ShieldCheck" size={22} color={C.goldDeep} />
            <p className="mt-2 text-sm font-bold" style={{ color: C.ink }}>
              {t("kredit.girisBasliq")}
            </p>
            <p className="mx-auto mt-1 max-w-[32ch] text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.girisIzah")}
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHesab?.();
              }}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.pine, color: "#fff" }}
            >
              {t("hesab.cta")}
            </button>
          </div>
        )}

        {(serverHal === "xeta" || serverHal === "qurulmayib") && (
          <div className="py-2 text-center">
            <Icon name="AlertCircle" size={22} color={C.muted} />
            <p className="mt-2 text-sm font-bold" style={{ color: C.ink }}>
              {t(serverHal === "qurulmayib" ? "kredit.serverYoxdur" : "kredit.xetaBasliq")}
            </p>
            <p className="mx-auto mt-1 max-w-[32ch] text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.xetaIzah")}
            </p>
            {serverHal === "xeta" && (
              <button
                type="button"
                onClick={() => kreditHali.yenile()}
                className="mt-4 w-full rounded-xl py-3 text-sm font-bold"
                style={{ backgroundColor: C.pine, color: "#fff" }}
              >
                {t("kredit.tekrarCehd")}
              </button>
            )}
          </div>
        )}

        {/* ── Aktiv kredit: balans, növbəti ödəniş, ödəniş, jurnal ────── */}
        {serverHal === "hazir" && aktivKredit && (
          <div className="py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold" style={{ color: C.ink }}>
                {t("kredit.aktivBasliq")}
              </p>
              {/* Gecikmə gizlədilmir: fermer nə vaxtdan borclu olduğunu
                  bilməlidir — xəbərdarlıq cərimədən əvvəl gəlir */}
              {aktivKredit.gecikmeGun > 0 && (
                <Chip
                  icon="AlertCircle"
                  label={t("kredit.gecikme", { gun: aktivKredit.gecikmeGun })}
                  color={C.danger}
                  bg="#FBEAE7"
                />
              )}
            </div>

            {/* Qalan əsas borc — ekranın ən iri rəqəmi */}
            <p className="mt-1 text-xs" style={{ color: C.muted }}>
              {t("kredit.qaliqBorc")}
            </p>
            <p
              className="text-3xl font-extrabold"
              style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
            >
              {money(aktivKredit.qaliqBorc)}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.mist }}>
              <div
                className="bar-dolur h-2 rounded-full"
                style={{
                  width: `${Math.round((1 - aktivKredit.qaliqBorc / aktivKredit.esasBorc) * 100)}%`,
                  backgroundColor: C.field,
                }}
              />
            </div>

            {[
              { ad: t("kredit.detal.ilkin"), deger: money(aktivKredit.esasBorc) },
              {
                ad: t("kredit.detal.faizBorc"),
                deger: money(aktivKredit.faizBorc),
                // Ödənilməmiş faiz varsa diqqət çəkir — gizli borc olmur
                vurgu: aktivKredit.faizBorc > 0,
              },
              // Gecikmiş məbləğ yalnız gecikmə varsa görünür
              aktivKredit.gecikmisMebleg > 0 && {
                ad: t("kredit.detal.gecikmis"),
                deger: money(aktivKredit.gecikmisMebleg),
                vurgu: true,
              },
              aktivKredit.novbetiTarix && {
                ad: t("kredit.detal.novbeti"),
                deger: t(
                  aktivKredit.novbetiEsasDaxil
                    ? "kredit.detal.novbetiEsasla"
                    : "kredit.detal.novbetiDeger",
                  {
                    mebleg: { money: aktivKredit.novbetiMebleg },
                    tarix: gunAdi(aktivKredit.novbetiTarix),
                  },
                ),
              },
              { ad: t("kredit.detal.faizDerece"), deger: `${aktivKredit.illikFaiz}%` },
              aktivKredit.sonTarix && {
                ad: t("kredit.detal.sonTarix"),
                deger: gunAdi(aktivKredit.sonTarix),
              },
            ]
              .filter(Boolean)
              .map(({ ad, deger, vurgu }) => (
                <div
                  key={ad}
                  className="flex justify-between gap-3 py-2"
                  style={{ borderBottom: `1px solid ${C.line}` }}
                >
                  <span className="text-xs" style={{ color: C.muted }}>
                    {ad}
                  </span>
                  <span
                    className="max-w-[60%] text-right text-xs font-bold"
                    style={{
                      color: vurgu ? C.goldDeep : C.ink,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {deger}
                  </span>
                </div>
              ))}

            <p className="mt-2 text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.detal.qeyd")}
            </p>

            {/* ── Ödəniş ─────────────────────────────────────────────── */}
            <p className="mt-4 text-sm font-bold" style={{ color: C.ink }}>
              {t("kredit.odenis.basliq")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {aktivKredit.novbetiMebleg > 0 && (
                <button
                  type="button"
                  onClick={() => setOdenisMebleg(String(Math.ceil(aktivKredit.novbetiMebleg)))}
                  className="rounded-xl px-3 py-2 text-xs font-semibold"
                  style={{ backgroundColor: C.mist, color: C.pine }}
                >
                  {t("kredit.odenis.novbeti", { mebleg: { money: aktivKredit.novbetiMebleg } })}
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setOdenisMebleg(String(Math.ceil(aktivKredit.qaliqBorc + aktivKredit.faizBorc)))
                }
                className="rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ backgroundColor: C.mist, color: C.pine }}
              >
                {t("kredit.odenis.hamisi", {
                  mebleg: { money: aktivKredit.qaliqBorc + aktivKredit.faizBorc },
                })}
              </button>
            </div>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              value={odenisMebleg}
              onChange={(e) => setOdenisMebleg(e.target.value)}
              aria-label={t("kredit.odenis.mebleg")}
              placeholder={t("kredit.odenis.mebleg")}
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm font-bold"
              style={{
                backgroundColor: C.mist,
                color: C.ink,
                border: `1px solid ${C.line}`,
                fontVariantNumeric: "tabular-nums",
              }}
            />
            <button
              type="button"
              disabled={kreditHali.gedir || !(Number(odenisMebleg) > 0)}
              onClick={ode}
              className="mt-2 w-full rounded-xl py-3 text-sm font-bold"
              style={{
                backgroundColor: C.pine,
                color: "#fff",
                opacity: kreditHali.gedir || !(Number(odenisMebleg) > 0) ? 0.5 : 1,
              }}
            >
              {kreditHali.gedir
                ? t("kredit.gedir")
                : t("kredit.odenis.cta", { mebleg: { money: Number(odenisMebleg) || 0 } })}
            </button>

            {/* ── Hərəkət jurnalı ─────────────────────────────────────
                Ödəniş BİR sətirdir (faiz payı + əsas payı + sonrakı qalıq),
                çünki fermer "2.100 ödədim" görmək istəyir, iki hadisə yox.
                Faizin yığılması və verilmə isə öz sətirlərində qalır. */}
            {jurnalSetirleri.length > 0 && (
              <>
                <p className="mt-4 text-sm font-bold" style={{ color: C.ink }}>
                  {t("kredit.tarixce.basliq")}
                </p>
                {jurnalSetirleri.map((setir) => (
                  <div
                    key={setir.acar}
                    className="flex items-baseline justify-between gap-3 py-2"
                    style={{ borderBottom: `1px solid ${C.line}` }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold" style={{ color: C.ink }}>
                        {setir.ad}
                      </p>
                      <p className="text-xs" style={{ color: C.muted }}>
                        {gunAdi(setir.tarix)}
                        {setir.alt ? ` · ${setir.alt}` : ""}
                      </p>
                    </div>
                    <span
                      className="text-xs font-bold whitespace-nowrap"
                      style={{
                        color: setir.vurgu ? C.goldDeep : C.ink,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {money(setir.mebleg)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Təklif hazırdır: qəbul et / imtina ──────────────────────── */}
        {serverHal === "hazir" && teklifVar && !aktivKredit && (
          <div className="py-2 text-center">
            <div className="relative mx-auto mb-2 inline-block">
              {/* Konfeti yalnız TƏZƏ göndərilmiş müraciətdə düşür — paneli
                  yenidən açanda bayram təkrarlanmır (bax: index.css, .konfeti) */}
              {addim === 2 &&
                [
                  ["8%", "0ms", C.gold],
                  ["24%", "120ms", C.field],
                  ["40%", "40ms", "#B79BE0"],
                  ["56%", "180ms", C.gold],
                  ["72%", "80ms", "#D9483B"],
                  ["88%", "150ms", C.field],
                  ["16%", "220ms", "#4A90E2"],
                  ["64%", "260ms", C.goldDeep],
                ].map(([sol, gecikme, reng]) => (
                  <span
                    key={`${sol}-${gecikme}`}
                    className="konfeti"
                    style={{ left: sol, animationDelay: gecikme, backgroundColor: reng }}
                  />
                ))}
              <Aqronom hal="sevincli" bitki={state.chat.crop} olcu={150} />
            </div>
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {t("kredit.teklifBasliq")}
            </p>
            <p
              className="mt-1 text-3xl font-extrabold"
              style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
            >
              {money(teklif.mebleg)}
            </p>
            {qerar?.sebebler?.includes("limitAsagiSalinib") && (
              <p className="mx-auto mt-1 max-w-[32ch] text-xs leading-relaxed" style={{ color: C.muted }}>
                {t("kredit.teklifAzaldilib", { istenilen: { money: muraciet.mebleg } })}
              </p>
            )}
            <p className="mx-auto mt-2 max-w-[34ch] text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.teklifIzah", {
                faiz: { money: ayliqFaiz(teklif.mebleg, teklif.illikFaiz) },
                ay: teklif.muddetAy,
              })}
            </p>
            <button
              type="button"
              disabled={kreditHali.gedir}
              // Açar TƏKLİFƏ bağlıdır: şəbəkə qırılıb fermer yenidən
              // toxunsa server eyni sorğunu tanıyır, ikinci kredit açmır
              onClick={() => kreditHali.teklifiQebulEt(teklif.id, `t-${teklif.id}`)}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.gold, color: C.pine, opacity: kreditHali.gedir ? 0.6 : 1 }}
            >
              {kreditHali.gedir ? t("kredit.gedir") : t("kredit.teklifQebulCta")}
            </button>
            <button
              type="button"
              disabled={kreditHali.gedir}
              onClick={() => kreditHali.legvEt()}
              className="mt-2 w-full rounded-xl py-2.5 text-xs font-bold"
              style={{ backgroundColor: C.mist, color: C.danger }}
            >
              {t("kredit.teklifImtinaCta")}
            </button>
          </div>
        )}

        {/* ── Rədd edildi: səbəb açıq deyilir ─────────────────────────── */}
        {serverHal === "hazir" && reddedilib && (
          <div className="py-2 text-center">
            <Aqronom hal="narahat" bitki={state.chat.crop} olcu={110} gorunus="tam" />
            <p className="mt-2 text-sm font-bold" style={{ color: C.ink }}>
              {t("kredit.reddBasliq")}
            </p>
            <p className="mx-auto mt-1 max-w-[34ch] text-xs leading-relaxed" style={{ color: C.muted }}>
              {t(
                qerar?.sebebler?.includes("qabiliyyetAzdir")
                  ? "kredit.reddQabiliyyet"
                  : "kredit.reddUmumi",
              )}
            </p>
          </div>
        )}

        {/* ── Baxılan müraciət var: ikincisi göndərilmir ──────────────── */}
        {serverHal === "hazir" && acıqMuraciet && (
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Icon name="Clock" size={15} color={C.goldDeep} />
              <p className="text-sm font-bold" style={{ color: C.ink }}>
                {t("kredit.movcudBasliq")}
              </p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.movcudIzahServer", { mebleg: { money: acıqMuraciet.mebleg } })}
            </p>
            <button
              type="button"
              disabled={kreditHali.gedir}
              onClick={() => kreditHali.legvEt()}
              className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold"
              style={{ backgroundColor: C.mist, color: C.danger }}
            >
              {t("kredit.legvCta")}
            </button>
          </div>
        )}

        {/* Yazma əməlinin xətası — fermerə görünür, sükutla udulmur */}
        {kreditHali?.xetaAcari && (
          <p
            role="alert"
            className="mt-2 rounded-lg px-2.5 py-2 text-xs leading-relaxed"
            style={{ backgroundColor: "#FBEAE7", color: C.danger }}
          >
            {t(`kredit.xeta.${kreditHali.xetaAcari}`)}
          </p>
        )}

        {/* ── Sahə/bitki yoxdur: imkan hesablana bilmir ─────────────── */}
        {axinAcıq && kredit.hal === "olculmur" && (
          <div className="py-2 text-center">
            <Icon name="Satellite" size={22} color={C.muted} />
            <p className="mt-2 text-sm font-bold" style={{ color: C.ink }}>
              {t("kredit.olculmurBasliq")}
            </p>
            <p className="mx-auto mt-1 max-w-[30ch] text-xs leading-relaxed" style={{ color: C.muted }}>
              {t(
                kredit.sebeb === "saheYoxdur"
                  ? "kredit.olculmurSahe"
                  : "kredit.olculmurBitki",
              )}
            </p>
          </div>
        )}

        {/* ── Tavan çox kiçikdir: bunu demək də dürüstlükdür ────────── */}
        {axinAcıq && kredit.hal === "imkanYoxdur" && (
          <div className="py-2">
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {t("kredit.imkanYoxBasliq")}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.imkanYoxIzah", {
                hektar: { number: state.sahe?.hektar ?? 0 },
                xalis: { money: Math.max(0, kredit.gelir.pessimist.xalisGelir) },
              })}
            </p>
            <p
              className="mt-2 rounded-lg px-2.5 py-2 text-xs leading-relaxed"
              style={{ backgroundColor: C.goldSoft, color: C.goldDeep }}
            >
              {t("kredit.imkanYoxMeslehet")}
            </p>
          </div>
        )}

        {/* ── Addım 0: məbləği seç ──────────────────────────────────── */}
        {axinAcıq && hazir && addim === 0 && (
          <div>
            {/* Aqro slaydere REAKSİYA VERİR (Leo kimi): tavana yaxınlaşanda
                fikirləşir — "çox götürürsən, ödəyə biləcəksən?" sözsüz deyilir.
                Qadağa deyil, üz ifadəsidir: seçim fermerindir. */}
            <div className="mb-1 flex items-end justify-center gap-3">
              <Aqronom
                hal={mebleg >= kredit.maxKredit * 0.85 ? "dusunur" : "sakit"}
                bitki={state.chat.crop}
                olcu={44}
              />
              <p
                className="text-center text-3xl font-extrabold"
                style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
              >
                {money(mebleg)}
              </p>
            </div>
            {/* "Bir ödəniş: X ₼ · Avqust" SİLİNİB — məhsul o deyil.
                Rəqəm İLK ayın faizidir, sabit aylıq ödəniş DEYİL: əsas borc
                azaldıqca faiz də azalır və məhsulun əsas üstünlüyü elə budur.
                "Hər ay 45 ₼" yazmaq o üstünlüyü gizlədirdi. */}
            <p
              className="text-center text-xs font-semibold"
              style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
            >
              {t("kredit.faizSetri", { faiz: { money: kredit.ayliqFaiz1(mebleg) } })}
            </p>
            <p className="text-center text-xs" style={{ color: C.muted }}>
              {t("kredit.faizAzalir")}
            </p>
            <p className="mb-3 text-center text-xs" style={{ color: C.muted }}>
              {t("kredit.sonTarixSetri", { tarix: ayAdi(kredit.odemeTarixi) })}
            </p>

            <input
              type="range"
              min={kredit.minKredit}
              max={kredit.maxKredit}
              step={kredit.addim}
              value={mebleg}
              onChange={(e) => setMebleg(Number(e.target.value))}
              aria-label={t("loan.amountLabel")}
              className="kredit-slayder w-full"
              // Dolu hissə qradiyentlə: standart boz zolaq brendsiz idi
              style={{
                backgroundImage: `linear-gradient(to right, ${C.field} ${
                  ((mebleg - kredit.minKredit) / (kredit.maxKredit - kredit.minKredit)) * 100
                }%, ${C.mist} 0)`,
              }}
            />
            <div className="mt-1 flex justify-between text-xs" style={{ color: C.muted }}>
              <span>{money(kredit.minKredit)}</span>
              <span className="font-semibold" style={{ color: C.ink }}>
                {money(kredit.maxKredit)}
              </span>
            </div>

            {/* Tavan izah olunur — gizli düstur etibar yaratmır */}
            <button
              type="button"
              onClick={() => setIzahAcilib(!izahAcilib)}
              aria-expanded={izahAcilib}
              className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2.5"
              style={{ backgroundColor: C.mist }}
            >
              <span className="text-xs font-semibold" style={{ color: C.pine }}>
                {t("kredit.niyeBuQeder", { max: { money: kredit.maxKredit } })}
              </span>
              <Icon name={izahAcilib ? "ChevronDown" : "ChevronRight"} size={14} color={C.muted} />
            </button>
            {izahAcilib && (
              <div className="mt-1 rounded-xl px-3 py-1" style={{ backgroundColor: C.mist }}>
                {izahSetirleri.map(([acar, deger]) => (
                  <div
                    key={acar}
                    className="flex items-baseline justify-between gap-2 py-2"
                    style={{ borderBottom: `1px solid ${C.line}` }}
                  >
                    <span className="text-xs" style={{ color: C.muted }}>
                      {t(acar)}
                    </span>
                    <span
                      className="text-xs font-bold whitespace-nowrap"
                      style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
                    >
                      {money(deger)}
                    </span>
                  </div>
                ))}
                <p className="py-2 text-xs leading-relaxed" style={{ color: C.muted }}>
                  {t("kredit.izahQeyd")}
                </p>
              </div>
            )}

            {/* Ödəniş prinsipi bir cümlə ilə: çevik əsas borc + qalığa faiz.
                Texniki dil yox — model-governance qeydləri müştəri ekranında
                deyil (bax: lib/odenis.js, ODENIS_TESDIQ). */}
            <p
              className="mt-3 rounded-lg px-2.5 py-2 text-xs leading-relaxed"
              style={{ backgroundColor: C.mist, color: C.pine }}
            >
              {t("kredit.cevikQeyd")}
            </p>

            <button
              type="button"
              onClick={() => setAddim(1)}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.pine, color: "#fff" }}
            >
              {t("loan.reviewCta")}
            </button>
          </div>
        )}

        {/* ── Addım 1: şərtlər ──────────────────────────────────────── */}
        {axinAcıq && hazir && addim === 1 && (
          <div>
            {/* "Bir ödəniş" sətri yoxdur: faiz aylıqdır, əsas borc çevikdir,
                son tarix əsas borcun TAM bağlanması üçündür.
                SIRALAMA GÖZLƏ OXUNUR: məbləğ ən iridir (fermer əvvəl onu
                axtarır), ilk ay faizi + əsas borc + son tarix normal, illik
                faiz/girov/sahə isə ikinci dərəcəli sətirlərdir — hamısı eyni
                çəkidə olanda heç biri seçilmirdi. */}
            {[
              { ad: t("kredit.setr.mebleg"), deger: money(mebleg), vurgu: true },
              {
                ad: t("kredit.setr.ilkFaiz"),
                deger: t("kredit.setr.ilkFaizDeger", {
                  faiz: { money: kredit.ayliqFaiz1(mebleg) },
                }),
                // Sabit aylıq ödəniş TƏSƏVVÜRÜ burada qırılır
                alt: t("kredit.faizAzalir"),
              },
              { ad: t("kredit.setr.esasBorc"), deger: t("kredit.setr.esasBorcDeger") },
              {
                ad: t("kredit.setr.sonTarix"),
                deger: t("kredit.setr.sonTarixDeger", { tarix: ayAdi(kredit.odemeTarixi) }),
              },
              { ad: t("kredit.setr.muddet"), deger: t("kredit.setr.muddetDeger", { ay: kredit.muddetAy }) },
              { ad: t("loan.term.rate"), deger: `${KREDIT_SERTLERI.illikFaiz}%`, ikinci: true },
              {
                ad: t("loan.term.collateral"),
                deger: t("loan.term.collateralValue"),
                ikinci: true,
              },
              // Peyk təsdiqi GİROVUN ƏVƏZİ DEYİL: ayrı sətirdir, çünki
              // "əkininiz girov kimi kifayətdir" hüquqi olaraq yanlışdır.
              // "Peyklə təsdiqlənib" yalnız ölçmə HƏQİQƏTƏN varsa yazılır —
              // indeks yoxdursa sahə sadəcə xəritədə çəkilmiş sahədir.
              {
                ad: t("kredit.setr.sahe"),
                deger: indeksHali?.indeks
                  ? t("kredit.setr.saheDeger")
                  : t("kredit.setr.saheDegerCizilib", { hektar: { number: state.sahe.hektar } }),
                ikinci: true,
              },
            ].map(({ ad, deger, alt, vurgu, ikinci }) => (
              <div key={ad} className="py-2.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                <div className="flex justify-between gap-3">
                  <span className={ikinci ? "text-xs" : "text-xs"} style={{ color: C.muted }}>
                    {ad}
                  </span>
                  <span
                    className={`max-w-[60%] text-right ${
                      vurgu ? "text-lg font-extrabold" : "text-xs font-bold"
                    }`}
                    style={{
                      color: ikinci ? C.muted : C.ink,
                      fontFamily: vurgu ? font.display : undefined,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {deger}
                  </span>
                </div>
                {alt && (
                  <p className="mt-0.5 text-right text-xs leading-snug" style={{ color: C.muted }}>
                    {alt}
                  </p>
                )}
              </div>
            ))}

            {/* Son tarix biçinə bağlıdır və erkən ödəniş faizi azaldır */}
            <p className="mt-2.5 text-xs leading-relaxed" style={{ color: C.muted }}>
              {t("kredit.bicinIzah")}
            </p>

            <button
              type="button"
              disabled={kreditHali.gedir}
              onClick={gonder}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold"
              style={{ backgroundColor: C.gold, color: C.pine, opacity: kreditHali.gedir ? 0.6 : 1 }}
            >
              {kreditHali.gedir
                ? t("kredit.gedir")
                : t("kredit.gonderCta", { mebleg: { money: mebleg } })}
            </button>
          </div>
        )}

      </div>
    </Sheet>
  );
}
