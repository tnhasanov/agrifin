// api/kredit.js — kredit sistemi: müraciət, qərar, təklif, kredit, ödəniş.
//
// NİYƏ BİR FUNKSİYA: Vercel Hobby planında api/ faylı = funksiya, limit 12.
// Hazırda 10-u doludur (bax: api/). Kredit axını ayrı-ayrı fayllara bölünsəydi
// limit dolardı. Əməl POST gövdəsindəki `emel` sahəsindən seçilir — api/hesab.js
// ilə eyni üslub.
//
//   GET                    → {muraciet, qerar, teklif, kredit, hadiseler}
//   GET ?tarixce=1         → bütün müraciətlərin qısa tarixçəsi
//   POST muraciet          → {mebleg, acar?} — SERVER anderraytinq edir və
//                          nəticənin tamamını (müraciət + hadisə izi + qərar
//                          + təklif + son status) BİR ifadədə yazır
//   POST teklif-qebul      → {teklifId} — ATOMİK: təklif qəbul + kredit yaranır
//   POST teklif-imtina     → {teklifId} — təklifdən imtina, müraciət bağlanır
//   POST legv              → açıq müraciəti geri götürür
//   POST odenis            → {mebleg, acar?} — ödəniş: ƏVVƏL faiz borcu,
//                          sonra əsas borc (hər ikisi ayrı hadisə kimi)
//
// Faiz gündəlik yığılır və aylıq dövrün sonunda jurnala yazılır — hesablama
// oxunuş anında, idempotent şəkildə aparılır (bax: faizleriIsle və
// lib/kreditMuhasibat.js).
//
// ═══ TƏHLÜKƏSİZLİK QAYDALARI ══════════════════════════════════════════
//   • Kimlik YALNIZ sessiyadan çıxır. Gövdədəki hər hansı user_id/istifadeci_id
//     BAXILMIR — sahiblik sorğunun WHERE şərtindədir, klientin sözündə yox.
//   • Klientdən yalnız MƏBLƏĞ və (istəyə görə) müddət alınır. Bal, gəlir,
//     qabiliyyət, tavan, qərar — hamısı serverdə hesablanır (lib/kredit.js).
//   • `status` klientdən qəbul edilmir; keçidlər vəziyyət maşınındadır.
//   • Vaxt damğaları serverdədir (now()) — klient tarixi yazmır.
//   • Xəta mətnləri daxili detal sızdırmır; stack yalnız server logundadır.
import { sorgu, dbQurulub } from "../lib/db.js";
import { cookieToken, hesabQurulub, sessiyaOxu } from "../lib/hesab.js";
import {
  ACIQ_HALLAR,
  anderraytinq,
  kecidMumkun,
  MURACIET_KECIDLERI,
  murecietGirisi,
  muddetTeyin,
  TEKLIF_KECIDLERI,
} from "../lib/kredit.js";
import { KREDIT_SERTLERI } from "../lib/kreditSertler.js";
import {
  araliqFaizi,
  dovrSonu,
  esasXetti,
  gecikme,
  hesablanacaqDovrler,
  novbetiOdenis,
  odenisTarixcesi,
  qepik,
} from "../lib/kreditMuhasibat.js";
import { bicinTarixi } from "../lib/movsum.js";

/**
 * Ölçülü hadisə jurnalı. Şəxsi məlumat, token, OTP və bağlantı sətri
 * YAZILMIR — yalnız kim (id), nə (hadisə) və hansı sətir.
 */
function jurnal(hadise, melumat) {
  console.log(JSON.stringify({ hadise, ...melumat }));
}

const reqem = (deyer) => (deyer == null ? null : Number(deyer));
/** Tarix → 'YYYY-MM-DD' (baza DATE sütunu və klient üçün eyni forma) */
const gun = (tarix) => (tarix ? new Date(tarix).toISOString().slice(0, 10) : null);

/** Cavabda gedən müraciət forması — daxili sahələr açılmır */
function muracietCavabi(setir) {
  if (!setir) return null;
  return {
    id: setir.id,
    hal: setir.status,
    mebleg: reqem(setir.requested_amount),
    muddetAy: setir.requested_term_months,
    bitki: setir.crop,
    hektar: reqem(setir.hectares),
    tarix: setir.created_at,
  };
}

function teklifCavabi(setir) {
  if (!setir) return null;
  return {
    id: setir.id,
    hal: setir.status,
    mebleg: reqem(setir.amount),
    illikFaiz: reqem(setir.annual_rate),
    muddetAy: setir.term_months,
    qurulus: setir.repayment_structure,
    sonTarix: setir.matures_on,
    tarix: setir.issued_at,
  };
}

/**
 * Kredit + mühasibat: qalıq, faiz borcu, növbəti ödəniş, gecikmə.
 * Növbəti ödəniş PROQNOZDUR (fermer əsas borcu azaldarsa faiz də azalır) —
 * hesablama saf funksiyalardadır (bax: lib/kreditMuhasibat.js).
 */
