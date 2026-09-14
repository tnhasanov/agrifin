// api/bazar.js — bazar: səbət hesabı, maliyyələşdirmə yoxlaması, sifariş, ləğv.
//
// NİYƏ BİR FUNKSİYA: əvvəl səbəb Hobby planının 12 funksiya limiti idi. Plan
// Pro-ya keçdi, limit artıq bağlamır — qruplaşdırma isə QALIR, çünki səbəbi
// təkcə limit deyil: bazar əməlləri eyni sessiya yoxlamasını, eyni kataloqu
// və eyni məbləğ hesablamasını bölüşür. Ayrı fayllarda hər biri öz soyuq
// start-ını və öz nüsxəsini gətirərdi. Əməl POST gövdəsindəki `emel`
// sahəsindən seçilir (api/kredit.js ilə eyni üslub).
//
//   POST sebet-hesabla     → {setirler:[{kod,say}], rayonKod?} — yekunlar
//                            KATALOQDAN (sessiya tələb etmir: yazmır)
//   GET                    → {sifarisler:[…]} — istifadəçinin sifarişləri
//   GET ?sifaris=<id>      → {sifaris} — detal + hadisə izi
//   POST maliyye-yoxla     → {setirler} — OXU-YALNIZ uyğunluq yoxlaması:
//                            mövcud anderraytinq (lib/kredit.js) işlədilir,
//                            HEÇ NƏ YAZILMIR, təsdiq VƏD EDİLMİR
//   POST sifaris-yarat     → {setirler, catdirilma, odenisUsulu, acar?} —
//                            ATOMİK: sifariş + sətirlər + hadisə + (varsa)
//                            maliyyələşdirmə sorğusu BİR ifadədə
//   POST sifaris-legv      → {sifarisId} — yalnız erkən hallarda
//   POST maliyye-bagla     → {sifarisId, muracietId} — sifarişi kredit
//                            müraciətinə bağlayır (hər ikisi istifadəçinindir)
//
// ═══ TƏHLÜKƏSİZLİK QAYDALARI ══════════════════════════════════════════
//   • Kimlik YALNIZ sessiyadan çıxır; gövdədəki user_id/istifadeci_id BAXILMIR.
//   • Klientdən yalnız {kod, say} gəlir. Qiymət, təchizatçı, endirim,
//     çatdırılma haqqı, yekun, maliyyələşmə məbləği — hamısı kataloqdan
//     serverdə hesablanır (lib/bazar/sifaris.js). Klient "cemi" göndərsə
//     də oxunmur.
//   • `status` klientdən qəbul edilmir; keçidlər vəziyyət maşınındadır və
//     fermer yalnız ləğv edə bilir (o da erkən hallarda).
//   • Sürət həddi BAZADADIR (10 dəqiqədə 5 sifariş) — instanslar arası.
//   • İdempotentlik açarı: şəbəkə itsə təkrar sorğu İKİNCİ sifariş yaratmır.
//   • Vaxt damğaları serverdədir; xəta mətnləri daxili detal sızdırmır.
import { sorgu, baglantiKimliyi, dbQurulub, sxemYoxdurXetasi } from "../lib/db.js";
import { cookieToken, hesabQurulub, sessiyaOxu } from "../lib/hesab.js";
import { ACIQ_HALLAR, anderraytinq, muddetTeyin, murecietGirisi } from "../lib/kredit.js";
import { KREDIT_SERTLERI } from "../lib/kreditSertler.js";
import { ayliqFaiz } from "../lib/kreditOdenis.js";
import { KATALOQ_VERSIYA, NUMUNE } from "../lib/bazar/kataloq.js";
import {
  FERMER_LEGV_OLAR,
  ODENIS_USULLARI,
  SIFARIS_HEDDI,
  catdirilmaYoxla,
  gozlenilenCatdirilma,
  sebetiHesabla,
  setirleriYoxla,
} from "../lib/bazar/sifaris.js";

