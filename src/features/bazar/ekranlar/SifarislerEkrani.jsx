import { Icon } from "../../../components/Icon.jsx";
import { Skeleton } from "../../../components/Skeleton.jsx";
import { C, KOLGE, font } from "../../../theme/tokens.js";
import { useI18n } from "../../../i18n/index.jsx";
import { formatQiymet } from "../../../lib/format.js";
import { gunAdi } from "../../../lib/tarix.js";
import { BazarBasliq } from "../BazarBasliq.jsx";
import { HalCipi } from "../HalCipi.jsx";

/**
 * SİFARİŞLƏRİM — siyahı: nömrə, tarix, hal çipi, məhsul sayı, yekun.
 * Boş, giriş yoxdur, qurulmayıb, xəta — hər hal açıq deyilir.
 */
export function SifarislerEkrani({ get, geri, sifarisHali, onOpenHesab }) {
  const { t, lang } = useI18n();
  const { hal, sifarisler } = sifarisHali;

  return (
    <div className="px-4 pb-4">
      <BazarBasliq basliq={t("bazar.sifarisler.basliq")} onGeri={geri} />

      {(hal === "yuklenir" || hal === "gozleyir") && (
        <div className="mt-4 space-y-2.5" aria-busy="true" aria-label={t("bazar.sifarisler.yuklenir")}>
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl p-4" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
              <Skeleton en="40%" hund={12} />
              <Skeleton en="70%" hund={10} className="mt-2" />
              <Skeleton en="30%" hund={14} className="mt-3" />
            </div>
          ))}
        </div>
      )}

      {hal === "girisYox" && (
        <div className="mt-6 rounded-2xl p-6 text-center" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
          <Icon name="ShieldCheck" size={24} color={C.goldDeep} />
          <p className="mt-2 text-base font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {t("bazar.sifaris.girisBasliq")}
          </p>
          <p className="mt-1 text-sm" style={{ color: C.muted }}>
            {t("bazar.sifarisler.girisIzah")}
          </p>
          <button type="button" onClick={onOpenHesab} className="basilir mt-4 w-full rounded-xl text-sm font-bold" style={{ minHeight: 48, backgroundColor: C.pine, color: "#fff" }}>
            {t("bazar.maliyye.girisCta")}
          </button>
        </div>
      )}

      {hal === "qurulmayib" && (
        <p className="mt-6 rounded-2xl p-4 text-sm leading-relaxed" style={{ backgroundColor: C.mist, color: C.muted }}>
          {t("bazar.sifaris.qurulmayib")}
        </p>
      )}

      {/* Sxem tətbiq olunmayıb: baza var, cədvəl yoxdur. Bu, "server sındı"
          deyil — quraşdırma vəziyyətidir və belə də adlandırılır. */}
      {hal === "sxemYoxdur" && (
        <p className="mt-6 rounded-2xl p-4 text-sm leading-relaxed" style={{ backgroundColor: C.mist, color: C.muted }}>
          {t("bazar.sifarisler.sxemYoxdur")}
        </p>
      )}

      {hal === "xeta" && (
        <div className="mt-6 rounded-2xl p-4" role="alert" style={{ backgroundColor: C.card, borderColor: C.danger, border: `1px solid ${C.danger}` }}>
          <p className="text-sm font-bold" style={{ color: C.ink }}>
            {t("bazar.sifarisler.xeta")}
          </p>
          <button type="button" onClick={sifarisHali.yenile} className="basilir mt-3 w-full rounded-xl text-sm font-bold" style={{ minHeight: 44, backgroundColor: C.pine, color: "#fff" }}>
            {t("common.retry")}
          </button>
        </div>
      )}

      {hal === "hazir" && sifarisler.length === 0 && (
        <div className="mt-8 rounded-2xl p-6 text-center" style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}>
          <span className="mx-auto flex items-center justify-center rounded-full" style={{ width: 56, height: 56, backgroundColor: C.mist }}>
            <Icon name="ClipboardList" size={24} color={C.muted} />
          </span>
          <p className="mt-3 text-base font-bold" style={{ color: C.ink, fontFamily: font.display }}>
            {t("bazar.sifarisler.bos")}
          </p>
          <p className="mt-1 text-sm" style={{ color: C.muted }}>
            {t("bazar.sifarisler.bosIzah")}
          </p>
          <button type="button" onClick={() => get.ev()} className="basilir mt-4 w-full rounded-xl text-sm font-bold" style={{ minHeight: 48, backgroundColor: C.pine, color: "#fff" }}>
            {t("bazar.sebet.bosCta")}
          </button>
        </div>
      )}

      {hal === "hazir" && sifarisler.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {sifarisler.map((s, i) => (
            <li key={s.id} className="giris" style={{ "--i": Math.min(i, 8) }}>
              <button
                type="button"
                onClick={() => get.sifarisDetal(s.id)}
                className="basilir w-full rounded-2xl p-4 text-left"
                style={{ backgroundColor: C.card, boxShadow: KOLGE.kart }}
                aria-label={`${s.nomre} · ${t(`bazar.hal.${s.hal}`)} · ${formatQiymet(s.cemi, lang)}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold" style={{ color: C.ink, fontFamily: font.display }}>
                    {s.nomre}
                  </span>
                  <HalCipi hal={s.hal} />
                </span>
                <span className="mt-1 block text-xs" style={{ color: C.muted }}>
                  {gunAdi(t, s.tarix)} · {t("bazar.sifarisler.mehsulSayi", { say: s.setirler.length })} · {s.tedarukculer.map((td) => td.ad).join(", ")}
                </span>
                <span className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold" style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}>
                    {formatQiymet(s.cemi, lang)}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.field }}>
                    {s.maliyyeIstenilib && <Icon name="Wallet" size={14} color={C.mal} />}
                    <Icon name="ChevronRight" size={16} color={C.muted} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
