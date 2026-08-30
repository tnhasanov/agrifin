import { Card } from "../../components/Card.jsx";
import { Chip } from "../../components/Chip.jsx";
import { Icon } from "../../components/Icon.jsx";
import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { gunAdi } from "../../lib/tarix.js";

/**
 * MALİYYƏ KARTLARI — panonun pul tərəfi. Hamısı SERVER dəyərlərini göstərir
 * (bax: api/kredit.js → kreditCavabi): qalıq, faiz borcu, növbəti ödəniş,
 * gecikmə hamısı serverdə hesablanır; burada yalnız format və seçimdir.
 *
 * "SONDA ÖDƏNİLƏCƏK ÜMUMİ MƏBLƏĞ" QƏSDƏN HEÇ YERDƏ YOXDUR: əsas borc
 * istənilən vaxt azaldıla bilər, gələcək faiz ona görə dəyişir — tək rəqəm
 * yalan olardı (bax: lib/kreditOdenis.js).
 */

function Setir({ etiket, deger, vurgu = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs" style={{ color: C.muted }}>
        {etiket}
      </span>
      <span
        className="text-right text-xs font-bold"
        style={{ color: vurgu ? C.goldDeep : C.ink, fontVariantNumeric: "tabular-nums" }}
      >
        {deger}
      </span>
    </div>
  );
}

/**
 * Aktiv kreditin tam xülasəsi (Maliyyə ekranı, hal D).
 * Dəqiq mətnlər: Əsas borc qalığı / Bu ayın faizi / Son tarix / Ödənilib %.
 * "Bu ayın faizi" server PROQNOZUDUR (~): əsas borc azaldılsa azalır.
 */
export function AktivKreditXulasesi({ kredit, odenisler = [], onOdenis, onQrafik }) {
  const { t, money } = useI18n();
  if (!kredit || kredit.hal !== "active") return null;

  const odenilibFaiz =
    kredit.esasBorc > 0
      ? Math.round((1 - kredit.qaliqBorc / kredit.esasBorc) * 100)
      : 0;
  const vaxtinda = kredit.gecikmeGun === 0;
  const sonOdenis = odenisler[0] ?? null;

  return (
    <Card className="giris" style={{ marginBottom: 8 }}>
      <div className="flex items-center gap-2">
        <div className="rounded-xl p-2" style={{ backgroundColor: C.fieldSoft }}>
          <Icon name="CreditCard" size={16} color={C.field} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
          {t("maliyye.aktiv")}
        </h3>
      </div>

      <p className="mt-3 text-xs" style={{ color: C.muted }}>
        {t("maliyye.esasQaliq")}
      </p>
      <p
        className="text-3xl font-extrabold"
        style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
      >
        {money(kredit.qaliqBorc)}
      </p>

      <div className="mt-2">
        {/* Bu ayın faizi: yığılmış borc + cari dövr proqnozu (server) */}
        {kredit.novbetiMebleg != null && !kredit.novbetiEsasDaxil && (
          <Setir etiket={t("maliyye.buAyFaiz")} deger={`~${money(kredit.novbetiMebleg)}`} />
        )}
        {kredit.novbetiTarix && (
          <Setir etiket={t("maliyye.sonTarix")} deger={gunAdi(t, kredit.novbetiTarix)} />
        )}
      </div>

      <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.mist }}>
        <div
          className="bar-dolur h-2 rounded-full"
          style={{ width: `${odenilibFaiz}%`, backgroundColor: C.field }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs" style={{ color: C.muted }}>
          {t("maliyye.odenilibFaiz", { faiz: odenilibFaiz })}
        </p>
        {vaxtinda && (
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.field }}>
            <Icon name="Check" size={12} color={C.field} />
            {t("maliyye.vaxtinda")}
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOdenis}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold"
          style={{ backgroundColor: C.pine, color: "#fff", minHeight: 44 }}
        >
          {t("maliyye.odenisEt")}
        </button>
        <button
          type="button"
          onClick={onQrafik}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold"
          style={{ backgroundColor: C.mist, color: C.pine, minHeight: 44 }}
        >
          {t("maliyye.qrafik")}
        </button>
      </div>

      {/* Son əməliyyat: serverin qruplaşdırdığı ödəniş sətri (faiz+əsas birgə) */}
      {sonOdenis && (
        <div className="mt-3 border-t pt-2" style={{ borderColor: C.line }}>
          <p className="text-xs font-semibold" style={{ color: C.muted }}>
            {t("maliyye.sonEmeliyyat")}
          </p>
          <div className="flex items-baseline justify-between gap-3 py-1">
            <span className="text-xs" style={{ color: C.ink }}>
              {gunAdi(t, sonOdenis.tarix)} ·{" "}
              {sonOdenis.faizHissesi > 0 && sonOdenis.esasHissesi > 0
                ? `${t("maliyye.faizOdenisi")} + ${t("maliyye.esasOdenisi")}`
                : sonOdenis.faizHissesi > 0
                  ? t("maliyye.faizOdenisi")
                  : t("maliyye.esasOdenisi")}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}
            >
              −{money(sonOdenis.mebleg)}
            </span>
          </div>
          <button
            type="button"
            onClick={onQrafik}
            className="text-xs font-bold"
            style={{ color: C.pine, minHeight: 44, paddingTop: 4 }}
          >
            {t("maliyye.hamisi")}
          </button>
        </div>
      )}
    </Card>
  );
}

