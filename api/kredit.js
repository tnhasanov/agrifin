// api/kredit.js — kredit sistemi: müraciət, qərar, təklif, kredit, ödəniş.
//
// NİYƏ BİR FUNKSİYA: Vercel Hobby planında api/ faylı = funksiya, limit 12.
// Hazırda 10-u doludur (bax: api/). Kredit axını ayrı-ayrı fayllara bölünsəydi
// limit dolardı. Əməl POST gövdəsindəki `emel` sahəsindən seçilir — api/hesab.js
// ilə eyni üslub.
//
//   GET                    → {muraciet, qerar, teklif, kredit, hadiseler}
//   GET ?tarixce=1         → bütün müraciətlərin qısa tarixçəsi
//   POST muraciet          → {mebleg, muddetAy?} — SERVER anderraytinq edir
//   POST teklif-qebul      → {teklifId} — ATOMİK: təklif qəbul + kredit yaranır
//   POST teklif-imtina     → {teklifId} — təklifdən imtina, müraciət bağlanır
//   POST legv              → açıq müraciəti geri götürür
//   POST odenis            → {mebleg} — əsas borcdan ödəniş (hadisə jurnalı)
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
import { bicinTarixi } from "../lib/movsum.js";

/**
 * Ölçülü hadisə jurnalı. Şəxsi məlumat, token, OTP və bağlantı sətri
 * YAZILMIR — yalnız kim (id), nə (hadisə) və hansı sətir.
 */
function jurnal(hadise, melumat) {
  console.log(JSON.stringify({ hadise, ...melumat }));
}

const reqem = (deyer) => (deyer == null ? null : Number(deyer));

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

function kreditCavabi(setir) {
  if (!setir) return null;
  return {
    id: setir.id,
    hal: setir.status,
    esasBorc: reqem(setir.principal_original),
    qaliqBorc: reqem(setir.principal_outstanding),
    illikFaiz: reqem(setir.annual_rate),
    muddetAy: setir.term_months,
    sonTarix: setir.matures_on,
    tarix: setir.created_at,
  };
}

