-- 1. Add boolean role columns to profiles table if they don't already exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_buyer BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Migrate existing data from the old 'role' string column (if the column exists)
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

-- 3. Create security function to protect admin role escalation
CREATE OR REPLACE FUNCTION public.protect_admin_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
        IF (SELECT auth.uid()) IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Only existing administrators can modify admin privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach trigger to the profiles table
DROP TRIGGER IF EXISTS tr_protect_admin_escalation ON public.profiles;
CREATE TRIGGER tr_protect_admin_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_admin_escalation();