function kreditCavabi(setir, hadiseler = [], indi = new Date()) {
  if (!setir) return null;
  const esasBorc = reqem(setir.principal_outstanding) ?? 0;
  const faizBorc = reqem(setir.interest_outstanding) ?? 0;
  const novbeti =
    setir.status === "active"
      ? novbetiOdenis({
          verilme: setir.disbursed_at ?? setir.created_at,
          hesablanmisDovr: setir.accrued_periods ?? 0,
          faizBorc,
          esasBorc,
          illikFaiz: reqem(setir.annual_rate),
          sonTarix: setir.matures_on,
          xett: esasXetti(hadiseler),
        })
      : null;
  const gecikmeHali = gecikme({ hadiseler, indi });
  // Son tarix keçibsə əsas borc da ödənilməli və gecikmiş sayılır
  const yetkinlikKecib = Boolean(setir.matures_on && new Date(setir.matures_on) <= indi);

  return {
    id: setir.id,
    hal: setir.status,
    // Servis vəziyyəti HESABLANIR, saxlanılmır: "overdue" vaxtdan asılıdır və
    // saxlanılan sahə cron olmadan səssizcə köhnələrdi (bax: faizleriIsle)
    veziyyet: setir.status === "active" ? (gecikmeHali.gunler > 0 ? "overdue" : "active") : "closed",
    esasBorc: reqem(setir.principal_original),
    qaliqBorc: esasBorc,
    faizBorc,
    faizCemi: reqem(setir.interest_accrued_total) ?? 0,
    faizOdenilen: reqem(setir.interest_paid_total) ?? 0,
    illikFaiz: reqem(setir.annual_rate),
    muddetAy: setir.term_months,
    sonTarix: setir.matures_on,
    verilme: setir.disbursed_at,
    hesablanmisDovr: setir.accrued_periods ?? 0,
    novbetiTarix: novbeti ? gun(novbeti.tarix) : null,
    novbetiMebleg: novbeti ? novbeti.mebleg : null,
    novbetiEsasDaxil: novbeti ? novbeti.esasDaxil : false,
    // İndi ödənilməli olan: yığılmış faiz + (son tarix keçibsə) əsas borc
    odenilecekIndi: qepik(faizBorc + (yetkinlikKecib ? esasBorc : 0)),
    gecikmeGun: gecikmeHali.gunler,
    gecikmisMebleg: qepik(gecikmeHali.mebleg + (yetkinlikKecib ? esasBorc : 0)),
    tarix: setir.created_at,
  };
}

/** Ödəniş tarixçəsi üçün hadisə forması — daxili sütunlar açılmır */
function hadiseCavabi(setir) {
  return {
    id: setir.id,
    nov: setir.event_type,
    mebleg: reqem(setir.amount),
    esasSonra: reqem(setir.principal_after),
    faizSonra: reqem(setir.interest_after),
    sonTarix: setir.due_on,
    tarix: setir.created_at,
  };
}

/**
 * BİTMİŞ DÖVRLƏRİN FAİZİNİ JURNALA YAZIR — lazy, idempotent.
 *
 * ═══ NİYƏ CRON DEYİL ══════════════════════════════════════════════════
 * Vercel Hobby-də planlaşdırıcı yoxdur, üstəlik faizi "işə salınmış cron"
 * qeyd edərsə, cron bir gün işləməyəndə jurnal susqun şəkildə səhv olur.
 * Burada faiz hər oxunuşda tələb olunduğu qədər yazılır:
 *   • hansı dövrün bitdiyini VAXT müəyyən edir, sorğu sayı yox;
 *   • hər dövr üçün açar 'faiz-<dövr>' — unikal indeks ikinci yazını
 *     qadağan edir (002-dəki loan_event_idempotent_idx);
 *   • UPDATE-in şərti `accrued_periods = <dövr> - 1` — dövrlər yalnız
 *     ardıcıl yazılır, paralel iki sorğudan biri heç nə etmir.
 * Yəni nə itən, nə təkrarlanan faiz var; nəticə vaxtdan asılıdır, sorğu
 * tarixçəsindən yox — hesablama təkrarlana bilir.
 */
