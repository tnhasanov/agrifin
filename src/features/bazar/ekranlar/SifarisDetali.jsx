import { useEffect, useState } from "react";
import { Button } from "../../../components/Button.jsx";
import { Icon } from "../../../components/Icon.jsx";
import { SectionTitle } from "../../../components/SectionTitle.jsx";
import { Skeleton } from "../../../components/Skeleton.jsx";
import { C, KOLGE, RADIUS, font } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { formatQiymet } from "../../../lib/format.js";
import { gunAdi } from "../../../lib/tarix.js";
import { rayonTap } from "../../../../lib/rayonlar.js";
import { mehsulTap } from "../../../../lib/bazar/kataloq.js";
import { sifarisYukle } from "../../../services/bazar.js";
import { BazarBasliq } from "../BazarBasliq.jsx";
import { HalCipi } from "../HalCipi.jsx";
import { MehsulSekli } from "../MehsulSekli.jsx";
import { SifarisZamanXetti } from "../SifarisZamanXetti.jsx";

function Bolme({ basliq, children }) {
  return (
    <>
      <SectionTitle>{basliq}</SectionTitle>
      <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
        {children}
      </div>
    </>
  );
}

/**
 * UĞUR EKRANI — sifariş yenicə yaranıb: nömrə, tədarükçü, gözlənilən
 * çatdırılma, "Sifarişə bax". Maliyyə ilə sifarişdə növbəti addım açıq
 * deyilir: kredit müraciəti (mövcud LoanSheet) — sifariş ona bağlanacaq.
 */
function UgurEkrani({ sifaris, onBax, onBazar, onMuraciet }) {
  const { t, lang } = useI18n();
  const maliyyeGozleyir = sifaris.maliyye?.hal === "requested";
  return (
    <div className="px-4 pb-4">
      <div className="mt-8 text-center">
        <span className="konfeti-yuva mx-auto flex items-center justify-center rounded-full" style={{ width: 72, height: 72, backgroundColor: C.successSoft }}>
          <Icon name="PackageCheck" size={34} color={C.success} strokeWidth={2} />
        </span>
        <h1 className="mt-4 text-xl font-extrabold" style={{ color: C.ink, fontFamily: font.display }}>
          {t("bazar.ugur.basliq")}
        </h1>
        <p className="mx-auto mt-1 max-w-[32ch] text-sm leading-relaxed" style={{ color: C.muted }}>
          {t("bazar.ugur.izah")}
        </p>
      </div>

      <div className="mt-5 rounded-2xl p-4" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
        {[
          [t("bazar.ugur.nomre"), sifaris.nomre],
          [t("bazar.ugur.tedarukcu"), sifaris.tedarukculer.map((td) => td.ad).join(", ")],
          [t("bazar.ugur.catdirilma"), sifaris.gozlenilenTarix ? gunAdi(t, sifaris.gozlenilenTarix) : "—"],
          [t("bazar.sebet.yekun"), formatQiymet(sifaris.cemi, lang)],
        ].map(([etiket, deger]) => (
          <div key={etiket} className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="text-xs" style={{ color: C.muted }}>
              {etiket}
            </span>
            <span className="text-right text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              {deger}
            </span>
          </div>
        ))}
      </div>

      {maliyyeGozleyir && (
        <section className="mt-3 rounded-2xl p-4" style={{ backgroundColor: C.malSoft }}>
          <p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: C.mal, fontFamily: font.display }}>
            <Icon name="Wallet" size={16} color={C.mal} />
            {t("bazar.ugur.maliyye")}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: C.mal }}>
            {t("bazar.ugur.maliyyeIzah", { mebleg: formatQiymet(sifaris.maliyye.mebleg, lang), app: { key: "app.name" } })}
          </p>
          <Button variant="secondary" ton="mal" fullWidth className="mt-3" onClick={onMuraciet}>
            {t("bazar.ugur.maliyyeCta")}
          </Button>
        </section>
      )}

      <Button size="lg" fullWidth className="mt-4" onClick={onBax}>
        {t("bazar.ugur.cta")}
      </Button>
      <Button variant="ghost" fullWidth className="mt-2" onClick={onBazar}>
        {t("bazar.ugur.bazar")}
      </Button>
    </div>
  );
}

