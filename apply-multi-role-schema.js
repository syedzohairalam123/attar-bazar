// Direct schema application using Supabase client
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
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
  console.error('Could not read .env.local file:', err.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchema() {
  console.log('🔄 Applying multi-role schema changes...');
  
  try {
    // Read the migration SQL file
    const migrationPath = './supabase/migrations/complete_multi_role_system.sql';
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    
    // Since we can't execute raw SQL through the REST API, we'll use the RPC approach
    // First, let's check if we can create a temporary SQL execution function
    
    // Try to use Supabase's SQL editor API approach
    console.log('📡 Attempting to apply schema changes...');
    
    // Method 1: Try to execute individual statements using direct client operations
    const changes = [];
    
    // Check current schema first
    const { data: profiles, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Database connection failed:', checkError.message);
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    if (profiles && profiles.length > 0) {
      const sample = profiles[0];
      const hasMultiRole = 'is_buyer' in sample && 'is_seller' in sample && 'is_admin' in sample;
      
      if (hasMultiRole) {
        console.log('✅ Multi-role columns already exist');
        console.log('Current schema has:', Object.keys(sample).filter(k => k.startsWith('is_')).join(', '));
        return;
      }
    }
    
    console.log('⚠️ Multi-role columns missing');
    console.log('📝 The schema needs to be applied via Supabase SQL Editor');
    console.log('🌐 Please go to: https://supabase.com/dashboard/project/zzcvciyloyaaklcbezby/sql/new');
    console.log('📄 And run the SQL from: supabase/migrations/complete_multi_role_system.sql');
    
    console.log('\n📋 Here is the SQL that needs to be executed:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(sqlContent);
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applySchema()
  .then(() => {
    console.log('\n✅ Schema check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Schema check failed:', error);
    process.exit(1);
  });