async function faizleriIsle(kredit, indi) {
  if (!kredit || kredit.status !== "active") return kredit;
  const verilme = kredit.disbursed_at ?? kredit.created_at;
  const dovrler = hesablanacaqDovrler({
    verilme,
    indi,
    hesablanmisDovr: kredit.accrued_periods ?? 0,
  });
  if (!dovrler.length) return kredit;

  const hadiseler = await sorgu(
    `SELECT event_type, amount, principal_after, created_at FROM loan_events
     WHERE loan_id=$1 ORDER BY created_at, id`,
    [kredit.id],
  );
  const xett = esasXetti(hadiseler);
  const illikFaiz = reqem(kredit.annual_rate);

  let cari = kredit;
  for (const dovr of dovrler) {
    const faiz = araliqFaizi({ xett, baslangic: dovr.baslangic, son: dovr.son, illikFaiz });
    let yeni;
    try {
      [yeni] = await sorgu(
        `WITH hadise AS (
           INSERT INTO loan_events
             (loan_id, event_type, amount, principal_after, interest_after, due_on, idempotency_key, detay)
           SELECT l.id, 'interest_charge', $2::numeric, l.principal_outstanding,
                  l.interest_outstanding + $2::numeric, $3::date, $4::text,
                  jsonb_build_object('dovr', $5::int)
           FROM loans l
           WHERE l.id=$1 AND l.status='active' AND l.accrued_periods = $5::int - 1
           RETURNING loan_id
         ), yenilenen AS (
           UPDATE loans l
              SET interest_outstanding = l.interest_outstanding + $2::numeric,
                  interest_accrued_total = l.interest_accrued_total + $2::numeric,
                  accrued_periods = $5::int,
                  next_due_on = $6::date,
                  updated_at = now()
           FROM hadise h WHERE l.id = h.loan_id
           RETURNING l.*
         )
         SELECT * FROM yenilenen`,
        [kredit.id, faiz, gun(dovr.son), `faiz-${dovr.no}`, dovr.no, gun(dovrSonu(verilme, dovr.no + 1))],
      );
    } catch (xeta) {
      // Paralel sorğu eyni dövrü yazıbsa unikal indeks dayandırır — bu, xəta
      // deyil: faiz onsuz da bir dəfə yazılıb, növbəti oxu onu görəcək
      if (!String(xeta?.message ?? "").includes("loan_event_idempotent")) throw xeta;
      break;
    }
    if (!yeni) break;
    cari = yeni;
    jurnal("interest_accrued", {
      loan_id: kredit.id,
      dovr: dovr.no,
      faiz,
      faiz_borcu: reqem(yeni.interest_outstanding),
    });
  }
  return cari;
}

/** İstifadəçinin ən son müraciəti + ona bağlı qərar/təklif/kredit */
async function veziyyetOxu(istifadeciId, indi = new Date()) {
  const [muraciet] = await sorgu(
    `SELECT * FROM credit_applications WHERE istifadeci_id=$1
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [istifadeciId],
  );
  if (!muraciet) {
    return {
      muraciet: null,
      qerar: null,
      teklif: null,
      kredit: null,
      hadiseler: [],
      odenisler: [],
    };
  }

  const [qerar] = await sorgu(
    `SELECT decision, approved_amount, reasons, model_version, created_at
     FROM credit_decisions WHERE application_id=$1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [muraciet.id],
  );
  const [teklif] = await sorgu(
    `SELECT * FROM credit_offers WHERE application_id=$1
     ORDER BY issued_at DESC, id DESC LIMIT 1`,
    [muraciet.id],
  );
  let [kredit] = await sorgu(
    `SELECT * FROM loans WHERE application_id=$1 LIMIT 1`,
    [muraciet.id],
  );

  // Faiz oxunuşdan ƏVVƏL yazılır: fermer ekranı açanda balans həmişə
  // bugünkü həqiqətdir, "gecikmiş hesablama" kimi bir vəziyyət yoxdur
  if (kredit) kredit = await faizleriIsle(kredit, indi);

  const hadiseler = kredit
    ? await sorgu(
        `SELECT id, event_type, amount, principal_after, interest_after, due_on, created_at
         FROM loan_events WHERE loan_id=$1 ORDER BY created_at DESC, id DESC LIMIT 50`,
        [kredit.id],
      )
    : [];

  return {
    muraciet: muracietCavabi(muraciet),
    qerar: qerar
      ? {
          qerar: qerar.decision,
          mebleg: reqem(qerar.approved_amount),
          // Səbəblər AÇARDIR, mətn deyil: UI onları öz dilində göstərir
          sebebler: qerar.reasons?.sebebler ?? [],
          versiya: qerar.model_version,
          tarix: qerar.created_at,
        }
      : null,
    teklif: teklifCavabi(teklif),
    kredit: kreditCavabi(kredit, hadiseler, indi),
    // Hadisə jurnalı: fermer öz jurnalını görməlidir — hansı gün nə
    // yığıldı, nə ödənildi. Balans sətri "haradan gəldi?" sualsız qalmır.
    hadiseler: hadiseler.map(hadiseCavabi),
    // Ödəniş tarixçəsi: hər ödəniş BİR sətir — məbləğ, faiz payı, əsas payı,
    // ödənişdən sonrakı qalıq (jurnaldakı iki hadisə burada birləşir)
    odenisler: odenisTarixcesi(hadiseler),
  };
}

/** Müraciət vəziyyətini keçid qaydası ilə dəyişir + tarixçəyə yazır */
async function halDeyis(muracietId, haradan, haraya, hadise, detay = null) {
  if (!kecidMumkun(MURACIET_KECIDLERI, haradan, haraya)) {
    const xeta = new Error(`Keçid mümkün deyil: ${haradan} → ${haraya}`);
    xeta.kod = "kecidYanlis";
    throw xeta;
  }
  // WHERE status=$3 — yarış şəraitində ikinci yazıcı heç nə dəyişmir
  const setirler = await sorgu(
    `UPDATE credit_applications SET status=$2, updated_at=now()
     WHERE id=$1 AND status=$3 RETURNING id`,
    [muracietId, haraya, haradan],
  );
  if (!setirler.length) {
    const xeta = new Error("Vəziyyət artıq dəyişib");
    xeta.kod = "kecidYanlis";
    throw xeta;
  }
  await sorgu(
    `INSERT INTO credit_application_events (application_id, event_type, from_status, to_status, detay)
     VALUES ($1, $2, $3, $4, $5)`,
    [muracietId, hadise, haradan, haraya, detay ? JSON.stringify(detay) : null],
  );
}

