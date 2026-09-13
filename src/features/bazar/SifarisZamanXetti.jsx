import { Icon } from "../../components/Icon.jsx";
import { C } from "../../theme/tokens.js";
import { useI18n } from "../../i18n/index.jsx";
import { SIFARIS_YOLU } from "../../../lib/bazar/sifaris.js";
import { gunAdi } from "../../lib/tarix.js";

/**
 * SİFARİŞ ZAMAN XƏTTİ — beş pillə: yeni → təsdiqləndi → hazırlanır →
 * çatdırılır → tamamlandı. Ləğv olunmuş sifarişdə xətt qırmızı nöqtə ilə
 * bitir.
 *
 * Keçilmiş pillələrin tarixi hadisə izindən gəlir (serverdə `to_status`
 * ilə); gələcək pillələr boz və tarixsizdir — "gözlənilir" yazılır,
 * uydurma tarix yoxdur.
 */
export function SifarisZamanXetti({ hal, hadiseler = [] }) {
  const { t } = useI18n();
  const legv = hal === "cancelled";
  const cariIndeks = legv ? -1 : SIFARIS_YOLU.indexOf(hal);
  const tarixi = (pille) => hadiseler.find((h) => h.haraya === pille)?.tarix ?? null;

  const pilleler = SIFARIS_YOLU.map((pille, i) => ({
    kod: pille,
    kecilib: !legv && i <= cariIndeks,
    cari: !legv && i === cariIndeks,
    tarix: tarixi(pille),
  }));
  if (legv) {
    const legvTarixi = hadiseler.find((h) => h.haraya === "cancelled")?.tarix ?? null;
    pilleler.splice(1, pilleler.length - 1, { kod: "cancelled", kecilib: true, cari: true, tarix: legvTarixi, legv: true });
    pilleler[0].kecilib = true;
  }

  return (
    <ol className="relative" aria-label={t("bazar.detal.hadiseler")}>
      {pilleler.map((p, i) => {
        const son = i === pilleler.length - 1;
        const reng = p.legv ? C.danger : p.kecilib ? C.field : C.line;
        return (
          <li key={p.kod} className="relative flex gap-3" style={{ paddingBottom: son ? 0 : 18 }}>
            {!son && (
              <span
                aria-hidden="true"
                className="absolute"
                style={{ left: 11, top: 22, bottom: -2, width: 2, backgroundColor: pilleler[i + 1]?.kecilib ? C.field : C.line }}
              />
            )}
            <span
              className="relative flex shrink-0 items-center justify-center rounded-full"
              style={{
                width: 24,
                height: 24,
                backgroundColor: p.kecilib ? reng : C.card,
                border: `2px solid ${reng}`,
              }}
            >
              {p.kecilib && <Icon name={p.legv ? "X" : "Check"} size={12} color="#fff" strokeWidth={3} />}
            </span>
            <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2" style={{ paddingTop: 3 }}>
              <span className="text-sm" style={{ color: p.kecilib ? C.ink : C.muted, fontWeight: p.cari ? 700 : 500 }}>
                {t(`bazar.hal.${p.kod}`)}
              </span>
              <span className="shrink-0 text-xs" style={{ color: C.muted }}>
                {p.tarix ? gunAdi(t, p.tarix) : p.kecilib ? "" : t("bazar.zaman.gozlenilir")}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