/** Ölçülü hadisə jurnalı — şəxsi məlumat, token, bağlantı sətri YAZILMIR */
function jurnal(hadise, melumat) {
  console.log(JSON.stringify({ hadise, ...melumat }));
}

const reqem = (deyer) => (deyer == null ? null : Number(deyer));
const gun = (tarix) => (tarix ? new Date(tarix).toISOString().slice(0, 10) : null);

/** Sətir cavabı — daxili sütun adları açılmır */
function setirCavabi(s) {
  return {
    id: s.id,
    kod: s.product_code,
    ad: s.product_name,
    kateqoriya: s.category_code,
    tedarukcu: s.supplier_code,
    tedarukcuAd: s.supplier_name,
    vahidKey: s.unit,
    say: s.quantity,
    vahidQiymet: reqem(s.unit_price),
    cemi: reqem(s.line_total),
    maliyye: Boolean(s.financing_eligible),
  };
}

function hadiseCavabi(h) {
  return { nov: h.event_type, haradan: h.from_status, haraya: h.to_status, aktor: h.actor, tarix: h.created_at };
}

/**
 * Sifariş cavabı. Çatdırılma məlumatı fermerin ÖZ məlumatıdır (sahiblik
 * WHERE-dədir), ona görə cavabda qayıdır — sifarişi izləyən adam kimə,
 * hara göndərildiyini görməlidir.
 */
function sifarisCavabi(setir, setirler = [], hadiseler = [], maliyye = null) {
  if (!setir) return null;
  const tedarukculer = [];
  for (const s of setirler) {
    if (!tedarukculer.some((t) => t.kod === s.supplier_code)) {
      tedarukculer.push({ kod: s.supplier_code, ad: s.supplier_name });
    }
  }
  return {
    id: setir.id,
    nomre: setir.order_no,
    hal: setir.status,
    odenisUsulu: setir.payment_method,
    maliyyeIstenilib: Boolean(setir.financing_requested),
    bitki: setir.crop,
    hektar: reqem(setir.hectares),
    araCem: reqem(setir.subtotal),
    catdirilmaHaqqi: reqem(setir.delivery_fee),
    cemi: reqem(setir.total),
    kataloqVersiyasi: setir.catalog_version,
    unvan: {
      rayonKod: setir.delivery_district,
      unvan: setir.delivery_address,
      ad: setir.contact_name,
      telefon: setir.contact_phone,
      qeyd: setir.note,
    },
    gozlenilenTarix: gun(setir.expected_delivery_on),
    tarix: setir.created_at,
    yenilenib: setir.updated_at,
    legvOlar: FERMER_LEGV_OLAR.includes(setir.status),
    setirler: setirler.map(setirCavabi),
    tedarukculer,
    hadiseler: hadiseler.map(hadiseCavabi),
    maliyye: maliyye
      ? { hal: maliyye.status, mebleg: reqem(maliyye.amount), muracietId: maliyye.credit_application_id ?? null }
      : null,
  };
}

/** Bir sifariş — sahiblik WHERE-dədir (IDOR qapalıdır) */
async function sifarisOxu(istifadeciId, sifarisId) {
  const [setir] = await sorgu("SELECT * FROM marketplace_orders WHERE id=$1 AND istifadeci_id=$2", [
    sifarisId,
    istifadeciId,
  ]);
  if (!setir) return null;
  const setirler = await sorgu("SELECT * FROM marketplace_order_items WHERE order_id=$1 ORDER BY id", [setir.id]);
  const hadiseler = await sorgu(
    `SELECT event_type, from_status, to_status, actor, created_at
     FROM marketplace_order_events WHERE order_id=$1 ORDER BY created_at, id`,
    [setir.id],
  );
  const [maliyye] = await sorgu(
    "SELECT status, amount, credit_application_id FROM marketplace_financing_requests WHERE order_id=$1",
    [setir.id],
  );
  return sifarisCavabi(setir, setirler, hadiseler, maliyye ?? null);
}