/**
 * Gecikmə kartı (hal E) — hörmətli ton, iki yol: ödə və ya dəstək.
 *
 * "Nə baş verəcək?" sətirləri YALNIZ backend-in təsdiqlədiyi davranışı
 * deyir: cərimə faizi YOXDUR (lib/kreditMuhasibat.js) — ona görə burada
 * "Əlavə faiz yarana bilər" YAZILMIR; faktiki qayda yazılır: faiz qalan
 * əsas borca hesablanmaqda davam edir.
 */
export function GecikmeKarti({ kredit, onOdenis, onDestek, onEtrafli }) {
  const { t, money } = useI18n();
  if (!kredit || kredit.hal !== "active" || !(kredit.gecikmeGun > 0)) return null;

  return (
    <Card className="giris" style={{ marginBottom: 8, borderColor: C.danger }} role="alert">
      <div className="flex items-center gap-2">
        <div className="rounded-xl p-2" style={{ backgroundColor: C.dangerSoft }}>
          <Icon name="AlertCircle" size={16} color={C.danger} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: C.danger, fontFamily: font.display }}>
          {t("gecikmeKart.basliq")}
        </h3>
      </div>

      <p
        className="mt-2 text-3xl font-extrabold"
        style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
      >
        {money(kredit.gecikmisMebleg)}
      </p>
      <p className="text-xs font-semibold" style={{ color: C.danger }}>
        {t("gecikmeKart.gun", { gun: kredit.gecikmeGun })}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.muted }}>
        {t("gecikmeKart.izah")}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOdenis}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold"
          style={{ backgroundColor: C.danger, color: "#fff", minHeight: 44 }}
        >
          {t("gecikmeKart.odeCta")}
        </button>
        <button
          type="button"
          onClick={onDestek}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold"
          style={{ backgroundColor: C.mist, color: C.pine, minHeight: 44 }}
        >
          {t("gecikmeKart.destek")}
        </button>
      </div>

      <div className="mt-3 border-t pt-2" style={{ borderColor: C.line }}>
        <p className="text-xs font-bold" style={{ color: C.ink }}>
          {t("gecikmeKart.neBasVerecek")}
        </p>
        <ul className="mt-1 space-y-1">
          <li className="flex items-start gap-1.5 text-xs" style={{ color: C.muted }}>
            <Icon name="Check" size={12} color={C.field} />
            {t("gecikmeKart.tarixce")}
          </li>
          <li className="flex items-start gap-1.5 text-xs" style={{ color: C.muted }}>
            <Icon name="Info" size={12} color={C.goldDeep} />
            {t("gecikmeKart.faizDavam")}
          </li>
        </ul>
        <button
          type="button"
          onClick={onEtrafli}
          className="mt-1 text-xs font-bold"
          style={{ color: C.pine, minHeight: 44, paddingTop: 4 }}
        >
          {t("gecikmeKart.etrafli")}
        </button>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
          {t("gecikmeKart.cetinlik")}
        </p>
      </div>
    </Card>
  );
}

/**
 * Təklif kartı (hal C) — server buraxdığı təklifin təqdimatı.
 *
 * Klient məbləği/müddəti/dərəcəni NƏ HESABLAYIR, NƏ DƏYİŞİR — hamısı
 * serverdən gəlir (bax: api/kredit.js). "Aylıq faiz ödənişi" yalnız İLK AY
 * üçün təxmindir (~): əsas borc azaldıqca azalır.
 *
 * Səbəblər anderraytinqin faktiki quruluşunu deyir: qabiliyyət mövsümi
 * gəlirdən çıxır, 25% ehtiyat saxlanılır, sahə/peyk girişləri qərara daxil
 * olub (bax: lib/gelir.js, lib/odenis.js, lib/kredit.js).
 */
