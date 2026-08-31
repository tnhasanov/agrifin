import { createHash } from "node:crypto";

/**
 * KONTUR HEŞİ — peyk sübutunu KONKRET sahə konturuna bağlayan barmaq izi.
 *
 * Niyə lazımdır: peyk tarixçəsi (mövsüm zirvələri) FarmScore-un bütün
 * söykəndiyi sübutdur. Heş olmasa, bir konturun ölçmələrini başqa kontur
 * üçün saxlamaq və ya sahəni dəyişib köhnə "yaxşı" tarixçəni qoruyub
 * saxlamaq mümkün olardı. Heş uyğun gəlmirsə snapshot etibarsızdır —
 * anderraytinq onu oxumur (bax: db/migrations/005, peyk_snapshotlar).
 *
 * SERVER-ONLY: node:crypto işlədir, ona görə brauzer paketinə düşməməlidir.
 * Həndəsənin özü isə ortaqdır (lib/geo.js).
 *
 * Normallaşdırma qaydaları:
 *   • koordinatlar 6 onluğa yuvarlaqlaşır (≈0,1 m — GPS dəqiqliyindən incə,
 *     yəni eyni kontur fərqli float quyruqları ilə fərqli heş verməsin);
 *   • nöqtə sırası SAXLANILIR: server konturu özü saxlayır və heşi elə
 *     saxladığı dəyərdən hesablayır, ona görə çevrilmə problemi yoxdur;
 *   • format sabitdir: `[[en,uz],...]` → JSON → sha256 → hex.
 */
export function konturHash(noqteler) {
  if (!Array.isArray(noqteler) || noqteler.length < 3) return null;
  const normal = noqteler.map((p) => [yuvarlaq(p?.[0]), yuvarlaq(p?.[1])]);
  if (normal.some((p) => p[0] === null || p[1] === null)) return null;
  return createHash("sha256").update(JSON.stringify(normal)).digest("hex");
}

function yuvarlaq(deger) {
  const say = Number(deger);
  if (!Number.isFinite(say)) return null;
  return Math.round(say * 1e6) / 1e6;
}
