-- 003 — Maliyyə qeydlərinin qorunması: CASCADE → RESTRICT.
--
-- 002-də kredit cədvəlləri ON DELETE CASCADE ilə yaranmışdı: istifadəçi
-- sətri silinsə müraciətlər, qərarlar, kreditlər və hadisə jurnalı da
-- SƏSSİZCƏ silinərdi. Maliyyə/audit qeydi adi DELETE ilə yox ola bilməz —
-- ona görə bütün zəncir RESTRICT olur: silmə cəhdi bazada dayanır.
--
-- İstifadəçi silinməsi gələcəkdə lazım olsa yolu bu DEYİL: soft-delete /
-- anonimləşdirmə olacaq (telefon sahəsi boşaldılır, qeydlər qalır).
--
-- NİYƏ 003, NİYƏ 002-Yİ DÜZƏLTMƏDİK: 002 artıq prodakşna tətbiq olunmuş
-- ola bilər; tətbiq olunmuş faylı dəyişmək checksum yoxlamasını da pozardı.
-- Miqrasiya faylı dondurulmuş sənəddir — düzəliş həmişə yeni nömrədir.
--
-- İdempotentlik: hər dəyişiklik DROP IF EXISTS + ADD cütlüyüdür — fayl
-- yarıda qırılsa təkrar icra təhlükəsizdir (bax: lib/miqrasiya.js qaydası).
-- Ad konvensiyası: Postgres-in standart <cədvəl>_<sütun>_fkey adları.

ALTER TABLE credit_applications DROP CONSTRAINT IF EXISTS credit_applications_istifadeci_id_fkey;
ALTER TABLE credit_applications
  ADD CONSTRAINT credit_applications_istifadeci_id_fkey
  FOREIGN KEY (istifadeci_id) REFERENCES istifadeciler(id) ON DELETE RESTRICT;

ALTER TABLE credit_application_events DROP CONSTRAINT IF EXISTS credit_application_events_application_id_fkey;
ALTER TABLE credit_application_events
  ADD CONSTRAINT credit_application_events_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE RESTRICT;

ALTER TABLE credit_decisions DROP CONSTRAINT IF EXISTS credit_decisions_application_id_fkey;
ALTER TABLE credit_decisions
  ADD CONSTRAINT credit_decisions_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE RESTRICT;

ALTER TABLE credit_offers DROP CONSTRAINT IF EXISTS credit_offers_application_id_fkey;
ALTER TABLE credit_offers
  ADD CONSTRAINT credit_offers_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE RESTRICT;

-- Qərar silinərsə təklifdəki istinad boşalmasın — qərar ümumiyyətlə silinməsin
ALTER TABLE credit_offers DROP CONSTRAINT IF EXISTS credit_offers_decision_id_fkey;
ALTER TABLE credit_offers
  ADD CONSTRAINT credit_offers_decision_id_fkey
  FOREIGN KEY (decision_id) REFERENCES credit_decisions(id) ON DELETE RESTRICT;

ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_istifadeci_id_fkey;
ALTER TABLE loans
  ADD CONSTRAINT loans_istifadeci_id_fkey
  FOREIGN KEY (istifadeci_id) REFERENCES istifadeciler(id) ON DELETE RESTRICT;

ALTER TABLE loan_events DROP CONSTRAINT IF EXISTS loan_events_loan_id_fkey;
ALTER TABLE loan_events
  ADD CONSTRAINT loan_events_loan_id_fkey
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE RESTRICT;
