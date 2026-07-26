# 🗄️ Supabase Database Migration Instructions

## ⚠️ IMPORTANT: Apply Migration Before Testing

Before testing the multi-role features, you MUST apply the SQL migration to your Supabase database.

## 📋 Migration Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `zzcvciyloyaaklcbezby`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Open the file: `supabase/migrations/complete_multi_role_system.sql`
   - Copy the entire content of that file
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Success**
   - You should see "Success" message
   - No red error messages should appear

### Option 2: Via Supabase CLI

If you have Supabase CLI installed:

```bash
cd C:\Users\HP\Downloads\featurechange-login-page\attar
supabase db push
```

## 🔍 Verification Steps

After running the migration, verify it worked:

### 1. Check Column Existence
In SQL Editor, run:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('is_buyer', 'is_seller', 'is_admin');
```

**Expected Result:** Should show 3 rows with the boolean columns.

### 2. Check Role Distribution
```sql
SELECT 
  COUNT(*) FILTER (WHERE is_buyer = TRUE) as buyer_count,
  COUNT(*) FILTER (WHERE is_seller = TRUE) as seller_count,
  COUNT(*) FILTER (WHERE is_admin = TRUE) as admin_count
FROM profiles;
```

### 3. Check Functions
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%role%';
```

**Expected:** Should show functions like `activate_seller_role`, `activate_buyer_role`, `promote_to_admin`, etc.

## 🐛 Troubleshooting

### If Migration Fails:

1. **Check for existing data conflicts**
   ```sql
   -- Check if any profiles have NULL values that might conflict
   SELECT id, email, is_buyer, is_seller, is_admin 
   FROM profiles 
   WHERE is_buyer IS NULL OR is_seller IS NULL OR is_admin IS NULL;
   ```

2. **Run individual sections**
   - If the full migration fails, try running sections separately
   - Start with the column additions, then functions, then policies

3. **Check existing constraints**
   ```sql
   -- Check if there are conflicting constraints
   SELECT conname, conrelid::regclass 
   FROM pg_constraint 
   WHERE conrelid::regclass = 'profiles'::regclass;
   ```

## 📞 Migration Support

If you encounter any issues during migration:
1. Copy the error message
2. Let me know immediately
3. I'll help you fix it and continue testing

## ✅ Migration Complete Checklist

- [ ] Migration executed successfully
- [ ] No error messages in SQL Editor
- [ ] Columns `is_buyer`, `is_seller`, `is_admin` exist
- [ ] Functions created successfully
- [ ] RLS policies updated
- [ ] Ready to proceed with testing

**Status:** ⏳ Waiting for migration to be applied
**Next Step:** Begin testing after migration is complete