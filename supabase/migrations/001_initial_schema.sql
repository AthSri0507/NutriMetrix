-- FoodRank India — Initial Database Schema
-- Supabase (PostgreSQL)
-- Migration 001: Core tables for products, nutrients, categories, and user scans

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- trigram matching for fuzzy search

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,  -- URL-friendly name
  parent_id   UUID REFERENCES categories(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_slug ON categories(slug);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode         TEXT UNIQUE,  -- EAN-13, EAN-8, or UPC-A
  name            TEXT NOT NULL,
  brand           TEXT,
  category_id     UUID REFERENCES categories(id),
  grade           CHAR(1) NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D')),
  score           INTEGER NOT NULL CHECK (score >= 0 AND score <= 40),
  image_url       TEXT,
  serving_size    TEXT,  -- e.g. "30g", "200ml"
  data_source     TEXT NOT NULL DEFAULT 'manual',  -- 'manual', 'off_api', 'ocr'
  data_complete   BOOLEAN NOT NULL DEFAULT false,
  off_id          TEXT,  -- Open Food Facts product code (if sourced from OFF)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_grade ON products(grade);
CREATE INDEX idx_products_score ON products(score);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_brand_trgm ON products USING gin (brand gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Nutrients (per 100g/100ml)
-- ---------------------------------------------------------------------------

CREATE TABLE nutrients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  energy_kj        NUMERIC(8,2),
  energy_kcal      NUMERIC(8,2),
  protein_g        NUMERIC(6,2),
  carbohydrates_g  NUMERIC(6,2),
  sugars_g         NUMERIC(6,2),
  fat_g            NUMERIC(6,2),
  saturated_fat_g  NUMERIC(6,2),
  fibre_g          NUMERIC(6,2),
  sodium_mg        NUMERIC(8,2),
  salt_g           NUMERIC(6,2),
  -- Additional nutrients tracked by FSSAI
  trans_fat_g      NUMERIC(6,2),
  cholesterol_mg   NUMERIC(8,2),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Data flags (community reporting)
-- ---------------------------------------------------------------------------

CREATE TABLE product_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  flag_type   TEXT NOT NULL CHECK (flag_type IN ('incorrect_data', 'missing_info', 'duplicate', 'other')),
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_flags_product ON product_flags(product_id);
CREATE INDEX idx_flags_status ON product_flags(status);

-- ---------------------------------------------------------------------------
-- Scan history (anonymous by default, linked to user if logged in)
-- ---------------------------------------------------------------------------

CREATE TABLE scan_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,  -- nullable for anonymous users
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scans_user ON scan_history(user_id);
CREATE INDEX idx_scans_product ON scan_history(product_id);
CREATE INDEX idx_scans_time ON scan_history(scanned_at DESC);

-- ---------------------------------------------------------------------------
-- Row-Level Security (RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrients ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;

-- Products and nutrients are publicly readable
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Nutrients are viewable by everyone"
  ON nutrients FOR SELECT
  USING (true);

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- Flags can be created by anyone but only viewed/managed by service role
CREATE POLICY "Anyone can create flags"
  ON product_flags FOR INSERT
  WITH CHECK (true);

-- Scan history: users can only see their own scans
CREATE POLICY "Users can view own scans"
  ON scan_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON scan_history FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- View: products with nutrients joined (for convenience)
-- ---------------------------------------------------------------------------

CREATE VIEW products_with_nutrients AS
SELECT
  p.*,
  n.energy_kj,
  n.energy_kcal,
  n.protein_g,
  n.carbohydrates_g,
  n.sugars_g,
  n.fat_g,
  n.saturated_fat_g,
  n.fibre_g,
  n.sodium_mg,
  n.salt_g,
  n.trans_fat_g,
  n.cholesterol_mg,
  c.name AS category_name,
  c.slug AS category_slug
FROM products p
LEFT JOIN nutrients n ON n.product_id = p.id
LEFT JOIN categories c ON c.id = p.category_id;
