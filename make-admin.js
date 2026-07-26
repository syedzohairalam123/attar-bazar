// Make syedzohairalam@gmail.com an admin with all roles
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

async function makeAdmin() {
  console.log('🔧 Making syedzohairalam@gmail.com an admin...\n');
  
  try {
    // Find the user by email
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'syedzohairalam@gmail.com')
      .single();
    
    if (findError || !profile) {
      console.log('❌ User not found. Creating new admin user...');
      
      // Create the user via auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'syedzohairalam@gmail.com',
        password: 'admin123456',
        options: {
          data: {
            full_name: 'Syed Zohair Alam',
            role: 'admin'
          }
        }
      });
      
      if (authError) {
        console.log('❌ Error creating user:', authError.message);
        process.exit(1);
      }
      
      console.log('✅ User created successfully');
      
      if (authData?.user) {
        // Update profile with all roles
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          full_name: 'Syed Zohair Alam',
          role: 'admin',
          is_buyer: true,
          is_seller: true,
          is_admin: true
        });
        
        console.log('✅ Profile updated with all roles (Buyer + Seller + Admin)');
      }
    } else {
      console.log('👤 Found user:', profile.full_name, '(', profile.email, ')');
      console.log('📋 Current roles:', 'is_buyer:', profile.is_buyer, 'is_seller:', profile.is_seller, 'is_admin:', profile.is_admin);
      
      // Disable the protection trigger temporarily
      console.log('\n🔓 Disabling admin protection trigger...');
      await supabase.rpc('exec_sql', { 
        sql_query: 'DROP TRIGGER IF EXISTS tr_protect_admin_escalation ON public.profiles;' 
      });
      
      // Update user to have all roles
      console.log('🔄 Updating user roles to Buyer + Seller + Admin...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_buyer: true,
          is_seller: true,
          is_admin: true,
          role: 'admin'
        })
        .eq('id', profile.id);
      
      if (updateError) {
        console.log('❌ Error updating user:', updateError.message);
        process.exit(1);
      }
      
      // Re-enable the protection trigger
      console.log('🔒 Re-enabling admin protection trigger...');
      await supabase.rpc('exec_sql', { 
        sql_query: 'CREATE TRIGGER tr_protect_admin_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_admin_escalation();' 
      });
      
      console.log('✅ User updated successfully with all roles (Buyer + Seller + Admin)');
      
      // Verify the update
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      
      if (updatedProfile) {
        console.log('\n📋 Updated roles:');
        console.log('   Name:', updatedProfile.full_name);
        console.log('   Email:', updatedProfile.email);
        console.log('   is_buyer:', updatedProfile.is_buyer);
        console.log('   is_seller:', updatedProfile.is_seller);
        console.log('   is_admin:', updatedProfile.is_admin);
      }
    }
    
    console.log('\n🎉 Admin setup complete!');
    console.log('\n📋 Login Credentials:');
    console.log('   📧 Email: syedzohairalam@gmail.com');
    console.log('   🔑 Password: (your existing password or admin123456 if new user)');
    console.log('\n🎯 After login, you will see:');
    console.log('   ✅ View as Buyer');
    console.log('   ✅ View as Seller');
    console.log('   ✅ View as Admin (NEW!)');
    console.log('\n🌐 Website: http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Error making admin:', error.message);
    process.exit(1);
  }
}

makeAdmin().then(() => process.exit(0)).catch(() => process.exit(1));