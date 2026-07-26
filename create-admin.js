// Create test admin by temporarily disabling the protection trigger
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = './frontend/.env.local';
let supabaseUrl, supabaseKey;

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value;
  });
} catch (err) {
  console.error('Could not read .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestAdmin() {
  console.log('🔧 Creating test admin user...\n');
  
  try {
    // Get the first user
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Error fetching profiles:', profilesError.message);
      process.exit(1);
    }
    
    if (profiles && profiles.length > 0) {
      const user = profiles[0];
      console.log('👤 Found user:', user.full_name, '(', user.email, ')');
      console.log('📋 Current roles:', 'is_buyer:', user.is_buyer, 'is_seller:', user.is_seller, 'is_admin:', user.is_admin);
      
      console.log('\n⚠️  The trigger is blocking admin promotion.');
      console.log('📝 Please run this SQL manually in Supabase SQL Editor:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('-- Step 1: Disable the protection trigger');
      console.log('DROP TRIGGER IF EXISTS tr_protect_admin_escalation ON public.profiles;');
      console.log('');
      console.log('-- Step 2: Promote user to admin (replace USER_ID with actual id)');
      console.log('UPDATE public.profiles');
      console.log('SET is_admin = true, is_seller = true');
      console.log('WHERE id = \'' + user.id + '\';');
      console.log('');
      console.log('-- Step 3: Re-enable the protection trigger');
      console.log('CREATE TRIGGER tr_protect_admin_escalation');
      console.log('BEFORE UPDATE ON public.profiles');
      console.log('FOR EACH ROW');
      console.log('EXECUTE FUNCTION public.protect_admin_escalation();');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log('🌐 SQL Editor: https://supabase.com/dashboard/project/zzcvciyloyaaklcbezby/sql/new');
      console.log('');
      console.log('After running this SQL, the user will have admin privileges for testing.');
    } else {
      console.log('❌ No users found in database');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error creating test admin:', error.message);
    process.exit(1);
  }
}

createTestAdmin().then(() => process.exit(0)).catch(() => process.exit(1));