export function TeklifKarti({ teklif, ayliqFaizTexmini = null, azaldilib = false, istenilen = null, onBax, onSonra }) {
  const { t, money } = useI18n();
  if (!teklif || teklif.hal !== "issued") return null;

  return (
    <Card className="giris" style={{ marginBottom: 8 }}>
      <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
        {t("teklifKart.basliq")}
      </p>
      <p className="text-xs" style={{ color: C.muted }}>
        {t("teklifKart.altyazi")}
      </p>

      <div className="mt-2.5 rounded-2xl px-3.5 py-3" style={{ backgroundColor: C.fieldSoft }}>
        <p className="text-xs font-semibold" style={{ color: C.pine }}>
          {t("teklifKart.adi")}
        </p>
        <p
          className="text-3xl font-extrabold"
          style={{ color: C.pine, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
        >
          {money(teklif.mebleg)}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div>
            <p style={{ color: C.muted, fontSize: 10 }}>{t("teklifKart.muddet")}</p>
            <p className="text-xs font-bold" style={{ color: C.ink }}>
              {t("teklifKart.ayDeyeri", { ay: teklif.muddetAy })}
            </p>
          </div>
          <div>
            <p style={{ color: C.muted, fontSize: 10 }}>{t("teklifKart.faiz")}</p>
            <p className="text-xs font-bold" style={{ color: C.ink }}>
              {teklif.illikFaiz}%
            </p>
          </div>
          <div>
            <p style={{ color: C.muted, fontSize: 10 }}>{t("teklifKart.ayliqFaiz")}</p>
            <p className="text-xs font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              {ayliqFaizTexmini != null ? `~${money(ayliqFaizTexmini)}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {azaldilib && istenilen != null && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: C.muted }}>
          {t("kredit.teklifAzaldilib", { istenilen: { money: istenilen } })}
        </p>
      )}

      <p className="mt-3 text-xs font-bold" style={{ color: C.ink }}>
        {t("teklifKart.niye")}
      </p>
      <ul className="mt-1 space-y-1">
        {["teklifKart.sebeb1", "teklifKart.sebeb2", "teklifKart.sebeb3"].map((acar) => (
          <li key={acar} className="flex items-start gap-1.5 text-xs" style={{ color: C.muted }}>
            <Icon name="Check" size={12} color={C.field} />
            {t(acar)}
          </li>
        ))}
      </ul>
      <p
        className="mt-2 rounded-lg px-2.5 py-2 text-xs leading-relaxed"
        style={{ backgroundColor: C.mist, color: C.pine }}
      >
        {t("teklifKart.qeyd")}
      </p>

      <button
        type="button"
        onClick={onBax}
        className="mt-3 w-full rounded-xl py-3 text-sm font-bold"
        style={{ backgroundColor: C.pine, color: "#fff", minHeight: 44 }}
      >
        {t("teklifKart.bax")}
      </button>
      <button
        type="button"
        onClick={onSonra}
        className="mt-2 w-full rounded-xl py-2.5 text-xs font-bold"
        style={{ backgroundColor: C.mist, color: C.pine, minHeight: 44 }}
      >
        {t("teklifKart.sonra")}
      </button>
    </Card>
  );
}

/**
 * Ana səhifə üçün yığcam kredit kartı: Qalıq + Növbəti ödəniş + Ətraflı bax.
 * Gecikmə varsa çip qırmızıdır — amma tam gecikmə kartı Maliyyədədir.
 */
export function KreditMiniKarti({ kredit, onBax }) {
  const { t, money } = useI18n();
  if (!kredit || kredit.hal !== "active") return null;

  // aria-label kartın MƏTNİNİ ƏVƏZ EDİR — ona görə qalıq, növbəti ödəniş və
  // gecikmə də ora yazılır. Yoxsa ekran oxuyucusu ilə gəzən borcalan yalnız
  // "Aktiv kredit" eşidir və gecikməni tamamilə qaçırır.
  const etiket = [
    t("maliyye.aktiv"),
    `${t("pano.kreditQaliq")}: ${money(kredit.qaliqBorc)}`,
    kredit.novbetiTarix ? `${t("pano.kreditNovbeti")}: ${gunAdi(t, kredit.novbetiTarix)}` : null,
    kredit.gecikmeGun > 0 ? t("gecikmeKart.gun", { gun: kredit.gecikmeGun }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="giris" style={{ marginTop: 12 }} onClick={onBax} ariaLabel={etiket}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl p-2" style={{ backgroundColor: C.fieldSoft }}>
            <Icon name="CreditCard" size={14} color={C.field} />
          </div>
          <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {t("maliyye.aktiv")}
          </p>
        </div>
        {kredit.gecikmeGun > 0 && (
          <Chip
            icon="AlertCircle"
            label={t("gecikmeKart.gun", { gun: kredit.gecikmeGun })}
            color={C.danger}
            bg={C.dangerSoft}
          />
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs" style={{ color: C.muted }}>
            {t("pano.kreditQaliq")}
          </p>
          <p
            className="text-xl font-extrabold"
            style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
          >
            {money(kredit.qaliqBorc)}
          </p>
        </div>
        {kredit.novbetiTarix && (
          <div className="text-right">
            <p className="text-xs" style={{ color: C.muted }}>
              {t("pano.kreditNovbeti")}
            </p>
            <p className="text-sm font-bold" style={{ color: C.ink }}>
              {gunAdi(t, kredit.novbetiTarix)}
            </p>
          </div>
        )}
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-xs font-bold" style={{ color: C.pine }}>
        {t("pano.etrafliBax")}
        <Icon name="ChevronRight" size={13} color={C.pine} />
      </p>
    </Card>
  );
}
