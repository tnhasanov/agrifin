-- 005 — Bazar: sifariş, sifariş sətri, hadisə izi, maliyyələşdirmə sorğusu.
--
-- ═══ NİYƏ BU FORMA ════════════════════════════════════════════════════
-- Bazar sifarişi GƏLƏCƏK ANDERRAYTİNQ MƏLUMATIDIR: fermer nə vaxt, nə qədər,
-- hansı təchizatçıdan, hansı rayona, hansı sahə üçün nə alıb — FarmScore-un
-- növbəti girişi budur. Ona görə hər sifariş sahə/bitki/hektar kontekstini
-- və hər sətir məhsulun adı/kateqoriyası/təchizatçısı/qiymətini SURƏT kimi
-- daşıyır (kredit qərarındakı decision_inputs prinsipi): kataloq dəyişsə
-- də dünənki sifariş izah oluna bilir.
--
-- Kataloqun özü (məhsul, təchizatçı, kateqoriya) HƏLƏ BAZADA DEYİL —
-- lib/bazar/kataloq.js nümunə modulundadır və server qiyməti YALNIZ oradan
-- oxuyur. Faza 2-də (təchizatçı özü qiymət yazanda) marketplace_products /
-- marketplace_suppliers cədvəlləri gələcək; sətir surətləri o vaxt da qalır.
--
-- HADİSƏ İZİNDƏ `actor` VAR: "kim etdi" sualı cavabsız qalmır (fermer,
-- sistem, operator). Kredit cədvəllərində bu sütunun olmaması auditdə
-- boşluq kimi çıxdı — burada əvvəldən qoyulur.
--
-- Bütün istifadəçi FK-ları RESTRICT-dir (003 ilə eyni prinsip): sifariş
-- maliyyə/audit qeydidir, istifadəçi silinəndə səssizcə itməməlidir.
--
-- Hər əmr təkrar icraya davamlıdır (bax: lib/miqrasiya.js qaydası).

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- İnsan üçün nömrə: AF-000123. id-dən törəyir, ona görə unikaldır.
  order_no TEXT GENERATED ALWAYS AS ('AF-' || lpad(id::text, 6, '0')) STORED,
  istifadeci_id BIGINT NOT NULL REFERENCES istifadeciler(id) ON DELETE RESTRICT,
  -- Sahə konteksti sifariş ANINDA: sahə sonradan dəyişsə də snapshot qalır
  sahe_id BIGINT REFERENCES saheler(id) ON DELETE SET NULL,
  crop TEXT,
  hectares REAL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','confirmed','preparing','delivering','completed','cancelled')),
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('on_delivery','agrofin_financing')),
  financing_requested BOOLEAN NOT NULL DEFAULT false,
  -- Çatdırılma: rayon kodu anderraytinq üçün, qalanı təchizatçı üçün
  delivery_district TEXT NOT NULL,
  delivery_address TEXT,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  note TEXT,
  -- Yekunlar SERVERDƏ hesablanır (lib/bazar/sifaris.js); klient rəqəmi yazmır
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  catalog_version TEXT NOT NULL,
  expected_delivery_on DATE,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_order_idempotent_idx
  ON marketplace_orders (istifadeci_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS marketplace_order_istifadeci_idx
  ON marketplace_orders (istifadeci_id, created_at DESC);

-- Sətirlər: məhsulun surəti. product_code kataloq açarıdır; ad, kateqoriya,
-- təchizatçı və qiymət sifariş anındakı dəyərlərdir.
CREATE TABLE IF NOT EXISTS marketplace_order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES marketplace_orders(id) ON DELETE RESTRICT,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category_code TEXT NOT NULL,
  supplier_code TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  unit TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  financing_eligible BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS marketplace_order_item_idx
  ON marketplace_order_items (order_id);

-- Hadisə izi: yalnız artır. actor = 'farmer' | 'system' | 'operator:<id>' | 'supplier:<kod>'
CREATE TABLE IF NOT EXISTS marketplace_order_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES marketplace_orders(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  detay JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_order_event_idx
  ON marketplace_order_events (order_id, created_at);

-- Maliyyələşdirmə sorğusu: sifarişi kredit müraciətinə bağlayır.
-- Kredit mühərriki TƏKRARLANMIR — müraciət credit_applications-da yaranır
-- (api/kredit.js), bura yalnız istinad və uyğunluq yoxlamasının snapshot-u düşür.
CREATE TABLE IF NOT EXISTS marketplace_financing_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES marketplace_orders(id) ON DELETE RESTRICT,
  istifadeci_id BIGINT NOT NULL REFERENCES istifadeciler(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','linked','withdrawn')),
  eligibility_snapshot JSONB,
  credit_application_id BIGINT REFERENCES credit_applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_financing_istifadeci_idx
  ON marketplace_financing_requests (istifadeci_id, created_at DESC);
