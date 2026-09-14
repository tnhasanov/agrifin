import { Amount } from "../../components/Amount.jsx";
import { Button } from "../../components/Button.jsx";
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
 * BİR EKRANDA BİR DOLU DÜYMƏ. Hər kart ən çox bir primary daşıyır; kartlar
 * bir ekranda üst-üstə gələndə (gecikmə + aktiv kredit) aşağıdakı kart
 * dolu düyməsini itirir — qərar yuxarıdakı kartındır.
 *
 * "SONDA ÖDƏNİLƏCƏK ÜMUMİ MƏBLƏĞ" burada yoxdur: əsas borc istənilən vaxt
 * azaldıla bilər, gələcək faiz ona görə dəyişir. Bu günün dəqiq rəqəmi
 * (payoffMebleg) Maliyyə ekranının fakt siyahısındadır — "bu gün" qeydi ilə.
 */

function Setir({ etiket, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs" style={{ color: C.muted }}>
        {etiket}
      </span>
      <span className="text-right text-xs font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
        {children}
      </span>
    </div>
  );
}

/**
 * Aktiv kreditin tam xülasəsi (Maliyyə ekranı, hal D).
 * "Bu ayın faizi" server PROQNOZUDUR (~): əsas borc azaldılsa azalır.
 *
 * `esasDuyme` false olanda (gecikmə kartı yuxarıdadır) heç bir dolu düymə
 * göstərilmir — hər iki hərəkət konturludur.
 */
export function AktivKreditXulasesi({ kredit, odenisler = [], onOdenis, onQrafik, esasDuyme = true }) {
  const { t, money } = useI18n();
  if (!kredit || kredit.hal !== "active") return null;

  const odenilibFaiz =
    kredit.esasBorc > 0 ? Math.round((1 - kredit.qaliqBorc / kredit.esasBorc) * 100) : 0;
  const vaxtinda = kredit.gecikmeGun === 0;
  const sonOdenis = odenisler[0] ?? null;

  return (
    <Card className="giris" style={{ marginBottom: 12, backgroundColor: C.malSoft, border: "none" }}>
      <div className="flex items-center gap-2">
        <div className="rounded-xl p-2" style={{ backgroundColor: "#fff" }}>
          <Icon name="CreditCard" size={16} color={C.mal} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: C.mal, fontFamily: font.display }}>
          {t("maliyye.aktiv")}
        </h3>
      </div>

      <p className="mt-3 text-xs" style={{ color: C.muted }}>
        {t("maliyye.esasQaliq")}
      </p>
      <Amount value={kredit.qaliqBorc} size="xl" qepik="hec" />

      <div className="mt-2">
        {kredit.novbetiMebleg != null && !kredit.novbetiEsasDaxil && (
          <Setir etiket={t("maliyye.buDovrFaiz")}>
            <Amount value={kredit.novbetiMebleg} size="sm" texmini qepik="hec" />
          </Setir>
        )}
        {kredit.novbetiTarix && <Setir etiket={t("maliyye.novbetiOdenis")}>{gunAdi(t, kredit.novbetiTarix)}</Setir>}
      </div>

      <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ backgroundColor: C.malTrack }}>
        <div className="bar-dolur h-2 rounded-full" style={{ width: `${odenilibFaiz}%`, backgroundColor: C.mal }} />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs" style={{ color: C.muted }}>
          {t("maliyye.odenilibFaiz", { faiz: odenilibFaiz })}
        </p>
        {vaxtinda && (
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.field }}>
            <Icon name="Check" size={16} color={C.field} />
            {t("maliyye.vaxtinda")}
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {esasDuyme && (
          <Button ton="mal" className="flex-1" onClick={onOdenis}>
            {t("maliyye.odenisEt")}
          </Button>
        )}
        <Button variant="secondary" ton="mal" className="flex-1" onClick={onQrafik}>
          {t("maliyye.qrafik")}
        </Button>
      </div>

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
            <span className="text-xs font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              −{money(sonOdenis.mebleg)}
            </span>
          </div>
          <Button variant="ghost" ton="mal" size="sm" onClick={onQrafik} style={{ paddingInline: 4 }}>
            {t("maliyye.hamisi")}
          </Button>
        </div>
      )}
    </Card>
  );
}

