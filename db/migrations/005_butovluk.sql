-- 005 — Bütövlük: sahə avtoriteti, sübut mənbəyi, bir aktiv kredit.
--
-- Bu miqrasiya ANDERRAYTİNQİN SÖYKƏNDİYİ MƏLUMATIN KİMDƏN GƏLDİYİNİ
-- qeydiyyata salır. Əvvəl belə idi:
--
--   • saheler.hektar — KLİENTİN göndərdiyi rəqəm (api/sahe.js onu olduğu
--     kimi yazırdı), halbuki gəlir modeli gəliri məhz hektara vurur
--     (lib/gelir.js) və kredit tavanı oradan çıxır. Yəni sorğu gövdəsində
--     hektarı böyütmək limiti böyüdürdü;
--   • peyk_snapshotlar — mövsüm tarixçəsi də KLİENT tərəfindən yazılırdı,
--     həm də hansı kontura aid olduğu heç yerdə yazılmırdı: bir sahənin
--     ölçmələrini başqa sahə üçün saxlamaq mümkün idi.
--
-- Sütunlar ÖZLÜYÜNDƏ qorumur — qorumanı API təmin edir (hektarı serverdə
-- hesablayır, yalnız menbe='server' sətirlərini oxuyur). Bu miqrasiya həmin
-- qorumanın YERİNİ yaradır və köhnə sətirləri dürüst işarələyir.
--
-- GERİYƏ UYĞUNLUQ: heç bir sütun silinmir, heç bir sətir dəyişdirilmir.
-- Mövcud snapshot və bal sətirləri menbe='klient' kimi işarələnir (DEFAULT) —
-- saxlanılır, çünki kalibrləmə üçün dəyərlidirlər, sadəcə kredit qərarında
-- İŞLƏDİLMİRLƏR. hektar_server backfill ayrıca skriptlədir
-- (scripts/hektar-backfill.mjs), çünki geodezik düstur JS-dədir.

-- ── Sahə: geodezik hektar və kontur barmaq izi ────────────────────────
-- hektar sütunu SAXLANILIR: klientin dediyi, yalnız diaqnostika üçün.
-- Avtoritativ dəyər hektar_server-dir.
ALTER TABLE saheler ADD COLUMN IF NOT EXISTS hektar_server REAL;
ALTER TABLE saheler ADD COLUMN IF NOT EXISTS kontur_hash TEXT;

COMMENT ON COLUMN saheler.hektar IS
  'Klientin göndərdiyi hektar — DİAQNOSTİKA ÜÇÜN. Anderraytinq bunu OXUMUR.';
COMMENT ON COLUMN saheler.hektar_server IS
  'Serverdə konturdan hesablanan geodezik hektar — AVTORİTATİV dəyər.';
COMMENT ON COLUMN saheler.kontur_hash IS
  'Normallaşdırılmış konturun sha256-sı (lib/konturHash.js). Peyk sübutu buna bağlanır.';

-- ── Peyk snapshot-ları: mənbə, kontur bağlantısı, hesablama versiyası ──
ALTER TABLE peyk_snapshotlar ADD COLUMN IF NOT EXISTS menbe TEXT NOT NULL DEFAULT 'klient';
ALTER TABLE peyk_snapshotlar ADD COLUMN IF NOT EXISTS kontur_hash TEXT;
ALTER TABLE peyk_snapshotlar ADD COLUMN IF NOT EXISTS hesablama_versiyasi TEXT;
ALTER TABLE peyk_snapshotlar ADD COLUMN IF NOT EXISTS dovr_son DATE;

ALTER TABLE peyk_snapshotlar DROP CONSTRAINT IF EXISTS peyk_snapshotlar_menbe_chk;
ALTER TABLE peyk_snapshotlar ADD CONSTRAINT peyk_snapshotlar_menbe_chk
  CHECK (menbe IN ('server', 'klient'));

COMMENT ON COLUMN peyk_snapshotlar.menbe IS
  'server = Copernicus-dan serverin ozu getirib (anderraytinq yalniz bunu oxuyur) — klient = brauzerden gelib.';

