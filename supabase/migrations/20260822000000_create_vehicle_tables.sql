-- Vehicle management tables for POS

-- 1. Kategori motor
CREATE TABLE IF NOT EXISTS vehicle_kategori (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  icon text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- 2. Merek motor
CREATE TABLE IF NOT EXISTS vehicle_brands (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- 3. Tipe motor (with kategori FK)
CREATE TABLE IF NOT EXISTS vehicle_models (
  id serial PRIMARY KEY,
  brand_id integer REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  vehicle_kategori_id integer REFERENCES vehicle_kategori(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- 4. Kode motor (per model)
CREATE TABLE IF NOT EXISTS vehicle_codes (
  id serial PRIMARY KEY,
  vehicle_model_id integer REFERENCES vehicle_models(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  year_start integer,
  year_end integer,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

-- 5. Pivot: kompatibilitas produk dengan kendaraan
CREATE TABLE IF NOT EXISTS product_vehicle_compatibilities (
  id serial PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  vehicle_model_id integer REFERENCES vehicle_models(id) ON DELETE CASCADE,
  vehicle_brand_id integer REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  vehicle_kategori_id integer REFERENCES vehicle_kategori(id) ON DELETE SET NULL,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamp DEFAULT now(),
  UNIQUE(product_id, vehicle_model_id)
);

-- Indexes untuk query cepat
CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand_id ON vehicle_models(brand_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_kategori_id ON vehicle_models(vehicle_kategori_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_codes_model_id ON vehicle_codes(vehicle_model_id);
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compatibilities_product_id ON product_vehicle_compatibilities(product_id);
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compatibilities_model_id ON product_vehicle_compatibilities(vehicle_model_id);
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compatibilities_brand_id ON product_vehicle_compatibilities(vehicle_brand_id);
CREATE INDEX IF NOT EXISTS idx_product_vehicle_compatibilities_kategori_id ON product_vehicle_compatibilities(vehicle_kategori_id);
