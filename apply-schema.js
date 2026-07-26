// Direct PostgreSQL schema application script
// Run with: node apply-schema.js

const { createClient } = require('@supabase/supabase-js')

// Read environment variables directly from .env.local
const fs = require('fs')
const envPath = './frontend/.env.local'
let supabaseUrl, supabaseKey

try {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    const value = valueParts.join('=').trim()
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value
  })
} catch (err) {
  console.error('Could not read .env.local file')
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  console.log('Found URL:', supabaseUrl ? 'Yes' : 'No')
  console.log('Found Key:', supabaseKey ? 'Yes' : 'No')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applySchemaChanges() {
  console.log('🔄 Starting schema application...')
  const changes = []
  const errors = []

  try {
    // Test connection
    console.log('📡 Testing database connection...')
    const { data: profiles, error: testError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (testError) {
      console.error('❌ Database connection failed:', testError.message)
      throw testError
    }
    console.log('✅ Database connection successful')

    // Check current schema
    console.log('🔍 Checking current schema...')
    if (profiles && profiles.length > 0) {
      const sample = profiles[0]
      const hasMultiRole = 'is_buyer' in sample && 'is_seller' in sample && 'is_admin' in sample
      console.log('Current columns:', Object.keys(sample).join(', '))
      console.log('Multi-role columns exist:', hasMultiRole)
      
      if (hasMultiRole) {
        console.log('✅ Schema already has multi-role columns')
        return
      }
    }

    console.log('⚠️ Multi-role columns missing, need to apply schema changes')
    console.log('📝 Schema changes must be applied via Supabase SQL Editor')
    console.log('📄 Please run the SQL from: supabase/migrations/complete_multi_role_system.sql')
    console.log('🌐 Or go to: https://supabase.com/dashboard/project/zzcvciyloyaaklcbezby/sql/new')

  } catch (error) {
    console.error('❌ Error during schema check:', error.message)
    errors.push(error.message)
  }

  console.log('\n📊 Summary:')
  console.log('Changes attempted:', changes.length)
  console.log('Errors encountered:', errors.length)
  if (errors.length > 0) {
    console.log('Errors:', errors)
  }
}

applySchemaChanges()
  .then(() => {
    console.log('\n✅ Schema check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Schema check failed:', error)
    process.exit(1)
  })