/**
 * Gecikmə kartı (hal E) — hörmətli ton, iki yol: ödə (danger, dolu) və
 * dəstək (konturlu). Bu ekranın YEGANƏ dolu düyməsi buradadır.
 */
export function GecikmeKarti({ kredit, onOdenis, onDestek, onEtrafli }) {
  const { t } = useI18n();
  if (!kredit || kredit.hal !== "active" || !(kredit.gecikmeGun > 0)) return null;

  return (
    <Card className="giris" style={{ marginBottom: 12, backgroundColor: C.warnSoft, borderColor: C.danger }} role="alert">
      <div className="flex items-center gap-2">
        <div className="rounded-xl p-2" style={{ backgroundColor: "#fff" }}>
          <Icon name="AlertCircle" size={16} color={C.danger} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: C.danger, fontFamily: font.display }}>
          {t("gecikmeKart.basliq")}
        </h3>
      </div>

      <div className="mt-2">
        <Amount value={kredit.gecikmisMebleg} size="xl" ton="danger" qepik="hec" />
      </div>
      <p className="text-xs font-semibold" style={{ color: C.danger }}>
        {t("gecikmeKart.gun", { gun: kredit.gecikmeGun })}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.muted }}>
        {t("gecikmeKart.izah")}
      </p>

      <div className="mt-3 flex gap-2">
        <Button variant="danger" className="flex-1" onClick={onOdenis}>
          {t("gecikmeKart.odeCta")}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onDestek}>
          {t("gecikmeKart.destek")}
        </Button>
      </div>

      <div className="mt-3 border-t pt-2" style={{ borderColor: C.line }}>
        <p className="text-xs font-bold" style={{ color: C.ink }}>
          {t("gecikmeKart.neBasVerecek")}
        </p>
        <ul className="mt-1 space-y-1">
          <li className="flex items-start gap-1.5 text-xs" style={{ color: C.muted }}>
            <Icon name="Check" size={16} color={C.field} />
            {t("gecikmeKart.tarixce")}
          </li>
          <li className="flex items-start gap-1.5 text-xs" style={{ color: C.muted }}>
            <Icon name="Info" size={16} color={C.goldDeep} />
            {t("gecikmeKart.faizDavam")}
          </li>
        </ul>
        <Button variant="ghost" size="sm" onClick={onEtrafli} style={{ paddingInline: 4, marginTop: 4 }}>
          {t("gecikmeKart.etrafli")}
        </Button>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
          {t("gecikmeKart.cetinlik")}
        </p>
      </div>
    </Card>
  );
}

/**
 * Təklif kartı (hal C) — server buraxdığı təklifin təqdimatı.
 * Məbləğ, müddət, dərəcə serverdən; "ilk ayın faizi" təxmindir (~).
 *
 * `meblegsiz`: Maliyyə ekranında məbləğ artıq ekranın ƏSAS rəqəmi kimi
 * yuxarıda durur (Uyğun limit) — kartda təkrarlanmır. Eyni rəqəmin bir
 * ekranda iki dəfə böyük yazılması diqqəti dağıdır, etibar əlavə etmir.
 */
