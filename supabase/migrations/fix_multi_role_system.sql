-- Multi-Role System Migration
-- This migration ensures the database properly supports the multi-role system
-- where one user can have Buyer, Seller, and Admin roles simultaneously.

-- 1. Add boolean role columns to profiles table if they don't already exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_buyer BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Migrate existing data from the old 'role' string column
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        UPDATE public.profiles
        SET 
            is_admin = CASE WHEN role = 'admin' THEN TRUE ELSE COALESCE(is_admin, FALSE) END,
            is_seller = CASE WHEN role = 'seller' OR role = 'admin' THEN TRUE ELSE COALESCE(is_seller, FALSE) END,
            is_buyer = CASE WHEN role = 'buyer' OR role = 'admin' OR role IS NULL THEN TRUE ELSE COALESCE(is_buyer, TRUE) END;
    END IF;
END $$;

-- 3. Update the handle_new_user function to set multi-role flags
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

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;

-- 6. Create security function to protect admin role escalation
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

-- 7. Recreate the trigger
DROP TRIGGER IF EXISTS tr_protect_admin_escalation ON public.profiles;
CREATE TRIGGER tr_protect_admin_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_admin_escalation();

-- 8. Update RLS policies to use the new boolean flags
DROP POLICY IF EXISTS "settings_write" ON settings;
CREATE POLICY "settings_write" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "categories_write" ON categories;
CREATE POLICY "categories_write" ON categories FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "perfumes_select" ON perfumes;
CREATE POLICY "perfumes_select" ON perfumes FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "perfumes_update" ON perfumes;
CREATE POLICY "perfumes_update" ON perfumes FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "perfumes_delete" ON perfumes;
CREATE POLICY "perfumes_delete" ON perfumes FOR DELETE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "contact_admin" ON contact_messages;
CREATE POLICY "contact_admin" ON contact_messages FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "contact_admin_update" ON contact_messages;
CREATE POLICY "contact_admin_update" ON contact_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "login_select" ON login_history;
CREATE POLICY "login_select" ON login_history FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));