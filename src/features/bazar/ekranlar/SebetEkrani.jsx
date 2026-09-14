import { Icon } from "../../../components/Icon.jsx";
import { Button } from "../../../components/Button.jsx";
import { C, KOLGE, font } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { formatQiymet } from "../../../lib/format.js";
import { AltCta } from "../AltCta.jsx";
import { BazarBasliq } from "../BazarBasliq.jsx";
import { MehsulSekli } from "../MehsulSekli.jsx";
import { MiqdarSecici } from "../MiqdarSecici.jsx";
import { SebetXulasesi } from "../SebetXulasesi.jsx";

/**
 * SƏBƏT — sətirlər (şəkil, ad, tədarükçü, miqdar, cəmi), xülasə, iki CTA.
 * Rəqəmlər kataloqdan (useSebet); serverin hesabı təsdiq ekranındadır.
 * "Agrofin ilə maliyyələşdir" yalnız maliyyələşdirilə bilən sətir varsa
 * görünür və nə qədərinin maliyyələşdiriləcəyini altında deyir.
 */
export function SebetEkrani({ get, geri, sebet, rayon, onSifaris }) {
  const { t, lang } = useI18n();
  const q = (v) => formatQiymet(v, lang);
  const { setirler, hesab } = sebet;

  if (sebet.bos) {
    return (
      <div className="px-4 pb-4">
        <BazarBasliq basliq={t("bazar.sebet.basliq")} onGeri={geri} />
        <div className="mt-8 rounded-2xl p-6 text-center" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
          <span className="mx-auto flex items-center justify-center rounded-full" style={{ width: 56, height: 56, backgroundColor: C.mist }}>
            <Icon name="ShoppingCart" size={24} color={C.muted} />
          </span>
          <p className="mt-3 text-base font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {t("bazar.sebet.bos")}
          </p>
          <p className="mt-1 text-sm" style={{ color: C.muted }}>
            {t("bazar.sebet.bosIzah")}
          </p>
          <Button fullWidth className="mt-4" onClick={() => get.ev()}>
            {t("bazar.sebet.bosCta")}
          </Button>
        </div>
      </div>
    );
  }

  const maliyyeSetirSayi = hesab.setirler.filter((s) => s.maliyye).length;
  const catdirilmayan = new Set(hesab.catdirilmayanlar);

  return (
    <div className="px-4 pb-2">
      <BazarBasliq
        basliq={t("bazar.sebet.basliq")}
        altYazi={t("bazar.sebet.sayCemi", { say: hesab.sayCemi })}
        onGeri={geri}
        sag={
          <button
            type="button"
            onClick={sebet.temizle}
            className="basilir rounded-full px-3 text-xs font-bold"
            style={{ minHeight: 44, color: C.muted, backgroundColor: C.card, border: `1px solid ${C.line}` }}
          >
            {t("bazar.sebet.temizle")}
          </button>
        }
      />

      <ul className="mt-3 space-y-2.5">
        {setirler.map(({ mehsul, say }, i) => {
          const setir = hesab.setirler.find((s) => s.kod === mehsul.kod);
          const gedmir = catdirilmayan.has(mehsul.kod);
          return (
            <li key={mehsul.kod} className="giris rounded-2xl p-3" style={{ "--i": i, backgroundColor: C.card, boxShadow: KOLGE.kart }}>
              <div className="flex gap-3">
                <button type="button" onClick={() => get.mehsul(mehsul.kod)} aria-label={mehsul.ad} className="basilir shrink-0">
                  <MehsulSekli mehsul={mehsul} olcu={64} radius={12} />
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => get.mehsul(mehsul.kod)} className="basilir line-clamp-2 text-left text-sm font-bold" style={{ color: C.ink, lineHeight: "18px" }}>
                    {mehsul.ad}
                  </button>
                  <p className="mt-0.5 truncate text-xs" style={{ color: C.muted }}>
                    {setir?.tedarukcuAd}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                    {t("bazar.sebet.setir", { say, qiymet: q(mehsul.qiymet) })}
                  </p>
                  {gedmir && rayon && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: C.warn }}>
                      <Icon name="AlertCircle" size={12} color={C.warn} />
                      {t("bazar.catdirilmirRayon", { rayon: rayon.name })}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <MiqdarSecici
                  say={say}
                  min={mehsul.minSay}
                  max={mehsul.maxSay}
                  kicik
                  onDeyis={(n) => sebet.sayDeyis(mehsul.kod, n)}
                  onSil={() => sebet.sil(mehsul.kod)}
                  etiket={mehsul.ad}
                />
                <p className="text-base font-extrabold" style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}>
                  {q(setir?.cemi ?? 0)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <SebetXulasesi hesab={hesab} />
      </div>

      {hesab.maliyyeMeblegi > 0 && (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-xs" style={{ color: C.mal }}>
          <Icon name="Wallet" size={14} color={C.mal} />
          {t("bazar.sebet.maliyyeQeyd", { mebleg: q(hesab.maliyyeMeblegi), say: maliyyeSetirSayi })}
        </p>
      )}

      <div className="h-3" />
      <AltCta
        esas={{ label: t("bazar.sebet.tamamla"), onClick: () => onSifaris("on_delivery") }}
        ikinci={
          hesab.maliyyeMeblegi > 0
            ? { label: t("bazar.sebet.maliyyelesdir", { app: { key: "app.name" } }), reng: C.mal, onClick: () => onSifaris("agrofin_financing") }
            : null
        }
      />
    </div>
  );
}
