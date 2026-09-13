import { C, font } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { formatQiymet } from "../../lib/format.js";

function Setir({ etiket, deger, vurgu = false, kicik = false }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={kicik ? "text-xs" : "text-sm"} style={{ color: C.muted }}>
        {etiket}
      </span>
      <span
        className={`${kicik ? "text-xs" : "text-sm"} font-bold`}
        style={{ color: vurgu ? C.ink : C.ink, fontVariantNumeric: "tabular-nums" }}
      >
        {deger}
      </span>
    </div>
  );
}

/**
 * SƏBƏT XÜLASƏSİ — ara cəm, çatdırılma (tədarükçü başına açılır), yekun.
 *
 * `hesab` lib/bazar/sifaris.js → sebetiHesabla formasındadır; klientdə də,
 * serverdə də eyni funksiyadan çıxır. `menbe="server"` verilibsə altda
 * "yekun server tərəfindən hesablanıb" qeydi görünür — təsdiq ekranında.
 */
export function SebetXulasesi({ hesab, menbe = "yerli", yuklenir = false }) {
  const { t, lang } = useI18n();
  if (!hesab) return null;
  const q = (v) => formatQiymet(v, lang);

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <Setir etiket={t("bazar.sebet.araCem")} deger={q(hesab.araCem)} />
      <Setir
        etiket={t("bazar.sebet.catdirilma")}
        deger={hesab.catdirilma > 0 ? q(hesab.catdirilma) : t("bazar.sebet.catdirilmaPulsuz")}
      />
      {/* Çatdırılma tədarükçü başınadır — gizlədilmir */}
      {hesab.tedarukculer.length > 1 || hesab.catdirilma > 0 ? (
        <div className="mb-1 pl-3" style={{ borderLeft: `2px solid ${C.line}` }}>
          {hesab.tedarukculer.map((td) => (
            <Setir
              key={td.kod}
              kicik
              etiket={td.ad}
              deger={
                td.catdirilma > 0
                  ? `${q(td.catdirilma)}${td.pulsuzHedd > 0 ? ` · ${t("bazar.sebet.pulsuzHedd", { hedd: q(td.pulsuzHedd) })}` : ""}`
                  : t("bazar.sebet.catdirilmaPulsuz")
              }
            />
          ))}
        </div>
      ) : null}
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t pt-2" style={{ borderColor: C.line }}>
        <span className="text-sm font-bold" style={{ color: C.ink }}>
          {t("bazar.sebet.yekun")}
        </span>
        <span
          className="text-xl font-extrabold"
          style={{ color: C.ink, fontFamily: font.display, fontVariantNumeric: "tabular-nums" }}
        >
          {q(hesab.cemi)}
        </span>
      </div>
      {menbe === "server" && (
        <p className="mt-1.5 text-right" style={{ color: C.muted, fontSize: 11 }}>
          {yuklenir ? t("bazar.sifaris.serverHesabGozle") : t("bazar.sifaris.serverHesab")}
        </p>
      )}
    </div>
  );
}