-- Köhnə UNIQUE (sahe_id, nov) mənbəni tanımırdı: serverin yazdığı sətir
-- klientinkini əvəz edərdi. İndi hər mənbə öz sətrini saxlayır.
-- 001-də bu UNIQUE cədvəl daxilində yazılıb, yəni İNDEKS YOX, CONSTRAINT-dir:
-- DROP INDEX onu silə bilmir (indeksi constraint tutur).
ALTER TABLE peyk_snapshotlar DROP CONSTRAINT IF EXISTS peyk_snapshotlar_sahe_id_nov_key;
CREATE UNIQUE INDEX IF NOT EXISTS peyk_snapshot_sahe_nov_menbe_idx
  ON peyk_snapshotlar (sahe_id, nov, menbe);
CREATE INDEX IF NOT EXISTS peyk_snapshot_kontur_idx
  ON peyk_snapshotlar (sahe_id, kontur_hash);

-- ── Bal jurnalı: balı kim hesablayıb ──────────────────────────────────
ALTER TABLE bal_jurnali ADD COLUMN IF NOT EXISTS menbe TEXT NOT NULL DEFAULT 'klient';
ALTER TABLE bal_jurnali ADD COLUMN IF NOT EXISTS kontur_hash TEXT;

ALTER TABLE bal_jurnali DROP CONSTRAINT IF EXISTS bal_jurnali_menbe_chk;
ALTER TABLE bal_jurnali ADD CONSTRAINT bal_jurnali_menbe_chk
  CHECK (menbe IN ('server', 'klient'));

COMMENT ON COLUMN bal_jurnali.menbe IS
  'server = FarmScore serverde hesablanib (qerar ucun yegane etibarli menbe) — klient = brauzerden gelib.';

-- ── Qərarın söykəndiyi sübut: hansı sahə, hansı kontur, hansı versiya ──
-- Qərardan geriyə "hansı məlumatla verilib" sualına cavab verə bilmək üçün.
ALTER TABLE credit_decisions ADD COLUMN IF NOT EXISTS sahe_id BIGINT REFERENCES saheler(id);
ALTER TABLE credit_decisions ADD COLUMN IF NOT EXISTS kontur_hash TEXT;
ALTER TABLE credit_decisions ADD COLUMN IF NOT EXISTS hektar_server REAL;
ALTER TABLE credit_decisions ADD COLUMN IF NOT EXISTS bal_menbe TEXT;

COMMENT ON COLUMN credit_decisions.kontur_hash IS
  'Qərar anındakı kontur — sahə sonradan dəyişsə də qərarın sübutu dəyişmir.';

-- ── Bir fermer, bir aktiv kredit ──────────────────────────────────────
-- 002-də yalnız BİR AÇIQ MÜRACİƏT təkləşdirilmişdi; kredit qəbul olunandan
-- sonra müraciət 'accepted' olur və fermer yenisini aça bilirdi. İkinci
-- aktiv kredit yaransaydı, ödəniş yolu (ORDER BY id DESC LIMIT 1) köhnə
-- krediti həm UI-dan, həm ödənişdən itirərdi.
--
-- DİQQƏT: bu indeks bazada artıq iki aktiv krediti olan istifadəçi varsa
-- YARADILMIR və miqrasiya dayanır. Ona görə tətbiqdən əvvəl read-only
-- yoxlama işlədilir: scripts/butovluk-yoxla.mjs (workflow: butovluk.yml).
CREATE UNIQUE INDEX IF NOT EXISTS loan_bir_aktiv_idx
  ON loans (istifadeci_id) WHERE status = 'active';

-- ── Təklif qəbulu üçün idempotentlik açarı ────────────────────────────
-- Müraciətdə (002) və ödənişdə (loan_events) açar vardı, təklif qəbulunda
-- yox idi: təkrarı yalnız loans.offer_id UNIQUE tuturdu, yəni "eyni sorğu
-- iki dəfə gəldi" ilə "başqa təklifi qəbul etmək istədi" fərqlənmirdi.
ALTER TABLE loans ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS loan_idempotent_idx
  ON loans (istifadeci_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
