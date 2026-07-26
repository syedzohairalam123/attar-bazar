// Create test users for multi-role testing
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

async function createTestUsers() {
  console.log('🔧 Creating test users for multi-role testing...\n');
  
  try {
    // Test 1: Create a pure buyer user
    console.log('1. Creating pure buyer user...');
    const { data: buyerUser, error: buyerError } = await supabase.auth.signUp({
      email: 'test-buyer@example.com',
      password: 'test123456',
      options: {
        data: {
          full_name: 'Test Buyer',
          role: 'buyer'
        }
      }
    });
    
    if (buyerError && !buyerError.message.includes('already registered')) {
      console.log('   ❌ Error creating buyer:', buyerError.message);
    } else {
      console.log('   ✅ Pure buyer user created/exists');
      
      // Update profile to ensure proper flags
      if (buyerUser?.user) {
        await supabase.from('profiles').upsert({
          id: buyerUser.user.id,
          full_name: 'Test Buyer',
          role: 'buyer',
          is_buyer: true,
          is_seller: false,
          is_admin: false
        });
      }
    }
    
    // Test 2: Create a pure seller user
    console.log('2. Creating pure seller user...');
    const { data: sellerUser, error: sellerError } = await supabase.auth.signUp({
      email: 'test-seller@example.com',
      password: 'test123456',
      options: {
        data: {
          full_name: 'Test Seller',
          role: 'seller'
        }
      }
    });
    
    if (sellerError && !sellerError.message.includes('already registered')) {
      console.log('   ❌ Error creating seller:', sellerError.message);
    } else {
      console.log('   ✅ Pure seller user created/exists');
      
      // Update profile to ensure proper flags
      if (sellerUser?.user) {
        await supabase.from('profiles').upsert({
          id: sellerUser.user.id,
          full_name: 'Test Seller',
          role: 'seller',
          is_buyer: false,
          is_seller: true,
          is_admin: false
        });
      }
    }
    
    // Test 3: Create a buyer+seller user (the critical test case)
    console.log('3. Creating buyer+seller user (multi-role test)...');
    const { data: multiUser, error: multiError } = await supabase.auth.signUp({
      email: 'test-multirole@example.com',
      password: 'test123456',
      options: {
        data: {
          full_name: 'Test Multi-Role',
          role: 'buyer'
        }
      }
    });
    
    if (multiError && !multiError.message.includes('already registered')) {
      console.log('   ❌ Error creating multi-role user:', multiError.message);
    } else {
      console.log('   ✅ Multi-role user created/exists');
      
      // Update profile to have both buyer and seller roles
      if (multiUser?.user) {
        await supabase.from('profiles').upsert({
          id: multiUser.user.id,
          full_name: 'Test Multi-Role',
          role: 'buyer',
          is_buyer: true,
          is_seller: true,
          is_admin: false
        });
      }
    }
    
    // Test 4: Verify the multi-role user has correct flags
    console.log('\n4. Verifying multi-role user flags...');
    const { data: multiProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'test-multirole@example.com')
      .single();
    
    if (multiProfile) {
      console.log('   User:', multiProfile.full_name);
      console.log('   is_buyer:', multiProfile.is_buyer);
      console.log('   is_seller:', multiProfile.is_seller);
      console.log('   is_admin:', multiProfile.is_admin);
      
      if (multiProfile.is_buyer && multiProfile.is_seller) {
        console.log('   ✅ Multi-role flags correctly set!');
      } else {
        console.log('   ❌ Multi-role flags not set correctly');
      }
    } else {
      console.log('   ❌ Could not find multi-role user');
    }
    
    console.log('\n📋 Test Users Created:');
    console.log('   📧 test-buyer@example.com (Buyer only)');
    console.log('   🔑 test123456');
    console.log('');
    console.log('   📧 test-seller@example.com (Seller only)');
    console.log('   🔑 test123456');
    console.log('');
    console.log('   📧 test-multirole@example.com (Buyer + Seller)');
    console.log('   🔑 test123456');
    console.log('');
    console.log('🎯 Test the multi-role user by:');
    console.log('   1. Login with test-multirole@example.com');
    console.log('   2. Try to add products to cart (should work)');
    console.log('   3. Go to checkout (should work)');
    console.log('   4. Switch to Seller Dashboard');
    console.log('   5. Switch back to Buyer Storefront');
    console.log('   6. Try purchasing again (should still work)');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
  }
}

createTestUsers().then(() => process.exit(0)).catch(() => process.exit(1));