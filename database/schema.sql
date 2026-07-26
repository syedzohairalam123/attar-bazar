-- ═══════════════════════════════════════════════════════════════════
-- ATTAR BAZAAR — Complete Database Schema (Single File, Paste-and-Run)
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ───────────────────────────────────────────────────────────────────
-- 1. SETTINGS — website copy, all editable live from /admin/settings
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('site_name', 'Attar Bazaar'),
  ('tagline', 'Scents that tell your story'),
  ('hero_title', 'Pakistan''s Most Exclusive\nPerfume Marketplace'),
  ('hero_subtitle', 'Discover rare attars, luxury fragrances, and signature scents — directly from verified sellers across Pakistan.'),
  ('hero_cta', 'Explore Fragrances'),
  ('about_text', 'Attar Bazaar is Pakistan''s first dedicated peer-to-peer perfume marketplace where you can buy and sell luxury fragrances, rare attars, and signature scents directly — without any middleman.'),
  ('mission_text', 'Our mission is to give every Pakistani easy and affordable access to their favourite fragrances, and provide sellers with a trusted platform to grow their business.'),
  ('founded_year', '2024'),
  ('contact_email', 'syedzohairalam@gmail.com'),
  ('whatsapp_number', '923190958709'),
  ('address', 'Karachi, Pakistan'),
  ('instagram', 'https://instagram.com/attarbazaar'),
  ('facebook', 'https://facebook.com/attarbazaar')
ON CONFLICT (key) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- 2. PROFILES — extends Supabase auth.users with Multi-Role Support
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer','seller','admin')),
  city TEXT,
  whatsapp TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  -- Multi-role boolean flags for comprehensive role management
  is_buyer BOOLEAN DEFAULT TRUE,
  is_seller BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure at least one role is always active constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'profiles' AND constraint_name = 'check_at_least_one_role'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT check_at_least_one_role CHECK (is_buyer = TRUE OR is_seller = TRUE OR is_admin = TRUE);
  END IF;
END $$;

-- Auto-create a profile row on signup supporting multi-role metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'buyer');
  
  INSERT INTO profiles (id, full_name, role, is_buyer, is_seller, is_admin)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), 
    user_role,
    TRUE,
    CASE WHEN user_role IN ('seller', 'admin') THEN TRUE ELSE FALSE END,
    CASE WHEN user_role = 'admin' THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Security function to protect admin role escalation
CREATE OR REPLACE FUNCTION public.protect_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
      RAISE EXCEPTION 'Unauthorized: Only existing administrators can modify admin privileges.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_admin_escalation ON public.profiles;
CREATE TRIGGER tr_protect_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_escalation();

-- ───────────────────────────────────────────────────────────────────
-- 3. CATEGORIES
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, slug) VALUES
  ('Attar / Oud', 'attar-oud'), ('Arabian Perfumes', 'arabian'), ('Designer Fragrances', 'designer'),
  ('Concentrated Perfume Oils', 'perfume-oils'), ('Incense & Bakhoor', 'bakhoor'), ('Floral Scents', 'floral'),
  ('Woody & Musky', 'woody-musky'), ('Fresh & Citrus', 'fresh-citrus')
ON CONFLICT (slug) DO NOTHING;

-- ───────────────────────────────────────────────────────────────────
-- 4. PERFUMES
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  original_price NUMERIC(10,2),
  condition TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new','like-new','used')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  images TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','pending','rejected')),
  featured BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- 5. ORDERS
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  perfume_id UUID REFERENCES perfumes(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('jazzcash','easypaisa','cod','bank')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','dispatched','out_for_delivery','delivered','cancelled')),
  buyer_name TEXT,
  buyer_phone TEXT,
  buyer_email TEXT,
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────
-- 6. CONTACT MESSAGES & 7. LOGIN HISTORY
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device TEXT,
  location TEXT,
  ip_address TEXT,
  is_new_device BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_read" ON settings;
DROP POLICY IF EXISTS "settings_write" ON settings;
CREATE POLICY "settings_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_write" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_write" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_write" ON categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

ALTER TABLE perfumes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfumes_select" ON perfumes;
DROP POLICY IF EXISTS "perfumes_insert" ON perfumes;
DROP POLICY IF EXISTS "perfumes_update" ON perfumes;
DROP POLICY IF EXISTS "perfumes_delete" ON perfumes;
CREATE POLICY "perfumes_select" ON perfumes FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "perfumes_insert" ON perfumes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND seller_id = auth.uid());
CREATE POLICY "perfumes_update" ON perfumes FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "perfumes_delete" ON perfumes FOR DELETE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND buyer_id = auth.uid());
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_insert" ON contact_messages;
DROP POLICY IF EXISTS "contact_admin" ON contact_messages;
DROP POLICY IF EXISTS "contact_admin_update" ON contact_messages;
CREATE POLICY "contact_insert" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_admin" ON contact_messages FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "contact_admin_update" ON contact_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_insert" ON login_history;
DROP POLICY IF EXISTS "login_select" ON login_history;
CREATE POLICY "login_insert" ON login_history FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "login_select" ON login_history FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES & PERFORMANCE
-- ═══════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_perfumes_seller ON perfumes(seller_id);
CREATE INDEX IF NOT EXISTS idx_perfumes_status ON perfumes(status);
CREATE INDEX IF NOT EXISTS idx_perfumes_category ON perfumes(category_id);
CREATE INDEX IF NOT EXISTS idx_perfumes_created ON perfumes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_buyer ON profiles(is_buyer);
CREATE INDEX IF NOT EXISTS idx_profiles_is_seller ON profiles(is_seller);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);