/**
 * SİFARİŞ DETALI — zaman xətti, məhsullar, çatdırılma, ödəniş, maliyyə, ləğv.
 * Hadisə izi serverdən ayrıca gətirilir (siyahıda yoxdur); gəlməyənə
 * qədər siyahıdakı surət göstərilir.
 */
export function SifarisDetali({ id, get, geri, sifarisHali, yeni = false, onYeniBagla, onMuraciet }) {
  const { t, lang } = useI18n();
  const q = (v) => formatQiymet(v, lang);
  const siyahidaki = sifarisHali.sifarisler.find((s) => String(s.id) === String(id)) ?? null;
  const [detal, setDetal] = useState(null);
  const [hal, setHal] = useState("yuklenir");
  const [legvSorusur, setLegvSorusur] = useState(false);

  // Detal (hadisə izi ilə) bir dəfə gətirilir; id dəyişəndə komponent
  // yenidən qurulur (BazarScreen: key=id), ona görə hal "yuklenir"dən başlayır
  useEffect(() => {
    const controller = new AbortController();
    sifarisYukle(id, { signal: controller.signal })
      .then((cavab) => {
        setDetal(cavab.sifaris);
        setHal("hazir");
      })
      .catch((xeta) => {
        if (xeta?.name === "AbortError") return;
        setHal(xeta?.status === 404 ? "yoxdur" : "xeta");
      });
    return () => controller.abort();
  }, [id]);

  const sifaris = detal ?? siyahidaki;

  if (yeni && sifaris) {
    return <UgurEkrani sifaris={sifaris} onBax={onYeniBagla} onBazar={() => get.ev()} onMuraciet={() => onMuraciet(sifaris)} />;
  }

  if (!sifaris) {
    return (
      <div className="px-4 pb-4">
        <BazarBasliq basliq={hal === "yuklenir" ? "" : t("bazar.detal.tapilmadi")} onGeri={geri} />
        {hal === "yuklenir" && (
          <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: C.card }} aria-busy="true">
            <Skeleton en="50%" hund={14} />
            <Skeleton en="80%" hund={10} className="mt-3" />
            <Skeleton en="60%" hund={10} className="mt-2" />
          </div>
        )}
      </div>
    );
  }

  const rayon = rayonTap(sifaris.unvan?.rayonKod);
  const legvEt = async () => {
    const netice = await sifarisHali.legvEt(sifaris.id);
    setLegvSorusur(false);
    if (netice.ok) setDetal(netice.sifaris);
  };

  return (
    <div className="px-4 pb-4">
      <BazarBasliq basliq={t("bazar.detal.basliq", { nomre: sifaris.nomre })} altYazi={gunAdi(t, sifaris.tarix)} onGeri={geri} sag={<HalCipi hal={sifaris.hal} />} />

      <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
        <SifarisZamanXetti hal={sifaris.hal} hadiseler={sifaris.hadiseler ?? []} />
        {sifaris.hal !== "completed" && sifaris.hal !== "cancelled" && (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: C.muted }}>
            {sifaris.gozlenilenTarix
              ? `${t("bazar.sifaris.gozlenilen")}: ${gunAdi(t, sifaris.gozlenilenTarix)} · `
              : ""}
            {t("bazar.detal.statusQeyd")}
          </p>
        )}
      </div>

      <Bolme basliq={t("bazar.detal.mehsullar")}>
        <ul>
          {sifaris.setirler.map((s, i) => (
            <li key={s.id ?? s.kod} className="flex items-center gap-3 py-2" style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
              <MehsulSekli mehsul={mehsulTap(s.kod) ?? { kod: s.kod, kateqoriya: s.kateqoriya, sekil: { nov: "yuva" } }} olcu={44} radius={10} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-semibold" style={{ color: C.ink }}>
                  {s.ad}
                </span>
                <span className="block text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                  {s.say} × {q(s.vahidQiymet)} · {s.tedarukcuAd}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                {q(s.cemi)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t pt-2" style={{ borderColor: C.line }}>
          {[
            [t("bazar.sebet.araCem"), q(sifaris.araCem)],
            [t("bazar.sebet.catdirilma"), sifaris.catdirilmaHaqqi > 0 ? q(sifaris.catdirilmaHaqqi) : t("bazar.sebet.catdirilmaPulsuz")],
          ].map(([etiket, deger]) => (
            <div key={etiket} className="flex items-baseline justify-between gap-3 py-1 text-xs">
              <span style={{ color: C.muted }}>{etiket}</span>
              <span className="font-bold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>
                {deger}
              </span>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <span className="text-sm font-bold" style={{ color: C.ink }}>
              {t("bazar.sebet.yekun")}
            </span>
            <span className="text-lg font-extrabold" style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}>
              {q(sifaris.cemi)}
            </span>
          </div>
        </div>
      </Bolme>

      <Bolme basliq={t("bazar.detal.catdirilma")}>
        <p className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
          <Icon name="MapPin" size={16} color={C.field} />
          <span>
            <span className="font-semibold">{rayon?.name ?? sifaris.unvan?.rayonKod}</span>
            {sifaris.unvan?.unvan ? ` · ${sifaris.unvan.unvan}` : ""}
            <span className="block text-xs" style={{ color: C.muted }}>
              {sifaris.unvan?.ad} · {sifaris.unvan?.telefon}
            </span>
            {sifaris.unvan?.qeyd && (
              <span className="block text-xs italic" style={{ color: C.muted }}>
                “{sifaris.unvan.qeyd}”
              </span>
            )}
          </span>
        </p>
      </Bolme>

      <Bolme basliq={t("bazar.detal.odenis")}>
        <p className="text-sm font-semibold" style={{ color: C.ink }}>
          {t(`bazar.sifaris.odenis.${sifaris.odenisUsulu}`, { app: { key: "app.name" } })}
        </p>
        {sifaris.maliyye && (
          <div className="mt-2 rounded-xl p-3" style={{ backgroundColor: C.malSoft }}>
            <p className="text-xs font-bold" style={{ color: C.mal }}>
              {t("bazar.detal.maliyye")} · {q(sifaris.maliyye.mebleg)}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: C.mal }}>
              {t(`bazar.detal.maliyye.${sifaris.maliyye.hal}`)}
            </p>
            {sifaris.maliyye.hal === "requested" && sifaris.hal !== "cancelled" && (
              <Button variant="secondary" ton="mal" size="sm" fullWidth className="mt-2" onClick={() => onMuraciet(sifaris)}>
                {t("bazar.detal.maliyyeCta")}
              </Button>
            )}
          </div>
        )}
      </Bolme>

      {sifaris.legvOlar && !legvSorusur && (
        <Button variant="secondary" fullWidth className="mt-5" style={{ color: C.danger }} onClick={() => setLegvSorusur(true)}>
          {t("bazar.detal.legv")}
        </Button>
      )}
      {legvSorusur && (
        <div className="mt-5 rounded-2xl p-4" role="alertdialog" aria-label={t("bazar.detal.legvTesdiq")} style={{ backgroundColor: C.warnSoft }}>
          <p className="text-sm font-bold" style={{ color: C.ink }}>
            {t("bazar.detal.legvTesdiq")}
          </p>
          <p className="mt-1 text-xs" style={{ color: C.muted }}>
            {t("bazar.detal.legvIzah")}
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setLegvSorusur(false)}>
              {t("bazar.detal.legvXeyr")}
            </Button>
            <Button variant="danger" className="flex-1" loading={sifarisHali.gedir} onClick={legvEt}>
              {t("bazar.detal.legvBeli")}
            </Button>
          </div>
        </div>
      )}
      {!sifaris.legvOlar && sifaris.hal !== "cancelled" && sifaris.hal !== "completed" && (
        <p className="mt-4 px-1 text-center text-xs" style={{ color: C.muted }}>
          {t("bazar.detal.legvOlmur")}
        </p>
      )}
    </div>
  );
}
