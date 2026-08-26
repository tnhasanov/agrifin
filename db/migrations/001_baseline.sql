-- 001 — Faza 1 təməli: hesab, sahə, peyk snapshotu, bal jurnalı.
--
-- Bu fayl əvvəl db/schema.sql idi və HƏR API sorğusunda avtomatik işləyirdi.
-- İndi miqrasiya ardıcıllığının ilk addımıdır (bax: scripts/migrate.mjs).
-- Məzmun BİLƏRƏKDƏN dəyişdirilməyib: mövcud prodakşn bazasında bu cədvəllər
-- artıq var, IF NOT EXISTS onları olduğu kimi qəbul edir — heç nə itmir.
--
-- Adlar kod bazası ilə eyni dildədir (bax: README — adlandırma qaydası).

CREATE TABLE IF NOT EXISTS istifadeciler (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telefon TEXT UNIQUE NOT NULL,
  yaradilib TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OTP kodlar açıq saxlanılmır: sızan verilənlər bazası girişə çevrilməsin
CREATE TABLE IF NOT EXISTS otp_kodlar (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  telefon TEXT NOT NULL,
  kod_hash TEXT NOT NULL,
  ip TEXT,
  bitir TIMESTAMPTZ NOT NULL,
  cehd INT NOT NULL DEFAULT 0,
  istifade_olunub BOOLEAN NOT NULL DEFAULT false,
  yaradilib TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_telefon_idx ON otp_kodlar (telefon, yaradilib);

-- Sessiya tokeni də yalnız hash kimi yaşayır; cookie-dəki xam token
-- serverdə heç yerdə saxlanmır
CREATE TABLE IF NOT EXISTS sessiyalar (
  token_hash TEXT PRIMARY KEY,
  istifadeci_id BIGINT NOT NULL REFERENCES istifadeciler(id) ON DELETE CASCADE,
  bitir TIMESTAMPTZ NOT NULL,
  yaradilib TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessiya_istifadeci_idx ON sessiyalar (istifadeci_id);

-- Faza 1: hər istifadəçiyə BİR sahə (multi-field bilərəkdən təxirə salınıb —
-- istifadəçi qərarı). UNIQUE bunu bazada da təsbit edir.
CREATE TABLE IF NOT EXISTS saheler (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  istifadeci_id BIGINT NOT NULL UNIQUE REFERENCES istifadeciler(id) ON DELETE CASCADE,
  noqteler JSONB NOT NULL,
  hektar REAL,
  bitki TEXT,
  yenilenib TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bahalı peyk nəticələrinin server nüsxəsi (hazırda: tarixce). Brauzer keşi
-- silinsə və ya cihaz dəyişsə ölçmə itmir; anderrayter də EYNİ məlumatı görür.
CREATE TABLE IF NOT EXISTS peyk_snapshotlar (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sahe_id BIGINT NOT NULL REFERENCES saheler(id) ON DELETE CASCADE,
  nov TEXT NOT NULL,
  mezmun JSONB NOT NULL,
  yaradilib TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sahe_id, nov)
);

-- KALİBRLƏMƏ JURNALI. Hər indeks hesablanması giriş amilləri və cədvəl
-- versiyası ilə yazılır: ödəniş nəticələri yığılanda çəkiləri yenidən
-- hesablamaq YALNIZ bu jurnalla mümkündür (bax: scorecard sənədi, §8).
-- Yalnız INSERT olunur — sətirlər dəyişdirilmir və silinmir.
CREATE TABLE IF NOT EXISTS bal_jurnali (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sahe_id BIGINT NOT NULL REFERENCES saheler(id) ON DELETE CASCADE,
  bal INT NOT NULL,
  bant TEXT NOT NULL,
  etibar TEXT NOT NULL,
  amiller JSONB NOT NULL,
  cedvel_versiyasi TEXT NOT NULL,
  yaradilib TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bal_sahe_idx ON bal_jurnali (sahe_id, yaradilib);
