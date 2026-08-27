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
-- (003-ün özü isə hələ heç bir prodakşn bazasına çatmayıb — yalnız bu
-- branch-dadır və istifadəçiyə verilmiş migrate təlimatı ondan əvvəldir —
-- ona görə merge-dən ƏVVƏL forması yerində dəqiqləşdirilib. Fərziyyə səhv
-- çıxsa checksum yoxlaması bunu səssiz korlamaq yox, açıq xəta ilə tutur.)
--
-- HƏR ƏVƏZLƏMƏ BİR İFADƏDİR: DROP CONSTRAINT IF EXISTS və ADD CONSTRAINT
-- eyni ALTER TABLE-dadır. Ayrı-ayrı yazılsaydı iki ifadə arasında qırılma
-- cədvəli FK-sız qoyurdu (icraçıda çox-ifadəli tranzaksiya yoxdur — bax:
-- lib/miqrasiya.js). Tək ifadə atomikdir və təkrar icraya davamlıdır.
-- Ad konvensiyası: Postgres-in standart <cədvəl>_<sütun>_fkey adları.

ALTER TABLE credit_applications
  DROP CONSTRAINT IF EXISTS credit_applications_istifadeci_id_fkey,
  ADD CONSTRAINT credit_applications_istifadeci_id_fkey
    FOREIGN KEY (istifadeci_id) REFERENCES istifadeciler(id) ON DELETE RESTRICT;

ALTER TABLE credit_application_events
  DROP CONSTRAINT IF EXISTS credit_application_events_application_id_fkey,
  ADD CONSTRAINT credit_application_events_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE RESTRICT;

ALTER TABLE credit_decisions
  DROP CONSTRAINT IF EXISTS credit_decisions_application_id_fkey,
  ADD CONSTRAINT credit_decisions_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE RESTRICT;

ALTER TABLE credit_offers
  DROP CONSTRAINT IF EXISTS credit_offers_application_id_fkey,
  ADD CONSTRAINT credit_offers_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES credit_applications(id) ON DELETE RESTRICT;

ALTER TABLE credit_offers
  DROP CONSTRAINT IF EXISTS credit_offers_decision_id_fkey,
  ADD CONSTRAINT credit_offers_decision_id_fkey
    FOREIGN KEY (decision_id) REFERENCES credit_decisions(id) ON DELETE RESTRICT;

ALTER TABLE loans
  DROP CONSTRAINT IF EXISTS loans_istifadeci_id_fkey,
  ADD CONSTRAINT loans_istifadeci_id_fkey
    FOREIGN KEY (istifadeci_id) REFERENCES istifadeciler(id) ON DELETE RESTRICT;

ALTER TABLE loan_events
  DROP CONSTRAINT IF EXISTS loan_events_loan_id_fkey,
  ADD CONSTRAINT loan_events_loan_id_fkey
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE RESTRICT;
