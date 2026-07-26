-- ═══════════════════════════════════════════════════════════════════
-- ATTAR BAZAAR — FINAL CONSOLIDATED DATABASE SCHEMA
-- Complete Multi-Role Authentication System
-- 
-- This is the FINAL consolidated SQL file that contains:
-- 1. Complete database schema with all tables
-- 2. Multi-role authentication system (is_buyer, is_seller, is_admin flags)
-- 3. All security functions, triggers, and RLS policies
-- 4. Performance indexes and optimizations
-- 5. Sample data (only inserts if tables are empty)
--
-- INSTRUCTIONS FOR FRESH DATABASE SETUP:
-- Supabase Dashboard → SQL Editor → New Query → paste this whole file → Run
--
-- FOR EXISTING DATABASES:
-- This file is safe to re-run. It uses IF NOT EXISTS and DROP-then-CREATE
-- patterns, so it will not duplicate your data or error out on existing objects.
-- ═══════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ───────────────────────────────────────────────────────────────────
-- 1. SETTINGS TABLE — website configuration
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
-- 2. PROFILES TABLE — extends Supabase auth.users with multi-role support
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

-- Add multi-role columns if they don't exist (for existing databases)
DO $$
BEGIN
  -- Add is_buyer column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_buyer') THEN
    ALTER TABLE profiles ADD COLUMN is_buyer BOOLEAN DEFAULT TRUE;
  END IF;
  
  -- Add is_seller column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_seller') THEN
    ALTER TABLE profiles ADD COLUMN is_seller BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add is_admin column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Migrate existing role data to multi-role flags
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    UPDATE public.profiles
    SET 
      is_admin = CASE WHEN role = 'admin' THEN TRUE ELSE COALESCE(is_admin, FALSE) END,
      is_seller = CASE WHEN role = 'seller' OR role = 'admin' THEN TRUE ELSE COALESCE(is_seller, FALSE) END,
      is_buyer = CASE WHEN role = 'buyer' OR role = 'admin' OR role IS NULL THEN TRUE ELSE COALESCE(is_buyer, TRUE) END
    WHERE is_buyer IS NULL OR is_seller IS NULL OR is_admin IS NULL;
  END IF;
END $$;

-- Ensure at least one role is always active
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS check_at_least_one_role;
ALTER TABLE profiles 
ADD CONSTRAINT check_at_least_one_role 
CHECK (is_buyer = TRUE OR is_seller = TRUE OR is_admin = TRUE);

-- ───────────────────────────────────────────────────────────────────
-- 3. CATEGORIES TABLE
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
-- 4. PERFUMES TABLE
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
-- 5. ORDERS TABLE
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

-- Migrate old 'shipped' status to new values if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
    BEGIN
      ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
      ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','confirmed','dispatched','out_for_delivery','delivered','cancelled'));
      UPDATE orders SET status = 'dispatched' WHERE status = 'shipped';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 6. CONTACT MESSAGES TABLE
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

-- ───────────────────────────────────────────────────────────────────
-- 7. LOGIN HISTORY TABLE
-- ───────────────────────────────────────────────────────────────────
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
-- MULTI-ROLE SYSTEM FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════

-- Update handle_new_user function for multi-role support
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
        CASE WHEN user_role IN ('buyer', 'admin') THEN TRUE ELSE TRUE END,
        CASE WHEN user_role IN ('seller', 'admin') THEN TRUE ELSE FALSE END,
        CASE WHEN user_role = 'admin' THEN TRUE ELSE FALSE END
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Security function to protect admin role escalation
CREATE OR REPLACE FUNCTION public.protect_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if 'is_admin' field is being modified
    IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
        -- Only allow admin escalation if the user is already an admin
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
            RAISE EXCEPTION 'Unauthorized: Only existing administrators can modify admin privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach admin protection trigger
DROP TRIGGER IF EXISTS tr_protect_admin_escalation ON public.profiles;
CREATE TRIGGER tr_protect_admin_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_admin_escalation();

-- Admin promotion function (server-side only)
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verify the caller is an admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE) THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can promote users to admin.';
        RETURN FALSE;
    END IF;
    
    -- Promote the target user
    UPDATE public.profiles
    SET is_admin = TRUE
    WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Role activation helpers
CREATE OR REPLACE FUNCTION public.activate_seller_role()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.profiles
    SET is_seller = TRUE
    WHERE id = auth.uid();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.activate_buyer_role()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.profiles
    SET is_buyer = TRUE
    WHERE id = auth.uid();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════════

