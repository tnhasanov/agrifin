/**
 * FARMSCORE V2 vs V3 — MÜQAYİSƏ CƏDVƏLİ (audit hesabatı üçün).
 *
 *   node scripts/farmscore-muqayise.mjs            → markdown cədvəl + bant paylanması
 *   node scripts/farmscore-muqayise.mjs --json     → JSON
 *
 * Nümunələr lib/farmscore/numuneler.js-dədir (test də eyni siyahını oxuyur).
 * Kredit əmsalı: v2 = GELIR_CONFIG.indeksTesiri[bant], v3 = underwritingMultiplier.
 */
import { mehsuldarliqIndeksi } from "../lib/mehsuldarliq.js";
import { farmScoreV3 } from "../lib/farmscore/v3.js";
import { GELIR_CONFIG } from "../lib/gelir.js";
import { NUMUNELER, NUMUNE_INDI, NUMUNE_SON_IL } from "../lib/farmscore/numuneler.js";

const BANT_AD = { yuksek: "Yüksək", yaxsi: "Yaxşı", orta: "Orta", zeif: "Zəif" };
const ad = (b) => (b ? BANT_AD[b] : "—");

export function muqayiseSetirleri() {
  return NUMUNELER.map((n) => {
    const indi = n.indi ?? NUMUNE_INDI;
    const v2 = n.movsumler.length ? mehsuldarliqIndeksi({ movsumler: n.movsumler, cari: n.cari, sonIl: NUMUNE_SON_IL }) : null;
    const v3 = n.movsumler.length ? farmScoreV3({ movsumler: n.movsumler, cari: n.cari, bitki: n.bitki, indi, sonIl: NUMUNE_SON_IL }) : null;
    const v2Bant = v2?.hal === "hazir" ? v2.bant : null;
    const v2Emsal = GELIR_CONFIG.indeksTesiri[v2Bant ?? "yoxdur"];
    const v3Emsal = v3?.underwritingMultiplier ?? 0.85;
    return {
      ad: n.ad,
      movsum: n.movsumler.length,
      v2Bal: v2?.hal === "hazir" ? v2.bal : null,
      v2Bant,
      v2Etibar: v2?.etibar ?? null,
      v2Emsal,
      v3Raw: v3?.rawScore ?? null,
      v3Adj: v3?.adjustedScore ?? null,
      v3RawBant: v3?.rawBand ?? null,
      v3Bant: v3?.adjustedBand ?? null,
      v3Etibar: v3?.confidence ?? null,
      v3Tavan: v3?.bandCapReason ?? null,
      v3Cari: v3?.currentRisk?.hal ?? "—",
      v3Emsal,
      v3Manual: v3?.manualReview?.teleb ?? true,
      ferq: Math.round((v3Emsal - v2Emsal) * 100) / 100,
    };
  });
}

export function bantPaylanmasi(setirler) {
  const say = () => ({ yuksek: 0, yaxsi: 0, orta: 0, zeif: 0, yoxdur: 0 });
  const v2 = say();
  const v3 = say();
  for (const s of setirler) {
    v2[s.v2Bant ?? "yoxdur"] += 1;
    v3[s.v3Bant ?? "yoxdur"] += 1;
  }
  return { v2, v3 };
}

function markdown(setirler) {
  const b = [];
  b.push("| # | Nümunə | Mövsüm | v2 bal | v2 bant | v2 əmsal | v3 xam | v3 düzəlişli | v3 bant | v3 etibar | v3 tavan | v3 cari | v3 əmsal | Δ əmsal | Manual |");
  b.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  setirler.forEach((s, i) => {
    b.push(
      `| ${i + 1} | ${s.ad} | ${s.movsum} | ${s.v2Bal ?? "—"} | ${ad(s.v2Bant)} | ${s.v2Emsal.toFixed(2)} | ${s.v3Raw ?? "—"} | ${s.v3Adj ?? "—"} | ${ad(s.v3Bant)} | ${s.v3Etibar ?? "—"} | ${s.v3Tavan ?? "—"} | ${s.v3Cari} | ${s.v3Emsal.toFixed(2)} | ${s.ferq >= 0 ? "+" : ""}${s.ferq.toFixed(2)} | ${s.v3Manual ? "bəli" : "—"} |`,
    );
  });
  const p = bantPaylanmasi(setirler);
  b.push("");
  b.push("| Bant | v2 | v3 |");
  b.push("|---|---|---|");
  for (const k of ["yuksek", "yaxsi", "orta", "zeif", "yoxdur"]) b.push(`| ${k === "yoxdur" ? "Bant yoxdur" : BANT_AD[k]} | ${p.v2[k]} | ${p.v3[k]} |`);
  return b.join("\n");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const setirler = muqayiseSetirleri();
  if (process.argv.includes("--json")) console.log(JSON.stringify({ setirler, paylanma: bantPaylanmasi(setirler) }, null, 2));
  else console.log(markdown(setirler));
}