/** İstifadəçinin sifarişləri (ən yeni əvvəldə) — sətirlərlə, hadisəsiz */
async function sifarisleriOxu(istifadeciId) {
  const sifarisler = await sorgu(
    `SELECT * FROM marketplace_orders WHERE istifadeci_id=$1
     ORDER BY created_at DESC, id DESC LIMIT 50`,
    [istifadeciId],
  );
  if (!sifarisler.length) return [];
  // Alt-sorğu ilə: massiv parametri yox, sürücüdən asılı olmayan forma
  const setirler = await sorgu(
    `SELECT * FROM marketplace_order_items
     WHERE order_id IN (SELECT id FROM marketplace_orders WHERE istifadeci_id=$1
                        ORDER BY created_at DESC, id DESC LIMIT 50)
     ORDER BY id`,
    [istifadeciId],
  );
  const maliyyeler = await sorgu(
    `SELECT order_id, status, amount, credit_application_id FROM marketplace_financing_requests
     WHERE istifadeci_id=$1`,
    [istifadeciId],
  );
  return sifarisler.map((s) =>
    sifarisCavabi(
      s,
      setirler.filter((x) => x.order_id === s.id),
      [],
      maliyyeler.find((m) => m.order_id === s.id) ?? null,
    ),
  );
}

/**
 * MALİYYƏLƏŞDİRMƏ UYĞUNLUĞU — OXU-YALNIZ.
 *
 * Mövcud anderraytinq (lib/kredit.js → anderraytinq) EYNİ girişlərlə
 * işlədilir: serverdəki sahə, serverdəki peyk snapshot-u, biçinə qalan ay.
 * Amma heç nə YAZILMIR — nə müraciət, nə qərar, nə təklif. Nəticə "ilkin
 * yoxlama"dır: yekun qərar fermer LoanSheet-dən müraciət göndərəndə
 * api/kredit.js-də verilir. Kredit mühərriki burada təkrarlanmır — çağırılır.
 *
 * Maliyyələşdirilən məbləğ YALNIZ uyğun sətirlərin cəmidir (səbətdəki
 * qalan məhsullar çatdırılmada ödənilir) — bunu UI açıq göstərir.
 */
async function maliyyeYoxla(istifadeciId, hesab, indi) {
  const mebleg = Math.round(hesab.maliyyeMeblegi);
  const esas = { mebleg, minKredit: KREDIT_SERTLERI.minKredit, illikFaiz: KREDIT_SERTLERI.illikFaiz };
  if (mebleg <= 0) return { hal: "uygunMehsulYoxdur", ...esas };

  const [sahe] = await sorgu("SELECT id, hektar, bitki FROM saheler WHERE istifadeci_id=$1", [istifadeciId]);
  if (!sahe) return { hal: "saheYoxdur", ...esas };
  if (!sahe.bitki) return { hal: "bitkiYoxdur", ...esas };

  const [aktiv] = await sorgu("SELECT id FROM loans WHERE istifadeci_id=$1 AND status='active' LIMIT 1", [
    istifadeciId,
  ]);
  if (aktiv) return { hal: "aktivKredit", ...esas };

  const [aciq] = await sorgu(
    "SELECT id FROM credit_applications WHERE istifadeci_id=$1 AND status = ANY($2) LIMIT 1",
    [istifadeciId, ACIQ_HALLAR],
  );
  if (aciq) return { hal: "aciqMuraciet", ...esas, muracietId: aciq.id };

  const muddetAy = muddetTeyin(sahe.bitki, indi);
  const giris = murecietGirisi({ mebleg, muddetAy });
  if (!giris.ok) return { hal: giris.sebeb === "meblegAzdir" ? "meblegAzdir" : "meblegYanlis", ...esas };

  const [snapshot] = await sorgu(
    "SELECT mezmun FROM peyk_snapshotlar WHERE sahe_id=$1 AND nov='tarixce'",
    [sahe.id],
  );
  const movsumler = Array.isArray(snapshot?.mezmun?.movsumler) ? snapshot.mezmun.movsumler : [];

  const netice = anderraytinq({
    mebleg: giris.mebleg,
    muddetAy,
    sahe: { hektar: sahe.hektar, bitki: sahe.bitki },
    movsumler,
    indi,
  });
  const cavab = {
    ...esas,
    mebleg: giris.mebleg,
    muddetAy,
    bitki: sahe.bitki,
    sebebler: netice.sebebler,
    versiya: netice.versiya,
    tesdiq: netice.mebleg,
    ilkAyFaiz: ayliqFaiz(netice.mebleg, KREDIT_SERTLERI.illikFaiz),
  };
  if (netice.qerar !== "approved") return { hal: "uygunDeyil", ...cavab, tesdiq: 0, ilkAyFaiz: 0 };
  if (netice.mebleg < giris.mebleg) return { hal: "qismen", ...cavab };
  return { hal: "uygun", ...cavab };
}

