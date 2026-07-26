// Setup existing user for multi-role testing
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

async function setupMultiRoleTest() {
  console.log('🔧 Setting up existing user for multi-role testing...\n');
  
  try {
    // Get the first user to make them multi-role
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
      
      // Make this user multi-role (buyer + seller)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_buyer: true,
          is_seller: true,
          is_admin: false
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.log('❌ Error updating user:', updateError.message);
        process.exit(1);
      }
      
      console.log('\n✅ User updated to multi-role (Buyer + Seller)');
      
      // Verify the update
      const { data: updatedUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (updatedUser) {
        console.log('📋 Updated roles:', 'is_buyer:', updatedUser.is_buyer, 'is_seller:', updatedUser.is_seller, 'is_admin:', updatedUser.is_admin);
        console.log('\n🎯 Test this user by:');
        console.log('   1. Login with:', updatedUser.email);
        console.log('   2. Try to add products to cart (should work now)');
        console.log('   3. Go to checkout (should work now)');
        console.log('   4. Switch to Seller Dashboard');
        console.log('   5. Switch back to Buyer Storefront');
        console.log('   6. Try purchasing again (should still work)');
        console.log('\n🌐 Website: http://localhost:3001');
      }
    } else {
      console.log('❌ No users found in database');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error setting up multi-role test:', error.message);
    process.exit(1);
  }
}

setupMultiRoleTest().then(() => process.exit(0)).catch(() => process.exit(1));