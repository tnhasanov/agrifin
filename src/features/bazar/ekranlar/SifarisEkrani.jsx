import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/Button.jsx";
import { Icon } from "../../../components/Icon.jsx";
import { SectionTitle } from "../../../components/SectionTitle.jsx";
import { C, KOLGE, RADIUS, TIPO, TOXUNMA, font } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { formatQiymet } from "../../../lib/format.js";
import { rayonTap } from "../../../../lib/rayonlar.js";
import { catdirilmaYoxla, gozlenilenCatdirilma } from "../../../../lib/bazar/sifaris.js";
import { sebetHesabla, maliyyeYoxla } from "../../../services/bazar.js";
import { RayonVereqi } from "../../location/RayonVereqi.jsx";
import { AltCta } from "../AltCta.jsx";
import { BazarBasliq } from "../BazarBasliq.jsx";
import { MaliyyeNeticesi } from "../MaliyyeKarti.jsx";
import { SebetXulasesi } from "../SebetXulasesi.jsx";
import { gunAdi } from "../../../lib/tarix.js";

function Xana({ etiket, deger, onDeyis, yerTutucu, tip = "text", xeta, coxSetir = false, inputMode }) {
  const Tag = coxSetir ? "textarea" : "input";
  return (
    <label className="block">
      <span className="text-xs font-semibold" style={{ color: C.muted }}>
        {etiket}
      </span>
      <Tag
        value={deger}
        onChange={(h) => onDeyis(h.target.value)}
        placeholder={yerTutucu}
        type={coxSetir ? undefined : tip}
        inputMode={inputMode}
        rows={coxSetir ? 2 : undefined}
        aria-invalid={Boolean(xeta)}
        className="mt-1 w-full outline-none"
        style={{
          backgroundColor: C.card,
          border: `1px solid ${xeta ? C.danger : C.line}`,
          borderRadius: RADIUS.idare,
          padding: "10px 12px",
          minHeight: coxSetir ? 64 : TOXUNMA,
          color: C.ink,
          ...TIPO.giris,
        }}
      />
      {xeta && (
        <span className="mt-1 block text-xs" style={{ color: C.danger }}>
          {xeta}
        </span>
      )}
    </label>
  );
}

function OdenisSecimi({ kod, secili, onSec, izah, elave }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={secili}
      onClick={() => onSec(kod)}
      className="basilir flex w-full items-start gap-3 rounded-2xl p-3.5 text-left"
      style={{ backgroundColor: C.card, border: `1.5px solid ${secili ? (kod === "agrofin_financing" ? C.mal : C.field) : C.line}` }}
    >
      <span
        className="mt-0.5 flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 20, height: 20, border: `2px solid ${secili ? (kod === "agrofin_financing" ? C.mal : C.field) : C.line}` }}
      >
        {secili && <span className="rounded-full" style={{ width: 10, height: 10, backgroundColor: kod === "agrofin_financing" ? C.mal : C.field }} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold" style={{ color: C.ink }}>
          {t(`bazar.sifaris.odenis.${kod}`, { app: { key: "app.name" } })}
        </span>
        <span className="block text-xs leading-relaxed" style={{ color: C.muted }}>
          {izah}
        </span>
        {elave}
      </span>
    </button>
  );
}

/**
 * SİFARİŞİN TAMAMLANMASI — iki addım: çatdırılma → təsdiq.
 *
 * FERMERDƏN BİLDİYİMİZİ SORUŞMURUQ: rayon `location`-dan, telefon hesabdan,
 * ad/ünvan son sifarişdən (store.catdirilma) gəlir. Boş olanlar soruşulur.
 *
 * TƏSDİQ ADDIMINDA YEKUN SERVERDƏNDİR (sebet-hesabla): ekranda görünən
 * rəqəm sifarişə yazılacaq rəqəmdir. Maliyyə seçilibsə uyğunluq da elə
 * burada, oxu-yalnız yoxlama ilə göstərilir. Sonra `sifaris-yarat` — server
 * hər şeyi yenidən hesablayır; klientdən yalnız {kod, say} gedir.
 */
