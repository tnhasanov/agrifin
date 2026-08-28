-- 004 — Kredit mühasibatı: faiz balansı, dövr sayğacı, ödəniş son tarixi.
--
-- 002-dəki kredit yalnız ƏSAS BORCU tanıyırdı: faiz nə yığılırdı, nə də
-- ödənilirdi — "aylıq faiz" məhsul mətnində vardı, mühasibatda yox idi.
-- Bu miqrasiya faizi qeydiyyata salır:
--
--   • interest_outstanding    — ödənilməmiş faiz borcu (yığılıb, ödənməyib)
--   • interest_accrued_total  — bütün dövrlər üzrə yığılmış faizin cəmi
--   • interest_paid_total     — ödənilmiş faizin cəmi
--   • accrued_periods         — jurnala yazılmış son aylıq dövrün nömrəsi
--   • next_due_on             — növbəti ödəniş tarixi (oxu rahatlığı üçün)
--
-- loan_events-də:
--   • interest_after — hadisədən SONRAKI faiz borcu (principal_after-in cütü)
--   • due_on         — faiz hadisəsinin son ödəniş tarixi; gecikmə (DPD)
--                      məhz bundan hesablanır (bax: lib/kreditMuhasibat.js)
--
-- HESABLAMA QAYDASI KODDADIR, BAZADA YOX: faiz gündəlik (act/365) yığılır və
-- dövrün sonunda BİR "interest_charge" hadisəsi kimi yazılır; hadisənin
-- idempotentlik açarı 'faiz-<dövr>'-dür, ona görə eyni dövr iki dəfə
-- yazıla bilmir (unikal indeks 002-dədir).
--
-- Balans sütunları hadisə jurnalının materiallaşdırılmış surətidir — həqiqət
-- mənbəyi yenə loan_events-dir.

ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_outstanding NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_accrued_total NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS interest_paid_total NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS accrued_periods INT NOT NULL DEFAULT 0;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS next_due_on DATE;

-- Faiz borcu mənfi ola bilməz: ödəniş bölgüsü LEAST ilə kəsilir, bu isə
-- bazanın öz qoruyucusudur (tək ifadə: qırılma FK/CHECK-siz pəncərə qoymur)
ALTER TABLE loans
  DROP CONSTRAINT IF EXISTS loans_faiz_menfi_deyil,
  ADD CONSTRAINT loans_faiz_menfi_deyil CHECK (interest_outstanding >= 0);

ALTER TABLE loan_events ADD COLUMN IF NOT EXISTS interest_after NUMERIC(12,2);
ALTER TABLE loan_events ADD COLUMN IF NOT EXISTS due_on DATE;