/** İstifadəçinin ən son müraciəti + ona bağlı qərar/təklif/kredit */
async function veziyyetOxu(istifadeciId) {
  const [muraciet] = await sorgu(
    `SELECT * FROM credit_applications WHERE istifadeci_id=$1
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [istifadeciId],
  );
  if (!muraciet) return { muraciet: null, qerar: null, teklif: null, kredit: null };

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
  const [kredit] = await sorgu(
    `SELECT * FROM loans WHERE application_id=$1 LIMIT 1`,
    [muraciet.id],
  );

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
    kredit: kreditCavabi(kredit),
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

export default async function handler(req, res) {
  if (!dbQurulub() || !hesabQurulub()) {
    return res.status(501).json({ error: "Kredit sistemi hələ qurulmayıb." });
  }

  let istifadeci;
  try {
    istifadeci = await sessiyaOxu(cookieToken(req));
  } catch (error) {
    console.error("kredit sessiya:", error?.message);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
  if (!istifadeci) return res.status(401).json({ error: "girisLazim" });

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
      return res.status(200).json(await veziyyetOxu(istifadeci.id));
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

      let muracietId;
      try {
        const [yeni] = await sorgu(
          `INSERT INTO credit_applications
             (istifadeci_id, sahe_id, requested_amount, requested_term_months, crop, hectares,
              status, decision_inputs, calc_version, idempotency_key)
           VALUES ($1,$2,$3,$4,$5,$6,'submitted',$7,$8,$9) RETURNING id`,
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
          ],
        );
        muracietId = yeni.id;
      } catch (xeta) {
        // Unikal indeks: təkrar sorğu ikinci müraciət yaratmır
        if (String(xeta?.message ?? "").includes("credit_app")) {
          return res.status(409).json({ error: "artiqMuracietVar" });
        }
        throw xeta;
      }

      await sorgu(
        `INSERT INTO credit_application_events (application_id, event_type, to_status)
         VALUES ($1, 'application_created', 'submitted')`,
        [muracietId],
      );
      jurnal("application_created", {
        istifadeci_id: istifadeci.id,
        application_id: muracietId,
        mebleg: giris.mebleg,
      });

      // Anderraytinq dərhal işləyir — nəticə QƏRAR sətridir
      await halDeyis(muracietId, "submitted", "reviewing", "underwriting_started");

      const [qerarSetri] = await sorgu(
        `INSERT INTO credit_decisions
           (application_id, decision, approved_amount, approved_term_months, reasons,
            score_snapshot, model_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          muracietId,
          netice.qerar,
          netice.qerar === "approved" ? netice.mebleg : null,
          netice.muddetAy,
          JSON.stringify({ sebebler: netice.sebebler }),
          JSON.stringify(netice.girisler.indeks),
          netice.versiya,
        ],
      );
      jurnal("decision_created", {
        istifadeci_id: istifadeci.id,
        application_id: muracietId,
        qerar: netice.qerar,
        sebebler: netice.sebebler,
      });

      if (netice.qerar === "rejected") {
        await halDeyis(muracietId, "reviewing", "rejected", "decision_rejected", {
          sebebler: netice.sebebler,
        });
        return res.status(200).json(await veziyyetOxu(istifadeci.id));
      }

      await halDeyis(muracietId, "reviewing", "approved", "decision_approved", {
        mebleg: netice.mebleg,
      });

      const sonTarix = bicinTarixi(sahe.bitki);
      await sorgu(
        `INSERT INTO credit_offers
           (application_id, decision_id, amount, annual_rate, term_months,
            repayment_structure, matures_on, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now() + interval '30 days')`,
        [
          muracietId,
          qerarSetri.id,
          netice.mebleg,
          KREDIT_SERTLERI.illikFaiz,
          netice.muddetAy,
          KREDIT_SERTLERI.odenisQurulusu,
          sonTarix ? sonTarix.toISOString().slice(0, 10) : null,
        ],
      );
      await halDeyis(muracietId, "approved", "offer_issued", "offer_issued", {
        mebleg: netice.mebleg,
      });
      jurnal("offer_issued", {
        istifadeci_id: istifadeci.id,
        application_id: muracietId,
        mebleg: netice.mebleg,
      });

      return res.status(200).json(await veziyyetOxu(istifadeci.id));
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
      // loans-dakı UNIQUE(application_id, offer_id) təkrar sorğuda ikinci
      // krediti onsuz da rədd edir.
      const [kredit] = await sorgu(
        `WITH teklif AS (
           UPDATE credit_offers SET status='accepted', accepted_at=now()
           WHERE id=$1 AND status='issued' AND (expires_at IS NULL OR expires_at > now())
           RETURNING id, application_id, amount, annual_rate, term_months, matures_on
         ), yeni_kredit AS (
           INSERT INTO loans
             (istifadeci_id, application_id, offer_id, principal_original, principal_outstanding,
              annual_rate, term_months, status, matures_on)
           SELECT $2, t.application_id, t.id, t.amount, t.amount, t.annual_rate, t.term_months,
                  'active', t.matures_on
           FROM teklif t
           RETURNING id, application_id, status, principal_original, principal_outstanding,
                     annual_rate, term_months, matures_on, created_at
         ), hadise AS (
           INSERT INTO loan_events (loan_id, event_type, amount, principal_after, detay)
           SELECT k.id, 'created', k.principal_original, k.principal_original,
                  jsonb_build_object('offer_id', $1)
           FROM yeni_kredit k
           RETURNING loan_id
         )
         SELECT * FROM yeni_kredit`,
        [teklifId, istifadeci.id],
      );
      if (!kredit) return res.status(409).json({ error: "teklifBaglidir" });

      await halDeyis(kredit.application_id, "offer_issued", "accepted", "offer_accepted", {
        loan_id: kredit.id,
      });
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

      return res.status(200).json(await veziyyetOxu(istifadeci.id));
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
      if (muraciet.status === "offer_issued") {
        await sorgu(
          "UPDATE credit_offers SET status='rejected' WHERE application_id=$1 AND status='issued'",
          [muraciet.id],
        );
      }
      await halDeyis(muraciet.id, muraciet.status, "cancelled", "cancelled_by_user");
      jurnal("application_closed", {
        istifadeci_id: istifadeci.id,
        application_id: muraciet.id,
        hal: "cancelled",
      });

      return res.status(200).json(await veziyyetOxu(istifadeci.id));
    }

    // ── Əsas borcdan ödəniş ────────────────────────────────────────────
    // UI-da hələ ekran yoxdur; server qabiliyyəti və jurnal buradadır ki,
    // ödəniş qeydə alınanda qalıq və faiz bazası düzgün azalsın.
    if (emel === "odenis") {
      const mebleg = Number(req.body?.mebleg);
      if (!Number.isFinite(mebleg) || mebleg <= 0 || mebleg > KREDIT_SERTLERI.mumkunMaxMebleg) {
        return res.status(400).json({ error: "meblegYanlis" });
      }
      const acar = typeof req.body?.acar === "string" ? req.body.acar.slice(0, 64) : null;

      const [kredit] = await sorgu(
        "SELECT id, principal_outstanding, status FROM loans WHERE istifadeci_id=$1 AND status='active' ORDER BY id DESC LIMIT 1",
        [istifadeci.id],
      );
      if (!kredit) return res.status(404).json({ error: "kreditYoxdur" });

      // Qalıqdan çox ödəniş qəbul edilmir: artıq pul "mənfi borc" yaratmır
      const odenilen = Math.min(mebleg, Number(kredit.principal_outstanding));

      const [yeni] = await sorgu(
        `WITH k AS (
           UPDATE loans
             SET principal_outstanding = principal_outstanding - $2,
                 status = CASE WHEN principal_outstanding - $2 <= 0 THEN 'repaid' ELSE status END,
                 closed_at = CASE WHEN principal_outstanding - $2 <= 0 THEN now() ELSE closed_at END,
                 updated_at = now()
           WHERE id=$1 AND status='active'
           RETURNING id, principal_outstanding, status
         )
         INSERT INTO loan_events (loan_id, event_type, amount, principal_after, idempotency_key)
         SELECT k.id, 'principal_repayment', $2, k.principal_outstanding, $3 FROM k
         RETURNING loan_id, principal_after`,
        [kredit.id, odenilen, acar],
      );
      if (!yeni) return res.status(409).json({ error: "kreditBaglidir" });

      jurnal("repayment_recorded", {
        istifadeci_id: istifadeci.id,
        loan_id: kredit.id,
        mebleg: odenilen,
        qaliq: reqem(yeni.principal_after),
      });
      return res.status(200).json(await veziyyetOxu(istifadeci.id));
    }

    return res.status(400).json({ error: "Naməlum əməl" });
  } catch (error) {
    if (error?.kod === "kecidYanlis") {
      return res.status(409).json({ error: "kecidYanlis" });
    }
    // Daxili detal klientə getmir — yalnız server logunda
    console.error("kredit error:", error?.message);
    return res.status(500).json({ error: "Gözlənilməz xəta." });
  }
}