function sxemCavabi(res, error) {
  console.error(
    JSON.stringify({
      hadise: "bazarSxemYoxdur",
      baza: baglantiKimliyi(),
      sebeb: error?.message,
      hell: "npm run db:migrate — həmin bazanın bağlantı sətri ilə",
    }),
  );
  return res.status(503).json({ error: "sxemYoxdur" });
}

export default async function handler(req, res) {
  // ── Səbət hesabı: saf, yazmır, sessiya istəmir — 501 qapısından ƏVVƏL ──
  // Qonaq da yekunları serverdən görür; bağlayıcı rəqəm yenə sifariş
  // anında hesablanır (aşağıda), bu yalnız ekranın təsdiqidir.
  if (req.method === "POST" && req.body?.emel === "sebet-hesabla") {
    const yoxlama = setirleriYoxla(req.body?.setirler);
    if (!yoxlama.ok) return res.status(400).json({ error: yoxlama.sebeb, kod: yoxlama.kod ?? null });
    const rayonKod = typeof req.body?.rayonKod === "string" ? req.body.rayonKod.slice(0, 40) : null;
    return res.status(200).json({ hesab: sebetiHesabla(yoxlama.setirler, { rayonKod }), numune: NUMUNE });
  }

  if (!dbQurulub() || !hesabQurulub()) {
    return res.status(501).json({ error: "Bazar sifariş sistemi hələ qurulmayıb." });
  }

  let istifadeci;
  try {
    istifadeci = await sessiyaOxu(cookieToken(req));
  } catch (error) {
    if (sxemYoxdurXetasi(error)) return sxemCavabi(res, error);
    console.error("bazar sessiya:", error?.message);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
  if (!istifadeci) return res.status(401).json({ error: "girisLazim" });

  const indi = new Date();

  try {
    if (req.method === "GET") {
      if (req.query?.sifaris) {
        const id = Number(req.query.sifaris);
        if (!Number.isInteger(id)) return res.status(400).json({ error: "yanlis" });
        const sifaris = await sifarisOxu(istifadeci.id, id);
        if (!sifaris) return res.status(404).json({ error: "sifarisYoxdur" });
        return res.status(200).json({ sifaris });
      }
      return res.status(200).json({ sifarisler: await sifarisleriOxu(istifadeci.id), numune: NUMUNE });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Yalnız GET/POST" });

    const { emel } = req.body || {};

    // ── Maliyyələşdirmə yoxlaması: oxu-yalnız ─────────────────────────
    if (emel === "maliyye-yoxla") {
      const yoxlama = setirleriYoxla(req.body?.setirler);
      if (!yoxlama.ok) return res.status(400).json({ error: yoxlama.sebeb, kod: yoxlama.kod ?? null });
      const hesab = sebetiHesabla(yoxlama.setirler);
      const maliyye = await maliyyeYoxla(istifadeci.id, hesab, indi);
      jurnal("financing_precheck", { istifadeci_id: istifadeci.id, hal: maliyye.hal, mebleg: maliyye.mebleg });
      return res.status(200).json({ maliyye, hesab });
    }

    // ── Sifariş: ATOMİK yazı ───────────────────────────────────────────
    if (emel === "sifaris-yarat") {
      const yoxlama = setirleriYoxla(req.body?.setirler);
      if (!yoxlama.ok) return res.status(400).json({ error: yoxlama.sebeb, kod: yoxlama.kod ?? null });

      const unvan = catdirilmaYoxla(req.body?.catdirilma);
      if (!unvan.ok) return res.status(400).json({ error: unvan.sebeb });

      const odenisUsulu = req.body?.odenisUsulu;
      if (!ODENIS_USULLARI.includes(odenisUsulu)) return res.status(400).json({ error: "odenisUsuluYanlis" });

      const acar = typeof req.body?.acar === "string" ? req.body.acar.slice(0, 64) : null;

      // İdempotent təkrar: eyni açarla ikinci sorğu uğurdur, əməl deyil
      if (acar) {
        const [movcud] = await sorgu(
          "SELECT id FROM marketplace_orders WHERE istifadeci_id=$1 AND idempotency_key=$2",
          [istifadeci.id, acar],
        );
        if (movcud) return res.status(200).json({ sifaris: await sifarisOxu(istifadeci.id, movcud.id), tekrar: true });
      }

      // Yekunlar YALNIZ kataloqdan; çatdırılma rayonuna görə
      const hesab = sebetiHesabla(yoxlama.setirler, { rayonKod: unvan.catdirilma.rayonKod });
      if (hesab.catdirilmayanlar.length) {
        return res.status(409).json({ error: "catdirilmaYoxdur", kodlar: hesab.catdirilmayanlar });
      }

      // Sürət həddi bazadadır — serverless instanslar arası paylaşılır
      const [hedd] = await sorgu(
        `SELECT count(*)::int AS say FROM marketplace_orders
         WHERE istifadeci_id=$1 AND created_at > now() - interval '${SIFARIS_HEDDI.pencereDeq} minutes'`,
        [istifadeci.id],
      );
      if (hedd.say >= SIFARIS_HEDDI.maxSay) return res.status(429).json({ error: "hedd" });

      // Sahə konteksti — anderraytinq üçün snapshot (sahə yoxdursa null)
      const [sahe] = await sorgu("SELECT id, hektar, bitki FROM saheler WHERE istifadeci_id=$1", [istifadeci.id]);

      // Maliyyələşdirmə: uyğunluq sifarişdən ƏVVƏL yoxlanılır ki, "sonra
      // baxarıq" ilə fermer boş yerə gözləməsin. Yekun qərar yenə müraciətdədir.
      let maliyye = null;
      if (odenisUsulu === "agrofin_financing") {
        maliyye = await maliyyeYoxla(istifadeci.id, hesab, indi);
        if (maliyye.hal !== "uygun" && maliyye.hal !== "qismen") {
          return res.status(409).json({ error: "maliyyeUygunDeyil", maliyye });
        }
      }

      const gozlenilen = gozlenilenCatdirilma(hesab.tedarukculer, indi);
      const setirlerJson = JSON.stringify(
        hesab.setirler.map((s) => ({
          product_code: s.kod,
          product_name: s.ad,
          category_code: s.kateqoriya,
          supplier_code: s.tedarukcu,
          supplier_name: s.tedarukcuAd,
          unit: s.vahidKey,
          quantity: s.say,
          unit_price: s.vahidQiymet,
          line_total: s.cemi,
          financing_eligible: s.maliyye,
        })),
      );

      // ═══ HƏR ŞEY BİR İFADƏDƏ ═══════════════════════════════════════
      // Sifariş + sətirlər + hadisə + (varsa) maliyyələşdirmə sorğusu bir
      // data-dəyişən CTE ifadəsində gedir: ya hamısı, ya heç nə. Aralarda
      // qırılma "sətirsiz sifariş" qoya bilməz.
      let setir;
      try {
        [setir] = await sorgu(
          `WITH sifaris AS (
             INSERT INTO marketplace_orders
               (istifadeci_id, sahe_id, crop, hectares, payment_method, financing_requested,
                delivery_district, delivery_address, contact_name, contact_phone, note,
                subtotal, delivery_fee, total, catalog_version, expected_delivery_on, idempotency_key)
             VALUES ($1,$2,$3,$4,$5,$6::boolean,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::date,$17)
             RETURNING id
           ), setirler AS (
             INSERT INTO marketplace_order_items
               (order_id, product_code, product_name, category_code, supplier_code, supplier_name,
                unit, quantity, unit_price, line_total, financing_eligible)
             SELECT s.id, x.product_code, x.product_name, x.category_code, x.supplier_code,
                    x.supplier_name, x.unit, x.quantity, x.unit_price, x.line_total, x.financing_eligible
             FROM sifaris s
             CROSS JOIN jsonb_to_recordset($18::jsonb) AS x(
               product_code text, product_name text, category_code text, supplier_code text,
               supplier_name text, unit text, quantity int, unit_price numeric, line_total numeric,
               financing_eligible boolean)
             RETURNING id
           ), hadise AS (
             INSERT INTO marketplace_order_events (order_id, event_type, from_status, to_status, actor, detay)
             SELECT s.id, 'order_created', NULL, 'new', 'farmer', $19::jsonb FROM sifaris s
             RETURNING id
           ), maliyye AS (
             INSERT INTO marketplace_financing_requests
               (order_id, istifadeci_id, amount, status, eligibility_snapshot)
             SELECT s.id, $1, $20::numeric, 'requested', $21::jsonb FROM sifaris s WHERE $6::boolean
             RETURNING id
           )
           SELECT s.id FROM sifaris s`,
          [
            istifadeci.id,
            sahe?.id ?? null,
            sahe?.bitki ?? null,
            sahe?.hektar ?? null,
            odenisUsulu,
            Boolean(maliyye),
            unvan.catdirilma.rayonKod,
            unvan.catdirilma.unvan,
            unvan.catdirilma.ad,
            unvan.catdirilma.telefon,
            unvan.catdirilma.qeyd,
            hesab.araCem,
            hesab.catdirilma,
            hesab.cemi,
            KATALOQ_VERSIYA,
            gun(gozlenilen),
            acar,
            setirlerJson,
            JSON.stringify({ setirSayi: hesab.setirler.length, cemi: hesab.cemi }),
            maliyye ? maliyye.mebleg : 0,
            maliyye
              ? JSON.stringify({
                  hal: maliyye.hal,
                  mebleg: maliyye.mebleg,
                  tesdiq: maliyye.tesdiq,
                  muddetAy: maliyye.muddetAy,
                  versiya: maliyye.versiya,
                  sebebler: maliyye.sebebler,
                  zaman: indi.toISOString(),
                })
              : null,
          ],
        );
      } catch (xeta) {
        // Yarış şəraitində eyni açarla iki sorğu: unikal indeks ikincini
        // dayandırır, bütöv ifadə geri sarınır — birincinin nəticəsi qaytarılır
        if (acar && String(xeta?.message ?? "").includes("marketplace_order_idempotent")) {
          const [movcud] = await sorgu(
            "SELECT id FROM marketplace_orders WHERE istifadeci_id=$1 AND idempotency_key=$2",
            [istifadeci.id, acar],
          );
          if (movcud) return res.status(200).json({ sifaris: await sifarisOxu(istifadeci.id, movcud.id), tekrar: true });
        }
        throw xeta;
      }

      jurnal("order_created", {
        istifadeci_id: istifadeci.id,
        order_id: setir.id,
        setir_sayi: hesab.setirler.length,
        cemi: hesab.cemi,
        odenis: odenisUsulu,
        maliyye: maliyye?.hal ?? null,
      });
      return res.status(200).json({ sifaris: await sifarisOxu(istifadeci.id, setir.id) });
    }

    // ── Ləğv: yalnız erkən hallarda, yalnız öz sifarişi ────────────────
    if (emel === "sifaris-legv") {
      const sifarisId = Number(req.body?.sifarisId);
      if (!Number.isInteger(sifarisId)) return res.status(400).json({ error: "yanlis" });

      const [netice] = await sorgu(
        `WITH evvel AS (
           SELECT id, status FROM marketplace_orders
           WHERE id=$1 AND istifadeci_id=$2 AND status = ANY($3)
           FOR UPDATE
         ), s AS (
           UPDATE marketplace_orders o SET status='cancelled', updated_at=now()
           FROM evvel e WHERE o.id = e.id
           RETURNING o.id, e.status AS evvelki
         ), h AS (
           INSERT INTO marketplace_order_events (order_id, event_type, from_status, to_status, actor)
           SELECT s.id, 'cancelled_by_farmer', s.evvelki, 'cancelled', 'farmer' FROM s
           RETURNING id
         ), m AS (
           UPDATE marketplace_financing_requests f SET status='withdrawn', updated_at=now()
           FROM s WHERE f.order_id = s.id AND f.status IN ('requested','linked')
           RETURNING f.id
         )
         SELECT s.id FROM s`,
        [sifarisId, istifadeci.id, FERMER_LEGV_OLAR],
      );

      if (!netice) {
        const [movcud] = await sorgu("SELECT status FROM marketplace_orders WHERE id=$1 AND istifadeci_id=$2", [
          sifarisId,
          istifadeci.id,
        ]);
        if (!movcud) return res.status(404).json({ error: "sifarisYoxdur" });
        return res.status(409).json({ error: "legvOlmur", hal: movcud.status });
      }

      jurnal("order_cancelled", { istifadeci_id: istifadeci.id, order_id: sifarisId });
      return res.status(200).json({ sifaris: await sifarisOxu(istifadeci.id, sifarisId) });
    }

    // ── Sifarişi kredit müraciətinə bağla ──────────────────────────────
    if (emel === "maliyye-bagla") {
      const sifarisId = Number(req.body?.sifarisId);
      const muracietId = Number(req.body?.muracietId);
      if (!Number.isInteger(sifarisId) || !Number.isInteger(muracietId)) {
        return res.status(400).json({ error: "yanlis" });
      }
      // SAHİBLİK İKİ TƏRƏFDƏ: həm sorğu, həm müraciət bu istifadəçinin
      // olmalıdır — başqasının müraciət id-si ilə bağlamaq mümkün deyil
      const [netice] = await sorgu(
        `WITH f AS (
           UPDATE marketplace_financing_requests f
              SET credit_application_id=$3, status='linked', updated_at=now()
             FROM credit_applications a
            WHERE f.order_id=$1 AND f.istifadeci_id=$2 AND f.status='requested'
              AND a.id=$3 AND a.istifadeci_id=$2
           RETURNING f.order_id
         ), h AS (
           INSERT INTO marketplace_order_events (order_id, event_type, actor, detay)
           SELECT f.order_id, 'financing_linked', 'farmer', $4::jsonb FROM f
           RETURNING id
         )
         SELECT f.order_id FROM f`,
        [sifarisId, istifadeci.id, muracietId, JSON.stringify({ muracietId })],
      );
      if (!netice) return res.status(404).json({ error: "baglanmadi" });

      jurnal("financing_linked", { istifadeci_id: istifadeci.id, order_id: sifarisId, application_id: muracietId });
      return res.status(200).json({ sifaris: await sifarisOxu(istifadeci.id, sifarisId) });
    }

    return res.status(400).json({ error: "Naməlum əməl" });
  } catch (error) {
    if (sxemYoxdurXetasi(error)) return sxemCavabi(res, error);
    console.error("bazar error:", error?.message);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