export function SifarisEkrani({
  geri,
  sebet,
  rayon,
  sonRayonlar,
  hesabTelefon,
  sonCatdirilma,
  sifarisHali,
  ilkOdenis = "on_delivery",
  onUgur,
  onOpenHesab,
  onRayonSec,
}) {
  const { t, lang } = useI18n();
  const q = (v) => formatQiymet(v, lang);
  const [addim, setAddim] = useState(1);
  const [forma, setForma] = useState(() => ({
    rayonKod: rayon?.kod ?? null,
    ad: sonCatdirilma?.ad ?? "",
    telefon: sonCatdirilma?.telefon ?? hesabTelefon ?? "",
    unvan: sonCatdirilma?.unvan ?? "",
    qeyd: "",
  }));
  const [xetalar, setXetalar] = useState({});
  const [rayonAcilib, setRayonAcilib] = useState(false);
  const [odenis, setOdenis] = useState(ilkOdenis);
  const [serverHesab, setServerHesab] = useState(null);
  const [serverHesabHali, setServerHesabHali] = useState("gozleyir");
  const [maliyye, setMaliyye] = useState(null);
  const [maliyyeHali, setMaliyyeHali] = useState("gozleyir");
  const [gonderisXetasi, setGonderisXetasi] = useState(null);
  // İdempotentlik açarı: bir təsdiq addımı = bir açar (şəbəkə itsə təkrar
  // toxunuş ikinci sifariş yaratmır). Render içində yaradılmır.
  const acarRef = useRef(null);

  const secilenRayon = forma.rayonKod ? rayonTap(forma.rayonKod) : null;
  const apiSetirleri = sebet.apiSetirleri;
  const setirAcari = JSON.stringify(apiSetirleri);

  // Təsdiq addımı: server hesabı. "yuklenir" halı addıma keçən düymədə
  // qoyulur (effektdə sinxron setState yox); burada yalnız cavab yazılır.
  useEffect(() => {
    if (addim !== 2) return undefined;
    const controller = new AbortController();
    sebetHesabla(JSON.parse(setirAcari), { rayonKod: forma.rayonKod, signal: controller.signal })
      .then((cavab) => {
        setServerHesab(cavab.hesab);
        setServerHesabHali("hazir");
      })
      .catch((xeta) => {
        if (xeta?.name === "AbortError") return;
        setServerHesabHali("xeta");
      });
    return () => controller.abort();
  }, [addim, setirAcari, forma.rayonKod]);

  // Təsdiq addımı + maliyyə seçilib: oxu-yalnız uyğunluq ("yuklenir" halı
  // seçim düyməsində qoyulur)
  useEffect(() => {
    if (addim !== 2 || odenis !== "agrofin_financing") return undefined;
    const controller = new AbortController();
    maliyyeYoxla(JSON.parse(setirAcari), { signal: controller.signal })
      .then((cavab) => {
        setMaliyye(cavab.maliyye);
        setMaliyyeHali("hazir");
      })
      .catch((xeta) => {
        if (xeta?.name === "AbortError") return;
        setMaliyyeHali(xeta?.status === 401 ? "girisYox" : "xeta");
      });
    return () => controller.abort();
  }, [addim, odenis, setirAcari]);

  const serverHal = sifarisHali.hal;

  // ── Giriş / quraşdırma halları — səbət qalır, sifariş gözləyir ────
  if (serverHal === "girisYox" || serverHal === "qurulmayib") {
    const girisYox = serverHal === "girisYox";
    return (
      <div className="px-4 pb-4">
        <BazarBasliq basliq={t("bazar.sifaris.basliq")} onGeri={geri} />
        <div className="mt-6 rounded-2xl p-6 text-center" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
          <Icon name={girisYox ? "ShieldCheck" : "Info"} size={24} color={girisYox ? C.goldDeep : C.muted} />
          <p className="mt-2 text-base font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {t(girisYox ? "bazar.sifaris.girisBasliq" : "bazar.sifaris.qurulmayib")}
          </p>
          <p className="mx-auto mt-1 max-w-[34ch] text-sm leading-relaxed" style={{ color: C.muted }}>
            {t(girisYox ? "bazar.sifaris.girisIzah" : "bazar.sifaris.qurulmayibIzah")}
          </p>
          {girisYox && (
            <Button fullWidth className="mt-4" onClick={onOpenHesab}>
              {t("bazar.maliyye.girisCta")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const addim1Yoxla = () => {
    const netice = catdirilmaYoxla(forma);
    if (netice.ok) {
      setXetalar({});
      return true;
    }
    setXetalar({ [netice.sebeb]: t(`bazar.sifaris.xeta.${netice.sebeb}`) });
    return false;
  };

  const gonder = async () => {
    setGonderisXetasi(null);
    acarRef.current ??= `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const netice = await sifarisHali.sifarisYarat({
      setirler: apiSetirleri,
      catdirilma: forma,
      odenisUsulu: odenis,
      acar: acarRef.current,
    });
    if (netice.ok) {
      acarRef.current = null;
      onUgur(netice.sifaris, { ad: forma.ad, telefon: forma.telefon, unvan: forma.unvan });
      return;
    }
    if (netice.acar === "girisLazim") return; // ekran özü giriş kartına keçir
    setGonderisXetasi(netice.acar);
  };

  const maliyyeMusbet = maliyye && (maliyye.hal === "uygun" || maliyye.hal === "qismen");
  const gonderOlar =
    !sifarisHali.gedir && (odenis !== "agrofin_financing" || (maliyyeHali === "hazir" && maliyyeMusbet));
  const gosterilenHesab = serverHesab ?? sebet.hesab;
  const gozlenilen = gosterilenHesab ? gozlenilenCatdirilma(gosterilenHesab.tedarukculer, new Date()) : null;

  return (
    <div className="px-4 pb-2">
      <BazarBasliq
        basliq={t("bazar.sifaris.basliq")}
        altYazi={`${addim} / 2 · ${t(addim === 1 ? "bazar.sifaris.addim1" : "bazar.sifaris.addim2")}`}
        onGeri={addim === 2 ? () => setAddim(1) : geri}
      />
      <div className="mt-3 flex gap-2" role="progressbar" aria-valuenow={addim} aria-valuemin={1} aria-valuemax={2}>
        {[1, 2].map((i) => (
          <span key={i} className="flex-1 rounded-full" style={{ height: 4, backgroundColor: i <= addim ? C.field : C.line }} />
        ))}
      </div>

      {addim === 1 && (
        <div className="mt-4 space-y-3">
          {/* Rayon — düymə, vərəq açır (rayon vərəqi onboarding-dən) */}
          <div>
            <span className="text-xs font-semibold" style={{ color: C.muted }}>
              {t("bazar.sifaris.rayon")}
            </span>
            <button
              type="button"
              onClick={() => setRayonAcilib(true)}
              className="basilir mt-1 flex w-full items-center justify-between gap-2 text-left"
              style={{
                backgroundColor: C.card,
                border: `1px solid ${xetalar.rayonYanlis ? C.danger : C.line}`,
                borderRadius: RADIUS.idare,
                padding: "10px 12px",
                minHeight: TOXUNMA,
                color: secilenRayon ? C.ink : C.muted,
                ...TIPO.giris,
              }}
            >
              <span className="flex items-center gap-2">
                <Icon name="MapPin" size={16} color={C.field} />
                {secilenRayon?.name ?? t("bazar.sifaris.rayonSec")}
              </span>
              <Icon name="ChevronDown" size={16} color={C.muted} />
            </button>
            {xetalar.rayonYanlis && (
              <span className="mt-1 block text-xs" style={{ color: C.danger }}>
                {xetalar.rayonYanlis}
              </span>
            )}
          </div>
          <Xana etiket={t("bazar.sifaris.ad")} deger={forma.ad} onDeyis={(v) => setForma({ ...forma, ad: v })} yerTutucu={t("bazar.sifaris.adYeri")} xeta={xetalar.adYanlis} />
          <Xana etiket={t("bazar.sifaris.telefon")} deger={forma.telefon} onDeyis={(v) => setForma({ ...forma, telefon: v })} yerTutucu="+994 50 000 00 00" tip="tel" inputMode="tel" xeta={xetalar.telefonYanlis} />
          <Xana etiket={t("bazar.sifaris.unvan")} deger={forma.unvan} onDeyis={(v) => setForma({ ...forma, unvan: v })} yerTutucu={t("bazar.sifaris.unvanYeri")} />
          <Xana etiket={t("bazar.sifaris.qeyd")} deger={forma.qeyd} onDeyis={(v) => setForma({ ...forma, qeyd: v })} yerTutucu={t("bazar.sifaris.qeydYeri")} coxSetir />

          <div className="h-2" />
          <AltCta
            esas={{
              label: t("bazar.sifaris.davam"),
              onClick: () => {
                if (!addim1Yoxla()) return;
                setServerHesabHali("yuklenir");
                if (odenis === "agrofin_financing") setMaliyyeHali("yuklenir");
                setAddim(2);
              },
            }}
          />
        </div>
      )}

      {addim === 2 && (
        <div className="mt-4">
          {/* Sətirlər — qısa */}
          <div className="rounded-2xl px-4 py-1" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
            {(gosterilenHesab?.setirler ?? []).map((s) => (
              <div key={s.kod} className="flex items-baseline justify-between gap-3 py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
                <span className="min-w-0 flex-1 truncate text-sm" style={{ color: C.ink }}>
                  {s.ad}
                </span>
                <span className="shrink-0 text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                  {s.say} × {q(s.vahidQiymet)}
                </span>
                <span className="shrink-0 text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                  {q(s.cemi)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 py-2.5 text-xs" style={{ color: C.muted }}>
              <span className="flex items-center gap-1.5">
                <Icon name="MapPin" size={14} color={C.field} />
                {secilenRayon?.name}
                {forma.unvan ? ` · ${forma.unvan}` : ""}
              </span>
              <span>{forma.ad}</span>
            </div>
          </div>

          <div className="mt-3">
            <SebetXulasesi hesab={gosterilenHesab} menbe="server" yuklenir={serverHesabHali !== "hazir"} />
          </div>
          {gozlenilen && (
            <p className="mt-2 flex items-center gap-1.5 px-1 text-xs" style={{ color: C.muted }}>
              <Icon name="Truck" size={14} color={C.muted} />
              {t("bazar.sifaris.gozlenilen")}: <strong style={{ color: C.ink }}>{gunAdi(t, gozlenilen)}</strong>
            </p>
          )}

          <SectionTitle>{t("bazar.sifaris.odenis")}</SectionTitle>
          <div className="space-y-2" role="radiogroup" aria-label={t("bazar.sifaris.odenis")}>
            <OdenisSecimi kod="on_delivery" secili={odenis === "on_delivery"} onSec={setOdenis} izah={t("bazar.sifaris.odenis.on_deliveryIzah")} />
            {gosterilenHesab?.maliyyeMeblegi > 0 && (
              <OdenisSecimi
                kod="agrofin_financing"
                secili={odenis === "agrofin_financing"}
                onSec={(kod) => {
                  if (odenis !== kod) setMaliyyeHali("yuklenir");
                  setOdenis(kod);
                }}
                izah={t("bazar.sifaris.odenis.agrofin_financingIzah")}
                elave={
                  odenis === "agrofin_financing" && (
                    <span className="mt-2 block">
                      {maliyyeHali === "yuklenir" && (
                        <span className="flex items-center gap-2 text-xs" style={{ color: C.muted }}>
                          <Icon name="LoaderCircle" size={14} color={C.muted} />
                          {t("bazar.maliyye.yoxlanir")}
                        </span>
                      )}
                      {maliyyeHali === "hazir" && <MaliyyeNeticesi netice={maliyye} />}
                      {(maliyyeHali === "xeta" || maliyyeHali === "girisYox") && (
                        <span className="block text-xs" style={{ color: C.danger }}>
                          {t("bazar.maliyye.xeta")}
                        </span>
                      )}
                    </span>
                  )
                }
              />
            )}
          </div>

          {gonderisXetasi && (
            <p className="mt-3 flex items-start gap-2 rounded-xl p-3 text-xs" role="alert" style={{ backgroundColor: C.dangerSoft, color: C.danger }}>
              <Icon name="AlertCircle" size={14} color={C.danger} />
              {t(`bazar.sifaris.xeta.${["catdirilmaYoxdur", "hedd", "maliyyeUygunDeyil", "rayonYanlis", "adYanlis", "telefonYanlis"].includes(gonderisXetasi) ? gonderisXetasi : "xeta"}`)}
            </p>
          )}

          <div className="h-3" />
          <AltCta
            esas={{
              label: sifarisHali.gedir ? t("bazar.sifaris.gonderilir") : t("bazar.sifaris.tesdiqle"),
              disabled: !gonderOlar,
              reng: odenis === "agrofin_financing" ? C.mal : undefined,
              onClick: gonder,
            }}
          />
        </div>
      )}

      <RayonVereqi
        acilib={rayonAcilib}
        onBagla={() => setRayonAcilib(false)}
        secilenKod={forma.rayonKod}
        sonKodlar={sonRayonlar}
        onSec={(r) => {
          setForma({ ...forma, rayonKod: r.kod });
          setXetalar((x) => ({ ...x, rayonYanlis: undefined }));
          onRayonSec?.(r);
        }}
      />
    </div>
  );
}
