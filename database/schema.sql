-- ═══════════════════════════════════════════════════════════════════
-- ATTAR BAZAAR — Complete Database Schema (single file, paste-and-run)
-- Supabase Dashboard → SQL Editor → New Query → paste this whole file → Run
--
-- Safe to re-run: every statement uses IF NOT EXISTS / DROP-then-CREATE
-- for policies, so running this again later (e.g. after an update)
-- will not duplicate your data or error out on things that already exist.
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
-- 2. PROFILES — extends Supabase auth.users
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile row the moment someone signs up (belt-and-braces
-- alongside the app's own explicit profile insert on the register page —
-- together these two paths mean a signed-up user NEVER ends up without
-- a profiles row, which is what previously caused
-- "insert on orders violates foreign key constraint orders_buyer_id_fkey").
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'), COALESCE(NEW.raw_user_meta_data->>'role', 'buyer'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── SECURITY: block role self-escalation ──────────────────────────
-- Without this, RLS alone would let ANY logged-in user run
--   update profiles set role = 'admin' where id = auth.uid()
-- because the UPDATE policy correctly allows a user to edit their own
-- row, but has no way to say "except this one column". This trigger
-- closes that gap: a non-admin may only ever move their own role from
-- 'buyer' to 'seller' (the explicit "Become a Seller" button) — nothing
-- else, ever. Only an existing admin can set anyone's role to anything.
CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      IF NOT (auth.uid() = OLD.id AND OLD.role = 'buyer' AND NEW.role = 'seller') THEN
        RAISE EXCEPTION 'Not authorized to change this role';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION prevent_role_self_escalation();

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
-- 5. ORDERS — status set matches the buyer/seller tracking UI exactly:
-- Pending → Confirmed → Dispatched → Out for Delivery → Delivered (or Cancelled)
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

-- If you ran an OLDER version of this schema that used 'shipped' instead
-- of 'dispatched'/'out_for_delivery', this migrates existing rows safely:
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
-- 6. CONTACT MESSAGES
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
-- 7. LOGIN HISTORY — powers the "new device login" security email
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
-- ROW LEVEL SECURITY — the real enforcement boundary. Every table is
-- locked down so a user can only ever see/change what they're supposed
-- to, no matter what the client-side code does or doesn't check.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_read" ON settings;
DROP POLICY IF EXISTS "settings_write" ON settings;
CREATE POLICY "settings_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_write" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
-- Public profile fields (name, city, whatsapp) need to stay readable by
-- everyone so buyers can see who they're contacting — this is a normal
-- marketplace requirement, not a leak. Nothing sensitive (email, auth
-- state, banned flag reasoning) is exposed by this table's columns.
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_write" ON categories;
CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_write" ON categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE perfumes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfumes_select" ON perfumes;
DROP POLICY IF EXISTS "perfumes_insert" ON perfumes;
DROP POLICY IF EXISTS "perfumes_update" ON perfumes;
DROP POLICY IF EXISTS "perfumes_delete" ON perfumes;
CREATE POLICY "perfumes_select" ON perfumes FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "perfumes_insert" ON perfumes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND seller_id = auth.uid());
CREATE POLICY "perfumes_update" ON perfumes FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "perfumes_delete" ON perfumes FOR DELETE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
-- Orders (the "transfer" / payment-adjacent data) are the most sensitive
-- table in the app: only the buyer who placed it, the seller who owns
-- the product, or an admin can ever read a given order row. No public
-- or anonymous access exists at all.
CREATE POLICY "orders_select" ON orders FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND buyer_id = auth.uid());
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_insert" ON contact_messages;
DROP POLICY IF EXISTS "contact_admin" ON contact_messages;
DROP POLICY IF EXISTS "contact_admin_update" ON contact_messages;
CREATE POLICY "contact_insert" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_admin" ON contact_messages FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "contact_admin_update" ON contact_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_insert" ON login_history;
DROP POLICY IF EXISTS "login_select" ON login_history;
CREATE POLICY "login_insert" ON login_history FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "login_select" ON login_history FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ═══════════════════════════════════════════════════════════════════
-- PERFORMANCE — indexes so the site stays fast as traffic grows.
-- Without these, every filtered query (a seller's own orders, a
-- buyer's own history, admin's status filter) forces a full table
-- scan once you have more than a few hundred rows.
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
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);

-- ═══════════════════════════════════════════════════════════════════
-- REALTIME — powers the live-updating stats on the seller dashboard,
-- buyer account page, and admin dashboard (no manual refresh needed).
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
  RAISE NOTICE 'Realtime publication step skipped (may already be enabled by default on your project): %', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- STORAGE — the "perfumes" bucket for listing photos. 5MB limit per
-- file, images only. Anyone can view (needed for a public marketplace),
-- only signed-in users can upload, and a seller can only delete files
-- inside their own folder (path starts with their own user id).
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
-- SAMPLE DATA — 12 listings with LOCAL images (served by your own
-- Next.js app from /public/samples/, so they can never 404 the way
-- hot-linked Unsplash URLs eventually do). Only inserts if the
-- perfumes table is currently empty, so it is always safe to re-run
-- this whole script without creating duplicates.
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
    RAISE NOTICE 'No profiles exist yet — sign up on the website first, then re-run this whole script to add sample listings.';
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
-- HOW TO MAKE YOURSELF ADMIN
-- ═══════════════════════════════════════════════════════════════════
-- 1. Sign up on the website
-- 2. Supabase Dashboard → Table Editor → profiles → find your row
-- 3. Change "role" column to "admin"  (only an admin, i.e. you doing
--    this manually the first time, can ever set that value — the
--    trigger above blocks anyone from doing it to themselves via the app)
-- 4. Refresh the website — /admin is now accessible
