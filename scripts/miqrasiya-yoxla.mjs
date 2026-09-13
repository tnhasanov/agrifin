#!/usr/bin/env node
/**
 * Miqrasiya nəticəsinin READ-ONLY yoxlaması — heç nə yazmır, heç nə dəyişmir.
 *
 * Prod miqrasiya workflow-u `db:migrate`-dən SONRA bunu işlədir:
 *   1. db/migrations-dakı HƏR fayl sxem_miqrasiyalari jurnalında var və
 *      mezmun_hash-ı yazılıb (legacy mənimsəmə də hash qoyur);
 *   2. əsas cədvəllər (istifadəçi/sahə + bütün kredit zənciri) mövcuddur.
 *
 * Bağlantı sətri heç vaxt çap olunmur — yalnız env açarının adı.
 * Uğursuzluqda çıxış kodu 1-dir.
 */
import { neon } from "@neondatabase/serverless";
import { BAGLANTI_ACARLARI, baglantiKimliyi } from "../lib/db.js";
import { miqrasiyaFayllari } from "../lib/miqrasiya.js";

const acar = BAGLANTI_ACARLARI.find((ad) => process.env[ad]);
if (!acar) {
  console.error(`Bağlantı sətri yoxdur. Gözlənilən açarlardan biri: ${BAGLANTI_ACARLARI.join(", ")}`);
  process.exit(1);
}
// HANSI bazaya baxdığımız da deyilir (host + baza adı, parolsuz): preview-da
// Neon hər branch üçün ayrı baza yaradır, prod miqrasiyası isə ayrı sirrlə
// gedir — "miqrasiyanı işlətdim, amma ✗ qalır" halının səbəbi adətən
// yoxlamanın BAŞQA bazaya baxmasıdır.
console.log(`Baza açarı: ${acar} → ${baglantiKimliyi()}`);

// BAĞLANTI QURULMASI DA TUTULUR: `neon()` yararsız sətirdə atır və onun öz
// xəta mətni BAĞLANTI SƏTRİNİ (deməli parolu) çap edə bilər. Bu faylın öz
// qaydası isə "connection string heç vaxt loglanmır" — ona görə xəta
// udulur və yerinə yalnız açarın adı deyilir.
let muster;
try {
  muster = neon(process.env[acar], { fullResults: true });
} catch {
  console.error(`Bağlantı sətri oxunmadı (${acar}) — gözlənilən format: postgresql://…`);
  process.exit(1);
}
const sorgu = async (metn, params = []) => {
  const netice = await muster.query(metn, params);
  return netice.rows ?? netice;
};

let ugursuz = 0;
function yoxla(ad, sert, detal = "") {
  console.log(`${sert ? "✓" : "✗"} ${ad}${sert ? "" : `  ← ${detal}`}`);
  if (!sert) ugursuz += 1;
}

try {
  const jurnal = await sorgu("SELECT ad, mezmun_hash FROM sxem_miqrasiyalari ORDER BY ad");
  for (const ad of miqrasiyaFayllari()) {
    const setir = jurnal.find((s) => s.ad === ad);
    yoxla(`${ad} jurnalda var`, Boolean(setir), "tətbiq olunmayıb");
    if (setir) yoxla(`${ad} checksum-u yazılıb`, Boolean(setir.mezmun_hash), "mezmun_hash boşdur");
  }

  const CEDVELLER = [
    "istifadeciler",
    "saheler",
    "credit_applications",
    "credit_application_events",
    "credit_decisions",
    "credit_offers",
    "loans",
    "loan_events",
    "marketplace_orders",
    "marketplace_order_items",
    "marketplace_order_events",
    "marketplace_financing_requests",
  ];
  for (const cedvel of CEDVELLER) {
    const [setir] = await sorgu("SELECT to_regclass($1) AS movcud", [`public.${cedvel}`]);
    yoxla(`${cedvel} cədvəli mövcuddur`, Boolean(setir?.movcud), "tapılmadı");
  }
} catch (xeta) {
  console.error(xeta.message);
  process.exit(1);
}

console.log(ugursuz === 0 ? "YOXLAMA KEÇDİ" : `${ugursuz} YOXLAMA KEÇMƏDİ`);
process.exit(ugursuz === 0 ? 0 : 1);