export function TeklifKarti({ teklif, ayliqFaizTexmini = null, azaldilib = false, istenilen = null, meblegsiz = false, onBax, onSonra }) {
  const { t } = useI18n();
  if (!teklif || teklif.hal !== "issued") return null;

  return (
    <Card className="giris" style={{ marginBottom: 12 }}>
      <p className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
        {t("teklifKart.basliq")}
      </p>
      <p className="text-xs" style={{ color: C.muted }}>
        {t("teklifKart.altyazi")}
      </p>

      <div className="mt-2.5 rounded-2xl px-3.5 py-3" style={{ backgroundColor: C.malSoft }}>
        <p className="flex items-center gap-1.5 text-xs font-bold" style={{ color: C.mal }}>
          <Icon name="Wallet" size={16} color={C.mal} />
          {t("teklifKart.adi")}
        </p>
        {!meblegsiz && <Amount value={teklif.mebleg} size="xl" ton="mal" qepik="hec" />}
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
            <p style={{ color: C.muted, fontSize: 10 }}>{t("teklifKart.ilkAyFaiz")}</p>
            <p className="text-xs font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              {ayliqFaizTexmini != null ? <Amount value={ayliqFaizTexmini} size="sm" texmini qepik="hec" /> : "—"}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: C.mal }}>
          {t("kredit.faizAzalir")}
        </p>
      </div>

      {azaldilib && istenilen != null && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: C.muted }}>
          {t("kredit.teklifAzaldilib", { istenilen: { money: istenilen } })}
        </p>
      )}

      <p className="mt-3 text-xs font-bold" style={{ color: C.ink }}>
        {t("teklifKart.niye")}
      </p>
      <ul className="mt-1 space-y-1.5">
        {["teklifKart.sebeb1", "teklifKart.sebeb2", "teklifKart.sebeb3"].map((acar) => (
          <li key={acar} className="flex items-start gap-2 text-xs" style={{ color: C.ink }}>
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: C.mal }}>
              <Icon name="Check" size={10} color="#fff" />
            </span>
            {t(acar)}
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-xs leading-relaxed" style={{ backgroundColor: C.malSoft, color: C.mal }}>
        <Icon name="ShieldCheck" size={16} color={C.mal} />
        {t("teklifKart.qeyd")}
      </p>

      <Button ton="mal" fullWidth className="mt-3" onClick={onBax}>
        {t("teklifKart.bax")}
      </Button>
      <Button variant="ghost" ton="mal" fullWidth className="mt-1" onClick={onSonra}>
        {t("teklifKart.sonra")}
      </Button>
    </Card>
  );
}

/**
 * Ana səhifə üçün yığcam kredit kartı: Qalıq + Növbəti ödəniş + Ətraflı bax.
 * Kart özü düymədir; içindəki "Ətraflı bax" DOLU deyil — ana səhifənin
 * əsas hərəkəti "Bu gün nə etməli?" kartındadır, ikinci dolu düymə onunla
 * rəqabət edərdi.
 */
export function KreditMiniKarti({ kredit, onBax }) {
  const { t, money } = useI18n();
  if (!kredit || kredit.hal !== "active") return null;

  const etiket = [
    t("maliyye.aktiv"),
    `${t("pano.kreditQaliq")}: ${money(kredit.qaliqBorc)}`,
    kredit.novbetiTarix ? `${t("pano.kreditNovbeti")}: ${gunAdi(t, kredit.novbetiTarix)}` : null,
    kredit.gecikmeGun > 0 ? t("gecikmeKart.gun", { gun: kredit.gecikmeGun }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="giris" style={{ marginTop: 12, backgroundColor: C.malSoft, border: "none" }} onClick={onBax} ariaLabel={etiket}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl p-2" style={{ backgroundColor: "#fff" }}>
            <Icon name="CreditCard" size={16} color={C.mal} />
          </div>
          <p className="text-sm font-bold" style={{ color: C.mal, fontFamily: font.display }}>
            {t("maliyye.aktiv")}
          </p>
        </div>
        {kredit.gecikmeGun > 0 && (
          <Chip icon="AlertCircle" label={t("gecikmeKart.gun", { gun: kredit.gecikmeGun })} color={C.danger} bg={C.dangerSoft} />
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs" style={{ color: C.muted }}>
            {t("pano.kreditQaliq")}
          </p>
          <Amount value={kredit.qaliqBorc} size="lg" qepik="hec" />
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
      <p className="mt-2.5 flex items-center justify-end gap-1 text-sm font-bold" style={{ color: C.mal }}>
        {t("pano.etrafliBax")}
        <Icon name="ChevronRight" size={16} color={C.mal} />
      </p>
    </Card>
  );
}
