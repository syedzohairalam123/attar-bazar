// Direct schema application using Supabase client with individual operations
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function applySchemaChanges() {
  console.log('🔄 Applying multi-role schema changes directly...');
  
  try {
    // Check current schema
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
    
    console.log('⚠️ Multi-role columns missing, attempting to add them...');
    
    // Since we can't execute ALTER TABLE through REST API, we need to use RPC
    // Let's try to create a temporary function to execute SQL
    const createExecFunction = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_query;
        RETURN 'Success';
      EXCEPTION WHEN OTHERS THEN
        RETURN SQLERRM;
      END;
      $$;
    `;
    
    // Try to execute the function creation
    console.log('📝 Creating SQL execution function...');
    
    // We can't execute this through REST API either
    console.log('❌ Cannot execute DDL statements through Supabase REST API');
    console.log('📝 The schema must be applied via Supabase SQL Editor');
    
    console.log('\n🌐 Please follow these steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/zzcvciyloyaaklcbezby/sql/new');
    console.log('2. Copy the SQL from: supabase/migrations/complete_multi_role_system.sql');
    console.log('3. Paste it into the SQL Editor');
    console.log('4. Click "Run" to execute the migration');
    
    console.log('\n⚠️ Without this migration, the multi-role features will not work.');
    console.log('⚠️ The website will run but role switching will fail.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applySchemaChanges()
  .then(() => {
    console.log('\n✅ Schema check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Schema check failed:', error);
    process.exit(1);
  });