-- Settings policies
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_read" ON settings;
DROP POLICY IF EXISTS "settings_write" ON settings;
CREATE POLICY "settings_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_write" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Profiles policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Categories policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_write" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_write" ON categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Perfumes policies
ALTER TABLE perfumes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfumes_select" ON perfumes;
DROP POLICY IF EXISTS "perfumes_insert" ON perfumes;
DROP POLICY IF EXISTS "perfumes_update" ON perfumes;
DROP POLICY IF EXISTS "perfumes_delete" ON perfumes;
CREATE POLICY "perfumes_select" ON perfumes FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "perfumes_insert" ON perfumes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND seller_id = auth.uid());
CREATE POLICY "perfumes_update" ON perfumes FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "perfumes_delete" ON perfumes FOR DELETE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Orders policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND buyer_id = auth.uid());
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Contact messages policies
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_insert" ON contact_messages;
DROP POLICY IF EXISTS "contact_admin" ON contact_messages;
DROP POLICY IF EXISTS "contact_admin_update" ON contact_messages;
CREATE POLICY "contact_insert" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_admin" ON contact_messages FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "contact_admin_update" ON contact_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Login history policies
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_insert" ON login_history;
DROP POLICY IF EXISTS "login_select" ON login_history;
CREATE POLICY "login_insert" ON login_history FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "login_select" ON login_history FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ═══════════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES
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

