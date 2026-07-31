-- ═══════════════════════════════════════════════════════════════════
-- COMPLETE MULTI-ROLE SYSTEM MIGRATION
-- Attar Bazaar — Multi-Role Authentication System
-- 
-- This migration implements a complete multi-role system where one user
-- can have Buyer, Seller, and Admin roles simultaneously using boolean flags.
-- 
-- Key Features:
-- - One Supabase Auth User can have multiple roles
-- - Boolean flags: is_buyer, is_seller, is_admin
-- - Role switching without re-authentication
-- - Protected admin escalation
-- - Comprehensive RLS policies
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- 1. ADD MULTI-ROLE BOOLEAN COLUMNS TO PROFILES TABLE
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_buyer BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- ───────────────────────────────────────────────────────────────────
-- 2. MIGRATE EXISTING DATA FROM LEGACY ROLE FIELD
-- ───────────────────────────────────────────────────────────────────
DO $$ 
BEGIN
    -- Only run migration if the legacy role column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        UPDATE public.profiles
        SET 
            is_admin = CASE WHEN role = 'admin' THEN TRUE ELSE COALESCE(is_admin, FALSE) END,
            is_seller = CASE WHEN role = 'seller' OR role = 'admin' THEN TRUE ELSE COALESCE(is_seller, FALSE) END,
            is_buyer = CASE WHEN role = 'buyer' OR role = 'admin' OR role IS NULL THEN TRUE ELSE COALESCE(is_buyer, TRUE) END
        WHERE is_buyer IS NULL OR is_seller IS NULL OR is_admin IS NULL;
        
        RAISE NOTICE 'Migrated existing role data to multi-role flags';
    ELSE
        RAISE NOTICE 'Legacy role column not found - skipping data migration';
    END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 3. UPDATE HANDLE_NEW_USER FUNCTION FOR MULTI-ROLE SUPPORT
-- ───────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────
-- 4. RECREATE AUTH TRIGGER
-- ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ───────────────────────────────────────────────────────────────────
-- 5. SECURITY FUNCTION TO PROTECT ADMIN ROLE ESCALATION
-- ───────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────
-- 6. ATTACH ADMIN PROTECTION TRIGGER
-- ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_protect_admin_escalation ON public.profiles;
CREATE TRIGGER tr_protect_admin_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_admin_escalation();

-- ───────────────────────────────────────────────────────────────────
-- 7. UPDATE RLS POLICIES TO USE MULTI-ROLE FLAGS
-- ───────────────────────────────────────────────────────────────────

-- Settings policies
DROP POLICY IF EXISTS "settings_write" ON settings;
CREATE POLICY "settings_write" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Categories policies
DROP POLICY IF EXISTS "categories_write" ON categories;
CREATE POLICY "categories_write" ON categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Profiles policies
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Perfumes policies
DROP POLICY IF EXISTS "perfumes_select" ON perfumes;
CREATE POLICY "perfumes_select" ON perfumes FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "perfumes_update" ON perfumes;
CREATE POLICY "perfumes_update" ON perfumes FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "perfumes_delete" ON perfumes;
CREATE POLICY "perfumes_delete" ON perfumes FOR DELETE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Orders policies
DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Contact messages policies
DROP POLICY IF EXISTS "contact_admin" ON contact_messages;
CREATE POLICY "contact_admin" ON contact_messages FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "contact_admin_update" ON contact_messages;
CREATE POLICY "contact_admin_update" ON contact_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Login history policies
DROP POLICY IF EXISTS "login_select" ON login_history;
CREATE POLICY "login_select" ON login_history FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- ───────────────────────────────────────────────────────────────────
-- 8. CREATE ADMIN PROMOTION FUNCTION (SERVER-SIDE ONLY)
-- ───────────────────────────────────────────────────────────────────
-- This function allows admins to promote other users to admin role
-- It can only be called by existing admins via server-side code
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

-- ───────────────────────────────────────────────────────────────────
-- 9. CREATE ROLE ACTIVATION HELPERS
-- ───────────────────────────────────────────────────────────────────
-- Function to activate seller role for current user
CREATE OR REPLACE FUNCTION public.activate_seller_role()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.profiles
    SET is_seller = TRUE
    WHERE id = auth.uid();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to activate buyer role for current user
CREATE OR REPLACE FUNCTION public.activate_buyer_role()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.profiles
    SET is_buyer = TRUE
    WHERE id = auth.uid();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ───────────────────────────────────────────────────────────────────
-- 10. UPDATE PROFILES TABLE CONSTRAINTS
-- ───────────────────────────────────────────────────────────────────
-- Ensure at least one role is always active
ALTER TABLE public.profiles 
ADD CONSTRAINT check_at_least_one_role 
CHECK (is_buyer = TRUE OR is_seller = TRUE OR is_admin = TRUE);

-- ───────────────────────────────────────────────────────────────────
-- 11. CREATE INDEXES FOR PERFORMANCE
-- ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_is_buyer ON public.profiles(is_buyer);
CREATE INDEX IF NOT EXISTS idx_profiles_is_seller ON public.profiles(is_seller);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- ───────────────────────────────────────────────────────────────────
-- 12. VERIFICATION QUERIES
-- ───────────────────────────────────────────────────────────────────
-- Run these to verify the migration was successful

-- Check if columns exist
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name IN ('is_buyer', 'is_seller', 'is_admin');

-- Check role distribution
-- SELECT 
--   COUNT(*) FILTER (WHERE is_buyer = TRUE) as buyer_count,
--   COUNT(*) FILTER (WHERE is_seller = TRUE) as seller_count,
--   COUNT(*) FILTER (WHERE is_admin = TRUE) as admin_count,
--   COUNT(*) FILTER (WHERE is_buyer = TRUE AND is_seller = TRUE) as buyer_seller_count,
--   COUNT(*) FILTER (WHERE is_buyer = TRUE AND is_seller = TRUE AND is_admin = TRUE) as all_roles_count
-- FROM profiles;

-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- 
-- The database now supports the complete multi-role system:
-- - Users can have Buyer, Seller, and Admin roles simultaneously
-- - Role switching is handled via boolean flags
-- - Admin escalation is protected
-- - RLS policies use the new multi-role flags
-- - Helper functions for role activation are available
-- ═══════════════════════════════════════════════════════════════════