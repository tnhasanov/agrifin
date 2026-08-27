-- 002 — Kredit sistemi: müraciət → qərar → təklif → kredit → hadisələr.
--
-- ═══ NİYƏ BU FORMA ════════════════════════════════════════════════════
-- Prototipdə kredit vəziyyəti brauzerdə (localStorage) yaşayırdı. Maliyyə
-- məhsulunda bu mümkün deyil: sahib, tarix və qərarın səbəbi serverdə,
-- dəyişdirilə bilməyən formada qalmalıdır.
--
-- İki prinsip:
--   1. QƏRARI TƏKRARLAMAQ MÜMKÜN OLMALIDIR. `decision_inputs` qərar anındakı
--      BÜTÜN girişlərin surətidir — bal, gəlir ssenariləri, ehtiyat, tavan,
--      sahə, bitki, peyk mənbəyi. Sonradan dəyişə bilən dəyərlərə istinad
--      saxlamırıq: konfiqurasiya dəyişsə köhnə qərar yenə izah olunmalıdır.
--   2. MALİYYƏ TARİXÇƏSİ HADİSƏLƏRDƏN ÇIXIR. loan_events yalnız artır;
--      qalıq borc onun cəmidir. Tam ikitərəfli mühasibat (general ledger)
--      QƏSDƏN qurulmur — məhsul hələ onu tələb etmir — amma hadisə jurnalı
--      sonradan ledger əlavə etməyə imkan verən formadır.
--
-- Adlar: yeni kredit cədvəlləri ingiliscədir (istifadəçinin spesifikasiyası
-- onları açıq adlandırıb; auditor/tərəfdaş bu cədvəlləri oxuyacaq). Mövcud
-- cədvəllər (istifadeciler, saheler) olduğu kimi qalır.

CREATE TABLE IF NOT EXISTS credit_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  istifadeci_id BIGINT NOT NULL REFERENCES istifadeciler(id) ON DELETE CASCADE,
  -- Sahə silinsə müraciət qalır: qərarın girişləri onsuz da snapshot-dadır
  sahe_id BIGINT REFERENCES saheler(id) ON DELETE SET NULL,
  requested_amount NUMERIC(12,2) NOT NULL CHECK (requested_amount > 0),
  requested_term_months INT NOT NULL CHECK (requested_term_months BETWEEN 1 AND 24),
  crop TEXT,
  hectares REAL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewing','approved','rejected','offer_issued','accepted','cancelled','expired')),
  -- Qərarın BÜTÜN girişləri (bax: lib/kredit.js → qerarGirisleri)
  decision_inputs JSONB NOT NULL,
  calc_version TEXT NOT NULL,
  -- Təkrar sorğu ikinci müraciət yaratmasın (şəbəkə itkisi, iki toxunuş)
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eyni anda BİR açıq müraciət. UI qaydası ("gözləyən müraciətiniz var")
-- artıq bazada təsbit olunur — yarış şəraiti də ikinci sətir yarada bilmir.
CREATE UNIQUE INDEX IF NOT EXISTS credit_app_bir_aciq_idx
  ON credit_applications (istifadeci_id)
  WHERE status IN ('submitted','reviewing','approved','offer_issued');

CREATE UNIQUE INDEX IF NOT EXISTS credit_app_idempotent_idx
  ON credit_applications (istifadeci_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS credit_app_istifadeci_idx
  ON credit_applications (istifadeci_id, created_at DESC);

-- Vəziyyət tarixçəsi: müraciətin hər addımı görünür (audit izi)
CREATE TABLE IF NOT EXISTS credit_application_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES credit_applications(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  detay JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_app_event_idx
  ON credit_application_events (application_id, created_at);

-- Qərar: maşın anderraytinqinin nəticəsi. Yalnız INSERT — qərar dəyişmir,
-- yeni qərar yeni sətirdir.
CREATE TABLE IF NOT EXISTS credit_decisions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES credit_applications(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  approved_amount NUMERIC(12,2) CHECK (approved_amount IS NULL OR approved_amount >= 0),
  approved_term_months INT,
  reasons JSONB NOT NULL,
  -- Bal anındakı surəti: cədvəl versiyası dəyişsə də qərar izah olunur
  score_snapshot JSONB,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_decision_app_idx
  ON credit_decisions (application_id, created_at DESC);

CREATE TABLE IF NOT EXISTS credit_offers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id BIGINT NOT NULL REFERENCES credit_applications(id) ON DELETE CASCADE,
  decision_id BIGINT REFERENCES credit_decisions(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  annual_rate NUMERIC(5,2) NOT NULL CHECK (annual_rate >= 0 AND annual_rate <= 100),
  term_months INT NOT NULL CHECK (term_months BETWEEN 1 AND 24),
  -- Məhsul qaydası: faiz dövri olaraq QALAN əsas borca hesablanır, əsas borc
  -- istənilən vaxt azaldıla bilər (bax: lib/kreditOdenis.js)
  repayment_structure TEXT NOT NULL DEFAULT 'aylik_faiz_cevik_esas',
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued','accepted','rejected','expired','superseded')),
  version INT NOT NULL DEFAULT 1,
  matures_on DATE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Müraciət başına BİR açıq təklif
CREATE UNIQUE INDEX IF NOT EXISTS credit_offer_bir_aciq_idx
  ON credit_offers (application_id) WHERE status = 'issued';
CREATE INDEX IF NOT EXISTS credit_offer_app_idx ON credit_offers (application_id);

CREATE TABLE IF NOT EXISTS loans (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  istifadeci_id BIGINT NOT NULL REFERENCES istifadeciler(id) ON DELETE CASCADE,
  -- UNIQUE: bir müraciət/təklif yalnız BİR kredit doğurur. Təkrar "qəbul et"
  -- sorğusu ikinci krediti yarada bilmir — bazanın özü qadağan edir.
  application_id BIGINT NOT NULL UNIQUE REFERENCES credit_applications(id) ON DELETE RESTRICT,
  offer_id BIGINT NOT NULL UNIQUE REFERENCES credit_offers(id) ON DELETE RESTRICT,
  principal_original NUMERIC(12,2) NOT NULL CHECK (principal_original > 0),
  -- Qalıq: hadisələrdən çıxan cəmin materiallaşdırılmış surəti (oxu üçün).
  -- Həqiqət mənbəyi loan_events-dir; bu sütun onunla birlikdə yenilənir.
  principal_outstanding NUMERIC(12,2) NOT NULL CHECK (principal_outstanding >= 0),
  annual_rate NUMERIC(5,2) NOT NULL,
  term_months INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','repaid','closed','written_off')),
  matures_on DATE,
  disbursed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loan_istifadeci_idx ON loans (istifadeci_id, created_at DESC);

-- Maliyyə hadisə jurnalı — YALNIZ ARTIR. Tarixçə yenidən yazılmır:
-- səhv hadisə silinmir, əks hadisə (adjustment) əlavə olunur.
CREATE TABLE IF NOT EXISTS loan_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created','disbursement','principal_repayment','interest_charge','interest_payment','adjustment','closure','write_off')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Hadisədən SONRAKI qalıq: jurnalı oxuyan hesablamağa məcbur olmasın
  principal_after NUMERIC(12,2),
  detay JSONB,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loan_event_idx ON loan_events (loan_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS loan_event_idempotent_idx
  ON loan_events (loan_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