-- ═══════════════════════════════════════════════════════════════════
-- REALTIME SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'perfumes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE perfumes;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Realtime publication step skipped: %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- STORAGE BUCKET FOR PERFUME IMAGES
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('perfumes', 'perfumes', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "perfumes_storage_read" ON storage.objects;
DROP POLICY IF EXISTS "perfumes_storage_upload" ON storage.objects;
DROP POLICY IF EXISTS "perfumes_storage_delete" ON storage.objects;
CREATE POLICY "perfumes_storage_read" ON storage.objects FOR SELECT USING (bucket_id = 'perfumes');
CREATE POLICY "perfumes_storage_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'perfumes' AND auth.uid() IS NOT NULL);
CREATE POLICY "perfumes_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'perfumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════════════════════════════════════
-- SAMPLE DATA (only inserts if tables are empty)
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
  cat_attar UUID; cat_arabian UUID; cat_designer UUID; cat_oils UUID; cat_floral UUID; cat_woody UUID;
  seller_id UUID;
  existing_count INT;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM perfumes;
  IF existing_count > 0 THEN
    RAISE NOTICE 'perfumes already has % rows — skipping sample data.', existing_count;
    RETURN;
  END IF;

  SELECT id INTO cat_attar FROM categories WHERE slug = 'attar-oud';
  SELECT id INTO cat_arabian FROM categories WHERE slug = 'arabian';
  SELECT id INTO cat_designer FROM categories WHERE slug = 'designer';
  SELECT id INTO cat_oils FROM categories WHERE slug = 'perfume-oils';
  SELECT id INTO cat_floral FROM categories WHERE slug = 'floral';
  SELECT id INTO cat_woody FROM categories WHERE slug = 'woody-musky';
  SELECT id INTO seller_id FROM profiles LIMIT 1;

  IF seller_id IS NULL THEN
    RAISE NOTICE 'No profiles exist yet — sign up on the website first, then re-run this script to add sample listings.';
    RETURN;
  END IF;

  INSERT INTO perfumes (title, brand, description, price, original_price, condition, quantity, images, category_id, seller_id, city, status, featured, views) VALUES
  ('Oud Rose 100ml', 'Al Haramain', 'A masterful blend of rich oud and delicate rose. Spray bottle, 80% remaining. Box included.', 4500, 6000, 'like-new', 1, ARRAY['/samples/oud-rose.svg'], cat_attar, seller_id, 'Karachi', 'active', true, 47),
  ('Musk Al Tahara 50ml', 'Swiss Arabian', 'Classic white musk — clean, long-lasting. Brand new, sealed bottle.', 2200, NULL, 'new', 3, ARRAY['/samples/musk-tahara.svg'], cat_arabian, seller_id, 'Lahore', 'active', true, 83),
  ('Bakhoor Al Oud Chips 100g', 'Naseem', 'Premium bakhoor chips from Saudi Arabia. Burn on charcoal for a rich fragrance.', 1800, 2500, 'new', 2, ARRAY['/samples/bakhoor-chips.svg'], cat_attar, seller_id, 'Islamabad', 'active', false, 29),
  ('Sauvage Inspired Attar 12ml', 'Local Craftsman', 'Fresh, woody, and magnetic. Concentrated oil lasts 12–14 hours. No alcohol.', 950, NULL, 'new', 5, ARRAY['/samples/sauvage-attar.svg'], cat_oils, seller_id, 'Karachi', 'active', false, 112),
  ('Arabian Night 75ml EDP', 'Lattafa', 'Oriental woody fragrance with amber, oud, and sandalwood. Bottle is 70% full.', 2800, 3500, 'like-new', 1, ARRAY['/samples/arabian-night.svg'], cat_arabian, seller_id, 'Multan', 'active', true, 61),
  ('Rose Floral Concentrate 6ml', 'Natural Oils', 'Pure Bulgarian rose concentrate. A single drop lasts all day.', 1200, NULL, 'like-new', 1, ARRAY['/samples/rose-floral.svg'], cat_floral, seller_id, 'Faisalabad', 'active', false, 38),
  ('Oud Wood Inspired 30ml', 'Tom Ford Impression', 'Warm, woody, sophisticated. 85% remaining.', 3200, 4500, 'like-new', 1, ARRAY['/samples/oud-wood.svg'], cat_woody, seller_id, 'Karachi', 'active', true, 94),
  ('Amber Musk 100ml EDT', 'Junaid Jamshed', 'Warm, sweet amber with soft musk. Full bottle, brand new.', 1500, NULL, 'new', 4, ARRAY['/samples/amber-musk.svg'], cat_arabian, seller_id, 'Peshawar', 'active', false, 22),
  ('Royal Oud Collection 50ml', 'Creed Impression', 'Cedar, oud, bergamot. Very lightly used, 95% remaining. Box included.', 5500, 7000, 'like-new', 1, ARRAY['/samples/royal-oud.svg'], cat_designer, seller_id, 'Lahore', 'active', true, 156),
  ('Saffron Oud Pure Oil 10ml', 'Ajmal Impression', 'Saffron and oud in a concentrated oil format. Brand new.', 2600, NULL, 'new', 2, ARRAY['/samples/saffron-oud.svg'], cat_oils, seller_id, 'Karachi', 'active', false, 45),
  ('Jasmine Garden 100ml EDP', 'Rasasi', 'Fresh, white floral with jasmine, gardenia, and musky base. 90% remaining.', 1900, 2400, 'like-new', 1, ARRAY['/samples/jasmine-garden.svg'], cat_floral, seller_id, 'Rawalpindi', 'active', false, 33),
  ('Black Oud Intense 75ml', 'Maison Oud', 'Dark, smoky oud with hints of leather and tobacco. 80% remaining.', 3800, 5200, 'used', 1, ARRAY['/samples/black-oud.svg'], cat_attar, seller_id, 'Hyderabad', 'active', true, 71);

  RAISE NOTICE 'Inserted 12 sample perfume listings with local images.';
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- HOW TO CREATE YOUR FIRST ADMIN USER
-- ═══════════════════════════════════════════════════════════════════
-- 
-- IMPORTANT: The security trigger prevents users from promoting themselves
-- to admin. To create your first admin, you need to temporarily disable
-- the trigger, promote a user, then re-enable it.
--
-- Step 1: Sign up on the website first to create a user account
-- Step 2: Run this SQL in Supabase SQL Editor:
--
-- -- Disable the protection trigger temporarily
-- DROP TRIGGER IF EXISTS tr_protect_admin_escalation ON public.profiles;
--
-- -- Promote your user to admin (replace USER_ID with your actual user ID)
-- UPDATE public.profiles
-- SET is_admin = true, is_seller = true
-- WHERE id = 'YOUR_USER_ID_HERE';
--
-- -- Re-enable the protection trigger
-- CREATE TRIGGER tr_protect_admin_escalation
-- BEFORE UPDATE ON public.profiles
-- FOR EACH ROW
-- EXECUTE FUNCTION public.protect_admin_escalation();
--
-- Step 3: Refresh the website — you will now see the Admin Portal option
-- 
-- ═══════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════
-- 
-- Run these queries to verify the installation:
--
-- -- Check if multi-role columns exist
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('is_buyer', 'is_seller', 'is_admin');
--
-- -- Check role distribution
-- SELECT 
--   COUNT(*) FILTER (WHERE is_buyer = TRUE) as buyer_count,
--   COUNT(*) FILTER (WHERE is_seller = TRUE) as seller_count,
--   COUNT(*) FILTER (WHERE is_admin = TRUE) as admin_count,
--   COUNT(*) FILTER (WHERE is_buyer = TRUE AND is_seller = TRUE) as buyer_seller_count,
--   COUNT(*) FILTER (WHERE is_buyer = TRUE AND is_seller = TRUE AND is_admin = TRUE) as all_roles_count
-- FROM profiles;
--
-- -- Check if functions exist
-- SELECT routine_name 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('activate_seller_role', 'activate_buyer_role', 'promote_to_admin', 'protect_admin_escalation');
--
-- ═══════════════════════════════════════════════════════════════════
-- INSTALLATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════
--
-- Your database now supports the complete multi-role system:
-- - Users can have Buyer, Seller, and Admin roles simultaneously
-- - Role switching is handled via boolean flags
-- - Admin escalation is protected by security trigger
-- - RLS policies use the new multi-role flags
-- - Helper functions for role activation are available
-- - Performance indexes are in place
-- - Realtime subscriptions are enabled
-- - Storage bucket is configured
--
-- ═══════════════════════════════════════════════════════════════════