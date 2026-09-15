import { C, TIPO, font } from "../theme/tokens.js";

/**
 * KART OLMAYAN BÖLMƏLƏR ÜÇÜN — boşluq və ayırıcı.
 *
 * Hər məlumat bloku kart olanda ekran "kart yığını"na çevrilir və heç
 * biri seçilmir. Maliyyə faktları (faiz, tarix, borc) kartdan çıxarılıb:
 * sətir-sətir, aralarında hairline, ətrafında boşluq. Göz bir sütunu
 * yuxarıdan aşağı oxuyur — bu, hesab çıxarışının dilidir.
 */
export function Ayirici({ className = "" }) {
  return <hr className={className} style={{ border: 0, borderTop: `1px solid ${C.line}`, margin: 0 }} />;
}

/**
 * FAKT SƏTRİ — etiket solda, dəyər sağda, altında istəyə görə qeyd.
 * Dəyər çox vaxt <Amount> olur; mətn də ola bilər.
 */
export function FaktSetri({ etiket, qeyd = null, children, son = false }) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-3"
      style={{ borderBottom: son ? "none" : `1px solid ${C.line}` }}
    >
      {/* Etiket sabit, dəyər ÇEVİKDİR: uzun mətn dəyəri (məsələn müraciət
          dövrü) sətrə keçir, etiketin üstünə çıxmır. Məbləğ (Amount) onsuz
          da nowrap-dır, ona görə rəqəmlər bölünmür. */}
      <div className="shrink-0" style={{ maxWidth: "46%" }}>
        <p style={{ ...TIPO.metn, color: C.muted }}>{etiket}</p>
        {qeyd && (
          <p className="mt-0.5" style={{ ...TIPO.qeyd, color: C.muted, opacity: 0.85 }}>
            {qeyd}
          </p>
        )}
      </div>
      <div
        className="min-w-0 flex-1 text-right"
        style={{ ...TIPO.metn, color: C.ink, fontWeight: 700, fontFamily: font.display, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * MƏNBƏ QEYDİ — hesablanan hər rəqəmin altında: haradan gəlib, nə vaxt
 * yenilənib. Fintech-də rəqəmin tarixi rəqəmin özü qədər vacibdir.
 */
export function MenbeQeydi({ children, className = "" }) {
  return (
    <p className={`flex items-center gap-1.5 ${className}`} style={{ fontSize: 12, lineHeight: "16px", color: C.muted }}>
      {children}
    </p>
  );
}
