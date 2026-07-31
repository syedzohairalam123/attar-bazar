// Direct SQL execution to make admin (bypasses trigger)
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

async function makeAdminDirect() {
  console.log('🔧 Making syedzohairalam@gmail.com an admin using direct SQL...\n');
  
  try {
    // Find the user by email
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'syedzohairalam@gmail.com')
      .single();
    
    if (findError || !profile) {
      console.log('❌ User not found in database.');
      console.log('Please register on the website first with email: syedzohairalam@gmail.com');
      process.exit(1);
    }
    
    console.log('👤 Found user:', profile.full_name, '(', profile.email, ')');
    console.log('📋 Current roles:', 'is_buyer:', profile.is_buyer, 'is_seller:', profile.is_seller, 'is_admin:', profile.is_admin);
    console.log('🆔 User ID:', profile.id);
    
    console.log('\n⚠️  To make this user admin, please run this SQL in Supabase SQL Editor:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('-- Step 1: Disable the protection trigger');
    console.log('DROP TRIGGER IF EXISTS tr_protect_admin_escalation ON public.profiles;');
    console.log('');
    console.log('-- Step 2: Promote user to admin');
    console.log('UPDATE public.profiles');
    console.log('SET is_admin = true, is_seller = true, is_buyer = true, role = \'admin\'');
    console.log('WHERE id = \'' + profile.id + '\';');
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
    console.log('After running this SQL, login with syedzohairalam@gmail.com');
    console.log('You will see: View as Buyer, View as Seller, and View as Admin options');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

makeAdminDirect().then(() => process.exit(0)).catch(() => process.exit(1));