/**
 * SXEM YOXDUR — baza var, cədvəl yoxdur (Postgres 42P01 "undefined_table").
 *
 * Bu, "gözlənilməz xəta" DEYİL, quraşdırma vəziyyətidir: miqrasiyalar həmin
 * bazada işlədilməyib. Vercel preview deployment-lərində Neon hər branch üçün
 * AYRI baza yaradır — kredit cədvəlləri gələnə qədər açılmış branch-ın
 * bazasında `credit_applications` yoxdur, halbuki kod onu gözləyir.
 * 500 qaytarsaq ekran "server sındı" deyir və axtarış səhv yerdə başlayır;
 * ayrıca kod isə cavabın özündə "npm run db:migrate işlədilməyib" deməkdir.
 */
function sxemYoxdur(error) {
  return (
    error?.code === "42P01" ||
    /relation ".*" does not exist/i.test(String(error?.message ?? ""))
  );
}

function sxemCavabi(res, error) {
  console.error("kredit sxem yoxdur (miqrasiya işlədilməyib):", error?.message);
  return res.status(503).json({ error: "sxemYoxdur" });
}

export default async function handler(req, res) {
  if (!dbQurulub() || !hesabQurulub()) {
    return res.status(501).json({ error: "Kredit sistemi hələ qurulmayıb." });
  }

  let istifadeci;
  try {
    istifadeci = await sessiyaOxu(cookieToken(req));
  } catch (error) {
    // Sessiya cədvəli də sxemin bir hissəsidir — miqrasiya işlədilməyibsə
    // səbəb eynidir, cavab da eyni olmalıdır
    if (sxemYoxdur(error)) return sxemCavabi(res, error);
    console.error("kredit sessiya:", error?.message);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
  if (!istifadeci) return res.status(401).json({ error: "girisLazim" });

  // Sorğunun BİR "indi"-si var: faizin hesablanması, gecikmə və növbəti
  // ödəniş eyni ana baxır — cavabın daxilində vaxt sürüşməsi olmur
  const indi = new Date();

  try {
    if (req.method === "GET") {
      if (req.query?.tarixce) {
        const setirler = await sorgu(
          `SELECT id, status, requested_amount, requested_term_months, crop, created_at
           FROM credit_applications WHERE istifadeci_id=$1
           ORDER BY created_at DESC, id DESC LIMIT 20`,
          [istifadeci.id],
        );
        return res.status(200).json({ tarixce: setirler.map(muracietCavabi) });
      }
      return res.status(200).json(await veziyyetOxu(istifadeci.id, indi));
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Yalnız GET/POST" });
    }

    const { emel } = req.body || {};

    // ── Yeni müraciət: SERVER anderraytinq edir ────────────────────────
    if (emel === "muraciet") {
      const [sahe] = await sorgu(
        "SELECT id, hektar, bitki FROM saheler WHERE istifadeci_id=$1",
        [istifadeci.id],
      );
      if (!sahe) return res.status(409).json({ error: "saheYoxdur" });

      // Müddət SERVERDƏ təyin olunur: klient onu şişirdib limiti böyüdə bilməsin
      const muddetAy = muddetTeyin(sahe.bitki);
      const giris = murecietGirisi({ mebleg: req.body?.mebleg, muddetAy });
      if (!giris.ok) return res.status(400).json({ error: giris.sebeb });

      // Açıq müraciət varsa ikincisi açılmır (bazada da unikal indeks var)
      const [acıq] = await sorgu(
        `SELECT id FROM credit_applications
         WHERE istifadeci_id=$1 AND status = ANY($2) LIMIT 1`,
        [istifadeci.id, ACIQ_HALLAR],
      );
      if (acıq) return res.status(409).json({ error: "artiqMuracietVar" });

      // Peyk tarixçəsi SERVERDƏKİ snapshot-dan — klientin göndərdiyindən yox
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
      });

      const acar = typeof req.body?.acar === "string" ? req.body.acar.slice(0, 64) : null;

      // ═══ NƏTİCƏNİN TAMAMI BİR İFADƏDƏ YAZILIR ═══════════════════════
      // Əvvəl müraciət, hadisələr, qərar və təklif 8 ayrı sorğu idi —
      // aralarda qırılma "reviewing/approved-də qalmış, qərarı yarımçıq
      // müraciət" qoyurdu və açıq-müraciət indeksi fermeri kilidləyirdi.
      // İndi anderraytinq nəticəsi JS-də hazırdır, sonra HƏR ŞEY bir
      // data-dəyişən CTE ifadəsində gedir: ya tam vəziyyət (offer_issued /
      // rejected + bütün hadisə izi + qərar + təklif), ya HEÇ NƏ.
      //
      // Aralıq submitted→reviewing→approved keçidləri məntiqidir və hadisə
      // izində TAM saxlanılır — sadəcə hamısı eyni anda yazılır, çünki
      // maşın anderraytinqi onsuz da ani gedir.
      const sebeblerJson = JSON.stringify({ sebebler: netice.sebebler });

      let setir;
      try {
        if (netice.qerar === "approved") {
          const sonTarix = bicinTarixi(sahe.bitki);
          [setir] = await sorgu(
            `WITH muraciet AS (
               INSERT INTO credit_applications
                 (istifadeci_id, sahe_id, requested_amount, requested_term_months, crop, hectares,
                  status, decision_inputs, calc_version, idempotency_key)
               VALUES ($1,$2,$3,$4,$5,$6,'offer_issued',$7,$8,$9)
               RETURNING id
             ), qerar AS (
               INSERT INTO credit_decisions
                 (application_id, decision, approved_amount, approved_term_months, reasons,
                  score_snapshot, model_version)
               SELECT m.id, 'approved', $10, $4, $11::jsonb, $12::jsonb, $8 FROM muraciet m
               RETURNING id, application_id
             ), teklif AS (
               INSERT INTO credit_offers
                 (application_id, decision_id, amount, annual_rate, term_months,
                  repayment_structure, matures_on, expires_at)
               SELECT q.application_id, q.id, $10, $13, $4, $14, $15, now() + interval '30 days'
               FROM qerar q
               RETURNING id
             ), hadiseler AS (
               INSERT INTO credit_application_events
                 (application_id, event_type, from_status, to_status, detay)
               SELECT m.id, h.event_type, h.from_status, h.to_status, h.detay::jsonb
               FROM muraciet m
               CROSS JOIN (VALUES
                 (1, 'application_created', NULL, 'submitted', NULL),
                 (2, 'underwriting_started', 'submitted', 'reviewing', NULL),
                 (3, 'decision_approved', 'reviewing', 'approved', $16),
                 (4, 'offer_issued', 'approved', 'offer_issued', $16)
               ) AS h(sira, event_type, from_status, to_status, detay)
               ORDER BY h.sira
               RETURNING id
             )
             SELECT m.id AS muraciet_id FROM muraciet m`,
            [
              istifadeci.id,
              sahe.id,
              giris.mebleg,
              muddetAy,
              sahe.bitki,
              sahe.hektar,
              JSON.stringify(netice.girisler),
              netice.versiya,
              acar,
              netice.mebleg,
              sebeblerJson,
              JSON.stringify(netice.girisler.indeks),
              KREDIT_SERTLERI.illikFaiz,
              KREDIT_SERTLERI.odenisQurulusu,
              sonTarix ? sonTarix.toISOString().slice(0, 10) : null,
              JSON.stringify({ mebleg: netice.mebleg }),
            ],
          );
        } else {
          [setir] = await sorgu(
            `WITH muraciet AS (
               INSERT INTO credit_applications
                 (istifadeci_id, sahe_id, requested_amount, requested_term_months, crop, hectares,
                  status, decision_inputs, calc_version, idempotency_key)
               VALUES ($1,$2,$3,$4,$5,$6,'rejected',$7,$8,$9)
               RETURNING id
             ), qerar AS (
               INSERT INTO credit_decisions
                 (application_id, decision, approved_amount, approved_term_months, reasons,
                  score_snapshot, model_version)
               SELECT m.id, 'rejected', NULL, $4, $10::jsonb, $11::jsonb, $8 FROM muraciet m
               RETURNING id
             ), hadiseler AS (
               INSERT INTO credit_application_events
                 (application_id, event_type, from_status, to_status, detay)
               SELECT m.id, h.event_type, h.from_status, h.to_status, h.detay::jsonb
               FROM muraciet m
               CROSS JOIN (VALUES
                 (1, 'application_created', NULL, 'submitted', NULL),
                 (2, 'underwriting_started', 'submitted', 'reviewing', NULL),
                 (3, 'decision_rejected', 'reviewing', 'rejected', $10)
               ) AS h(sira, event_type, from_status, to_status, detay)
               ORDER BY h.sira
               RETURNING id
             )
             SELECT m.id AS muraciet_id FROM muraciet m`,
            [
              istifadeci.id,
              sahe.id,
              giris.mebleg,
              muddetAy,
              sahe.bitki,
              sahe.hektar,
              JSON.stringify(netice.girisler),
              netice.versiya,
              acar,
              sebeblerJson,
              JSON.stringify(netice.girisler.indeks),
            ],
          );
        }
      } catch (xeta) {
        // Unikal indekslər (açıq müraciət / idempotentlik açarı): təkrar
        // sorğu ikinci müraciət yaratmır — bütöv ifadə geri sarınır
        if (String(xeta?.message ?? "").includes("credit_app")) {
          return res.status(409).json({ error: "artiqMuracietVar" });
        }
        throw xeta;
      }

      jurnal("application_created", {
        istifadeci_id: istifadeci.id,
        application_id: setir.muraciet_id,
        mebleg: giris.mebleg,
      });
      jurnal("decision_created", {
        istifadeci_id: istifadeci.id,
        application_id: setir.muraciet_id,
        qerar: netice.qerar,
        sebebler: netice.sebebler,
      });
      if (netice.qerar === "approved") {
        jurnal("offer_issued", {
          istifadeci_id: istifadeci.id,
          application_id: setir.muraciet_id,
          mebleg: netice.mebleg,
        });
      }

      return res.status(200).json(await veziyyetOxu(istifadeci.id, indi));
    }

    // ── Təklifi qəbul et: ATOMİK (təklif + kredit + hadisə) ────────────
    if (emel === "teklif-qebul") {
      const teklifId = Number(req.body?.teklifId);
      if (!Number.isInteger(teklifId)) return res.status(400).json({ error: "yanlis" });

      // SAHİBLİK: təklif JOIN ilə istifadəçiyə bağlanır — başqasının
      // təklifinin id-si ilə sorğu 404 alır (IDOR qapalıdır)
      const [teklif] = await sorgu(
        `SELECT o.id, o.application_id, o.amount, o.annual_rate, o.term_months, o.status,
                o.matures_on, o.expires_at
         FROM credit_offers o
         JOIN credit_applications a ON a.id = o.application_id
         WHERE o.id=$1 AND a.istifadeci_id=$2`,
        [teklifId, istifadeci.id],
      );
      if (!teklif) return res.status(404).json({ error: "teklifYoxdur" });
      if (!kecidMumkun(TEKLIF_KECIDLERI, teklif.status, "accepted")) {
        return res.status(409).json({ error: "teklifBaglidir" });
      }
      if (teklif.expires_at && new Date(teklif.expires_at) <= new Date()) {
        await sorgu("UPDATE credit_offers SET status='expired' WHERE id=$1 AND status='issued'", [
          teklifId,
        ]);
        return res.status(409).json({ error: "teklifVaxti" });
      }

      // ATOMİKLİK: bir SQL ifadəsi = bir tranzaksiya. Neon HTTP sürücüsündə
      // BEGIN/COMMIT ayrı sorğulardır və eyni tranzaksiyada qalmır; məlumat
      // dəyişən CTE isə tam bir ifadədir — ya hamısı yazılır, ya heç biri.
      //
      // BEŞ YAZININ BEŞİ DƏ BURADADIR: təklifin qəbulu, müraciətin keçidi,
      // müraciət hadisəsi, kreditin yaranması, kredit hadisəsi. Əvvəl
      // müraciətin keçidi ifadədən SONRA ayrıca gedirdi — o addım uğursuz
      // olsa "təklif qəbul edilib, kredit var, müraciət hələ offer_issued"
      // qalırdı. İndi belə yarımçıq vəziyyət mümkün deyil (testi var).
      //
      // Təklif yalnız müraciət offer_issued halında ikən qəbul olunur —
      // hər iki UPDATE eyni snapshot-u görür, loans-dakı UNIQUE açarlar
      // təkrar sorğuda ikinci krediti onsuz da rədd edir.
      //
      // MƏHSUL SEMANTİKASI: qəbul = dərhal (simulyasiya olunmuş) ödəmə.
      // Real ödəniş relsləri hələ yoxdur; pul axını qoşulanda "qəbul olundu,
      // köçürülməyi gözləyir" aralıq halı ayrıca əlavə olunacaq. Ona görə
      // disbursed_at burada yazılır və ilk hadisə 'disbursement'-dir.
      const [kredit] = await sorgu(
        `WITH teklif AS (
           UPDATE credit_offers o SET status='accepted', accepted_at=now()
           FROM credit_applications a
           WHERE o.id=$1 AND o.status='issued'
             AND (o.expires_at IS NULL OR o.expires_at > now())
             AND a.id = o.application_id AND a.status='offer_issued'
             AND a.istifadeci_id=$2
           RETURNING o.id, o.application_id, o.amount, o.annual_rate, o.term_months, o.matures_on
         ), muraciet AS (
           UPDATE credit_applications a SET status='accepted', updated_at=now()
           FROM teklif t
           WHERE a.id = t.application_id AND a.status='offer_issued'
           RETURNING a.id
         ), yeni_kredit AS (
           INSERT INTO loans
             (istifadeci_id, application_id, offer_id, principal_original, principal_outstanding,
              annual_rate, term_months, status, matures_on, disbursed_at, next_due_on)
           SELECT $2, t.application_id, t.id, t.amount, t.amount, t.annual_rate, t.term_months,
                  'active', t.matures_on, now(),
                  -- İlk faiz ödənişi verilmədən bir ay sonra: dövr sayğacı
                  -- da elə bu andan başlayır (bax: lib/kreditMuhasibat.js)
                  (now() + interval '1 month')::date
           FROM teklif t
           JOIN muraciet m ON m.id = t.application_id
           RETURNING id, application_id, status, principal_original, principal_outstanding,
                     annual_rate, term_months, matures_on, disbursed_at, created_at
         ), muraciet_hadisesi AS (
           INSERT INTO credit_application_events
             (application_id, event_type, from_status, to_status, detay)
           SELECT k.application_id, 'offer_accepted', 'offer_issued', 'accepted',
                  jsonb_build_object('offer_id', $1, 'loan_id', k.id)
           FROM yeni_kredit k
           RETURNING id
         ), kredit_hadisesi AS (
           INSERT INTO loan_events (loan_id, event_type, amount, principal_after, detay)
           SELECT k.id, 'disbursement', k.principal_original, k.principal_original,
                  jsonb_build_object('offer_id', $1)
           FROM yeni_kredit k
           RETURNING loan_id
         )
         SELECT * FROM yeni_kredit`,
        [teklifId, istifadeci.id],
      );
      if (!kredit) return res.status(409).json({ error: "teklifBaglidir" });

      jurnal("offer_accepted", {
        istifadeci_id: istifadeci.id,
        application_id: kredit.application_id,
        offer_id: teklifId,
      });
      jurnal("loan_created", {
        istifadeci_id: istifadeci.id,
        loan_id: kredit.id,
        mebleg: reqem(kredit.principal_original),
      });

      return res.status(200).json(await veziyyetOxu(istifadeci.id, indi));
    }

    // ── Təklifdən imtina / müraciəti geri götür ────────────────────────
    if (emel === "teklif-imtina" || emel === "legv") {
      const [muraciet] = await sorgu(
        `SELECT id, status FROM credit_applications
         WHERE istifadeci_id=$1 AND status = ANY($2)
         ORDER BY created_at DESC, id DESC LIMIT 1`,
        [istifadeci.id, ACIQ_HALLAR],
      );
      if (!muraciet) return res.status(404).json({ error: "muracietYoxdur" });

      // Təklif "rejected" olur (fermer ondan imtina etdi), müraciət isə
      // "cancelled" — bunlar FƏRQLİ hadisələrdir: `rejected` müraciət
      // anderraytinqin rəddi deməkdir və hesabatda qarışmamalıdır.
      //
      // SIRA QƏSDƏNDİR: əvvəl müraciət bağlanır, sonra təklif. İkinci addım
      // uğursuz qalsa "bağlanmış müraciət + açıq görünən təklif" qalır —
      // zərərsizdir (açıq-müraciət indeksi artıq tutmur, təkrar ləğv və ya
      // yeni müraciət yolu açıqdır). Əks sıra fermeri kilidləyirdi.
      await halDeyis(muraciet.id, muraciet.status, "cancelled", "cancelled_by_user");
      if (muraciet.status === "offer_issued") {
        await sorgu(
          "UPDATE credit_offers SET status='rejected' WHERE application_id=$1 AND status='issued'",
          [muraciet.id],
        );
      }
      jurnal("application_closed", {
        istifadeci_id: istifadeci.id,
        application_id: muraciet.id,
        hal: "cancelled",
      });

      return res.status(200).json(await veziyyetOxu(istifadeci.id, indi));
    }

    // ── Ödəniş: ƏVVƏL FAİZ, SONRA ƏSAS BORC ───────────────────────────
    if (emel === "odenis") {
      const mebleg = Number(req.body?.mebleg);
      if (!Number.isFinite(mebleg) || mebleg <= 0 || mebleg > KREDIT_SERTLERI.mumkunMaxMebleg) {
        return res.status(400).json({ error: "meblegYanlis" });
      }
      const acar = typeof req.body?.acar === "string" ? req.body.acar.slice(0, 64) : null;

      const [aktiv] = await sorgu(
        "SELECT * FROM loans WHERE istifadeci_id=$1 AND status='active' ORDER BY id DESC LIMIT 1",
        [istifadeci.id],
      );
      if (!aktiv) return res.status(404).json({ error: "kreditYoxdur" });

      // Ödənişdən ƏVVƏL faiz bugünə gətirilir: fermer bu günə qədər yığılan
      // faizi ödəyir, "sonra hesablanan" gizli borc qalmır
      const kredit = await faizleriIsle(aktiv, indi);

      // BÖLGÜ VƏ TƏTBİQ KİLİDLİ CARİ BALANSDAN HESABLANIR. Ödəniş əvvəl faiz
      // borcunu, sonra əsas borcu bağlayır (bax: lib/kreditMuhasibat.js →
      // bolusdur; SQL-də eyni qayda LEAST ilə yazılıb ki, hesablama bazada,
      // kilid altında olsun). Bir ifadədə:
      //   • FOR UPDATE sıranı müəyyən edir — ikinci sorğu birincini gözləyir
      //     və YENİLƏNMİŞ balansı görür (100-ə eyni anda 60+60 → 60, sonra 40);
      //   • LEAST(...) borcdan çoxunu heç vaxt çıxmır — mənfi balans mümkünsüz;
      //   • hər hissə üçün AYRI hadisə yazılır (faiz və əsas ayrı sətirlərdir,
      //     çünki hesabatda və gecikmə hesabında ayrı mənaları var);
      //   • sıfır hissə hadisə yaratmır (WHERE h.mebleg > 0);
      //   • kredit yalnız HƏR İKİ balans sıfırlananda "repaid" olur — əsas
      //     borc bağlanıb faiz qalıbsa kredit hələ açıqdır;
      //   • idempotentlik açarı artıq jurnaldadırsa "evvel" boş qayıdır —
      //     təkrar sorğu İKİNCİ DƏFƏ TƏTBİQ OLUNMUR.
      let netice;
      try {
        [netice] = await sorgu(
          `WITH evvel AS (
             SELECT id, principal_outstanding, interest_outstanding FROM loans
             WHERE id=$1 AND status='active'
               AND ($3::text IS NULL OR NOT EXISTS (
                 SELECT 1 FROM loan_events WHERE loan_id=$1
                   AND idempotency_key IN ($3::text || ':faiz', $3::text || ':esas')))
             FOR UPDATE
           ), bolgu AS (
             SELECT e.id,
                    e.principal_outstanding AS evvelki_esas,
                    e.interest_outstanding AS evvelki_faiz,
                    LEAST($2::numeric, e.interest_outstanding) AS faiz_odenis,
                    LEAST($2::numeric - LEAST($2::numeric, e.interest_outstanding),
                          e.principal_outstanding) AS esas_odenis
             FROM evvel e
           ), yenilenen AS (
             UPDATE loans l
               SET interest_outstanding = b.evvelki_faiz - b.faiz_odenis,
                   interest_paid_total = l.interest_paid_total + b.faiz_odenis,
                   principal_outstanding = b.evvelki_esas - b.esas_odenis,
                   status = CASE
                     WHEN (b.evvelki_esas - b.esas_odenis) <= 0
                      AND (b.evvelki_faiz - b.faiz_odenis) <= 0
                     THEN 'repaid' ELSE l.status END,
                   closed_at = CASE
                     WHEN (b.evvelki_esas - b.esas_odenis) <= 0
                      AND (b.evvelki_faiz - b.faiz_odenis) <= 0
                     THEN now() ELSE l.closed_at END,
                   updated_at = now()
             FROM bolgu b WHERE l.id = b.id
             RETURNING l.id, l.status, b.faiz_odenis, b.esas_odenis,
                       l.principal_outstanding AS yeni_esas,
                       l.interest_outstanding AS yeni_faiz
           ), hadiseler AS (
             INSERT INTO loan_events
               (loan_id, event_type, amount, principal_after, interest_after, idempotency_key)
             SELECT y.id, h.nov, h.mebleg, y.yeni_esas, y.yeni_faiz, h.acar
             FROM yenilenen y
             CROSS JOIN LATERAL (VALUES
               (1, 'interest_payment', y.faiz_odenis,
                   CASE WHEN $3::text IS NULL THEN NULL ELSE $3::text || ':faiz' END),
               (2, 'principal_repayment', y.esas_odenis,
                   CASE WHEN $3::text IS NULL THEN NULL ELSE $3::text || ':esas' END)
             ) AS h(sira, nov, mebleg, acar)
             WHERE h.mebleg > 0
             ORDER BY h.sira
             RETURNING id
           )
           SELECT * FROM yenilenen`,
          [kredit.id, mebleg, acar],
        );
      } catch (xeta) {
        // Yarış şəraitində eyni açarla iki sorğu: "evvel" qapısı köhnə
        // snapshot-la keçə bilər, unikal indeks isə ikinci yazını dayandırır —
        // bütöv ifadə geri sarınır (heç nə tətbiq olunmur) və aşağıdakı
        // təkrar-sorğu cavabına düşür
        if (!String(xeta?.message ?? "").includes("loan_event_idempotent")) throw xeta;
        netice = null;
      }

      if (!netice) {
        if (acar) {
          const [movcud] = await sorgu(
            `SELECT id FROM loan_events WHERE loan_id=$1
               AND idempotency_key IN ($2 || ':faiz', $2 || ':esas') LIMIT 1`,
            [kredit.id, acar],
          );
          // İdempotent təkrar: eyni sorğunun təkrarı uğurdur, əməl deyil —
          // cari vəziyyət qaytarılır, ikinci hadisə YAZILMIR
          if (movcud) return res.status(200).json(await veziyyetOxu(istifadeci.id, indi));
        }
        return res.status(409).json({ error: "kreditBaglidir" });
      }

      jurnal("repayment_recorded", {
        istifadeci_id: istifadeci.id,
        loan_id: kredit.id,
        faiz: reqem(netice.faiz_odenis),
        esas: reqem(netice.esas_odenis),
        faiz_borcu: reqem(netice.yeni_faiz),
        qaliq: reqem(netice.yeni_esas),
        hal: netice.status,
      });
      return res.status(200).json(await veziyyetOxu(istifadeci.id, indi));
    }

    return res.status(400).json({ error: "Naməlum əməl" });
  } catch (error) {
    if (error?.kod === "kecidYanlis") {
      return res.status(409).json({ error: "kecidYanlis" });
    }
    if (sxemYoxdur(error)) return sxemCavabi(res, error);
    // Daxili detal klientə getmir — yalnız server logunda
    console.error("kredit error:", error?.message);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
